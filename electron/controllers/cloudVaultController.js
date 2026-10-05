const { ipcMain } = require('electron');
const cloud = require('../googleSync');
const { dbAPI } = require('../database');
const CloudSnapshotVaultService = require('../services/cloudSnapshotVaultService');
const CloudBackupGuardService = require('../services/cloudBackupGuardService');

/**
 * cloudVaultController.js
 * 
 * Especialidade: Controlador IPC da Máquina do Tempo de Backups (Cofre Imutável)
 * 
 * Expõe canais IPC para consulta, auditoria e restauração cirúrgica de snapshots
 * imutáveis armazenados no Google Drive, assegurando rollback local prévio.
 */

function registerCloudVaultHandlers() {
    // 1. Listar Snapshots do Cofre
    ipcMain.handle('vault:listSnapshots', async () => {
        try {
            const drive = cloud.getDriveClient();
            if (!drive) {
                return { success: false, error: 'Google Drive não inicializado ou não autenticado.' };
            }

            const isAuth = await cloud.isAuthenticated();
            if (!isAuth) {
                return { success: false, error: 'Sessão do Google Drive não conectada.' };
            }

            const snapshots = await CloudSnapshotVaultService.listVaultSnapshots(drive);
            return { success: true, snapshots };
        } catch (e) {
            console.error('[CloudVaultController] Erro ao listar snapshots:', e);
            return { success: false, error: e.message || String(e) };
        }
    });

    // 2. Restaurar Snapshot Específico da Máquina do Tempo
    ipcMain.handle('vault:restoreSnapshot', async (_, fileId) => {
        if (!fileId) {
            return { success: false, error: 'ID do snapshot não fornecido.' };
        }

        try {
            const drive = cloud.getDriveClient();
            if (!drive) {
                return { success: false, error: 'Google Drive não inicializado.' };
            }

            // ETAPA A: Snapshot Local Preventivo (Rollback de Emergência)
            console.log(`[CloudVault] Criando snapshot local preventivo antes do restore do ID ${fileId}...`);
            const localSnapshotRes = dbAPI.createLocalSnapshot();
            if (!localSnapshotRes.success) {
                return { 
                    success: false, 
                    error: `Não foi possível criar o snapshot preventivo local. Operação cancelada por segurança: ${localSnapshotRes.error}` 
                };
            }

            // ETAPA B: Download do Snapshot Imutável
            console.log(`[CloudVault] Baixando snapshot ${fileId} do Google Drive...`);
            const rawData = await CloudSnapshotVaultService.retrieveSnapshotContent(drive, fileId);

            let envelope;
            if (rawData && typeof rawData === 'object' && !Buffer.isBuffer(rawData)) {
                envelope = rawData;
            } else {
                try {
                    envelope = JSON.parse(typeof rawData === 'string' ? rawData : String(rawData));
                } catch (_) {
                    envelope = null;
                }
            }

            if (!envelope || !envelope.payload) {
                dbAPI.deleteSnapshot();
                return { success: false, error: 'O snapshot baixado não possui payload válido.' };
            }

            // ETAPA C: Verificação de Integridade Criptográfica
            if (envelope.hash) {
                const computedHash = CloudBackupGuardService.computeHash(envelope.payload);
                if (computedHash !== envelope.hash) {
                    dbAPI.deleteSnapshot();
                    return { 
                        success: false, 
                        error: 'Falha crítica de integridade: o hash SHA-256 do snapshot baixado não confere com o registrado na criação.' 
                    };
                }
            }

            // ETAPA D: Importação no Banco de Dados Local
            const importRes = dbAPI.importData(envelope.payload);
            if (!importRes.success) {
                console.warn('[CloudVault] Falha na importação. Executando rollback local...');
                dbAPI.restoreFromSnapshot();
                return { 
                    success: false, 
                    error: `Falha ao importar dados do snapshot: ${importRes.error}. O banco local foi restaurado ao estado anterior com sucesso.` 
                };
            }

            // ETAPA E: Sucesso - Limpar snapshot temporário
            dbAPI.deleteSnapshot();
            console.log('[CloudVault] Restauração do snapshot concluída com sucesso absoluto.');
            return { 
                success: true, 
                message: 'Snapshot restaurado com sucesso.',
                metrics: envelope.metrics || null
            };

        } catch (e) {
            console.error('[CloudVaultController] Erro na restauração do snapshot:', e);
            dbAPI.deleteSnapshot();
            return { success: false, error: e.message || String(e) };
        }
    });

    // 3. Obter Métricas de Integridade Comparativas
    ipcMain.handle('vault:getMetrics', async () => {
        try {
            const rawDb = dbAPI.getMemoryData ? dbAPI.getMemoryData() : null;
            const localMetrics = CloudBackupGuardService.extractMetrics(rawDb);
            return { success: true, localMetrics };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
}

module.exports = { registerCloudVaultHandlers };
