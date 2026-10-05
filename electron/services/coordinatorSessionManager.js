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
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 3 * 60 * 1000; // 3 minutos

let activeSession = null;
let inactivityTimer = null;
let eventBroadcaster = null;

// Controle de Rate Limiting Anti-Brute Force em memória
let failedAttempts = 0;
let lockoutUntil = null;

function checkRateLimit() {
    if (lockoutUntil) {
        const now = Date.now();
        if (now < lockoutUntil) {
            const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
            return {
                blocked: true,
                remainingSeconds,
                error: `Acesso temporariamente bloqueado por excesso de tentativas. Aguarde ${remainingSeconds}s.`
            };
        }
        // Expirou o tempo de bloqueio: libera
        failedAttempts = 0;
        lockoutUntil = null;
    }
    return { blocked: false, remainingSeconds: 0 };
}

function recordFailedAttempt() {
    failedAttempts++;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_TIME_MS;
        const remainingSeconds = Math.ceil(LOCKOUT_TIME_MS / 1000);
        return {
            blocked: true,
            attemptsLeft: 0,
            remainingSeconds,
            error: `Limite de tentativas excedido. Cofre bloqueado temporariamente por ${remainingSeconds} segundos.`
        };
    }
    const attemptsLeft = MAX_FAILED_ATTEMPTS - failedAttempts;
    return {
        blocked: false,
        attemptsLeft,
        remainingSeconds: 0,
        error: `Credencial incorreta. Restam ${attemptsLeft} tentativa(s) antes do bloqueio temporário.`
    };
}

function resetRateLimit() {
    failedAttempts = 0;
    lockoutUntil = null;
}

/**
 * Gera uma chave mestre de recuperação de emergência (16 chars alfanuméricos em 4 blocos).
 */
