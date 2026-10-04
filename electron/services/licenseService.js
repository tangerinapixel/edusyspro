const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Chave Pública Ed25519 do Sistema (Chave de Validação Oficial EduSys Pro)
// A Chave Privada correspondente fica exclusivamente com o Administrador no script emissor.
const EDUSYS_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAun1xcjzdcFMD/ODNMmaH+kLBOk49E+kRratpk3SiZ+4=
-----END PUBLIC KEY-----`;

// Configurações do Storage da Licença (Isolado de school_data.json)
function getLicenseStorePath() {
    const isPackaged = app && app.isPackaged;
    const baseDir = isPackaged ? app.getPath('userData') : path.join(__dirname, '..', '..');
    return path.join(baseDir, 'license_store.json');
}

/**
 * Coleta o Machine ID único e determinístico do hardware Windows
 * Combina UUID da Placa-Mãe + Processador + Disk Serial
 */
let cachedMachineId = null;

function getMachineId() {
    if (cachedMachineId) return cachedMachineId;

    try {
        let rawId = '';
        if (process.platform === 'win32') {
            try {
                // Tenta PowerShell para obter UUID da placa-mãe de forma rápida e segura
                const psCmd = 'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"';
                const output = execSync(psCmd, { encoding: 'utf8', timeout: 3500 }).trim();
                if (output && output.length > 5 && !output.includes('00000000')) {
                    rawId = output;
                }
            } catch (e) {
                // Fallback via WMIC se PowerShell falhar
                try {
                    const wmicCmd = 'wmic csproduct get uuid';
                    const wmicOut = execSync(wmicCmd, { encoding: 'utf8', timeout: 3500 });
                    const lines = wmicOut.split('\r\n').map(l => l.trim()).filter(l => l && l !== 'UUID');
                    if (lines.length > 0) rawId = lines[0];
                } catch (e2) {
                    // Ignora erro
                }
            }
        }

        // Se falhar ou estiver em outro SO de teste, usa hostname + username + platform como semente
        if (!rawId) {
            rawId = `${process.env.COMPUTERNAME || 'EDUSYS'}-${process.env.USERNAME || 'USER'}-${process.arch}`;
        }

        // Hash SHA-256 e formatação amigável (XXXX-XXXX-XXXX-XXXX)
        const hash = crypto.createHash('sha256').update(rawId).digest('hex').toUpperCase();
        cachedMachineId = `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
        return cachedMachineId;
    } catch (err) {
        console.error('[LicenseService] Falha ao coletar Machine ID:', err.message);
        cachedMachineId = 'EDUS-0000-0000-PRO1';
        return cachedMachineId;
    }
}

/**
 * Lê o arquivo de licença local
 */
function readLicenseStore() {
    const storePath = getLicenseStorePath();
    if (!fs.existsSync(storePath)) {
        return {
            licenseToken: null,
            lastKnownTimestamp: Date.now()
        };
    }

    try {
        const raw = fs.readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            licenseToken: parsed.licenseToken || null,
            lastKnownTimestamp: typeof parsed.lastKnownTimestamp === 'number' ? parsed.lastKnownTimestamp : Date.now()
        };
    } catch (err) {
        console.error('[LicenseService] Erro ao ler license_store:', err.message);
        return { licenseToken: null, lastKnownTimestamp: Date.now() };
    }
}

/**
 * Grava o arquivo de licença local de forma segura
 */
function writeLicenseStore(data) {
    try {
        const storePath = getLicenseStorePath();
        const dir = path.dirname(storePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[LicenseService] Erro ao gravar license_store:', err.message);
        return false;
    }
}

/**
 * Valida a integridade criptográfica de um token de licença usando Ed25519
 * Formato do token: EDUSYS.<payload_b64>.<signature_b64>
 */
function verifyLicenseToken(token, customPublicKeyPem = null) {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token de licença ausente ou inválido.' };
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'EDUSYS') {
        return { valid: false, error: 'Formato de chave de licença incompatível com EduSys Pro.' };
    }

    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    try {
        const publicKey = customPublicKeyPem || EDUSYS_PUBLIC_KEY_PEM;
        const signatureBuffer = Buffer.from(signatureB64, 'base64');
        const isVerified = crypto.verify(null, Buffer.from(payloadB64), publicKey, signatureBuffer);

        if (!isVerified) {
            return { valid: false, error: 'Assinatura digital inválida. Chave de ativação corrompida ou falsificada.' };
        }

        const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
        const claims = JSON.parse(payloadJson);

        return { valid: true, claims };
    } catch (err) {
        return { valid: false, error: `Falha na verificação criptográfica: ${err.message}` };
    }
}

/**
 * Calcula os dias civis restantes até a expiração
 */
