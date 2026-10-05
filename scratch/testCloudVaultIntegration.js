const Module = require('module');
const assert = require('assert');

// Mock Electron & Electron-Store if running outside full Electron environment
const registeredHandlers = {};
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'electron') {
        return {
            app: {
                isPackaged: false,
                name: 'EduSys Pro',
                getPath: () => 'C:\\Users\\Roni\\AppData\\Roaming\\EduSys Pro',
                whenReady: () => Promise.resolve(),
                on: () => {}
            },
            BrowserWindow: class {
                maximize() {}
                loadURL() {}
                loadFile() {}
            },
            ipcMain: {
                handle: (channel, handler) => {
                    registeredHandlers[channel] = handler;
                }
            },
            ipcRenderer: {}
        };
    }
    if (id === 'electron-store') {
        return class MockStore {
            constructor() { this.data = {}; }
            get(key) { return this.data[key]; }
            set(key, val) { this.data[key] = val; }
            delete(key) { delete this.data[key]; }
        };
    }
    return originalRequire.apply(this, arguments);
};

console.log('=== AUDITORIA DE INTEGRAÇÃO DA ETAPA 2 ===\n');

// 1. Carregar módulos integrados
const { initDB, dbAPI } = require('../electron/database');
initDB();

const { registerCloudVaultHandlers } = require('../electron/controllers/cloudVaultController');
registerCloudVaultHandlers();

const cloud = require('../electron/googleSync');

// 2. Verificar Handlers Registrados
console.log('1. Verificando canais IPC registrados pelo CloudVaultController:');
const expectedChannels = ['vault:listSnapshots', 'vault:restoreSnapshot', 'vault:getMetrics'];
expectedChannels.forEach(ch => {
    assert(typeof registeredHandlers[ch] === 'function', `Canal ${ch} deve estar registrado!`);
    console.log(`   ✓ Canal [${ch}] registrado com sucesso.`);
});

// 3. Teste do Handler vault:getMetrics
console.log('\n2. Testando execução do handler vault:getMetrics...');
registeredHandlers['vault:getMetrics']().then(async res => {
    console.log('   -> Resultado vault:getMetrics:', res);
    assert.strictEqual(res.success, true);
    assert(res.localMetrics.totalStudents > 0, 'Deveria conter estudantes');
    assert(res.localMetrics.totalActivities > 0, 'Deveria conter atividades');
    console.log(`   ✓ Métricas locais validadas: ${res.localMetrics.totalStudents} alunos, ${res.localMetrics.totalActivities} atividades.`);

    // 4. Testar getDriveClient
    console.log('\n3. Testando exposição de getDriveClient em googleSync...');
    const driveClient = cloud.getDriveClient();
    assert(driveClient !== null && typeof driveClient === 'object', 'getDriveClient() deve retornar a instância');
    console.log('   ✓ driveClient acessível.');

    // 5. Testar Bloqueio de Auto-Sync em Dev
    console.log('\n4. Testando bloqueio preventivo de Auto-Sync em ambiente DEV...');
    const autoSyncRes = await cloud.uploadBackup('fake_payload', { isAutoSync: true });
    console.log('   -> Resultado auto-sync em dev:', autoSyncRes);
    assert.strictEqual(autoSyncRes.success, true);
    assert.strictEqual(autoSyncRes.skipped, true);
    assert.strictEqual(autoSyncRes.reason, 'DEV_AUTOSYNC_BLOCKED');
    console.log('   ✓ Auto-Sync em DEV bloqueado com sucesso (Proteção ativa!).');

    console.log('\n=== AUDITORIA DA ETAPA 2 CONCLUÍDA COM 100% DE SUCESSO ===');
}).catch(err => {
    console.error('Falha na auditoria da Etapa 2:', err);
    process.exit(1);
});
