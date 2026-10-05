const assert = require('assert');

// Importa os serviços modificados
const CloudSnapshotVaultService = require('../electron/services/cloudSnapshotVaultService');
const CloudBackupGuardService = require('../electron/services/cloudBackupGuardService');
const CloudEnvironmentGuard = require('../electron/services/cloudEnvironmentGuard');

console.log('==================================================================');
console.log('TESTES CIRÚRGICOS DE MITIGAÇÃO DOS 4 RISCOS DE SEGURANÇA SAAS');
console.log('==================================================================\n');

async function testTask1RetentionPruning() {
    console.log('[TAREFA 1] Testando Política de Retenção GFS & Exceção [PROTECTED]...');
    const deletedFiles = [];
    const mockDrive = {
        files: {
            delete: async ({ fileId }) => {
                deletedFiles.push(fileId);
                return { success: true };
            }
        }
    };

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const mockSnapshots = [
        // Últimas 48h (todos devem ser mantidos)
        { id: 'snap_1h', name: 'snapshot_1h.edusys', createdTime: new Date(now - 1 * HOUR).toISOString() },
        { id: 'snap_12h', name: 'snapshot_12h.edusys', createdTime: new Date(now - 12 * HOUR).toISOString() },
        { id: 'snap_36h', name: 'snapshot_36h.edusys', createdTime: new Date(now - 36 * HOUR).toISOString() },

        // Dia 5 dias atrás (deve manter 1 e deletar os outros 2 do mesmo dia)
        { id: 'snap_d5_1', name: 'snapshot_d5_1.edusys', createdTime: new Date(now - 5 * DAY - 1 * HOUR).toISOString() },
        { id: 'snap_d5_2', name: 'snapshot_d5_2.edusys', createdTime: new Date(now - 5 * DAY - 4 * HOUR).toISOString() },
        { id: 'snap_d5_3', name: 'snapshot_d5_3.edusys', createdTime: new Date(now - 5 * DAY - 8 * HOUR).toISOString() },

        // Mais de 30 dias (devem ser excluídos)
        { id: 'snap_old_40d', name: 'snapshot_40d.edusys', createdTime: new Date(now - 40 * DAY).toISOString() },

        // Mais de 30 dias MAS com [PROTECTED] no nome (NUNCA DEVE SER EXCLUÍDO)
        { id: 'snap_protected', name: 'snapshot_50d_[PROTECTED].edusys', createdTime: new Date(now - 50 * DAY).toISOString() }
    ];

    await CloudSnapshotVaultService._pruneOldSnapshots(mockDrive, mockSnapshots);

    console.log(`    -> Arquivos excluídos pelo pruning: [${deletedFiles.join(', ')}]`);

    // Validações
    assert(!deletedFiles.includes('snap_1h'), 'snap_1h não deve ser deletado (janela 48h)');
    assert(!deletedFiles.includes('snap_12h'), 'snap_12h não deve ser deletado (janela 48h)');
    assert(!deletedFiles.includes('snap_36h'), 'snap_36h não deve ser deletado (janela 48h)');

    // No dia 5, o mais recente (snap_d5_1) é mantido, os outros 2 descartados
    assert(!deletedFiles.includes('snap_d5_1'), 'snap_d5_1 deve ser mantido (1 por dia)');
    assert(deletedFiles.includes('snap_d5_2'), 'snap_d5_2 deve ser deletado (duplicata diária)');
    assert(deletedFiles.includes('snap_d5_3'), 'snap_d5_3 deve ser deletado (duplicata diária)');

    // Arquivo antigo > 30 dias
    assert(deletedFiles.includes('snap_old_40d'), 'snap_old_40d deve ser deletado (>30 dias)');

    // Arquivo protegido NUNCA pode ser deletado
    assert(!deletedFiles.includes('snap_protected'), 'snap_protected JAMAIS pode ser excluído!');

    console.log('    ✓ Política GFS e proteção [PROTECTED] 100% validadas.\n');
}

async function testTask2BypassAndTracking() {
    console.log('[TAREFA 2] Testando Bypass com Rastreio (Falsos Positivos & [ADMIN_BYPASS])...');

    const remoteState = {
        metrics: {
            students: 188,
            activities: 3180,
            evaluations: 1671
        }
    };

    // Cenário: Professor limpou turmas no fim de ano (banco encolheu)
    const legitLocalShrink = {
        totalStudents: 30, // Redução drástica
        totalActivities: 50,
        totalEvaluations: 40
    };

    // Sem bypass: Deve ser bloqueado
    const blockedRes = CloudBackupGuardService.assessBackupSafety(legitLocalShrink, remoteState);
    assert.strictEqual(blockedRes.safe, false, 'Sem bypass deve ser bloqueado');
    console.log('    ✓ Bloqueio padrão atuando.');

    // Com forceBypass: Deve ser liberado
    const allowedRes = CloudBackupGuardService.assessBackupSafety(legitLocalShrink, remoteState, { forceBypass: true });
    assert.strictEqual(allowedRes.safe, true, 'Com forceBypass deve ser permitido');
    assert.strictEqual(allowedRes.bypassed, true, 'Flag bypassed deve ser true');
    console.log(`    ✓ Bypass administrativo aprovado: "${allowedRes.message}"`);

    // Teste da injeção de [ADMIN_BYPASS] no nome do arquivo
    let createdFileName = null;
    const mockDrive = {
        files: {
            list: async () => ({ data: { files: [{ id: 'mock_vault_folder' }] } }),
            create: async ({ requestBody }) => {
                createdFileName = requestBody.name;
                return { data: { id: 'mock_snap_id', name: requestBody.name, createdTime: new Date().toISOString() } };
            }
        }
    };

    // Subir com bypass
    await CloudSnapshotVaultService.persistImmutableSnapshot(mockDrive, { hash: 'abc', app_version: '5.5.3' }, legitLocalShrink, { forceBypass: true });
    console.log(`    -> Nome do arquivo gerado com bypass: ${createdFileName}`);
    assert(createdFileName.includes('[ADMIN_BYPASS]'), 'O nome deve conter [ADMIN_BYPASS]');
    console.log('    ✓ Tag [ADMIN_BYPASS] injetada com sucesso no snapshot auditável.\n');
}

