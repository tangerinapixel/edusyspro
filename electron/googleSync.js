const { google } = require('googleapis');
const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Store = require('electron-store');

const store = new Store();

// Credenciais OAuth2 isoladas em arquivo gitignored (electron/oauth_credentials.js).
// Nunca exponha CLIENT_ID/SECRET diretamente no código-fonte.
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('./oauth_credentials');

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file'
];
const BACKUP_FILENAME = 'edusys_pro_backup.json';

// Armazena o code_verifier do PKCE entre a geração da URL e o callback OAuth.
// Válido apenas durante o fluxo de login ativo; zerado imediatamente após o uso.
let pendingCodeVerifier = null;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Carrega tokens salvos se existirem
const savedTokens = store.get('google_tokens');
if (savedTokens) {
    oauth2Client.setCredentials(savedTokens);
}

// Persiste tokens atualizados na renovação automática
oauth2Client.on('tokens', (tokens) => {
    const currentTokens = store.get('google_tokens') || {};
    const updatedTokens = { ...currentTokens, ...tokens };
    store.set('google_tokens', updatedTokens);
    oauth2Client.setCredentials(updatedTokens);
});

async function startAuth(parentWindow) {
    // ─── PKCE: Proof Key for Code Exchange ───────────────────────────────────
    // Gera um par criptográfico one-time: code_verifier (segredo local) e
    // code_challenge (hash SHA-256 enviado ao Google).
    // Mesmo que o CLIENT_SECRET seja extraído do pacote, um authorization code
    // interceptado é inútil sem o code_verifier — que nunca trafega pela rede.
    // Nota: generateCodeVerifierAsync() v10.6+ não retorna codeChallengeMethod.
    // A implementação interna SEMPRE usa SHA-256 — hardcodar 'S256' é correto e necessário.
    const { codeVerifier, codeChallenge } =
        await oauth2Client.generateCodeVerifierAsync();
    pendingCodeVerifier = codeVerifier;
    // ─────────────────────────────────────────────────────────────────────────

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    const authWindow = new BrowserWindow({
        width: 500,
        height: 650,
        parent: parentWindow,
        modal: true,
        show: true,
        resizable: false,
        autoHideMenuBar: true,
        title: 'Conectar ao Google Drive',
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        webPreferences: { nodeIntegration: false }
    });

    authWindow.loadURL(authUrl);

    return new Promise((resolve, reject) => {
        let exchangingCode = false; // Guard: impede dupla execução do getToken()

        authWindow.webContents.on('will-redirect', async (event, url) => {
            if (url.startsWith(REDIRECT_URI)) {
                // ─── Bloqueia a navegação real para http://localhost ───────────────────
                // Sem preventDefault(), o Chromium navega efetivamente para a URL,
                // o que dispara will-redirect uma segunda vez com o mesmo code (já
                // consumido pelo Google) → invalid_grant na 2ª chamada a getToken().
                event.preventDefault();

                const urlParams = new URL(url);

                // ─── Trata erros explícitos retornados pelo Google no redirect ──────────
                // Ex: error=redirect_uri_mismatch, error=access_denied, error=invalid_client
                // Sem este bloco, o 'if (code)' seria false, a janela ficaria aberta para
                // sempre e a Promise nunca resolveria nem rejeitaria (app travado silencioso).
                const oauthError = urlParams.searchParams.get('error');
                if (oauthError) {
                    pendingCodeVerifier = null;
                    authWindow.close();
                    reject(new Error(`Google OAuth: ${oauthError}`));
                    return;
                }

                const code = urlParams.searchParams.get('code');
                if (code) {
                    // ─── Guard contra disparo duplo ───────────────────────────────────
                    // Mesmo com preventDefault(), o evento pode disparar mais de uma vez
                    // em versões do Electron com comportamento de redirect agressivo.
                    // O guard garante que apenas a primeira invocação chega ao getToken().
                    if (exchangingCode) return;
                    exchangingCode = true;

                    const verifier = pendingCodeVerifier;
                    pendingCodeVerifier = null; // Limpa imediatamente — uso único
                    try {
                        // Inclui o code_verifier na troca pelo token (validação PKCE)
                        const { tokens } = await oauth2Client.getToken({ code, codeVerifier: verifier });
                        oauth2Client.setCredentials(tokens);
                        store.set('google_tokens', tokens);
                        authWindow.close();
                        resolve({ success: true });
                    } catch (e) {
                        pendingCodeVerifier = null;
                        // ─── Fecha a janela antes de rejeitar ────────────────────────────
                        // Sem close() aqui, o evento 'closed' posterior chamaria
                        // resolve({ cancelled: true }) sobre uma Promise já rejeitada.
                        authWindow.close();
                        reject(e);
                    }
                }
            }
        });

        authWindow.on('closed', () => {
            pendingCodeVerifier = null; // Garante limpeza se a janela for fechada manualmente
            resolve({ cancelled: true });
        });
    });
}

