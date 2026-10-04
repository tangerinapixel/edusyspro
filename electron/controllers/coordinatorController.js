/* eslint-env node */
/**
 * Controlador IPC Isolado: Painel da Coordenação Pedagógica
 * Expõe as rotas do barramento IPC para autenticação com elevação de privilégios,
 * consulta de Dossiê 360º de alunos, métricas globais e sincronização federada com Google Drive.
 * 
 * Regra Arquitetural: Todas as rotas de dados sensíveis exigem validação server-side
 * via coordinatorSessionManager.assertCoordinatorAccess().
 */

const { ipcMain } = require('electron');
const coordinatorSessionManager = require('../services/coordinatorSessionManager');
const coordinatorService = require('../services/coordinatorService');
const coordinatorDriveSync = require('../services/coordinatorDriveSync');
const coordinatorIdentityResolver = require('../services/coordinatorIdentityResolver');

function registerCoordinatorHandlers(getMainWindow) {
    // Configura o despachante de eventos para a janela do renderer (ex: auto-lock por inatividade)
    coordinatorSessionManager.setEventBroadcaster((channel, payload) => {
        try {
            const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
            if (win && !win.isDestroyed() && win.webContents) {
                win.webContents.send(channel, payload);
            }
        } catch (err) {
            console.warn('[CoordinatorController] Falha ao enviar evento IPC para renderer:', err.message);
        }
    });

    // 1. Obter Status da Sessão e Configuração (Livre de elevação para renderização condicional)
    ipcMain.handle('coordinator:getStatus', async () => {
        try {
            return {
                success: true,
                ...coordinatorSessionManager.getStatus()
            };
        } catch (err) {
            console.error('[CoordinatorController] Erro ao obter status:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 2. Configurar PIN inicial ou alterar PIN
    ipcMain.handle('coordinator:setupPin', async (_, { pin, coordinatorName }) => {
        try {
            return coordinatorSessionManager.setupCoordinatorPin(pin, coordinatorName);
        } catch (err) {
            console.error('[CoordinatorController] Erro ao configurar PIN:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 3. Autenticação e Elevação Contextual
    ipcMain.handle('coordinator:authenticate', async (_, { pin }) => {
        try {
            return coordinatorSessionManager.verifyAndElevate(pin);
        } catch (err) {
            console.error('[CoordinatorController] Erro na autenticação:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 4. Trancamento Imediato da Sessão (Manual)
    ipcMain.handle('coordinator:lockSession', async () => {
        try {
            return coordinatorSessionManager.lockSession('manual');
        } catch (err) {
            console.error('[CoordinatorController] Erro ao trancar sessão:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 5. Visão Geral da Escola (Dashboard Agregado) - Guarda Server-Side
    ipcMain.handle('coordinator:getSchoolOverview', async () => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            return coordinatorService.getSchoolOverview();
        } catch (err) {
            console.error('[CoordinatorController] Erro ao obter visão geral:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 6. Dossiê 360º de Aluno Específico - Guarda Server-Side
    ipcMain.handle('coordinator:getStudent360', async (_, { canonicalId }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            if (!canonicalId) throw new Error('ID canônico do estudante não informado.');
            return coordinatorService.getStudent360(canonicalId);
        } catch (err) {
            console.error('[CoordinatorController] Erro ao obter dossiê 360º:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 7. Listagem de Professores Ingeridos - Guarda Server-Side
    ipcMain.handle('coordinator:getTeachersList', async () => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            return { success: true, teachers: coordinatorService.listTeachers() };
        } catch (err) {
            console.error('[CoordinatorController] Erro ao listar professores:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 8. Obter Shard Detalhado de um Professor - Guarda Server-Side
    ipcMain.handle('coordinator:getTeacherShard', async (_, { teacherId }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            if (!teacherId) throw new Error('ID do professor não informado.');
            const shard = coordinatorService.getTeacherShard(teacherId);
            return { success: true, shard };
        } catch (err) {
            console.error('[CoordinatorController] Erro ao obter shard do professor:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 9. Remoção de Professor do Cofre - Guarda Server-Side
    ipcMain.handle('coordinator:removeTeacher', async (_, { teacherId }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            if (!teacherId) throw new Error('ID do professor não informado.');
            return coordinatorService.removeTeacher(teacherId);
        } catch (err) {
            console.error('[CoordinatorController] Erro ao remover professor:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 10. Sincronização Federada Multi-Docente no Google Drive - Guarda Server-Side
    ipcMain.handle('coordinator:syncDriveTeachers', async () => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            return await coordinatorDriveSync.syncAllTeachersFromDrive();
        } catch (err) {
            console.error('[CoordinatorController] Erro ao sincronizar professores do Drive:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 11. Ingestão de Snapshot Manual (Arquivo Local / Upload) - Guarda Server-Side
    ipcMain.handle('coordinator:ingestSnapshot', async (_, { rawData, metadata }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            return await coordinatorService.ingestTeacherSnapshot(rawData, metadata || { source: 'manual_import' });
        } catch (err) {
            console.error('[CoordinatorController] Erro ao ingerir snapshot manual:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 12. Resolução de Identidade Canônica de Estudante
    ipcMain.handle('coordinator:resolveStudent', async (_, { name, turma }) => {
        try {
            return {
                success: true,
                resolved: coordinatorIdentityResolver.resolveCanonicalStudent(name, turma)
            };
        } catch (err) {
            console.error('[CoordinatorController] Erro ao resolver identidade de estudante:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 13. Ingestão Direta do Docente Local (Deste Computador)
    ipcMain.handle('coordinator:ingestLocalTeacher', async () => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            const { dbPath } = require('../database');
            const fs = require('fs');
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: 'Arquivo school_data.json não encontrado neste computador.' };
            }
            const raw = fs.readFileSync(dbPath, 'utf8');
            return await coordinatorService.ingestTeacherSnapshot(raw, {
                source: 'local_computer',
                teacherName: 'Docente (Este Computador)',
                uploadedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('[CoordinatorController] Erro ao importar professor local:', err.message);
            return { success: false, error: err.message };
        }
    });

    // 14. Importar Arquivo de Backup JSON (Diálogo do Sistema)
    ipcMain.handle('coordinator:importBackupFile', async () => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();
            const { dialog } = require('electron');
            const fs = require('fs');
            const path = require('path');
            const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
            const result = await dialog.showOpenDialog(win, {
                title: 'Importar Backup do Docente (.json)',
                filters: [{ name: 'Backup EduSys (*.json)', extensions: ['json'] }],
                properties: ['openFile']
            });
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return { success: false, cancelled: true };
            }
            const filePath = result.filePaths[0];
            const raw = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath).replace('.json', '');
            return await coordinatorService.ingestTeacherSnapshot(raw, {
                source: 'imported_file',
                teacherName: fileName,
                filePath,
                uploadedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('[CoordinatorController] Erro ao importar arquivo:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerCoordinatorHandlers
};
