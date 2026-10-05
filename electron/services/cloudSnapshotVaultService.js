/**
 * cloudSnapshotVaultService.js
 * 
 * Especialidade: Gerenciador de Snapshots Imutáveis (WORM - Write Once, Read Many)
 * 
 * Responsável por criar e catalogar snapshots permanentes no Google Drive em uma pasta
 * segura dedicada (/EduSys_Vault/Snapshots/). Mesmo que o ponteiro principal seja
 * alterado, os arquivos desta pasta nunca são sobrescritos, permitindo restauração
 * pontual através da interface "Máquina do Tempo" (Time Machine).
 */

class CloudSnapshotVaultService {
    static VAULT_FOLDER_NAME = 'EduSys_Vault';
    static SNAPSHOTS_FOLDER_NAME = 'Snapshots';

    /**
     * Localiza ou cria a hierarquia de pastas do cofre no Google Drive.
     * Retorna o ID da pasta Snapshots.
     */
    static async ensureVaultFolder(drive) {
        if (!drive) throw new Error('Cliente Google Drive não inicializado.');

        // 1. Buscar ou criar pasta raiz 'EduSys_Vault'
        let vaultFolderId = null;
        const vaultQuery = await drive.files.list({
            q: `name = '${this.VAULT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (vaultQuery.data.files && vaultQuery.data.files.length > 0) {
            vaultFolderId = vaultQuery.data.files[0].id;
        } else {
            const createdVault = await drive.files.create({
                requestBody: {
                    name: this.VAULT_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            vaultFolderId = createdVault.data.id;
        }

        // 2. Buscar ou criar subpasta 'Snapshots' dentro de 'EduSys_Vault'
        let snapshotsFolderId = null;
        const snapQuery = await drive.files.list({
            q: `name = '${this.SNAPSHOTS_FOLDER_NAME}' and '${vaultFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (snapQuery.data.files && snapQuery.data.files.length > 0) {
            snapshotsFolderId = snapQuery.data.files[0].id;
        } else {
            const createdSnapFolder = await drive.files.create({
                requestBody: {
                    name: this.SNAPSHOTS_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [vaultFolderId]
                },
                fields: 'id'
            });
            snapshotsFolderId = createdSnapFolder.data.id;
        }

        return snapshotsFolderId;
    }

    /**
     * Grava um novo snapshot imutável no cofre.
     */
    static async persistImmutableSnapshot(drive, envelopeData, metrics = {}, options = {}) {
        const folderId = await this.ensureVaultFolder(drive);

        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const version = envelopeData.app_version || '5.5.5';
        const bypassTag = (options.forceBypass || options.allowShrinkage) ? '_[ADMIN_BYPASS]' : '';
        const filename = `edusys_snapshot_${dateStr}_v${version}${bypassTag}.edusys`;

        const envelopeStr = typeof envelopeData === 'string' 
            ? envelopeData 
            : JSON.stringify(envelopeData, null, 2);

        const fileMetadata = {
            name: filename,
            parents: [folderId],
            mimeType: 'application/json',
            description: `Snapshot de Segurança EduSys Pro - ${now.toLocaleString('pt-BR')}`,
            appProperties: {
                _edusys_snapshot: 'true',
                app_version: version,
                hash: envelopeData.hash || '',
                students: String(metrics.totalStudents ?? metrics.students ?? 0),
                activities: String(metrics.totalActivities ?? metrics.activities ?? 0),
                evaluations: String(metrics.totalEvaluations ?? metrics.evaluations ?? 0),
                timestamp: now.toISOString(),
                admin_bypass: (options.forceBypass || options.allowShrinkage) ? 'true' : 'false'
            }
        };

        const media = {
            mimeType: 'application/json',
            body: envelopeStr
        };

        const res = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, createdTime, size, appProperties'
        });

        // Executa Pruning automático de snapshots obsoletos (política de retenção GFS)
        try {
            const allSnapshots = await this.listVaultSnapshots(drive);
            await this._pruneOldSnapshots(drive, allSnapshots);
        } catch (pruneErr) {
            console.warn('[Cloud Vault] Aviso ao executar pruning de retenção:', pruneErr.message);
        }

