const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 [TEST] Iniciando Suite de Testes IPC do LicenseController...');

// Mock seguro do Electron IPC
const registeredHandlers = {};
const mockElectron = {
    ipcMain: {
        handle: (channel, handler) => {
            registeredHandlers[channel] = handler;
        }
    },
    shell: {
        openExternal: async (url) => {
            mockElectron.lastOpenedUrl = url;
            return true;
        }
    },
    app: {
        isPackaged: false,
        getPath: () => __dirname
    }
};

// Carrega o controller injetando o mock ou via require
const licenseControllerPath = path.join(__dirname, '../electron/controllers/licenseController.js');

// Verificação de sintaxe de preload.js e main.js
const preloadContent = fs.readFileSync(path.join(__dirname, '../electron/preload.js'), 'utf8');
assert.ok(preloadContent.includes('licenseGetStatus:'), 'preload.js deve conter licenseGetStatus');
assert.ok(preloadContent.includes('licenseGetMachineId:'), 'preload.js deve conter licenseGetMachineId');
assert.ok(preloadContent.includes('licenseActivate:'), 'preload.js deve conter licenseActivate');
assert.ok(preloadContent.includes('licenseRemove:'), 'preload.js deve conter licenseRemove');
assert.ok(preloadContent.includes('licenseOpenSupport:'), 'preload.js deve conter licenseOpenSupport');
assert.ok(preloadContent.includes('onLicenseStatus:'), 'preload.js deve conter onLicenseStatus');
console.log('  ✅ PASS: preload.js expõe todos os métodos e listeners de licenciamento');

const mainContent = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8');
assert.ok(mainContent.includes('registerLicenseHandlers'), 'main.js deve registrar os handlers de licença');
console.log('  ✅ PASS: main.js importa e inicializa registerLicenseHandlers');

mockElectron.BrowserWindow = {
    getAllWindows: () => [
        {
            isDestroyed: () => false,
            webContents: {
                send: (channel, data) => {
                    mockElectron.lastSentMessage = { channel, data };
                }
            }
        }
    ]
};

// Injeta o mock em require.cache antes de carregar o controller
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: mockElectron
};

// Testa execução dos handlers
const { registerLicenseHandlers } = require('../electron/controllers/licenseController');
registerLicenseHandlers();

// Verificação de que os 5 canais foram registrados
const expectedChannels = [
    'license:getStatus',
    'license:getMachineId',
    'license:activate',
    'license:remove',
    'license:openSupport'
];

expectedChannels.forEach(channel => {
    assert.strictEqual(typeof registeredHandlers[channel], 'function', `Canal ${channel} deve ser registrado`);
    console.log(`  ✅ PASS: Canal IPC ${channel} registrado com sucesso`);
});

// Teste de chamada aos handlers
async function runAsyncTests() {
    // 1. getMachineId
    const mid = await registeredHandlers['license:getMachineId']();
    assert.match(mid, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    console.log('  ✅ PASS: Handler license:getMachineId retornou ID formatado');

    // 2. getStatus
    const status = await registeredHandlers['license:getStatus']();
    assert.ok(status && typeof status.status === 'string');
    console.log('  ✅ PASS: Handler license:getStatus respondeu com schema válido');

    // 3. activate com token inválido
    const failAct = await registeredHandlers['license:activate']({}, 'TOKEN-INVALIDO');
    assert.strictEqual(failAct.success, false);
    console.log('  ✅ PASS: Handler license:activate rejeitou token inválido com segurança');

    // 4. openSupport
    const sup = await registeredHandlers['license:openSupport']({}, mid);
    assert.strictEqual(sup.success, true);
    console.log('  ✅ PASS: Handler license:openSupport disparou link de suporte técnico');

    console.log('\n🎉 Todos os testes de integração IPC da Etapa 2 passaram com 100% de sucesso!');
}

runAsyncTests().catch(err => {
    console.error('❌ Falha nos testes assíncronos IPC:', err);
    process.exit(1);
});
