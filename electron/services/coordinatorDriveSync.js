/* eslint-env node */
/**
 * Sincronizador Google Drive Multi-Docente
 * Responsável por descobrir, baixar e validar integridade de backups compartilhados
 * por professores no Google Drive, com bloqueio estrito de dados desatualizados (stale data).
 */

const { google } = require('googleapis');
const Store = require('electron-store');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../oauth_credentials');
const coordinatorService = require('./coordinatorService');
const sessionManager = require('./coordinatorSessionManager');

const store = new Store();
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const drive = google.drive({ version: 'v3', auth: oauth2Client });

function refreshClientCredentials() {
    const savedTokens = store.get('google_tokens');
    if (savedTokens) {
        oauth2Client.setCredentials(savedTokens);
        return true;
    }
    return false;
}

/**
 * Varre o Google Drive procurando backups de professores (próprios ou compartilhados).
 */
async function discoverTeacherBackupFiles() {
    if (!refreshClientCredentials()) {
        throw new Error('Nenhuma conta Google Drive conectada. Conecte sua conta em Configurações.');
    }

    try {
        // Busca arquivos que contenham 'edusys' no nome e extensão json, não descartados na lixeira
        const query = "mimeType = 'application/json' and (name contains 'edusys' or name contains 'backup') and trashed = false";
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, modifiedTime, shared, owners(displayName, emailAddress), size)',
            spaces: 'drive',
            pageSize: 50
        });

        return response.data.files || [];
    } catch (err) {
        console.error('[CoordinatorDriveSync] Erro ao listar backups no Google Drive:', err.message);
        throw new Error(`Falha ao consultar Google Drive: ${err.message}`);
    }
}

/**
 * Baixa o conteúdo de um arquivo de backup específico do Google Drive.
 */
async function downloadDriveFile(fileId) {
    if (!refreshClientCredentials()) {
        throw new Error('Conta Google Drive não autenticada.');
    }

    const response = await drive.files.get({
        fileId,
        alt: 'media'
    });

    return response.data;
}

/**
 * Sincroniza todos os backups de professores encontrados no Google Drive.
 */
async function syncAllTeachersFromDrive() {
    sessionManager.assertCoordinatorAccess();

    const files = await discoverTeacherBackupFiles();
    if (!files || files.length === 0) {
        return {
            success: true,
            totalFound: 0,
            syncedCount: 0,
            results: [],
            message: 'Nenhum arquivo de backup do EduSys encontrado no Google Drive.'
        };
    }

    const syncResults = [];
    let syncedSuccess = 0;

    for (const file of files) {
        try {
            const rawContent = await downloadDriveFile(file.id);
            const ownerName = file.owners?.[0]?.displayName || file.name.replace('.json', '');

            const ingestRes = await coordinatorService.ingestTeacherSnapshot(rawContent, {
                source: 'google_drive',
                driveFileId: file.id,
                uploadedAt: file.modifiedTime,
                teacherName: ownerName
            });

            if (ingestRes.success && ingestRes.status === 'INGESTED_OK') {
                syncedSuccess++;
            }

            syncResults.push({
                fileId: file.id,
                fileName: file.name,
                owner: ownerName,
                status: ingestRes.status,
                teacherId: ingestRes.teacherId,
                teacherName: ingestRes.teacherName
            });
        } catch (fileErr) {
            console.warn(`[CoordinatorDriveSync] Erro ao processar arquivo ${file.name} (${file.id}):`, fileErr.message);
            syncResults.push({
                fileId: file.id,
                fileName: file.name,
                status: 'ERROR',
                error: fileErr.message
            });
        }
    }

    return {
        success: true,
        totalFound: files.length,
        syncedCount: syncedSuccess,
        results: syncResults
    };
}

module.exports = {
    discoverTeacherBackupFiles,
    downloadDriveFile,
    syncAllTeachersFromDrive
};
