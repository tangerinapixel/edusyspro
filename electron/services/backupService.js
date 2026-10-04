const { dbAPI } = require('../database');
const cloud = require('../googleSync');

let autoBackupIntervalId = null;

function setupAutoBackup() {
    if (autoBackupIntervalId) {
        clearInterval(autoBackupIntervalId);
        autoBackupIntervalId = null;
    }
    
    const settings = dbAPI.getSettings();
    if (settings && settings.auto_backup_enabled && settings.auto_backup_interval) {
        const ms = settings.auto_backup_interval * 60 * 1000;
        console.log(`[AutoBackup] Iniciando backup automático a cada ${settings.auto_backup_interval} min.`);
        autoBackupIntervalId = setInterval(async () => {
            try {
                const isAuth = await cloud.isAuthenticated();
                if (isAuth) {
                    console.log(`[AutoBackup] Verificando versão na nuvem...`);
                    const cloudMeta = await cloud.getCloudMetadata();
                    const localMeta = dbAPI.getMetadata();
                    const localTime = new Date(localMeta.last_updated).getTime();
                    
                    if (cloudMeta && cloudMeta.modifiedDrive) {
                        const cloudTime = new Date(cloudMeta.modifiedDrive).getTime();
                        if (cloudTime > localTime) {
                            console.log(`[AutoBackup] BLOQUEADO: A nuvem possui dados mais recentes que o PC atual. Restaure primeiro.`);
                            return;
                        }
                    }

                    console.log(`[AutoBackup] Executando upload em segundo plano...`);
                    const localData = dbAPI.getEncryptedData();
                    await cloud.uploadBackup(localData);
                    console.log(`[AutoBackup] Upload concluído.`);
                }
            } catch (e) {
                console.error("[AutoBackup] Falha:", e);
            }
        }, ms);
    } else {
        console.log(`[AutoBackup] Desativado.`);
    }
}

module.exports = {
    setupAutoBackup
};