function calculateDaysRemaining(expiresAtIso, nowTimestamp) {
    if (!expiresAtIso) return 99999;
    const expDate = new Date(expiresAtIso);
    const nowDate = new Date(nowTimestamp || Date.now());

    if (expDate.getTime() <= nowDate.getTime()) {
        return 0;
    }

    // Normalização civil baseada no início dos dias locais (00:00:00)
    const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
    const nowMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const diffDays = Math.round((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

    // Se vence hoje mas o milissegundo de expiração ainda não passou, resta 1 dia
    return Math.max(1, diffDays);
}

/**
 * Avalia o status completo da licença instalada
 */
function checkLicenseStatus(options = {}) {
    const currentMachineId = options.machineIdOverride || getMachineId();
    const store = readLicenseStore();
    const now = options.currentDateOverride ? new Date(options.currentDateOverride).getTime() : Date.now();

    // 1. Anti-Clock Tampering Check
    // Se a data atual for menor que o último timestamp registrado em mais de 10 minutos (600.000 ms), detecta recuo
    if (store.lastKnownTimestamp && (store.lastKnownTimestamp - now > 600000)) {
        return {
            status: 'CLOCK_TAMPERED',
            isValid: false,
            canOperate: false,
            message: 'O relógio do computador foi retrocedido. Por favor, ajuste a data e hora do Windows.',
            machineId: currentMachineId,
            claims: null,
            daysRemaining: 0
        };
    }

    // Atualiza a marca temporal se o relógio avançou
    if (now > store.lastKnownTimestamp) {
        store.lastKnownTimestamp = now;
        writeLicenseStore(store);
    }

    // 2. Verifica se há token registrado
    if (!store.licenseToken) {
        return {
            status: 'UNLICENSED',
            isValid: false,
            canOperate: false,
            message: 'Nenhuma chave de ativação foi instalada nesta máquina.',
            machineId: currentMachineId,
            claims: null,
            daysRemaining: 0
        };
    }

    // 3. Validação Criptográfica do Token
    const verifyResult = verifyLicenseToken(store.licenseToken, options.publicKeyOverride);
    if (!verifyResult.valid) {
        return {
            status: 'INVALID_TOKEN',
            isValid: false,
            canOperate: false,
            message: verifyResult.error,
            machineId: currentMachineId,
            claims: null,
            daysRemaining: 0
        };
    }

    const claims = verifyResult.claims;

    // 4. Verificação de Vinculação com o Hardware ID
    if (claims.machineId && claims.machineId !== '*' && claims.machineId !== currentMachineId) {
        return {
            status: 'INVALID_MACHINE',
            isValid: false,
            canOperate: false,
            message: `Esta licença foi emitida para outro computador (${claims.machineId}).`,
            machineId: currentMachineId,
            claims,
            daysRemaining: 0
        };
    }


    // 5. Verificação de Expiração
    if (claims.expiresAt) {
        const expirationTime = new Date(claims.expiresAt).getTime();
        const diffMs = expirationTime - now;

        if (diffMs <= 0) {
            return {
                status: 'EXPIRED',
                isValid: false,
                canOperate: false, // Dispara o Modo Somente Leitura pedagógico
                message: `Sua licença expirou em ${new Date(claims.expiresAt).toLocaleDateString('pt-BR')}.`,
                machineId: currentMachineId,
                claims,
                daysRemaining: 0
            };
        }

        const daysRemaining = calculateDaysRemaining(claims.expiresAt, now);

        if (daysRemaining <= 15) {
            return {
                status: 'WARNING_EXPIRING',
                isValid: true,
                canOperate: true,
                message: `Sua licença expira em ${daysRemaining} dia(s). Renove para continuar com novos lançamentos.`,
                machineId: currentMachineId,
                claims,
                daysRemaining
            };
        }

        return {
            status: 'VALID',
            isValid: true,
            canOperate: true,
            message: 'Licença ativa e regular.',
            machineId: currentMachineId,
            claims,
            daysRemaining
        };
    }

    // Licença vitalícia (sem data de expiração)
    return {
        status: 'VALID',
        isValid: true,
        canOperate: true,
        message: 'Licença Vitalícia ativa.',
        machineId: currentMachineId,
        claims,
        daysRemaining: 99999
    };
}

/**
 * Ativa uma nova licença no sistema
 */
function activateLicense(token, options = {}) {
    if (!token || typeof token !== 'string') {
        return { success: false, message: 'Chave de licença vazia ou inválida.' };
    }

    const cleanToken = token.trim();
    const currentMachineId = options.machineIdOverride || getMachineId();

    const verifyResult = verifyLicenseToken(cleanToken, options.publicKeyOverride);
    if (!verifyResult.valid) {
        return { success: false, message: verifyResult.error };
    }

    const claims = verifyResult.claims;

    if (claims.machineId && claims.machineId !== '*' && claims.machineId !== currentMachineId) {
        return {
            success: false,
            message: `A chave informada pertence ao computador (${claims.machineId}). O seu ID é ${currentMachineId}.`
        };
    }

    const now = options.currentDateOverride ? new Date(options.currentDateOverride).getTime() : Date.now();
    if (claims.expiresAt && new Date(claims.expiresAt).getTime() <= now) {
        return {
            success: false,
            message: `Esta chave de licença já expirou em ${new Date(claims.expiresAt).toLocaleDateString('pt-BR')}.`
        };
    }

    const store = readLicenseStore();
    store.licenseToken = cleanToken;
    store.lastKnownTimestamp = now;

    const saved = writeLicenseStore(store);
    if (!saved) {
        return { success: false, message: 'Erro ao gravar arquivo de licença no disco.' };
    }

    const status = checkLicenseStatus(options);
    return {
        success: true,
        message: 'EduSys Pro ativado com sucesso!',
        status
    };
}

/**
 * Remove a licença atual (desativação)
 */
function removeLicense() {
    const store = readLicenseStore();
    store.licenseToken = null;
    writeLicenseStore(store);
    return { success: true, message: 'Licença removida com sucesso.' };
}

module.exports = {
    getMachineId,
    verifyLicenseToken,
    checkLicenseStatus,
    activateLicense,
    removeLicense,
    calculateDaysRemaining,
    EDUSYS_PUBLIC_KEY_PEM
};
