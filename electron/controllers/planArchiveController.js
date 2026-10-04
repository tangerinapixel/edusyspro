/**
 * Controlador IPC Isolado: Acervo Pedagógico
 * Expõe as rotas do barramento IPC para persistência, consulta e
 * compilação curricular do acervo sem sobrecarregar outros controladores.
 */

const { ipcMain } = require('electron');
const planArchiveService = require('../services/planArchiveService');

function registerPlanArchiveHandlers() {
    // Salvar ou atualizar plano no acervo
    ipcMain.handle('planArchive:save', async (_, planData) => {
        try {
            return await planArchiveService.savePlan(planData);
        } catch (err) {
            console.error('[PlanArchiveController] Erro ao salvar plano:', err);
            return { success: false, error: err.message };
        }
    });

    // Listar planos com filtros
    ipcMain.handle('planArchive:list', async (_, filters) => {
        try {
            return await planArchiveService.listPlans(filters || {});
        } catch (err) {
            console.error('[PlanArchiveController] Erro ao listar planos:', err);
            return { success: false, error: err.message, plans: [] };
        }
    });

    // Obter plano específico por ID
    ipcMain.handle('planArchive:getById', async (_, planId) => {
        try {
            return await planArchiveService.getPlanById(planId);
        } catch (err) {
            console.error('[PlanArchiveController] Erro ao obter plano por ID:', err);
            return { success: false, error: err.message };
        }
    });

    // Excluir plano do acervo
    ipcMain.handle('planArchive:delete', async (_, planId) => {
        try {
            return await planArchiveService.deletePlan(planId);
        } catch (err) {
            console.error('[PlanArchiveController] Erro ao excluir plano:', err);
            return { success: false, error: err.message };
        }
    });

    // Compilar súmula de múltiplas semanas para a IA
    ipcMain.handle('planArchive:compileSummary', async (_, planIds) => {
        try {
            return await planArchiveService.compileCurricularSummary(planIds);
        } catch (err) {
            console.error('[PlanArchiveController] Erro ao compilar súmula curricular:', err);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerPlanArchiveHandlers
};
