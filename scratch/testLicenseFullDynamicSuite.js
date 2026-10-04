const assert = require('assert');
const {
    getMachineId,
    checkLicenseStatus,
    activateLicense,
    removeLicense,
    calculateDaysRemaining
} = require('../electron/services/licenseService');
const { generateLicenseToken } = require('../scripts/gerar-licenca');

console.log('🧪 [TEST ETAPA 3] Validação de Ponta a Ponta do Ciclo Dinâmico e Término...');

const machineId = getMachineId();

// 1. Simulação temporal da contagem regressiva dia a dia
console.log('\n--- 1. Simulação de contagem regressiva de dias civis ---');
const startDate = new Date('2026-10-01T12:00:00.000Z');
const expDate = new Date('2026-10-08T23:59:59.999Z');

// Dia 1 (01/10) -> faltam 7 dias
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-01T10:00:00.000Z').getTime()), 7);
// Dia 2 (02/10) -> faltam 6 dias
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-02T10:00:00.000Z').getTime()), 6);
// Dia 3 (03/10) -> faltam 5 dias
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-03T10:00:00.000Z').getTime()), 5);
// Dia 4 (04/10) -> faltam 4 dias
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-04T10:00:00.000Z').getTime()), 4);
// Dia 8 (08/10 às 20:00) -> resta 1 dia
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-08T20:00:00.000Z').getTime()), 1);
// Dia 9 (09/10 após expiração) -> 0 dias
assert.strictEqual(calculateDaysRemaining(expDate.toISOString(), new Date('2026-10-09T03:00:00.000Z').getTime()), 0);
console.log('  ✅ PASS: Contagem regressiva decresce dia a dia perfeitamente alinhada ao calendário civil');

// 2. Transição de Status: VALID -> WARNING_EXPIRING -> EXPIRED
console.log('\n--- 2. Transição de Status Dinâmica ---');
const { token: token18d } = generateLicenseToken({
    clientName: 'Prof. Ciclo',
    machineId,
    periodoStr: '18d'
});

activateLicense(token18d);
// No dia 0 (faltam 18 dias): status deve ser VALID
const st18 = checkLicenseStatus();
assert.strictEqual(st18.status, 'VALID');
assert.strictEqual(st18.canOperate, true);
console.log('  ✅ PASS: Status VALID quando dias restantes > 15');

// Avançando para faltar 10 dias
const future10 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
const st10 = checkLicenseStatus({ currentDateOverride: future10 });
assert.strictEqual(st10.status, 'WARNING_EXPIRING');
assert.strictEqual(st10.canOperate, true);
assert.ok(st10.daysRemaining <= 10 && st10.daysRemaining >= 9);
console.log('  ✅ PASS: Transição automática para WARNING_EXPIRING quando dias <= 15');

// Avançando para a data expirada (20 dias no futuro)
const futureExpired = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
const stExp = checkLicenseStatus({ currentDateOverride: futureExpired });
assert.strictEqual(stExp.status, 'EXPIRED');
assert.strictEqual(stExp.canOperate, false);
assert.strictEqual(stExp.daysRemaining, 0);
console.log('  ✅ PASS: Transição automática para EXPIRED e canOperate: false');

removeLicense();

// 3. Emissão com Data Específica de Término (escolha do administrador)
console.log('\n--- 3. Validação de Término Específico Escolhido ---');
const { token: customToken, payload: customPayload } = generateLicenseToken({
    clientName: 'Colégio Futuro',
    machineId: '*',
    customTermino: '2026-12-31'
});

assert.ok(customPayload.expiresAt.includes('2026-12-31') || new Date(customPayload.expiresAt).toLocaleDateString('pt-BR') === '31/12/2026');
const actCustom = activateLicense(customToken);
assert.strictEqual(actCustom.success, true);
const stCustom = checkLicenseStatus();
assert.strictEqual(stCustom.isValid, true);
assert.strictEqual(stCustom.claims.clientName, 'Colégio Futuro');
assert.ok(stCustom.daysRemaining > 70);
console.log(`  ✅ PASS: Licença com data de término customizada ativada com ${stCustom.daysRemaining} dias calculados`);

removeLicense();

console.log('\n🎉 [ETAPA 3] Todos os testes de integração dinâmica passaram com 100% de sucesso!\n');
