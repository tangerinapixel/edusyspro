const { ipcMain } = require('electron');
const { dbAPI } = require('../database');
const { hashPassword, verifyPassword, generateRecoveryKey } = require('../services/authService');

function registerAuthHandlers() {
    ipcMain.handle('auth:getStatus', () => {
        const auth = dbAPI.getAuth();
        if (!auth.is_enabled) return { status: 'needs_setup', user_name: auth.user_name };
        return { status: 'unauthenticated', user_name: auth.user_name };
    });

    ipcMain.handle('auth:setup', (_, { password, user_name }) => {
        const recoveryKey = generateRecoveryKey();
        const pHash = hashPassword(password);
        dbAPI.saveAuth({
            is_enabled: true,
            user_name: user_name,
            password_hash: pHash,
            recovery_key: recoveryKey
        });
        return { success: true, recoveryKey };
    });

    ipcMain.handle('auth:save', (_, data) => dbAPI.saveAuth(data));

    ipcMain.handle('auth:login', (_, { password }) => {
        const auth = dbAPI.getAuth();
        if (!auth.is_enabled) return { success: true }; // Se desativado, loga direto
        
        if (verifyPassword(password, auth.password_hash)) {
            return { success: true };
        }
        return { success: false, error: 'Senha incorreta.' };
    });

    ipcMain.handle('auth:resetPassword', (_, { recoveryKey, newPassword }) => {
        const auth = dbAPI.getAuth();
        const keyClean = String(recoveryKey || '').trim().toUpperCase();
        if (auth.recovery_key && auth.recovery_key === keyClean) {
            if (typeof newPassword !== 'string') {
                return { success: false, error: 'Nova senha inválida.' };
            }
            const pHash = hashPassword(newPassword);
            dbAPI.saveAuth({ password_hash: pHash });
            return { success: true };
        }
        return { success: false, error: 'Chave de recuperação inválida.' };
    });

    ipcMain.handle('auth:disable', (_, { password }) => {
        const auth = dbAPI.getAuth();
        if (verifyPassword(password, auth.password_hash)) {
            dbAPI.saveAuth({ is_enabled: false, password_hash: null, recovery_key: null });
            return { success: true };
        }
        return { success: false, error: 'Senha incorreta para desativar.' };
    });
}

module.exports = {
    registerAuthHandlers
};
