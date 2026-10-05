/* eslint-env node */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../electron/oauth_credentials');

const BACKUP_FILENAME = 'edusys_pro_backup.json';
const ENCRYPTION_SECRET = "EduSysPro_Local_Secure_Secret_Key_v3_2026";
const ALGORITHM = 'aes-256-cbc';

function getDerivedKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

function decrypt(text) {
    const parts = text.trim().split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const enc = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
    let r = decipher.update(enc, 'hex', 'utf8');
    r += decipher.final('utf8');
    return r;
}

async function forceCloudSync() {
    console.log("==================================================================");
    console.log("EXECUÇÃO DA ETAPA: SINCRONIZAÇÃO FORÇADA NA NUVEM (GOOGLE DRIVE)");
    console.log("==================================================================");

    const configPath = path.join(process.env.APPDATA, 'EduSys Pro', 'config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error("Arquivo config.json com credenciais do Google Drive não encontrado.");
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.google_tokens) {
        throw new Error("Tokens do Google Drive não encontrados em config.json.");
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials(config.google_tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 1. Ler os dados locais restaurados
    const localDataPath = path.join(process.cwd(), 'school_data.json');
    console.log(`\n[1] Lendo banco de dados restaurado: ${localDataPath}...`);
    const localEncryptedData = fs.readFileSync(localDataPath, 'utf8');

    // Validação de pré-requisito antes do envio
    const testDec = decrypt(localEncryptedData);
    if (!testDec) throw new Error("Falha ao decriptar banco local antes do envio.");
    const parsedLocal = JSON.parse(testDec);
    console.log(`  ✓ Banco local validado: ${parsedLocal.students.length} estudantes, ${parsedLocal.activities.length} atividades, ${parsedLocal.units.find(u => u.id === 3)?.name} (Ativa).`);

    // 2. Preparar Envelope de Integridade
    console.log("\n[2] Gerando Envelope de Integridade com Hash SHA-256...");
    const hash = crypto.createHash('sha256').update(localEncryptedData, 'utf8').digest('hex');
    const envelope = JSON.stringify({
        _edusys: true,
        app_version: '5.5.3',
        uploaded_at: new Date().toISOString(),
        hash,
        payload: localEncryptedData
    });
    console.log(`  ✓ Hash SHA-256 gerado: ${hash}`);

    // 3. Localizar e Atualizar no Google Drive
    console.log(`\n[3] Conectando ao Google Drive para atualizar '${BACKUP_FILENAME}'...`);
    const listRes = await drive.files.list({
        q: `name = '${BACKUP_FILENAME}' and trashed = false`,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive'
    });

    const existingFile = listRes.data.files?.[0];
    const media = {
        mimeType: 'application/json',
        body: envelope
    };

    let fileId;
    if (existingFile) {
        fileId = existingFile.id;
        console.log(`  ✓ Arquivo existente encontrado no Drive: ID ${fileId}. Atualizando conteúdo...`);
        const updateRes = await drive.files.update({
            fileId,
            media: media
        });
        console.log(`  ✓ Upload de atualização concluído.`);
    } else {
        console.log(`  ✓ Criando novo arquivo no Drive...`);
        const createRes = await drive.files.create({
            requestBody: {
                name: BACKUP_FILENAME,
                mimeType: 'application/json'
            },
            media: media
        });
        fileId = createRes.data.id;
        console.log(`  ✓ Novo arquivo criado com ID ${fileId}.`);
    }

    // 4. Auditoria Reversa: Baixar imediatamente da nuvem e verificar integridade
    console.log(`\n[4] Auditoria Reversa: Verificando integridade do backup diretamente da nuvem...`);
    const downloadRes = await drive.files.get({
        fileId,
        alt: 'media'
    });

    const cloudData = downloadRes.data;
    if (!cloudData || !cloudData._edusys || !cloudData.hash || !cloudData.payload) {
        throw new Error("O arquivo retornado pelo Google Drive não possui envelope válido.");
    }

    const calculatedHash = crypto.createHash('sha256').update(cloudData.payload, 'utf8').digest('hex');
    if (calculatedHash !== cloudData.hash) {
        throw new Error(`Inconsistência de integridade: hash nuvem ${cloudData.hash} vs calculado ${calculatedHash}`);
    }
    console.log(`  ✓ Hash SHA-256 verificado com sucesso da nuvem: ${calculatedHash}`);

    const cloudDecrypted = decrypt(cloudData.payload);
    const cloudParsed = JSON.parse(cloudDecrypted);

    console.log(`  ✓ Conteúdo do Google Drive 100% verificado:`);
    console.log(`     - Versão App: ${cloudParsed.metadata.app_version}`);
    console.log(`     - Alunos: ${cloudParsed.students.length}`);
    console.log(`     - Atividades: ${cloudParsed.activities.length}`);
    console.log(`     - Mini-testes: ${cloudParsed.mini_testes.length}`);
    console.log(`     - Provas: ${cloudParsed.provas.length}`);
    console.log(`     - Trabalhos: ${cloudParsed.trabalhos.length}`);
    console.log(`     - Ocorrências: ${cloudParsed.occurrences.length}`);
    console.log(`     - Unidades:`, cloudParsed.units.map(u => `${u.name} (active: ${u.is_active}, closed: ${u.is_closed})`).join(' | '));

    console.log("\n==================================================================");
    console.log("SINCRONIZAÇÃO FORÇADA NA NUVEM CONCLUÍDA COM 100% DE SUCESSO!");
    console.log("==================================================================\n");
}

forceCloudSync().catch(err => {
    console.error("ERRO NA SINCRONIZAÇÃO EM NUVEM:", err);
    process.exit(1);
});
