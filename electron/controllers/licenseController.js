const { ipcMain, shell, BrowserWindow } = require('electron');
const {
    getMachineId,
    checkLicenseStatus,
    activateLicense,
    removeLicense
} = require('../services/licenseService');

let licenseSyncInterval = null;

function broadcastLicenseStatus() {
    try {
        const status = checkLicenseStatus();
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
            if (!win.isDestroyed()) {
                win.webContents.send('license:status', status);
            }
        }
        return status;
    } catch (err) {
        console.error('[LicenseController] Erro ao transmitir status da licença:', err.message);
        return null;
    }
}

function registerLicenseHandlers() {
    // 1. Consulta o status da licença atual e informações do plano
    ipcMain.handle('license:getStatus', async () => {
        try {
            return checkLicenseStatus();
        } catch (err) {
            console.error('[LicenseController] Erro em license:getStatus:', err.message);
            return {
                status: 'ERROR',
                isValid: false,
                canOperate: false,
                message: `Erro interno ao verificar licença: ${err.message}`,
                machineId: getMachineId(),
                claims: null,
                daysRemaining: 0
            };
        }
    });

    // 2. Obtém o Machine ID do computador
    ipcMain.handle('license:getMachineId', async () => {
        try {
            return getMachineId();
        } catch (err) {
            console.error('[LicenseController] Erro em license:getMachineId:', err.message);
            return 'EDUS-0000-0000-PRO1';
        }
    });

    // 3. Tenta ativar uma licença a partir do token informado pelo usuário
    ipcMain.handle('license:activate', async (_, token) => {
        try {
            const res = activateLicense(token);
            if (res.success) {
                broadcastLicenseStatus();
            }
            return res;
        } catch (err) {
            console.error('[LicenseController] Erro em license:activate:', err.message);
            return {
                success: false,
                message: `Falha na ativação: ${err.message}`
            };
        }
    });

    // 4. Remove a licença instalada (desativação manual)
    ipcMain.handle('license:remove', async () => {
        try {
            const res = removeLicense();
            if (res.success) {
                broadcastLicenseStatus();
            }
            return res;
        } catch (err) {
            console.error('[LicenseController] Erro em license:remove:', err.message);
            return {
                success: false,
                message: `Falha ao remover licença: ${err.message}`
            };
        }
    });

    // 5. Abre canal de suporte técnico com Machine ID pré-preenchido
    ipcMain.handle('license:openSupport', async (_, machineId) => {
        try {
            const mid = machineId || getMachineId();
            const text = encodeURIComponent(`Olá, suporte técnico EduSys Pro! Gostaria de solicitar/renovar a chave de ativação para a minha máquina (ID: ${mid}).`);
            // Link universal com número oficial de suporte técnico EduSys Pro (11 95831-0751)
            const supportPhone = '5511958310751';
            const supportUrl = `https://wa.me/${supportPhone}?text=${text}`;
            await shell.openExternal(supportUrl);
            return { success: true };
        } catch (err) {
            console.error('[LicenseController] Erro ao abrir suporte:', err.message);
            return { success: false, message: err.message };
        }
    });

    // 6. Monitoramento de fundo contínuo (Heartbeat a cada 30 minutos)
    // Garante que na virada da meia-noite o estado de dias restantes seja atualizado automaticamente
    if (!licenseSyncInterval) {
        licenseSyncInterval = setInterval(() => {
            broadcastLicenseStatus();
        }, 30 * 60 * 1000);
        if (typeof licenseSyncInterval.unref === 'function') {
            licenseSyncInterval.unref();
        }
    }
}

module.exports = {
    registerLicenseHandlers,
    broadcastLicenseStatus
};
