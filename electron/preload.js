/* eslint-env node */
const { contextBridge, ipcRenderer } = require('electron');

// Expondo uma API segura "window.electronAPI" para o React usar
contextBridge.exposeInMainWorld('electronAPI', {
    // Turmas
    getTurmas: () => ipcRenderer.invoke('db:getTurmas'),
    addTurma: (name, icon, weekly_schedule, params) => ipcRenderer.invoke('db:addTurma', name, icon, weekly_schedule, params),
    updateTurma: (id, name, icon, weekly_schedule) => ipcRenderer.invoke('db:updateTurma', id, name, icon, weekly_schedule),
    deleteTurma: (id) => ipcRenderer.invoke('db:deleteTurma', id),
    updateTurmaParams: (turmaId, params, unitId) => ipcRenderer.invoke('db:updateTurmaParams', turmaId, params, unitId),
    getTurmaUnitParams: (turmaId, unitId) => ipcRenderer.invoke('db:getTurmaUnitParams', turmaId, unitId),
    getAllTurmaUnitParams: () => ipcRenderer.invoke('db:getAllTurmaUnitParams'),

    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),
    getStudents: (turmaId) => ipcRenderer.invoke('db:getStudents', turmaId),
    addStudent: (name, turmaId) => ipcRenderer.invoke('db:addStudent', name, turmaId),
    removeStudent: (id) => ipcRenderer.invoke('db:removeStudent', id),
    addStudentsBulk: (names, turmaId) => ipcRenderer.invoke('db:addStudentsBulk', names, turmaId),
    getFinalGrades: () => ipcRenderer.invoke('db:getFinalGrades'),
    
    getOccurrences: (date) => ipcRenderer.invoke('db:getOccurrences', date),
    addOccurrence: (data) => ipcRenderer.invoke('db:addOccurrence', data),
    removeOccurrence: (id) => ipcRenderer.invoke('db:removeOccurrence', id),

    getOccurrenceTypes: () => ipcRenderer.invoke('db:getOccurrenceTypes'),
    addOccurrenceType: (title, penalty, color) => ipcRenderer.invoke('db:addOccurrenceType', title, penalty, color),
    updateOccurrenceType: (id, data) => ipcRenderer.invoke('db:updateOccurrenceType', id, data),
    deleteOccurrenceType: (id) => ipcRenderer.invoke('db:deleteOccurrenceType', id),

    getActivities: (unitId) => ipcRenderer.invoke('db:getActivities', unitId),
    toggleActivity: (stuId, date) => ipcRenderer.invoke('db:toggleActivity', stuId, date),
    getActivityTopics: (turmaId, unitId) => ipcRenderer.invoke('db:getActivityTopics', turmaId, unitId),
    saveActivityTopic: (date, topic, turmaId) => ipcRenderer.invoke('db:saveActivityTopic', date, topic, turmaId),
    deleteActivityDate: (date, turmaId) => ipcRenderer.invoke('db:deleteActivityDate', date, turmaId),
    updateActivityDate: (oldDate, newDate, turmaId) => ipcRenderer.invoke('db:updateActivityDate', oldDate, newDate, turmaId),

    getStudentComputedGrades: (turmaId, unitId) => ipcRenderer.invoke('db:getStudentComputedGrades', turmaId, unitId),
    getMiniTestes: () => ipcRenderer.invoke('db:getMiniTestes'),
    addMiniTeste: (stuId, name, score) => ipcRenderer.invoke('db:addMiniTeste', stuId, name, score),
    removeMiniTeste: (id) => ipcRenderer.invoke('db:removeMiniTeste', id),
    addEvaluationItem: (category, stuId, name, score) => ipcRenderer.invoke('db:addEvaluationItem', category, stuId, name, score),
    updateEvaluationItem: (category, id, name, score) => ipcRenderer.invoke('db:updateEvaluationItem', category, id, name, score),
    reorderEvaluationItems: (category, stuId, start, end) => ipcRenderer.invoke('db:reorderEvaluationItems', category, stuId, start, end),
    removeEvaluationItem: (category, id) => ipcRenderer.invoke('db:removeEvaluationItem', category, id),
    saveFinalGrade: (stuId, type, value) => ipcRenderer.invoke('db:saveFinalGrade', stuId, type, value),
    getMetadata: () => ipcRenderer.invoke('db:getMetadata'),
    importData: (data) => ipcRenderer.invoke('db:importData', data),

    // Agenda da Unidade
    getUnitAgenda: (turmaId, activeUnitId) => ipcRenderer.invoke('db:getUnitAgenda', turmaId, activeUnitId),
    addUnitAgendaItem: (turmaId, itemData) => ipcRenderer.invoke('db:addUnitAgendaItem', turmaId, itemData),
    updateUnitAgendaItem: (id, itemData) => ipcRenderer.invoke('db:updateUnitAgendaItem', id, itemData),
    deleteUnitAgendaItem: (id) => ipcRenderer.invoke('db:deleteUnitAgendaItem', id),
    toggleAgendaCorrection: (id) => ipcRenderer.invoke('db:toggleAgendaCorrection', id),

    // Unidades Escolares
    getUnits: () => ipcRenderer.invoke('db:getUnits'),
    advanceUnit: () => ipcRenderer.invoke('db:advanceUnit'),
    switchToUnit: (unitId) => ipcRenderer.invoke('db:switchToUnit', unitId),
    exportToDoc: (data, title) => ipcRenderer.invoke('google:exportToDoc', data, title),
    exportGradesPDF: (data) => ipcRenderer.invoke('pdf:exportGrades', data),
    exportStudentReportPDF: (data) => ipcRenderer.invoke('pdf:exportStudentReport', data),
    exportUnitAgendaPDF: (data) => ipcRenderer.invoke('pdf:exportUnitAgenda', data),
    exportLessonPlanPDF: (planData, title, unitLabel, professorName) => ipcRenderer.invoke('pdf:exportLessonPlan', { planData, planText: planData, title, unitLabel, professorName }),
    exportStudentActivitiesPDF: (planData, title, unitLabel, professorName, options) => ipcRenderer.invoke('pdf:exportStudentActivities', { planData, planText: planData, title, unitLabel, professorName, options }),
    exportStudentPendenciesPDF: (data) => ipcRenderer.invoke('pdf:exportStudentPendencies', data),
    exportStudentBehaviorPDF: (data) => ipcRenderer.invoke('pdf:exportStudentBehavior', data),

    // Cloud
    cloudLogin: () => ipcRenderer.invoke('cloud:login'),
    cloudIsAuthenticated: () => ipcRenderer.invoke('cloud:isAuthenticated'),
    cloudSync: () => ipcRenderer.invoke('cloud:sync'),
    cloudRestore: () => ipcRenderer.invoke('cloud:restore'),
    cloudGetCloudMetadata: () => ipcRenderer.invoke('cloud:getCloudMetadata'),
    cloudLogout: () => ipcRenderer.invoke('cloud:logout'),

    // Cloud Time Machine (Cofre Imutável)
    vaultListSnapshots: () => ipcRenderer.invoke('vault:listSnapshots'),
    vaultRestoreSnapshot: (fileId) => ipcRenderer.invoke('vault:restoreSnapshot', fileId),
    vaultGetMetrics: () => ipcRenderer.invoke('vault:getMetrics'),

    // AI
    generateLessonPlan: (params) => ipcRenderer.invoke('ai:generateLessonPlan', params),
    generateExamWithAI: (params) => ipcRenderer.invoke('ai:generateExam', params),
    generateStudentReport: (data) => ipcRenderer.invoke('ai:generateStudentReport', data),
    askAIChat: (data) => ipcRenderer.invoke('ai:chat', data),
    askAIChatStream: (data, onChunk) => {
        const handler = (_, chunk) => {
            if (typeof onChunk === 'function') onChunk(chunk);
        };
        ipcRenderer.on('ai:chatStreamChunk', handler);
        return ipcRenderer.invoke('ai:chatStream', data).finally(() => {
            ipcRenderer.removeListener('ai:chatStreamChunk', handler);
        });
    },

    // Acervo Pedagógico & Memória de Planos
    planArchiveSave: (plan) => ipcRenderer.invoke('planArchive:save', plan),
    planArchiveList: (filters) => ipcRenderer.invoke('planArchive:list', filters),
    planArchiveGetById: (id) => ipcRenderer.invoke('planArchive:getById', id),
    planArchiveDelete: (id) => ipcRenderer.invoke('planArchive:delete', id),
    planArchiveCompileSummary: (planIds) => ipcRenderer.invoke('planArchive:compileSummary', planIds),

    // Acervo & Histórico de Diagnósticos I.A.
    diagnosisArchiveSave: (data) => ipcRenderer.invoke('diagnosisArchive:save', data),
    diagnosisArchiveList: (filters) => ipcRenderer.invoke('diagnosisArchive:list', filters),
    diagnosisArchiveGetById: (id) => ipcRenderer.invoke('diagnosisArchive:getById', id),
    diagnosisArchiveDelete: (id) => ipcRenderer.invoke('diagnosisArchive:delete', id),

    // Autenticação
    authGetStatus: () => ipcRenderer.invoke('auth:getStatus'),
    authSetup: (data) => ipcRenderer.invoke('auth:setup', data),
    authLogin: (data) => ipcRenderer.invoke('auth:login', data),
    authResetPassword: (data) => ipcRenderer.invoke('auth:resetPassword', data),
    authDisable: (data) => ipcRenderer.invoke('auth:disable', data),
    authSave: (data) => ipcRenderer.invoke('auth:save', data),

    // OMR Engine
    omrProcess: (imgB64) => ipcRenderer.invoke('omr:process', imgB64),

    // Sistema de Licenciamento & Proteção
    licenseGetStatus: () => ipcRenderer.invoke('license:getStatus'),
    licenseGetMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    licenseActivate: (token) => ipcRenderer.invoke('license:activate', token),
    licenseRemove: () => ipcRenderer.invoke('license:remove'),
    licenseOpenSupport: (machineId) => ipcRenderer.invoke('license:openSupport', machineId),
    onLicenseStatus: (callback) => {
        const handler = (_, data) => {
            if (typeof callback === 'function') callback(data);
        };
        ipcRenderer.on('license:status', handler);
        return () => ipcRenderer.removeListener('license:status', handler);
    },

    // Atualização Automática (Auto-Updater)
    updaterGetStatus: () => ipcRenderer.invoke('updater:getStatus'),
    updaterCheck: () => ipcRenderer.invoke('updater:check'),
    updaterDownload: () => ipcRenderer.invoke('updater:download'),
    updaterInstall: () => ipcRenderer.invoke('updater:install'),
    onUpdaterStatus: (callback) => {
        const handler = (_, data) => {
            if (typeof callback === 'function') callback(data);
        };
        ipcRenderer.on('updater:status', handler);
        return () => ipcRenderer.removeListener('updater:status', handler);
    },

    // Coordenação Pedagógica (Cofre Federado & Inteligência Escolar)
    coordinatorGetStatus: () => ipcRenderer.invoke('coordinator:getStatus'),
    coordinatorSetupPin: (params) => ipcRenderer.invoke('coordinator:setupPin', params),
    coordinatorAuthenticate: (params) => ipcRenderer.invoke('coordinator:authenticate', params),
    coordinatorLockSession: () => ipcRenderer.invoke('coordinator:lockSession'),
    coordinatorGetSchoolOverview: () => ipcRenderer.invoke('coordinator:getSchoolOverview'),
    coordinatorGetStudent360: (params) => ipcRenderer.invoke('coordinator:getStudent360', params),
    coordinatorGetStudent360ByUnit: (params) => ipcRenderer.invoke('coordinator:getStudent360ByUnit', params),
    coordinatorExportStudentDossierPDF: (params) => ipcRenderer.invoke('coordinator:exportStudentDossierPDF', params),
    coordinatorGetTeachersList: () => ipcRenderer.invoke('coordinator:getTeachersList'),
    coordinatorGetTeacherShard: (params) => ipcRenderer.invoke('coordinator:getTeacherShard', params),
    coordinatorRemoveTeacher: (params) => ipcRenderer.invoke('coordinator:removeTeacher', params),
    coordinatorSyncDriveTeachers: () => ipcRenderer.invoke('coordinator:syncDriveTeachers'),
    coordinatorIngestSnapshot: (params) => ipcRenderer.invoke('coordinator:ingestSnapshot', params),
    coordinatorIngestLocalTeacher: () => ipcRenderer.invoke('coordinator:ingestLocalTeacher'),
    coordinatorImportBackupFile: () => ipcRenderer.invoke('coordinator:importBackupFile'),
    coordinatorResolveStudent: (params) => ipcRenderer.invoke('coordinator:resolveStudent', params),
    coordinatorGetSettings: () => ipcRenderer.invoke('coordinator:getSettings'),
    coordinatorUpdateProfile: (params) => ipcRenderer.invoke('coordinator:updateProfile', params),
    coordinatorChangePin: (params) => ipcRenderer.invoke('coordinator:changePin', params),
    coordinatorChangePinWithOldPin: (params) => ipcRenderer.invoke('coordinator:changePinWithOldPin', params),
    coordinatorRecoverPin: (params) => ipcRenderer.invoke('coordinator:recoverPin', params),
    coordinatorUpdatePreferences: (params) => ipcRenderer.invoke('coordinator:updatePreferences', params),
    coordinatorSwitchDriveAccount: () => ipcRenderer.invoke('coordinator:switchDriveAccount'),
    coordinatorDisconnectDrive: () => ipcRenderer.invoke('coordinator:disconnectDrive'),
    coordinatorRebuildVaultIndex: () => ipcRenderer.invoke('coordinator:rebuildVaultIndex'),
    onCoordinatorSessionLocked: (callback) => {
        const handler = (_, data) => {
            if (typeof callback === 'function') callback(data);
        };
        ipcRenderer.on('coordinator:sessionLocked', handler);
        return () => ipcRenderer.removeListener('coordinator:sessionLocked', handler);
    }
});

