const { ipcMain } = require('electron');
const cloud = require('../googleSync');
const { dbAPI } = require('../database');

function registerCloudHandlers(getMainWindow) {
    const getWin = () => (typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow);

    ipcMain.handle('cloud:login', async () => {
        try {
            const mainWindow = getWin();
            const res = await cloud.startAuth(mainWindow);
            if (res && res.cancelled) return { success: false, cancelled: true };
            if (res && res.success) return { success: true };
            return { success: false, error: 'Resposta inesperada do servidor de autenticação.' };
        } catch (e) {
            return { success: false, error: e.message || String(e) };
        }
    });

    ipcMain.handle('cloud:isAuthenticated', () => cloud.isAuthenticated());

    ipcMain.handle('cloud:sync', async () => {
        try {
            const localData = dbAPI.getEncryptedData();
            return await cloud.uploadBackup(localData);
        } catch (e) {
            return { success: false, error: "Erro ao serializar banco local: " + e.message };
        }
    });

    ipcMain.handle('cloud:restore', async () => {
        // ─── ETAPA 1: Criar snapshot local ANTES de qualquer modificação ────────
        console.log('[Restore] Iniciando restore seguro. Criando snapshot local...');
        const snapshotRes = dbAPI.createLocalSnapshot();
        if (!snapshotRes.success) {
            console.error('[Restore] Abortado: não foi possível criar o snapshot de segurança.');
            return { success: false, error: `Não foi possível criar um ponto de segurança local antes do restore. Operação cancelada por segurança. Detalhe: ${snapshotRes.error}` };
        }

        // ─── ETAPA 2: Baixar backup da nuvem ────────────────────────────────────
        let downloadRes;
        try {
            downloadRes = await cloud.downloadBackup();
        } catch (e) {
            downloadRes = { success: false, error: e.message };
        }

        if (!downloadRes.success) {
            // Falha no download — banco local intocado, apenas remove snapshot desnecessário
            dbAPI.deleteSnapshot();
            return { success: false, error: downloadRes.error || 'Falha ao baixar o backup da nuvem.' };
        }

        // ─── ETAPA 3: Importar dados baixados ───────────────────────────────────
        const importRes = dbAPI.importData(downloadRes.data);

        if (!importRes.success) {
            // ─── ETAPA 3a: ROLLBACK AUTOMÁTICO ──────────────────────────────────
            console.warn('[Restore] Importação falhou. Executando rollback para o snapshot local...');
            const rollbackRes = dbAPI.restoreFromSnapshot();
            if (rollbackRes.success) {
                console.log('[Restore] Rollback concluído. Dados locais preservados.');
                return {
                    success: false,
                    error: `O arquivo de backup da nuvem parece estar corrompido ou incompatível. Seus dados locais foram preservados automaticamente. Detalhe: ${importRes.error || 'Dados inválidos'}`
                };
            } else {
                // Situação crítica: rollback também falhou (raro, mas deve ser reportado)
                console.error('[Restore] CRÍTICO: Rollback falhou! Verifique o arquivo .snapshot manualmente.');
                return {
                    success: false,
                    error: `ATENÇÃO: A importação falhou e o rollback automático também apresentou problema. Contate o suporte. Detalhe: ${rollbackRes.error}`
                };
            }
        }

        // ─── ETAPA 4: Sucesso — limpar snapshot e recarregar app ────────────────
        dbAPI.deleteSnapshot();
        console.log('[Restore] Restore concluído com sucesso. Recarregando aplicação...');
        const mainWindow = getWin();
        if (mainWindow) mainWindow.reload();
        return { success: true };
    });

    ipcMain.handle('cloud:getCloudMetadata', () => cloud.getCloudMetadata());
    ipcMain.handle('cloud:logout', () => cloud.logout());
    ipcMain.handle('google:exportToDoc', (_, data, title) => cloud.exportToDoc(data, title));
}

module.exports = {
    registerCloudHandlers
};
