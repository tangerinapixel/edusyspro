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
        // Busca arquivos consolidados de backup, ignorando snapshots históricos do cofre
        const query = "mimeType = 'application/json' and (name = 'edusys_pro_backup.json' or name contains 'backup') and not name contains 'snapshot_' and trashed = false";
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, modifiedTime, shared, owners(displayName, emailAddress), size)',
            spaces: 'drive',
            pageSize: 1000
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

    const rawFiles = await discoverTeacherBackupFiles();
    if (!rawFiles || rawFiles.length === 0) {
        return {
            success: true,
            totalFound: 0,
            syncedCount: 0,
            results: [],
            message: 'Nenhum arquivo de backup do EduSys encontrado no Google Drive.'
        };
    }

    // Deduplicação Inteligente no Google Drive:
    // Agrupa backups pelo titular/proprietário e seleciona apenas a versão mais recente
    const filesByOwner = {};
    for (const f of rawFiles) {
        const ownerKey = f.owners?.[0]?.emailAddress || f.owners?.[0]?.displayName || f.name.replace(/\.(json|edusys)$/i, '');
        if (!filesByOwner[ownerKey]) {
            filesByOwner[ownerKey] = [];
        }
        filesByOwner[ownerKey].push(f);
    }

    const filesToProcess = [];
    const syncResults = [];

    Object.keys(filesByOwner).forEach(ownerKey => {
        const group = filesByOwner[ownerKey];
        // Ordena por modifiedTime descrescente (o mais novo primeiro)
        group.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        
        // O mais recente é mantido para processamento
        filesToProcess.push(group[0]);

        // Arquivos legados mais antigos do mesmo titular são descartados antes do download
        for (let i = 1; i < group.length; i++) {
            syncResults.push({
                fileId: group[i].id,
                fileName: group[i].name,
                owner: ownerKey,
                status: 'SKIPPED_LEGACY_OBSOLETE',
                message: `Arquivo legado anterior ignorado em prol da versão mais recente de ${new Date(group[0].modifiedTime).toLocaleDateString('pt-BR')}`
            });
        }
    });

    let syncedSuccess = 0;

    for (const file of filesToProcess) {
        try {
            const rawContent = await downloadDriveFile(file.id);
            const ownerName = file.owners?.[0]?.displayName || file.name.replace(/\.(json|edusys)$/i, '');

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
        totalFound: rawFiles.length,
        syncedCount: syncedSuccess,
        results: syncResults
    };
}

module.exports = {
    discoverTeacherBackupFiles,
    downloadDriveFile,
    syncAllTeachersFromDrive
};