async function testTask3AirGapDeepInspection() {
    console.log('[TAREFA 3] Testando Air-Gap Profundo (Prevenção de Falsos Empacotamentos)...');

    // O arquivo cloudEnvironmentGuard.js possui inspeção de __dirname e caminhos de dev
    const isDev = CloudEnvironmentGuard.isDevEnvironment();
    console.log(`    -> isDevEnvironment(): ${isDev}`);
    assert.strictEqual(isDev, true, 'Deve identificar ambiente de dev');

    const targetFile = CloudEnvironmentGuard.getTargetBackupFilename();
    console.log(`    -> targetBackupFilename: ${targetFile}`);
    assert.strictEqual(targetFile, 'edusys_dev_sandbox.json', 'Deve isolar em sandbox em ambiente de dev');
    console.log('    ✓ Air-Gap profundo ativo: produção protegida contra contaminação.\n');
}

async function testTask4AutoHealingRaceCondition() {
    console.log('[TAREFA 4] Testando Auto-Healing de Race Condition (Cura do Ponteiro Órfão)...');

    let updatedPointerBody = null;
    const now = Date.now();

    const mockDrive = {
        files: {
            list: async ({ q }) => {
                // Se busca a pasta
                if (q.includes('mimeType = \'application/vnd.google-apps.folder\'')) {
                    return { data: { files: [{ id: 'mock_folder_id' }] } };
                }
                // Se busca snapshots no cofre
                if (q.includes('parents and trashed = false')) {
                    return {
                        data: {
                            files: [
                                {
                                    id: 'snap_newest_id',
                                    name: 'edusys_snapshot_2026-10-05_new.edusys',
                                    createdTime: new Date(now).toISOString(), // AGORA
                                    size: '1024',
                                    appProperties: { app_version: '5.5.3' }
                                }
                            ]
                        }
                    };
                }
                // Se busca o ponteiro principal edusys_pro_backup.json (DESATUALIZADO / 10 minutos atrás)
                if (q.includes('edusys_pro_backup.json')) {
                    return {
                        data: {
                            files: [
                                {
                                    id: 'pointer_file_id',
                                    name: 'edusys_pro_backup.json',
                                    modifiedTime: new Date(now - 10 * 60 * 1000).toISOString() // 10 minutos ATRÁS
                                }
                            ]
                        }
                    };
                }
                return { data: { files: [] } };
            },
            get: async ({ fileId, alt }) => {
                // Conteúdo do snapshot
                return {
                    data: {
                        _edusys: true,
                        app_version: '5.5.3',
                        hash: 'healed_hash_123',
                        payload: 'healed_database_payload'
                    }
                };
            },
            update: async ({ fileId, media }) => {
                updatedPointerBody = media.body;
                return { data: { id: fileId } };
            }
        }
    };

    const healResult = await CloudSnapshotVaultService.verifyPointerConsistency(mockDrive, 'edusys_pro_backup.json');
    console.log('    -> Resultado do Auto-Healing:', healResult);
    assert.strictEqual(healResult.consistent, false, 'Deve detectar a inconsistência');
    assert.strictEqual(healResult.healed, true, 'Deve reparar a inconsistência');
    assert.strictEqual(healResult.action, 'UPDATED_POINTER');
    assert(updatedPointerBody.includes('healed_hash_123'), 'Ponteiro deve ser atualizado com o conteúdo do snapshot mais recente');

    console.log('    ✓ Auto-Healing de Race Condition testado e aprovado com 100% de precisão.\n');
}

async function runAll() {
    await testTask1RetentionPruning();
    await testTask2BypassAndTracking();
    await testTask3AirGapDeepInspection();
    await testTask4AutoHealingRaceCondition();

    console.log('==================================================================');
    console.log('AS 4 TAREFAS DE SEGURANÇA FORAM CONCLUÍDAS COM SUCESSO ABSOLUTO!');
    console.log('==================================================================');
}

runAll().catch(err => {
    console.error('Falha nos testes de mitigação:', err);
    process.exit(1);
});