        return {
            success: true,
            snapshotId: res.data.id,
            filename: res.data.name,
            createdTime: res.data.createdTime
        };
    }

    /**
     * Política de Retenção GFS (Grandfather-Father-Son) para economia de cota no Google Drive.
     * Regras:
     * - Últimas 48h: manter TODOS os snapshots.
     * - De 48h a 30 dias: manter no máximo 1 snapshot por dia (o mais recente daquele dia).
     * - Acima de 30 dias: excluir.
     * Exceção de Segurança: Arquivos contendo a string "[PROTECTED]" no nome NUNCA são excluídos.
     */
    static async _pruneOldSnapshots(drive, snapshotList) {
        if (!drive || !Array.isArray(snapshotList) || snapshotList.length === 0) return;

        const now = Date.now();
        const MS_48_HOURS = 48 * 60 * 60 * 1000;
        const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

        // Ordena do mais recente para o mais antigo
        const sorted = [...snapshotList].sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

        const dailyRetentionMap = new Set();
        const filesToDelete = [];

        for (const snap of sorted) {
            // Exceção estrita de segurança: Arquivos marcados com [PROTECTED] são sagrados
            if (snap.name && snap.name.includes('[PROTECTED]')) {
                continue;
            }

            const snapTime = new Date(snap.createdTime).getTime();
            const ageMs = now - snapTime;

            // 1. Janela Recente: últimas 48h -> Preservar todos
            if (ageMs <= MS_48_HOURS) {
                continue;
            }

            // 2. Janela Intermediária: de 48h a 30 dias -> Manter 1 por dia
            if (ageMs > MS_48_HOURS && ageMs <= MS_30_DAYS) {
                const dayKey = new Date(snap.createdTime).toISOString().slice(0, 10);
                if (!dailyRetentionMap.has(dayKey)) {
                    // Primeiro snapshot encontrado deste dia (o mais recente daquele dia)
                    dailyRetentionMap.add(dayKey);
                    continue;
                } else {
                    // Já temos um snapshot guardado para este dia: marcar para descarte
                    filesToDelete.push(snap);
                }
            } else if (ageMs > MS_30_DAYS) {
                // 3. Janela Antiga: acima de 30 dias -> Descartar
                filesToDelete.push(snap);
            }
        }

        // Executa a exclusão dos arquivos identificados
        for (const file of filesToDelete) {
            try {
                await drive.files.delete({ fileId: file.id });
                console.log(`[Cloud Vault Pruning] Snapshot obsoleto expurgado: ${file.name} (ID: ${file.id})`);
            } catch (err) {
                console.warn(`[Cloud Vault Pruning] Falha ao expurgar snapshot ${file.id}:`, err.message);
            }
        }
    }

    /**
     * Lista todos os snapshots imutáveis disponíveis no cofre para a Máquina do Tempo.
     */
    static async listVaultSnapshots(drive) {
        const folderId = await this.ensureVaultFolder(drive);

        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            orderBy: 'createdTime desc',
            pageSize: 50,
            fields: 'files(id, name, createdTime, size, appProperties)'
        });

        const files = res.data.files || [];

        return files.map(file => {
            const props = file.appProperties || {};
            return {
                id: file.id,
                name: file.name,
                createdTime: file.createdTime,
                sizeBytes: parseInt(file.size || '0', 10),
                version: props.app_version || 'unknown',
                hash: props.hash || '',
                studentsCount: parseInt(props.students || '0', 10),
                activitiesCount: parseInt(props.activities || '0', 10),
                evaluationsCount: parseInt(props.evaluations || '0', 10)
            };
        });
    }

    /**
     * Faz download do conteúdo completo de um snapshot específico pelo ID.
     */
    static async retrieveSnapshotContent(drive, fileId) {
        if (!fileId) throw new Error('ID do snapshot não especificado.');

        const res = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return res.data;
    }

    /**
     * Auto-Healing de Race Condition:
     * Verifica e repara inconsistência caso a internet ou a aplicação tenha caído
     * logo após persistir um snapshot no cofre, mas ANTES de atualizar o ponteiro principal.
     * Se a pasta /Snapshots tiver um snapshot mais novo que o ponteiro, cura o ponteiro automaticamente.
     */
    static async verifyPointerConsistency(drive, pointerFilename = null) {
        if (!drive) return { consistent: true };

        try {
            const targetPointerName = pointerFilename || 'edusys_pro_backup.json';
            const snapshots = await this.listVaultSnapshots(drive);
            if (!snapshots || snapshots.length === 0) {
                return { consistent: true, message: 'Nenhum snapshot no cofre.' };
            }

            const latestSnap = snapshots[0];

            // Busca ponteiro principal atual
            const pointerRes = await drive.files.list({
                q: `name = '${targetPointerName}' and trashed = false`,
                fields: 'files(id, name, modifiedTime, createdTime)',
                spaces: 'drive'
            });

            const pointerFile = pointerRes.data.files && pointerRes.data.files[0];

            // Cenário A: Ponteiro inexistente, mas snapshot existe no cofre
            if (!pointerFile) {
                console.log(`[Auto-Healing] Ponteiro ${targetPointerName} não encontrado. Restaurando a partir do snapshot mais recente ${latestSnap.name}...`);
                const snapContent = await this.retrieveSnapshotContent(drive, latestSnap.id);
                const mediaBody = typeof snapContent === 'string' ? snapContent : JSON.stringify(snapContent, null, 2);

                await drive.files.create({
                    requestBody: {
                        name: targetPointerName,
                        mimeType: 'application/json'
                    },
                    media: {
                        mimeType: 'application/json',
                        body: mediaBody
                    }
                });

                console.log(`[Auto-Healing] Ponteiro ${targetPointerName} recriado com sucesso com base no snapshot órfão.`);
                return { consistent: false, healed: true, action: 'RECREATED_POINTER', snapshot: latestSnap };
            }

            // Cenário B: Ponteiro existe, verificar se o snapshot é mais recente
            const pointerTime = new Date(pointerFile.modifiedTime || pointerFile.createdTime).getTime();
            const snapTime = new Date(latestSnap.createdTime).getTime();

            // Tolerância de 5 segundos para compensar latência entre create e update
            if (snapTime > (pointerTime + 5000)) {
                console.warn(`[Auto-Healing] Inconsistência detectada! Snapshot ${latestSnap.name} (${latestSnap.createdTime}) é mais novo que o ponteiro ${targetPointerName} (${pointerFile.modifiedTime}). Reparando...`);

                const snapContent = await this.retrieveSnapshotContent(drive, latestSnap.id);
                const mediaBody = typeof snapContent === 'string' ? snapContent : JSON.stringify(snapContent, null, 2);

                await drive.files.update({
                    fileId: pointerFile.id,
                    media: {
                        mimeType: 'application/json',
                        body: mediaBody
                    }
                });

                console.log(`[Auto-Healing] Ponteiro ${targetPointerName} sincronizado com sucesso para o snapshot mais recente.`);
                return { consistent: false, healed: true, action: 'UPDATED_POINTER', snapshot: latestSnap };
            }

            return { consistent: true };
        } catch (healErr) {
            console.warn('[Auto-Healing] Falha não impeditiva na verificação de consistência:', healErr.message);
            return { consistent: true, error: healErr.message };
        }
    }
}

module.exports = CloudSnapshotVaultService;
