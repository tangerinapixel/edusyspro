/* eslint-env node */
/**
 * Controller IPC: Configurações da Gestão Escolar (Coordenação Pedagógica)
 * Registra canais para consulta de perfil, atualização de dados, troca de PIN,
 * preferências de timbrado institucional e alternância de conta Google Drive.
 */

const { ipcMain } = require('electron');
const settingsService = require('../services/coordinatorSettingsService');
const googleSync = require('../googleSync');
const { assertCoordinatorAccess } = require('../services/coordinatorSessionManager');

function registerCoordinatorSettingsHandlers(getMainWindow) {
    const getWin = () => (typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow);

    // 1. Obter configurações da coordenação
    ipcMain.handle('coordinator:getSettings', async () => {
        try {
            assertCoordinatorAccess();
            const res = settingsService.getSettings();
            
            // Adiciona status atualizado do Google Drive (resolução assíncrona blindada)
            let isDriveAuth = false;
            try {
                isDriveAuth = !!(await googleSync.isAuthenticated());
            } catch (_) {
                isDriveAuth = false;
            }

            return {
                ...res,
                settings: {
                    ...res.settings,
                    isDriveAuthenticated: isDriveAuth
                }
            };
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao carregar configurações:', err.message);
            return { success: false, error: err.message || 'Falha ao acessar configurações institucionais.' };
        }
    });

    // 2. Atualizar perfil (Nome e Avatar)
    ipcMain.handle('coordinator:updateProfile', async (_, { name, avatar }) => {
        try {
            assertCoordinatorAccess();
            return settingsService.updateProfile({ name, avatar });
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao atualizar perfil:', err.message);
            return { success: false, error: err.message || 'Falha ao atualizar perfil do gestor.' };
        }
    });

    // 3. Trocar PIN de acesso
    ipcMain.handle('coordinator:changePin', async (_, { currentPin, newPin }) => {
        try {
            assertCoordinatorAccess();
            return settingsService.changePin({ currentPin, newPin });
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao trocar PIN:', err.message);
            return { success: false, error: err.message || 'Falha ao alterar PIN de acesso.' };
        }
    });

    // 4. Atualizar preferências da instituição (Nome no cabeçalho do PDF, Slogan, etc.)
    ipcMain.handle('coordinator:updatePreferences', async (_, preferences) => {
        try {
            assertCoordinatorAccess();
            return settingsService.updatePreferences(preferences);
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao atualizar preferências:', err.message);
            return { success: false, error: err.message || 'Falha ao salvar preferências institucionais.' };
        }
    });

    // 5. Alternar / Reconectar conta Google Drive
    ipcMain.handle('coordinator:switchDriveAccount', async () => {
        try {
            assertCoordinatorAccess();
            const win = getWin();
            
            // Desconecta da conta antiga
            await googleSync.logout();

            // Inicia fluxo de autenticação com a nova conta
            const authRes = await googleSync.startAuth(win);
            if (authRes && authRes.cancelled) {
                return { success: false, cancelled: true };
            }

            if (authRes && authRes.success) {
                return {
                    success: true,
                    isDriveAuthenticated: true,
                    message: 'Nova conta Google Drive vinculada com sucesso!'
                };
            }

            return { success: false, error: 'Não foi possível concluir o login com a nova conta.' };
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao alternar conta Google Drive:', err.message);
            return { success: false, error: err.message || 'Erro durante a alternância de conta Google Drive.' };
        }
    });

    // 6. Desconectar conta do Google Drive
    ipcMain.handle('coordinator:disconnectDrive', async () => {
        try {
            assertCoordinatorAccess();
            await googleSync.logout();
            return { success: true, isDriveAuthenticated: false };
        } catch (err) {
            console.error('[CoordinatorSettingsController] Erro ao desconectar Google Drive:', err.message);
            return { success: false, error: err.message || 'Falha ao desconectar Google Drive.' };
        }
    });
}

module.exports = {
    registerCoordinatorSettingsHandlers
};
