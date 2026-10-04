const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

// Configurações do AutoUpdater (Consentimento e Respeito à Franquia de Dados)
autoUpdater.autoDownload = false; // Não baixa 100 MB em silêncio: aguarda autorização do professor
autoUpdater.autoInstallOnAppQuit = false; // Não instala sozinho ao fechar se o professor adiou
autoUpdater.allowPrerelease = false;

let updaterStatus = {
    state: 'IDLE', // 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR'
    version: app.getVersion(),
    currentVersion: app.getVersion(),
    newVersion: null,
    releaseName: null,
    releaseNotes: null,
    releaseDate: null,
    progress: 0,
    error: null
};

function notifyRenderer(getMainWindow, channel, data) {
    try {
        const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
    } catch (e) {
        // Ignora erro se janela fechada
    }
}

function initAutoUpdater(getMainWindow) {
    // 1. Checando por atualizações
    autoUpdater.on('checking-for-update', () => {
        updaterStatus.state = 'CHECKING';
        updaterStatus.error = null;
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // 2. Atualização disponível
    autoUpdater.on('update-available', (info) => {
        updaterStatus.state = 'AVAILABLE';
        updaterStatus.newVersion = info.version;
        updaterStatus.releaseName = info.releaseName || `Versão ${info.version}`;
        updaterStatus.releaseNotes = typeof info.releaseNotes === 'string'
            ? info.releaseNotes
            : (Array.isArray(info.releaseNotes) ? info.releaseNotes.map(n => n.note).join('\n') : null);
        updaterStatus.releaseDate = info.releaseDate;
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // 3. Nenhuma atualização disponível (versão mais recente já instalada)
    autoUpdater.on('update-not-available', () => {
        updaterStatus.state = 'IDLE';
        updaterStatus.error = null;
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // 4. Progresso do download em segundo plano
    autoUpdater.on('download-progress', (progressObj) => {
        updaterStatus.state = 'DOWNLOADING';
        updaterStatus.progress = Math.round(progressObj.percent || 0);
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // 5. Download concluído com sucesso
    autoUpdater.on('update-downloaded', (info) => {
        updaterStatus.state = 'DOWNLOADED';
        updaterStatus.newVersion = info.version;
        updaterStatus.releaseName = info.releaseName || `Versão ${info.version}`;
        updaterStatus.releaseNotes = typeof info.releaseNotes === 'string'
            ? info.releaseNotes
            : (Array.isArray(info.releaseNotes) ? info.releaseNotes.map(n => n.note).join('\n') : null);
        updaterStatus.releaseDate = info.releaseDate;
        updaterStatus.progress = 100;
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // 6. Tratamento de erro defensivo
    autoUpdater.on('error', (err) => {
        updaterStatus.state = 'ERROR';
        updaterStatus.error = err ? err.message : 'Erro ao verificar atualizações';
        notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
    });

    // Registra os canais IPC para o frontend
    ipcMain.handle('updater:getStatus', async () => {
        return {
            ...updaterStatus,
            currentVersion: app.getVersion()
        };
    });

    ipcMain.handle('updater:check', async () => {
        if (!app.isPackaged) {
            return {
                success: true,
                message: 'Modo de Desenvolvimento: verificação simulada. O auto-update roda em builds de produção.'
            };
        }
        try {
            const result = await autoUpdater.checkForUpdates();
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('updater:download', async () => {
        try {
            updaterStatus.state = 'DOWNLOADING';
            updaterStatus.progress = 0;
            notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
            await autoUpdater.downloadUpdate();
            return { success: true };
        } catch (err) {
            updaterStatus.state = 'ERROR';
            updaterStatus.error = err ? err.message : 'Erro ao baixar atualização';
            notifyRenderer(getMainWindow, 'updater:status', updaterStatus);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('updater:install', async () => {
        try {
            autoUpdater.quitAndInstall(false, true);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Se estiver empacotado em produção, checa silenciosamente após 3.5 segundos do boot
    if (app.isPackaged) {
        setTimeout(() => {
            try {
                autoUpdater.checkForUpdates().catch(e => {
                    console.log('[AutoUpdater] Verificação em background:', e.message);
                });
            } catch (err) {
                // Silencioso
            }
        }, 3500);
    }
}

module.exports = {
    initAutoUpdater,
    getUpdaterStatus: () => updaterStatus
};
