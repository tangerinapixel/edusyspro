const assert = require('assert');
const CloudEnvironmentGuard = require('../electron/services/cloudEnvironmentGuard');
const CloudBackupGuardService = require('../electron/services/cloudBackupGuardService');
const CloudSnapshotVaultService = require('../electron/services/cloudSnapshotVaultService');

console.log('=== TESTE DE AUDITORIA DOS SERVIÇOS DE SEGURANÇA (ETAPA 1) ===\n');

// 1. Teste de CloudEnvironmentGuard
console.log('1. Testando CloudEnvironmentGuard...');
const isDev = CloudEnvironmentGuard.isDevEnvironment();
console.log(`   -> isDevEnvironment(): ${isDev}`);
const targetFilename = CloudEnvironmentGuard.getTargetBackupFilename();
console.log(`   -> getTargetBackupFilename(): ${targetFilename}`);
assert(typeof isDev === 'boolean', 'isDev deve ser boolean');
assert(typeof targetFilename === 'string', 'targetFilename deve ser string');
console.log('   ✓ CloudEnvironmentGuard validado com sucesso.');

// 2. Teste de CloudBackupGuardService (Extração e Envelope)
console.log('\n2. Testando CloudBackupGuardService...');
const mockDatabase = {
    students: [{ id: 1 }, { id: 2 }, { id: 3 }],
    turmas: [{ id: 1 }],
    activities: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    mini_testes: [{ id: 1 }],
    provas: [{ id: 1 }, { id: 2 }],
    trabalhos: [{ id: 1 }],
    occurrences: [{ id: 1 }],
    units: [{ id: 1, created_at: '2026-05-20' }, { id: 2, created_at: '2026-05-20' }],
    metadata: { app_version: '5.5.3' }
};

const metrics = CloudBackupGuardService.extractMetrics(mockDatabase);
console.log('   -> Métricas extraídas:', metrics);
assert.strictEqual(metrics.totalStudents, 3);
assert.strictEqual(metrics.totalActivities, 5);
assert.strictEqual(metrics.totalEvaluations, 4); // 1 mini + 2 provas + 1 trabalho

const envelope = CloudBackupGuardService.createSealedEnvelope('mock_encrypted_payload', metrics, '5.5.3');
console.log('   -> Envelope selado criado com sucesso:');
console.log(`      _security_grade: ${envelope._security_grade}`);
console.log(`      hash: ${envelope.hash}`);
assert.strictEqual(envelope._edusys, true);
assert.strictEqual(envelope._security_grade, 'SAAS_RESILIENT_V2');
assert.strictEqual(envelope.metrics.students, 3);
assert.strictEqual(envelope.metrics.activities, 5);

// 3. Teste do Data Shrinkage Guard (Simulação de Tentativa de Regressão)
console.log('\n3. Testando Data Shrinkage Guard (Prevenção de Encolhimento)...');

const remoteConsolidatedState = {
    metrics: {
        students: 188,
        activities: 3180,
        evaluations: 1671,
        turmas: 8
    }
};

// Cenário A: IA ou Dev tenta enviar banco encolhido (com apenas 660 atividades da U2)
const regressedLocalMetrics = {
    totalStudents: 188,
    totalActivities: 660,
    totalEvaluations: 400
};

const blockedResult = CloudBackupGuardService.assessBackupSafety(regressedLocalMetrics, remoteConsolidatedState);
console.log('   -> Cenário A (Banco Encolhido):');
console.log(`      safe: ${blockedResult.safe}`);
console.log(`      alerta: ${blockedResult.error}`);
assert.strictEqual(blockedResult.safe, false, 'Deveria ter bloqueado a tentativa de regressão!');
assert(blockedResult.error.includes('REGRESSÃO DE ATIVIDADES BLOQUEADA'), 'Mensagem de erro incorreta');

// Cenário B: Tentativa de perda de alunos (150 alunos vs 188 da nuvem)
const regressedStudentsMetrics = {
    totalStudents: 150,
    totalActivities: 3200,
    totalEvaluations: 1700
};
const studentBlockedResult = CloudBackupGuardService.assessBackupSafety(regressedStudentsMetrics, remoteConsolidatedState);
console.log('   -> Cenário B (Perda de Alunos):');
console.log(`      safe: ${studentBlockedResult.safe}`);
console.log(`      alerta: ${studentBlockedResult.error}`);
assert.strictEqual(studentBlockedResult.safe, false);
assert(studentBlockedResult.error.includes('REGRESSÃO DE MATRÍCULAS BLOQUEADA'));

// Cenário C: Backup válido com incremento de dados (3.200 atividades)
const validIncrementalMetrics = {
    totalStudents: 188,
    totalActivities: 3200,
    totalEvaluations: 1680
};
const approvedResult = CloudBackupGuardService.assessBackupSafety(validIncrementalMetrics, remoteConsolidatedState);
console.log('   -> Cenário C (Dados Válidos Incrementais):');
console.log(`      safe: ${approvedResult.safe}`);
console.log(`      mensagem: ${approvedResult.message}`);
assert.strictEqual(approvedResult.safe, true, 'Deveria aprovar dados incrementais!');

// 4. Teste de Assinatura de CloudSnapshotVaultService
console.log('\n4. Testando CloudSnapshotVaultService...');
assert.strictEqual(typeof CloudSnapshotVaultService.ensureVaultFolder, 'function');
assert.strictEqual(typeof CloudSnapshotVaultService.persistImmutableSnapshot, 'function');
assert.strictEqual(typeof CloudSnapshotVaultService.listVaultSnapshots, 'function');
assert.strictEqual(typeof CloudSnapshotVaultService.retrieveSnapshotContent, 'function');
console.log('   ✓ Métodos estáticos do cofre catalogados.');

console.log('\n=== AUDITORIA DA ETAPA 1 CONCLUÍDA COM 100% DE SUCESSO ===');
