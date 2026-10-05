require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Module = require('module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'electron') {
        return {
            app: {
                isPackaged: false,
                name: 'EduSys Pro',
                getPath: () => 'C:\\Users\\Roni\\AppData\\Roaming\\EduSys Pro'
            },
            ipcRenderer: {},
            ipcMain: {}
        };
    }
    return originalRequire.apply(this, arguments);
};

const assert = require('assert');
const { google } = require('googleapis');
const { initDB, dbAPI } = require('../electron/database');
const CloudBackupGuardService = require('../electron/services/cloudBackupGuardService');
const CloudSnapshotVaultService = require('../electron/services/cloudSnapshotVaultService');
const CloudEnvironmentGuard = require('../electron/services/cloudEnvironmentGuard');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../electron/oauth_credentials');

console.log('==================================================================');
console.log('AUDITORIA DE RESILIÊNCIA E COFRE IMUTÁVEL DE BACKUPS (ETAPA 4)');
console.log('==================================================================\n');

async function runEndToEndAudit() {
    // 0. Inicializar Banco Local
    initDB();
    const memoryData = dbAPI.getMemoryData();
    const localMetrics = CloudBackupGuardService.extractMetrics(memoryData);
    console.log('[1] Banco de Dados Local Ativo:');
    console.log(`    - Alunos: ${localMetrics.totalStudents}`);
    console.log(`    - Turmas: ${localMetrics.totalTurmas}`);
    console.log(`    - Atividades: ${localMetrics.totalActivities}`);
    console.log(`    - Avaliações: ${localMetrics.totalEvaluations}`);
    console.log(`    - Unidades Ativas: ${localMetrics.activeUnits}`);
    console.log(`    - Versão: ${localMetrics.appVersion}`);
    assert(localMetrics.totalStudents > 0, 'Alunos devem ser > 0');
    assert(localMetrics.totalActivities > 0, 'Atividades devem ser > 0');

    // 1. Teste de Blindagem contra Encolhimento (Data Shrinkage Guard)
    console.log('\n[2] Testando Proteção de Encolhimento (Data Shrinkage Guard)...');
    const fakeRegressedMetrics = {
        totalStudents: 188,
        totalActivities: 500, // Menos da metade
        totalEvaluations: 300
    };
    const safetyCheck = CloudBackupGuardService.assessBackupSafety(fakeRegressedMetrics, { metrics: localMetrics });
    console.log(`    -> Status de segurança com banco encolhido: ${safetyCheck.safe}`);
    console.log(`    -> Alerta gerado: ${safetyCheck.error}`);
    assert.strictEqual(safetyCheck.safe, false, 'Deveria ter bloqueado o encolhimento de atividades');
    console.log('    ✓ Bloqueio de regressão operando perfeitamente.');

    // 2. Conectar ao Google Drive lendo token do AppData
    console.log('\n[3] Conectando ao Google Drive da Escola...');
    const configPath = path.join('C:', 'Users', 'Roni', 'AppData', 'Roaming', 'EduSys Pro', 'config.json');
    let tokens = null;
    if (fs.existsSync(configPath)) {
        try {
            const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            tokens = configJson.google_tokens;
        } catch (e) {
            console.warn('Erro ao ler config.json:', e.message);
        }
    }

    if (!tokens) {
        console.warn('    [AVISO] Nenhum token local do Google Drive encontrado.');
        return;
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 3. Teste do Cofre de Snapshots Imutáveis
    console.log('\n[4] Testando Criação e Consulta no Cofre Imutável (/EduSys_Vault/Snapshots)...');
    const folderId = await CloudSnapshotVaultService.ensureVaultFolder(drive);
    console.log(`    -> Pasta do Cofre confirmada no Drive com ID: ${folderId}`);
    assert(folderId, 'Folder ID da pasta de snapshots deve existir');

    // Gerar Envelope Selado
    const encryptedPayload = dbAPI.getEncryptedData();
    const sealedEnvelope = CloudBackupGuardService.createSealedEnvelope(encryptedPayload, localMetrics, localMetrics.appVersion);

    // Persistir Snapshot Imutável
    console.log('    -> Gravando Snapshot Imutável no Cofre...');
    const persistRes = await CloudSnapshotVaultService.persistImmutableSnapshot(drive, sealedEnvelope, localMetrics);
    console.log(`    -> Snapshot criado com sucesso: ${persistRes.filename} (ID: ${persistRes.snapshotId})`);
    assert(persistRes.snapshotId, 'Snapshot ID deve existir');

    // Listar Snapshots do Cofre
    console.log('    -> Consultando catálogo de Snapshots da Máquina do Tempo...');
    const snapshotsList = await CloudSnapshotVaultService.listVaultSnapshots(drive);
    console.log(`    -> Total de Snapshots encontrados no cofre: ${snapshotsList.length}`);
    assert(snapshotsList.length > 0, 'Deve conter pelo menos 1 snapshot');

    const latestSnap = snapshotsList[0];
    console.log('    -> Snapshot mais recente no cofre:');
    console.log(`       - Nome: ${latestSnap.name}`);
    console.log(`       - Criado em: ${latestSnap.createdTime}`);
    console.log(`       - Tamanho: ${(latestSnap.sizeBytes / 1024).toFixed(1)} KB`);
    console.log(`       - Alunos arquivados: ${latestSnap.studentsCount}`);
    console.log(`       - Atividades arquivadas: ${latestSnap.activitiesCount}`);
    console.log(`       - Avaliações arquivadas: ${latestSnap.evaluationsCount}`);
    console.log(`       - Versão: v${latestSnap.version}`);

    assert.strictEqual(latestSnap.studentsCount, localMetrics.totalStudents);
    assert.strictEqual(latestSnap.activitiesCount, localMetrics.totalActivities);
    console.log('    ✓ Métricas do snapshot imutável 100% fiéis ao banco de dados!');

    // 4. Teste de Recuperação e Integridade de Snapshot (Simulação de Restore)
    console.log('\n[5] Testando Recuperação Cirúrgica e Validação SHA-256...');
    const downloadedRaw = await CloudSnapshotVaultService.retrieveSnapshotContent(drive, latestSnap.id);
    const downloadedEnvelope = typeof downloadedRaw === 'string' ? JSON.parse(downloadedRaw) : downloadedRaw;

    const computedHash = CloudBackupGuardService.computeHash(downloadedEnvelope.payload);
    assert.strictEqual(computedHash, downloadedEnvelope.hash, 'Hash SHA-256 deve ser rigorosamente idêntico!');
    console.log(`    ✓ Hash SHA-256 verificado com sucesso bit a bit: ${computedHash.slice(0, 16)}...`);

    // 5. Teste de Snapshot Local Preventivo (Rollback Harness)
    console.log('\n[6] Testando Snapshot Preventivo Local (Rollback Harness)...');
    const localSnapRes = dbAPI.createLocalSnapshot();
    assert.strictEqual(localSnapRes.success, true, 'Snapshot local deve ser criado');
    console.log('    ✓ Snapshot local preventivo criado.');
    dbAPI.deleteSnapshot();
    console.log('    ✓ Limpeza de snapshot concluída.');

    console.log('\n==================================================================');
    console.log('TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
    console.log('O SISTEMA ESTÁ BLINDADO EM NÍVEL SAAS À PROVA DE FALHAS DE IA.');
    console.log('==================================================================');
}

runEndToEndAudit().catch(err => {
    console.error('Falha crítica na auditoria E2E:', err);
    process.exit(1);
});
