/* eslint-env node */
/**
 * Serviço de Configurações da Gestão Escolar (Coordenação Pedagógica)
 * Gerencia o perfil do gestor, avatar, preferências institucionais e troca segura de PIN.
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
const settingsFilePath = path.join(vaultBaseDir, 'settings.json');

function ensureVaultDir() {
    try {
        if (!fs.existsSync(vaultBaseDir)) {
            fs.mkdirSync(vaultBaseDir, { recursive: true });
        }
    } catch (e) {
        console.error('[CoordinatorSettingsService] Erro ao criar diretório do cofre:', e.message);
    }
}

function readAuthMeta() {
    try {
        ensureVaultDir();
        if (!fs.existsSync(authMetaFilePath)) return null;
        const raw = fs.readFileSync(authMetaFilePath, 'utf8');
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('[CoordinatorSettingsService] Erro ao ler auth_meta.json:', err.message);
        return null;
    }
}

function writeAuthMeta(data) {
    try {
        ensureVaultDir();
        fs.writeFileSync(authMetaFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[CoordinatorSettingsService] Erro ao salvar auth_meta.json:', err.message);
        return false;
    }
}

function readSettings() {
    try {
        ensureVaultDir();
        if (!fs.existsSync(settingsFilePath)) {
            return {
                avatar: null,
                school_name: 'SISTEMA DE ENSINO INTEGRADO',
                school_subtitle: 'Coordenação Pedagógica • Gestão Escolar 360º',
                session_timeout_minutes: 15,
                last_pin_change: null,
                created_at: new Date().toISOString()
            };
        }
        const raw = fs.readFileSync(settingsFilePath, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('[CoordinatorSettingsService] Erro ao ler settings.json:', err.message);
        return {};
    }
}

function writeSettings(data) {
    try {
        ensureVaultDir();
        fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[CoordinatorSettingsService] Erro ao salvar settings.json:', err.message);
        return false;
    }
}

function hashPin(pin, salt) {
    return crypto.pbkdf2Sync(String(pin), salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Obtém todas as configurações ativas da coordenação.
 */
function getSettings() {
    const auth = readAuthMeta() || {};
    const settings = readSettings();

    return {
        success: true,
        settings: {
            coordinatorName: auth.coordinator_name || 'Coordenador Pedagógico',
            avatar: settings.avatar || null,
            schoolName: settings.school_name || 'SISTEMA DE ENSINO INTEGRADO',
            schoolSubtitle: settings.school_subtitle || 'Coordenação Pedagógica • Gestão Escolar 360º',
            sessionTimeoutMinutes: Number(settings.session_timeout_minutes) || 15,
            configuredAt: auth.configured_at || null,
            lastPinChange: settings.last_pin_change || auth.configured_at || null
        }
    };
}

/**
 * Atualiza o perfil da coordenação (Nome e Avatar).
 */
function updateProfile({ name, avatar }) {
    if (!name || !name.trim()) {
        return { success: false, error: 'O nome do(a) coordenador(a) não pode ficar em branco.' };
    }

    const cleanName = String(name).trim();
    const auth = readAuthMeta() || {};
    auth.coordinator_name = cleanName;
    writeAuthMeta(auth);

    const settings = readSettings();
    if (avatar !== undefined) {
        settings.avatar = avatar; // Base64 data URL ou null
    }
    settings.updated_at = new Date().toISOString();
    writeSettings(settings);

    // Atualiza nome na sessão ativa do coordinatorSessionManager se existir
    try {
        const sessionManager = require('./coordinatorSessionManager');
        if (typeof sessionManager.updateActiveSessionName === 'function') {
            sessionManager.updateActiveSessionName(cleanName);
        }
    } catch (e) {
        // Ignora silenciosamente se o método opcional não existir
    }

    return {
        success: true,
        coordinatorName: cleanName,
        avatar: settings.avatar
    };
}

/**
 * Altera o PIN de acesso da Coordenação com validação do PIN atual.
 */
function changePin({ currentPin, newPin }) {
    if (!newPin || String(newPin).length < 4) {
        return { success: false, error: 'O novo PIN deve conter no mínimo 4 caracteres numéricos.' };
    }

    const auth = readAuthMeta();
    if (!auth || !auth.pin_hash || !auth.salt) {
        return { success: false, error: 'Cofre institucional não configurado previamente.' };
    }

    // 1. Valida o PIN atual via timingSafeEqual
    const calculatedCurrent = hashPin(currentPin, auth.salt);
    const isCurrentValid = crypto.timingSafeEqual(
        Buffer.from(calculatedCurrent, 'utf8'),
        Buffer.from(auth.pin_hash, 'utf8')
    );

    if (!isCurrentValid) {
        return { success: false, error: 'O PIN atual informado está incorreto.' };
    }

    // 2. Gera novo par Salt / Hash
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPin(newPin, newSalt);

    auth.salt = newSalt;
    auth.pin_hash = newHash;
    auth.last_pin_change = new Date().toISOString();
    writeAuthMeta(auth);

    // 3. Atualiza registro em settings
    const settings = readSettings();
    settings.last_pin_change = auth.last_pin_change;
    writeSettings(settings);

    console.log('[CoordinatorSettingsService] PIN da coordenação atualizado com sucesso.');
    return { success: true, message: 'PIN institucional alterado com sucesso.' };
}

/**
 * Atualiza preferências da escola (Nome no cabeçalho do PDF, Slogan e Tempo de Bloqueio).
 */
function updatePreferences({ schoolName, schoolSubtitle, sessionTimeoutMinutes }) {
    const settings = readSettings();

    if (schoolName !== undefined) {
        settings.school_name = String(schoolName).trim() || 'SISTEMA DE ENSINO INTEGRADO';
    }
    if (schoolSubtitle !== undefined) {
        settings.school_subtitle = String(schoolSubtitle).trim() || 'Coordenação Pedagógica • Gestão Escolar 360º';
    }
    if (sessionTimeoutMinutes !== undefined) {
        const timeout = Number(sessionTimeoutMinutes);
        settings.session_timeout_minutes = (!isNaN(timeout) && timeout >= 5 && timeout <= 120) ? timeout : 15;
    }

    settings.updated_at = new Date().toISOString();
    writeSettings(settings);

    return {
        success: true,
        preferences: {
            schoolName: settings.school_name,
            schoolSubtitle: settings.school_subtitle,
            sessionTimeoutMinutes: settings.session_timeout_minutes
        }
    };
}

module.exports = {
    getSettings,
    updateProfile,
    changePin,
    updatePreferences
};
