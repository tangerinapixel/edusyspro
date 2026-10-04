const assert = require('assert');
const { 
    checkLicenseStatus, 
    activateLicense, 
    removeLicense, 
    calculateDaysRemaining 
} = require('../electron/services/licenseService');
const { generateLicenseToken, parsePeriodo } = require('../scripts/gerar-licenca');

console.log('🧪 [TEST ETAPA 1] Validando novas capacidades de término e dias civis...');

// 1. Teste de cálculo de dias civis
const now = new Date('2026-10-04T12:00:00.000Z');
const expIn5Days = new Date('2026-10-09T23:59:59.999Z').toISOString();
const days = calculateDaysRemaining(expIn5Days, now.getTime());
assert.strictEqual(days, 5, `Deveria ter calculado exatamente 5 dias civis, recebeu ${days}`);
console.log('  ✅ PASS: Cálculo determinístico de dias civis (calculateDaysRemaining)');

// 2. Teste de parsePeriodo com formato brasileiro DD/MM/YYYY
const parsedBr = parsePeriodo(null, '31/12/2026');
assert.ok(parsedBr.planType === '3_MONTHS' || parsedBr.planType === 'CUSTOM_TERM');
assert.strictEqual(new Date(parsedBr.expiresAt).toLocaleDateString('pt-BR'), '31/12/2026');
console.log('  ✅ PASS: Suporte a data de término DD/MM/YYYY (alinhado ao calendário civil local)');

// 3. Teste de parsePeriodo com formato ISO YYYY-MM-DD
const parsedIso = parsePeriodo('2026-11-20');
assert.strictEqual(parsedIso.planType, 'CUSTOM_TERM');
assert.strictEqual(new Date(parsedIso.expiresAt).toLocaleDateString('pt-BR'), '20/11/2026');
console.log('  ✅ PASS: Suporte a data de término YYYY-MM-DD (alinhado ao calendário civil local)');

// 4. Teste de rejeição de data no passado
assert.throws(() => {
    parsePeriodo('2020-01-01');
}, /já expirou no passado/i);
console.log('  ✅ PASS: Rejeição de data de término no passado');

// 5. Teste de emissão e ativação de licença com término específico
const { token, payload } = generateLicenseToken({
    clientName: 'Escola Modelo',
    machineId: '*',
    customTermino: '31/12/2026'
});

const act = activateLicense(token);
assert.strictEqual(act.success, true);
const status = checkLicenseStatus();
assert.strictEqual(status.isValid, true);
assert.strictEqual(status.claims.clientName, 'Escola Modelo');
assert.ok(status.daysRemaining > 50);
console.log('  ✅ PASS: Emissão e Ativação de licença com término específico');

removeLicense();

console.log('🎉 [ETAPA 1] Todos os testes de unidade da Etapa 1 passaram com 100% de sucesso!\n');
