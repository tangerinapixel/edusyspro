/* eslint-env node */
/**
 * Controlador IPC Isolado: Acervo & Histórico de Diagnósticos
 * Expõe as rotas do barramento IPC para persistência, consulta e
 * exclusão do histórico de diagnósticos com IA sem sobrecarregar outros controladores.
 */

const { ipcMain } = require('electron');
const diagnosisArchiveService = require('../services/diagnosisArchiveService');

function registerDiagnosisArchiveHandlers() {
    // Salvar ou atualizar diagnóstico no acervo
    ipcMain.handle('diagnosisArchive:save', async (_, diagData) => {
        try {
            return await diagnosisArchiveService.saveDiagnosis(diagData);
        } catch (err) {
            console.error('[DiagnosisArchiveController] Erro ao salvar diagnóstico:', err);
            return { success: false, error: err.message };
        }
    });

    // Listar diagnósticos com filtros (turmaId, unitId, studentId, search)
    ipcMain.handle('diagnosisArchive:list', async (_, filters) => {
        try {
            return await diagnosisArchiveService.listDiagnoses(filters || {});
        } catch (err) {
            console.error('[DiagnosisArchiveController] Erro ao listar diagnósticos:', err);
            return { success: false, error: err.message, diagnoses: [], total: 0 };
        }
    });

    // Obter diagnóstico específico por ID
    ipcMain.handle('diagnosisArchive:getById', async (_, id) => {
        try {
            return await diagnosisArchiveService.getDiagnosisById(id);
        } catch (err) {
            console.error('[DiagnosisArchiveController] Erro ao obter diagnóstico por ID:', err);
            return { success: false, error: err.message };
        }
    });

    // Excluir diagnóstico do acervo
    ipcMain.handle('diagnosisArchive:delete', async (_, id) => {
        try {
            return await diagnosisArchiveService.deleteDiagnosis(id);
        } catch (err) {
            console.error('[DiagnosisArchiveController] Erro ao excluir diagnóstico:', err);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerDiagnosisArchiveHandlers
};