function generateRecoveryKey() {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Hash da chave de recuperação com PBKDF2 (100.000 iterações com SHA-512).
 */
function hashRecoveryKey(key, salt) {
    const cleanKey = String(key || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.pbkdf2Sync(cleanKey, salt, 100000, 64, 'sha512').toString('hex');
}

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
 * Configuração Inicial do PIN da Coordenação (Blindada contra sobrescrita não autorizada).
 * Gera par de chaves e a Emergency Recovery Key para contingência offline.
 * @param {string} newPin Novo PIN (mínimo 4 caracteres)
 * @param {string} coordinatorName Nome do gestor
 * @param {object} options Opções avançadas ({ force: boolean } para ambiente de testes controlados)
 */
function setupCoordinatorPin(newPin, coordinatorName = '', { force = false } = {}) {
    if (isCoordinatorSetup() && !force) {
        throw new Error('O cofre institucional já foi configurado. Não é permitido criar novo PIN via setup inicial.');
    }

    const cleanPin = String(newPin || '').trim();
    if (cleanPin.length < 4) {
        throw new Error('O PIN da coordenação deve ter no mínimo 4 dígitos.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = hashPin(cleanPin, salt);

    const recoveryKey = generateRecoveryKey();
    const recoverySalt = crypto.randomBytes(16).toString('hex');
    const recoveryHash = hashRecoveryKey(recoveryKey, recoverySalt);

    const payload = {
        configured_at: new Date().toISOString(),
        coordinator_name: String(coordinatorName || '').trim(),
        salt,
        pin_hash: pinHash,
        recovery_salt: recoverySalt,
        recovery_hash: recoveryHash,
        version: '2.2'
    };

    writeAuthMeta(payload);
    resetRateLimit();

    return { 
        success: true, 
        recoveryKey,
        coordinatorName: payload.coordinator_name 
    };
}

/**
 * Altera o PIN exigindo obrigatoriamente a validação do PIN atual (Zero-Bypass).
 * Protegido contra brute force com timingSafeEqual.
 */
function changePinWithOldPin({ currentPin, newPin }) {
    const rateCheck = checkRateLimit();
    if (rateCheck.blocked) {
        return { success: false, ...rateCheck };
    }

    const cleanNewPin = String(newPin || '').trim();
    if (cleanNewPin.length < 4) {
        return { success: false, error: 'O novo PIN deve conter no mínimo 4 caracteres.' };
    }

    const auth = readAuthMeta();
    if (!auth || !auth.pin_hash || !auth.salt) {
        return { success: false, error: 'Cofre institucional não configurado previamente.' };
    }

    const calculatedCurrent = hashPin(String(currentPin || ''), auth.salt);
    const isCurrentValid = crypto.timingSafeEqual(
        Buffer.from(calculatedCurrent, 'utf8'),
        Buffer.from(auth.pin_hash, 'utf8')
    );

    if (!isCurrentValid) {
        const rate = recordFailedAttempt();
        return { 
            success: false, 
            error: rate.error, 
            blocked: rate.blocked, 
            remainingSeconds: rate.remainingSeconds,
            attemptsLeft: rate.attemptsLeft 
        };
    }

    resetRateLimit();

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPinHash = hashPin(cleanNewPin, newSalt);

    auth.salt = newSalt;
    auth.pin_hash = newPinHash;
    auth.last_pin_change = new Date().toISOString();

    writeAuthMeta(auth);

    return { 
        success: true, 
        message: 'PIN institucional alterado com sucesso.' 
    };
}

/**
 * Recuperação de Emergência via Recovery Key (Padrão Corporativo SaaS).
 * Redefine o PIN e rotaciona a própria Chave Mestre de Recuperação.
 */
function recoverPinWithKey({ recoveryKey, newPin }) {
    const rateCheck = checkRateLimit();
    if (rateCheck.blocked) {
        return { success: false, ...rateCheck };
    }

    const cleanNewPin = String(newPin || '').trim();
    if (cleanNewPin.length < 4) {
        return { success: false, error: 'O novo PIN deve conter no mínimo 4 dígitos.' };
    }

    const auth = readAuthMeta();
    if (!auth || !auth.pin_hash) {
        return { success: false, error: 'Cofre institucional não inicializado.' };
    }

    if (!auth.recovery_hash || !auth.recovery_salt) {
        return { 
            success: false, 
            error: 'Este cofre foi criado em versão anterior sem Chave de Recuperação registrada. Entre com seu PIN atual para renovar a segurança.' 
        };
    }

    const calculatedKeyHash = hashRecoveryKey(recoveryKey, auth.recovery_salt);
    const isKeyValid = crypto.timingSafeEqual(
        Buffer.from(calculatedKeyHash, 'utf8'),
        Buffer.from(auth.recovery_hash, 'utf8')
    );

    if (!isKeyValid) {
        const rate = recordFailedAttempt();
        return { 
            success: false, 
            error: rate.blocked ? rate.error : `Chave de emergência inválida. Restam ${rate.attemptsLeft} tentativa(s).`, 
            blocked: rate.blocked, 
            remainingSeconds: rate.remainingSeconds,
            attemptsLeft: rate.attemptsLeft 
        };
    }

    resetRateLimit();

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPinHash = hashPin(cleanNewPin, newSalt);

    const newRecoveryKey = generateRecoveryKey();
    const newRecoverySalt = crypto.randomBytes(16).toString('hex');
    const newRecoveryHash = hashRecoveryKey(newRecoveryKey, newRecoverySalt);

    auth.salt = newSalt;
    auth.pin_hash = newPinHash;
    auth.recovery_salt = newRecoverySalt;
    auth.recovery_hash = newRecoveryHash;
    auth.last_pin_change = new Date().toISOString();
    auth.recovered_at = new Date().toISOString();

    writeAuthMeta(auth);

    return { 
        success: true, 
        message: 'PIN redefinido com sucesso via Chave de Emergência.',
        newRecoveryKey
    };
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
 * Aplica proteção de Rate Limiting contra tentativas sucessivas de adivinhação.
 * @param {string} pin PIN digitado pelo usuário
 */
function verifyAndElevate(pin) {
    const rateCheck = checkRateLimit();
    if (rateCheck.blocked) {
        return { 
            success: false, 
            blocked: true, 
            remainingSeconds: rateCheck.remainingSeconds, 
            error: rateCheck.error 
        };
    }

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
        const rate = recordFailedAttempt();
        return { 
            success: false, 
            error: rate.error, 
            blocked: rate.blocked, 
            remainingSeconds: rate.remainingSeconds,
            attemptsLeft: rate.attemptsLeft 
        };
    }

    resetRateLimit();

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
    const rateCheck = checkRateLimit();

    return {
        isSetup,
        isElevated: isActive,
        coordinatorName: activeSession?.coordinatorName || (readAuthMeta()?.coordinator_name || ''),
        expiresAt: activeSession?.expiresAt || null,
        rateLimit: {
            blocked: rateCheck.blocked,
            remainingSeconds: rateCheck.remainingSeconds,
            failedAttempts
        }
    };
}

/**
 * Obtém a chave do cofre para descriptografia de dados internos (se ativa).
 */
function getActiveVaultKey() {
    assertCoordinatorAccess();
    return activeSession.vaultKey;
}

/**
 * Atualiza o nome do coordenador na sessão ativa em memória.
 */
function updateActiveSessionName(newName) {
    if (activeSession && newName) {
        activeSession.coordinatorName = String(newName).trim();
    }
}

module.exports = {
    setEventBroadcaster,
    isCoordinatorSetup,
    setupCoordinatorPin,
    changePinWithOldPin,
    recoverPinWithKey,
    verifyAndElevate,
    lockSession,
    isSessionActive,
    assertCoordinatorAccess,
    getStatus,
    getActiveVaultKey,
    updateActiveSessionName,
    checkRateLimit,
    resetRateLimit
};
