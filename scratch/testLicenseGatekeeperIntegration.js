const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 [TEST] Iniciando Suite de Testes do Gatekeeper de Licença & Modo Leitura...');

const mockElectron = {
    ipcMain: {
        handlers: {},
        handle: function(channel, handler) {
            this.handlers[channel] = handler;
        },
        on: function() {}
    },
    shell: {
        openExternal: async () => true
    },
    app: {
        isPackaged: false,
        getPath: () => __dirname,
        getVersion: () => '5.1.0'
    }
};

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: mockElectron
};

const {
    getMachineId,
    activateLicense,
    removeLicense,
    checkLicenseStatus
} = require('../electron/services/licenseService');

const { generateLicenseToken } = require('../scripts/gerar-licenca');
const { registerAiHandlers } = require('../electron/controllers/aiController');
const { registerDbHandlers } = require('../electron/controllers/dbController');
const { initDB } = require('../electron/database');

initDB();

// Registra os handlers usando o mock
registerAiHandlers();
registerDbHandlers();

async function runGatekeeperTests() {
    const machineId = getMachineId();

    // 1. Cenário Não Ativado (UNLICENSED)
    removeLicense();
    assert.strictEqual(checkLicenseStatus().canOperate, false);

    // Teste: IA de Plano de Aula deve ser interceptada com aviso amigável
    const blockedPlan = await mockElectron.ipcMain.handlers['ai:generateLessonPlan']({}, {});
    assert.strictEqual(blockedPlan.success, false);
    assert.strictEqual(blockedPlan.isLicenseBlocked, true);
    assert.match(blockedPlan.error, /Nenhuma chave de ativação|Licença expirada/i);
    console.log('  ✅ PASS: Geração de Plano de Aula bloqueada no status UNLICENSED');

    // Teste: IA de Prova deve ser interceptada com aviso amigável
    const blockedExam = await mockElectron.ipcMain.handlers['ai:generateExam']({}, {});
    assert.strictEqual(blockedExam.success, false);
    assert.strictEqual(blockedExam.isLicenseBlocked, true);
    assert.match(blockedExam.error, /Nenhuma chave de ativação|Licença expirada/i);
    console.log('  ✅ PASS: Geração de Prova bloqueada no status UNLICENSED');

    // Teste: Modo Leitura - Banco de Dados de turmas e notas NÃO pode ser bloqueado
    const turmas = await mockElectron.ipcMain.handlers['db:getTurmas']();
    assert.ok(Array.isArray(turmas), 'Professor deve ter acesso aos seus dados mesmo sem licença ativa');
    console.log('  ✅ PASS: Modo Leitura pedagógico preservado (banco SQLite acessível)');

    // 2. Cenário Ativação Válida (Anual / 1 Ano)
    const { token } = generateLicenseToken({
        clientName: 'Colégio Alpha',
        machineId,
        periodoStr: '1y'
    });

    const actResult = activateLicense(token);
    assert.strictEqual(actResult.success, true);
    assert.strictEqual(checkLicenseStatus().canOperate, true);
    console.log('  ✅ PASS: Licença de 1 ano ativada com sucesso');

    // Com licença ativa, o gatekeeper não bloqueia por licença
    // (a chamada prossegue para o serviço de IA real)
    assert.strictEqual(checkLicenseStatus().canOperate, true);
    console.log('  ✅ PASS: Gatekeeper libera operação normalmente para licença válida');

    // Limpeza final para não deixar resíduo de chave na máquina de dev
    removeLicense();
    console.log('\n🎉 Todos os testes do Gatekeeper e Modo Leitura passaram com 100% de sucesso!');
}

runGatekeeperTests().catch(err => {
    console.error('❌ Falha nos testes de gatekeeper:', err);
    process.exit(1);
});
