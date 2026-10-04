const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    getMachineId,
    verifyLicenseToken,
    checkLicenseStatus,
    activateLicense,
    removeLicense,
    EDUSYS_PUBLIC_KEY_PEM
} = require('../electron/services/licenseService');

const { generateLicenseToken } = require('../scripts/gerar-licenca');

console.log('🧪 [TEST] Iniciando Suite de Testes do Motor de Licenças...');

let testsPassed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        testsPassed++;
    } catch (e) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(e);
        process.exit(1);
    }
}

// 1. Machine ID
test('Geração determinística de Machine ID', () => {
    const id1 = getMachineId();
    const id2 = getMachineId();
    assert.strictEqual(id1, id2, 'Machine ID deve ser determinístico');
    assert.match(id1, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Formato deve ser XXXX-XXXX-XXXX-XXXX');
});

// 2. Geração e Verificação Criptográfica com Chave Mestras
test('Validação de Token Assinado com Ed25519 (Sucesso)', () => {
    const machineId = getMachineId();
    const { token, payload } = generateLicenseToken({
        clientName: 'Prof. Teste',
        machineId,
        periodoStr: '3m'
    });

    const verify = verifyLicenseToken(token);
    assert.strictEqual(verify.valid, true, 'Token deve ser válido');
    assert.strictEqual(verify.claims.clientName, 'Prof. Teste');
    assert.strictEqual(verify.claims.machineId, machineId);
    assert.strictEqual(verify.claims.planType, '3_MONTHS');
});

test('Rejeição imediata de Token Adulterado (Anti-Tampering)', () => {
    const machineId = getMachineId();
    const { token } = generateLicenseToken({
        clientName: 'Prof. Teste',
        machineId,
        periodoStr: '1y'
    });

    const parts = token.split('.');
    // Modifica 1 byte do payload
    const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
    const tamperedJson = decoded.replace('1_YEAR', 'LIFETIME');
    const tamperedPayloadB64 = Buffer.from(tamperedJson).toString('base64');
    const tamperedToken = `EDUSYS.${tamperedPayloadB64}.${parts[2]}`;

    const verify = verifyLicenseToken(tamperedToken);
    assert.strictEqual(verify.valid, false, 'Token adulterado deve falhar na assinatura');
    assert.match(verify.error, /Assinatura digital inválida/i);
});

// 3. Diferença de Hardware ID
test('Rejeição de Licença emitida para outra máquina', () => {
    const { token } = generateLicenseToken({
        clientName: 'Escola Y',
        machineId: 'ZZZZ-9999-AAAA-1111',
        periodoStr: '1y'
    });

    const activate = activateLicense(token, { machineIdOverride: 'AAAA-0000-BBBB-2222' });
    assert.strictEqual(activate.success, false);
    assert.match(activate.message, /pertence ao computador/i);
});

test('Licença Universal (*) funciona em qualquer máquina', () => {
    const { token } = generateLicenseToken({
        clientName: 'Licença Coringa',
        machineId: '*',
        periodoStr: '1y'
    });

    const activate = activateLicense(token, { machineIdOverride: 'DIFF-1111-2222-3333' });
    assert.strictEqual(activate.success, true);
    removeLicense();
});

// 4. Períodos e Expiração
test('Detecção de Licença Expirada no tempo', () => {
    const machineId = getMachineId();
    const { token } = generateLicenseToken({
        clientName: 'Prof. Vencido',
        machineId,
        periodoStr: '7d'
    });

    // Simula data daqui a 30 dias
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Tenta ativar em data futura
    const activate = activateLicense(token, { currentDateOverride: futureDate });
    assert.strictEqual(activate.success, false);
    assert.match(activate.message, /já expirou/i);
});

test('Detecção de Aviso de Vencimento Próximo (WARNING_EXPIRING <= 15 dias)', () => {
    const machineId = getMachineId();
    const { token } = generateLicenseToken({
        clientName: 'Prof. Quase Vencendo',
        machineId,
        periodoStr: '7d'
    });

    const activate = activateLicense(token);
    assert.strictEqual(activate.success, true);

    const status = checkLicenseStatus();
    assert.strictEqual(status.status, 'WARNING_EXPIRING');
    assert.strictEqual(status.isValid, true);
    assert.strictEqual(status.canOperate, true);
    assert.ok(status.daysRemaining <= 8 && status.daysRemaining >= 7);

    removeLicense();
});

// 5. Anti-Clock Tampering (Relógio Atrasado)
test('Detecção de Recuo Malicioso do Relógio do Windows', () => {
    const machineId = getMachineId();
    const { token } = generateLicenseToken({
        clientName: 'Teste Relógio',
        machineId,
        periodoStr: '1y'
    });

    activateLicense(token);

    // Simula que o usuário voltou o relógio para 2020
    const pastDate = '2020-01-01T00:00:00.000Z';
    const status = checkLicenseStatus({ currentDateOverride: pastDate });

    assert.strictEqual(status.status, 'CLOCK_TAMPERED');
    assert.strictEqual(status.isValid, false);
    assert.strictEqual(status.canOperate, false);
    assert.match(status.message, /relógio do computador foi retrocedido/i);

    removeLicense();
});

// 6. Ciclo de Ativação e Limpeza
test('Ciclo Completo: Ativação, Leitura e Desativação', () => {
    const machineId = getMachineId();
    const { token } = generateLicenseToken({
        clientName: 'Escola Municipal Central',
        machineId,
        periodoStr: '1y'
    });

    const act = activateLicense(token);
    assert.strictEqual(act.success, true);

    const currentStatus = checkLicenseStatus();
    assert.strictEqual(currentStatus.status, 'VALID');
    assert.strictEqual(currentStatus.claims.clientName, 'Escola Municipal Central');

    const rem = removeLicense();
    assert.strictEqual(rem.success, true);

    const postStatus = checkLicenseStatus();
    assert.strictEqual(postStatus.status, 'UNLICENSED');
});

console.log(`\n🎉 Todos os ${testsPassed} testes de segurança do LicenseService passaram com 100% de sucesso!`);
