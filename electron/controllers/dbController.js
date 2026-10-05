const { ipcMain } = require('electron');
const { dbAPI } = require('../database');
const { setupAutoBackup } = require('../services/backupService');
const { processOMR } = require('../omr/omrEngine');

function registerDbHandlers() {
    // Turmas
    ipcMain.handle('db:getTurmas', () => dbAPI.getTurmas());
    ipcMain.handle('db:addTurma', (_, name, icon, weekly_schedule, customParams) => dbAPI.addTurma(name, icon, weekly_schedule, customParams));
    ipcMain.handle('db:updateTurma', (_, id, name, icon, weekly_schedule) => dbAPI.updateTurma(id, name, icon, weekly_schedule));
    ipcMain.handle('db:deleteTurma', (_, id) => dbAPI.deleteTurma(id));
    ipcMain.handle('db:updateTurmaParams', (_, turmaId, params, unitId) => dbAPI.updateTurmaParams(turmaId, params, unitId));
    ipcMain.handle('db:getTurmaUnitParams', (_, turmaId, unitId) => dbAPI.getTurmaUnitParams(turmaId, unitId));
    ipcMain.handle('db:getAllTurmaUnitParams', () => dbAPI.getAllTurmaUnitParams());

    // Registra os canais de comunicação (IPC) para o React chamar as funções do SQLite
    ipcMain.handle('db:getSettings', () => dbAPI.getSettings());
    ipcMain.handle('db:saveSettings', (_, settings) => {
        const res = dbAPI.saveSettings(settings);
        setupAutoBackup();
        return res;
    });
    ipcMain.handle('db:getStudents', (_, turmaId) => dbAPI.getStudents(turmaId));
    ipcMain.handle('db:addStudent', (_, name, turmaId) => dbAPI.addStudent(name, turmaId));
    ipcMain.handle('db:removeStudent', (_, id) => dbAPI.removeStudent(id));
    ipcMain.handle('db:addStudentsBulk', (_, names, turmaId) => dbAPI.addStudentsBulk(names, turmaId));
    ipcMain.handle('db:getFinalGrades', () => dbAPI.getFinalGrades());
    
    // Rotas do Registro Diário
    ipcMain.handle('db:getOccurrences', (_, date) => dbAPI.getOccurrences(date));
    ipcMain.handle('db:addOccurrence', (_, data) => dbAPI.addOccurrence(data));
    ipcMain.handle('db:removeOccurrence', (_, id) => dbAPI.removeOccurrence(id));

    // Tipos de Ocorrência
    ipcMain.handle('db:getOccurrenceTypes', () => dbAPI.getOccurrenceTypes());
    ipcMain.handle('db:addOccurrenceType', (_, title, penalty, color) => dbAPI.addOccurrenceType(title, penalty, color));
    ipcMain.handle('db:updateOccurrenceType', (_, id, data) => dbAPI.updateOccurrenceType(id, data));
    ipcMain.handle('db:deleteOccurrenceType', (_, id) => dbAPI.deleteOccurrenceType(id));

    // Atividades
    ipcMain.handle('db:getActivities', (_, unitId) => dbAPI.getActivities(unitId));
    ipcMain.handle('db:toggleActivity', (_, stuId, date) => dbAPI.toggleActivity(stuId, date));
    ipcMain.handle('db:getActivityTopics', (_, turmaId, unitId) => dbAPI.getActivityTopics(turmaId, unitId));
    ipcMain.handle('db:saveActivityTopic', (_, date, topic, turmaId) => dbAPI.saveActivityTopic(date, topic, turmaId));
    ipcMain.handle('db:deleteActivityDate', (_, date, turmaId) => dbAPI.deleteActivityDate(date, turmaId));
    ipcMain.handle('db:updateActivityDate', (_, oldDate, newDate, turmaId) => dbAPI.updateActivityDate(oldDate, newDate, turmaId));

    // Notas e Motor Matemático
    ipcMain.handle('db:getStudentComputedGrades', (_, turmaId, unitId) => dbAPI.getStudentComputedGrades(turmaId, unitId));
    ipcMain.handle('db:getMiniTestes', () => dbAPI.getMiniTestes());
    ipcMain.handle('db:addMiniTeste', (_, stuId, name, score) => dbAPI.addMiniTeste(stuId, name, score));
    ipcMain.handle('db:removeMiniTeste', (_, id) => dbAPI.removeMiniTeste(id));
    
    // Novas rotas de avaliação múltipla
    ipcMain.handle('db:addEvaluationItem', (_, category, stuId, name, score) => dbAPI.addEvaluationItem(category, stuId, name, score));
    ipcMain.handle('db:updateEvaluationItem', (_, category, id, name, score) => dbAPI.updateEvaluationItem(category, id, name, score));
    ipcMain.handle('db:reorderEvaluationItems', (_, category, stuId, start, end) => dbAPI.reorderEvaluationItems(category, stuId, start, end));
    ipcMain.handle('db:removeEvaluationItem', (_, category, id) => dbAPI.removeEvaluationItem(category, id));
    ipcMain.handle('db:getMetadata', () => dbAPI.getMetadata());
    ipcMain.handle('db:importData', (_, data) => dbAPI.importData(data));

    // Agenda da Unidade
    ipcMain.handle('db:getUnitAgenda', (_, turmaId, activeUnitId) => dbAPI.getUnitAgenda(turmaId, activeUnitId));
    ipcMain.handle('db:addUnitAgendaItem', (_, turmaId, itemData) => dbAPI.addUnitAgendaItem(turmaId, itemData));
    ipcMain.handle('db:updateUnitAgendaItem', (_, id, itemData) => dbAPI.updateUnitAgendaItem(id, itemData));
    ipcMain.handle('db:deleteUnitAgendaItem', (_, id) => dbAPI.deleteUnitAgendaItem(id));
    ipcMain.handle('db:toggleAgendaCorrection', (_, id) => dbAPI.toggleAgendaCorrection(id));

    // OMR Engine
    ipcMain.handle('omr:process', async (_, base64Image) => {
        return await processOMR(base64Image);
    });

    // Unidades Escolares
    ipcMain.handle('db:getUnits', () => dbAPI.getUnits());
    ipcMain.handle('db:advanceUnit', () => dbAPI.advanceUnit());
    ipcMain.handle('db:switchToUnit', (_, unitId) => dbAPI.switchToUnit(unitId));
}

module.exports = {
    registerDbHandlers
};
