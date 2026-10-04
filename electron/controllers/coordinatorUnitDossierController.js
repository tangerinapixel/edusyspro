/* eslint-env node */
/**
 * Controlador IPC Dedicado: Dossiê 360º Segmentado por Unidade
 * Expõe as rotas do barramento IPC para consulta granular de estudantes
 * por unidade letiva ('ALL', 1, 2, 3, 4) protegidas por sessão da coordenação.
 */

const { ipcMain } = require('electron');
const coordinatorSessionManager = require('../services/coordinatorSessionManager');
const coordinatorUnitDossierService = require('../services/coordinatorUnitDossierService');

function registerCoordinatorUnitDossierHandlers() {
    // 1. Obter Dossiê 360º do Estudante Segmentado por Unidade
    ipcMain.handle('coordinator:getStudent360ByUnit', async (_, { canonicalId, unitId }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();

            if (!canonicalId) {
                throw new Error('ID canônico do estudante não informado.');
            }

            const targetUnit = unitId !== undefined && unitId !== null ? unitId : 'ALL';
            return coordinatorUnitDossierService.getStudent360ByUnit(canonicalId, targetUnit);
        } catch (err) {
            console.error('[CoordinatorUnitDossierController] Erro ao obter dossiê por unidade:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerCoordinatorUnitDossierHandlers
};
