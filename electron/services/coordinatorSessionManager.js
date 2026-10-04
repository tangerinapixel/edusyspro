/* eslint-env node */
/**
 * Gerenciador de Sessão e Segurança da Coordenação Pedagógica
 * Responsável pela validação do PIN do Gestor via PBKDF2, controle de tokens
 * de sessão em memória, temporizador de inatividade (15 min) e auto-lock.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const isDev = !app || !app.isPackaged;
const vaultBaseDir = isDev
    ? path.join(__dirname, '..', '..', 'coordinator_vault')
    : (app && typeof app.getPath === 'function' 
        ? path.join(app.getPath('userData'), 'coordinator_vault') 
        : path.join(__dirname, '..', '..', 'coordinator_vault'));

const authMetaFilePath = path.join(vaultBaseDir, 'auth_meta.json');
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

let activeSession = null;
let inactivityTimer = null;
let eventBroadcaster = null;

function ensureVaultDir() {
    try {
        if (!fs.existsSync(vaultBaseDir)) {
            fs.mkdirSync(vaultBaseDir, { recursive: true });
        }
    } catch (e) {
        console.error('[CoordinatorSession] Erro ao criar diretório do cofre:', e.message);
    }
}

/**
 * Registra o despachante de eventos para a janela Chromium.
 * @param {Function} broadcaster Função que recebe (channel, payload) e envia para a janela.
 */
function setEventBroadcaster(broadcaster) {
    if (typeof broadcaster === 'function') {
        eventBroadcaster = broadcaster;
    }
}

function broadcastLockEvent(reason = 'timeout') {
    if (eventBroadcaster) {
        try {
            eventBroadcaster('coordinator:sessionLocked', { reason, lockedAt: new Date().toISOString() });
        } catch (err) {
            console.warn('[CoordinatorSession] Falha ao notificar UI sobre lock:', err.message);
        }
    }
}

/**
 * Lê o arquivo de autenticação do gestor defensivamente.
 */
function readAuthMeta() {
    try {
        ensureVaultDir();
        if (!fs.existsSync(authMetaFilePath)) {
            return null;
        }
        const raw = fs.readFileSync(authMetaFilePath, 'utf8');
        if (!raw || !raw.trim()) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.error('[CoordinatorSession] Erro ao ler auth_meta.json:', err.message);
        return null;
    }
}

/**
 * Salva metadados de autenticação do coordenador.
 */
function writeAuthMeta(data) {
    try {
        ensureVaultDir();
        const tmpPath = `${authMetaFilePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmpPath, authMetaFilePath);
        return true;
    } catch (err) {
        console.error('[CoordinatorSession] Erro ao persistir auth_meta.json:', err.message);
        throw new Error('Falha ao salvar credenciais do gestor.');
    }
}

/**
 * Hash de PIN com PBKDF2 (100.000 iterações com SHA-512).
 */
function hashPin(pin, salt) {
    return crypto.pbkdf2Sync(String(pin), salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Verifica se a coordenação já possui PIN configurado.
 */
function isCoordinatorSetup() {
    const meta = readAuthMeta();
    return !!(meta && meta.pin_hash && meta.salt);
}

/**
 * Configura ou altera o PIN do Gestor.
 * @param {string} newPin Novo PIN (mínimo 4 caracteres)
 * @param {string} coordinatorName Nome opcional do gestor
 */
function setupCoordinatorPin(newPin, coordinatorName = '') {
    const cleanPin = String(newPin || '').trim();
    if (cleanPin.length < 4) {
        throw new Error('O PIN da coordenação deve ter no mínimo 4 dígitos.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = hashPin(cleanPin, salt);

    const payload = {
        configured_at: new Date().toISOString(),
        coordinator_name: String(coordinatorName || '').trim(),
        salt,
        pin_hash: pinHash,
        version: '2.1'
    };

    writeAuthMeta(payload);
    return { success: true };
}

/**
 * Reseta o timer de inatividade (15 min).
 */
function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    inactivityTimer = setTimeout(() => {
        console.log('[CoordinatorSession] Sessão encerrada por inatividade (Auto-Lock 15 min).');
        lockSession('timeout');
    }, INACTIVITY_TIMEOUT_MS);
}

/**
 * Valida o PIN fornecido e cria a sessão em memória se válido.
 * @param {string} pin PIN digitado pelo usuário
 */
function verifyAndElevate(pin) {
    const meta = readAuthMeta();
    if (!meta || !meta.pin_hash || !meta.salt) {
        return {
            success: false,
            needsSetup: true,
            error: 'PIN da coordenação ainda não configurado.'
        };
    }

    const calculated = hashPin(pin, meta.salt);
    const isValid = crypto.timingSafeEqual(Buffer.from(calculated, 'utf8'), Buffer.from(meta.pin_hash, 'utf8'));

    if (!isValid) {
        return { success: false, error: 'PIN de acesso incorreto.' };
    }

    // Deriva chave efêmera de cofre via PBKDF2 (32 bytes para AES-256)
    const vaultKey = crypto.pbkdf2Sync(String(pin), meta.salt, 100000, 32, 'sha512');
    const sessionToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MS).toISOString();

    activeSession = {
        token: sessionToken,
        createdAt: new Date().toISOString(),
        expiresAt,
        coordinatorName: meta.coordinator_name || 'Coordenador Pedagógico',
        vaultKey
    };

    resetInactivityTimer();

    return {
        success: true,
        sessionToken,
        expiresAt,
        coordinatorName: activeSession.coordinatorName
    };
}

/**
 * Tranca imediatamente a sessão (manual ou timeout).
 * @param {string} reason 'manual' ou 'timeout'
 */
function lockSession(reason = 'manual') {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    if (activeSession && activeSession.vaultKey) {
        // Zera o buffer da chave em memória por segurança
        activeSession.vaultKey.fill(0);
    }

    activeSession = null;
    broadcastLockEvent(reason);

    return { success: true, locked: true, reason };
}

/**
 * Retorna true se a sessão da coordenação estiver ativa e válida.
 */
function isSessionActive() {
    if (!activeSession || !activeSession.vaultKey) {
        return false;
    }
    return true;
}

/**
 * Guarda Server-Side obrigatória: renova timer ou lança exceção de autorização.
 */
function assertCoordinatorAccess() {
    if (!isSessionActive()) {
        throw new Error('Acesso negado: sessão da coordenação bloqueada ou expirada.');
    }
    resetInactivityTimer();
}

/**
 * Retorna o status atual da sessão e da configuração.
 */
function getStatus() {
    const isSetup = isCoordinatorSetup();
    const isActive = isSessionActive();

    return {
        isSetup,
        isElevated: isActive,
        coordinatorName: activeSession?.coordinatorName || (readAuthMeta()?.coordinator_name || ''),
        expiresAt: activeSession?.expiresAt || null
    };
}

/**
 * Obtém a chave do cofre para descriptografia de dados internos (se ativa).
 */
function getActiveVaultKey() {
    assertCoordinatorAccess();
    return activeSession.vaultKey;
}

module.exports = {
    setEventBroadcaster,
    isCoordinatorSetup,
    setupCoordinatorPin,
    verifyAndElevate,
    lockSession,
    isSessionActive,
    assertCoordinatorAccess,
    getStatus,
    getActiveVaultKey
};