async function findBackupFile() {
    try {
        const response = await drive.files.list({
            q: `name = '${BACKUP_FILENAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive'
        });
        return response.data.files[0];
    } catch (e) {
        console.error('Erro ao buscar backup no Drive:', e);
        return null;
    }
}

async function uploadBackup(localData) {
    try {
        const existingFile = await findBackupFile();

        // Normaliza o payload para string (sempre será o banco criptografado)
        const payload = typeof localData === 'string' ? localData : JSON.stringify(localData, null, 2);

        // ─── ENVELOPE DE INTEGRIDADE ─────────────────────────────────────────────
        // Computa SHA-256 sobre o payload criptografado antes de enviar.
        // Na restauração, o hash é reverificado — qualquer alteração é detectada.
        const hash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
        const envelope = JSON.stringify({
            _edusys: true,
            app_version: '5.5.1',
            uploaded_at: new Date().toISOString(),
            hash,
            payload
        });
        // ─────────────────────────────────────────────────────────────────────────

        const media = {
            mimeType: 'application/json',
            body: envelope
        };

        if (existingFile) {
            await drive.files.update({
                fileId: existingFile.id,
                media: media
            });
        } else {
            await drive.files.create({
                requestBody: {
                    name: BACKUP_FILENAME,
                    mimeType: 'application/json'
                },
                media: media
            });
        }
        return { success: true };
    } catch (e) {
        const errorMsg = e.message || String(e);
        if (errorMsg.includes('invalid_grant') || e.code === 401) {
            store.delete('google_tokens');
            oauth2Client.setCredentials(null);
            return { success: false, error: 'Sessão do Google Drive expirada. Por favor, desconecte e reconecte sua conta na aba de Configurações.' };
        }
        return { success: false, error: errorMsg };
    }
}

async function downloadBackup() {
    try {
        const existingFile = await findBackupFile();
        if (!existingFile) return { success: false, error: 'Nenhum backup encontrado no Drive' };

        const response = await drive.files.get({
            fileId: existingFile.id,
            alt: 'media'
        });

        // ─── VERIFICAÇÃO DE INTEGRIDADE ────────────────────────────────────────
        // A googleapis retorna o JSON já parseado quando o mimeType é application/json.
        // Suporte a dois formatos:
        //   1. Envelope moderno { _edusys, hash, payload } — verifica hash SHA-256
        //   2. Formato legado (banco criptografado direto) — aceita com aviso no log
        const raw = response.data;

        // Garante que temos um objeto para inspecionar
        let envelope;
        if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
            envelope = raw; // Já parseado pela biblioteca
        } else {
            try {
                envelope = JSON.parse(typeof raw === 'string' ? raw : String(raw));
            } catch (_) {
                envelope = null; // Não é JSON válido — formato legado
            }
        }

        if (envelope && envelope._edusys === true && envelope.hash && envelope.payload) {
            // ── Formato moderno: verificar hash SHA-256 ──────────────────────────
            const computedHash = crypto
                .createHash('sha256')
                .update(envelope.payload, 'utf8')
                .digest('hex');

            if (computedHash !== envelope.hash) {
                console.error('[Backup] FALHA DE INTEGRIDADE: hash esperado =', envelope.hash, '| calculado =', computedHash);
                return {
                    success: false,
                    error: 'Falha na verificação de integridade: o arquivo de backup no Google Drive está corrompido ou foi adulterado. Restauração cancelada por segurança.'
                };
            }

            console.log('[Backup] Hash SHA-256 verificado com sucesso. Backup íntegro.');
            return { success: true, data: envelope.payload };
        }

        // ── Formato legado (backup antigo sem envelope) ──────────────────────────
        console.warn('[Backup] Aviso: backup no formato legado (sem envelope de integridade). Prosseguindo sem verificação. Recomendado: faça um novo backup para atualizar o formato.');
        return { success: true, data: raw };
        // ─────────────────────────────────────────────────────────────────────────

    } catch (e) {
        const errorMsg = e.message || String(e);
        if (errorMsg.includes('invalid_grant') || e.code === 401) {
            store.delete('google_tokens');
            oauth2Client.setCredentials(null);
            return { success: false, error: 'Sessão do Google Drive expirada. Por favor, desconecte e reconecte sua conta na aba de Configurações.' };
        }
        return { success: false, error: errorMsg };
    }
}

async function getOrCreateFolder(folderName) {
    try {
        const response = await drive.files.list({
            q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            spaces: 'drive'
        });
        
        if (response.data.files.length > 0) {
            return response.data.files[0].id;
        }

        const folder = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        });
        return folder.data.id;
    } catch (e) {
        console.error('Erro ao gerenciar pasta no Drive:', e);
        return null;
    }
}

async function getCloudMetadata() {
    try {
        const file = await findBackupFile();
        if(!file) return null;
        return { 
            id: file.id, 
            modifiedDrive: file.modifiedTime 
        };
    } catch (e) {
        return null;
    }
}

async function exportToDoc(markdownData, title) {
    try {
        const { marked } = require('marked');
        const { Readable } = require('stream');

        // Converter Markdown em HTML para o Google Drive entender
        const htmlContent = `
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif;">
                ${marked.parse(markdownData)}
            </body>
            </html>
        `;

        const folderId = await getOrCreateFolder('EduSys Pro - Planos de Aula');
        
        const media = {
            mimeType: 'text/html',
            body: Readable.from(htmlContent)
        };

        const fileMetadata = {
            name: title || 'Plano de Aula - AI',
            mimeType: 'application/vnd.google-apps.document',
            parents: folderId ? [folderId] : []
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        // Abrir automaticamente no navegador se solicitado (o frontend lidará com o link)
        return { success: true, fileId: file.data.id, link: file.data.webViewLink };
    } catch (e) {
        console.error('Erro ao exportar para Google Docs:', e);
        return { success: false, error: e.message };
    }
}



async function logout() {
    try {
        store.delete('google_tokens');
        oauth2Client.setCredentials(null);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    startAuth,
    uploadBackup,
    downloadBackup,
    getCloudMetadata,
    exportToDoc,
    logout,
    isAuthenticated: async () => {
        if (!store.get('google_tokens')) return false;

        // ─── TIMEOUT DE REDE ─────────────────────────────────────────────────────
        // getAccessToken() pode travar indefinidamente sem conexão.
        // Promise.race() garante resposta em até 5 segundos.
        // Importante: timeout NÃO apaga os tokens — o token pode ser válido,
        // apenas a rede estava indisponível no momento da verificação.
        const TIMEOUT_MS = 5000;
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), TIMEOUT_MS)
        );
        // ─────────────────────────────────────────────────────────────────────────

        try {
            await Promise.race([oauth2Client.getAccessToken(), timeoutPromise]);
            return true;
        } catch (e) {
            const errorMsg = e.message || String(e);

            // Timeout de rede: tokens preservados — não desconecta o professor
            if (errorMsg === 'NETWORK_TIMEOUT') {
                console.warn('[Cloud Auth] Timeout na verificação de autenticação (sem internet?). Tokens preservados.');
                return false;
            }

            // Erro de autenticação real: token inválido/revogado → limpa credenciais
            const isAuthError = e.code === 400 || e.code === 401 ||
                                errorMsg.includes('invalid_grant') ||
                                errorMsg.includes('invalid_request') ||
                                errorMsg.includes('invalid_client');

            if (isAuthError) {
                store.delete('google_tokens');
                oauth2Client.setCredentials(null);
            }
            return false;
        }
    }
};
