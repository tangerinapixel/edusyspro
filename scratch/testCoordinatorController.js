/* eslint-env node */
/**
 * Teste de Integração da Etapa 2: Controller IPC da Coordenação Pedagógica
 */

const assert = require('assert');

// Mock do electron.ipcMain para testar os handlers registrados pelo controller
const handlers = new Map();
const mockIpcMain = {
    handle: (channel, fn) => {
        handlers.set(channel, fn);
    },
    on: () => {}
};

// Intercepta require('electron') para injetar mockIpcMain durante teste isolado
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'electron') {
        return {
            ipcMain: mockIpcMain,
            app: {
                isPackaged: false,
                getPath: () => __dirname,
                getVersion: () => '5.4.1'
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

const { registerCoordinatorHandlers } = require('../electron/controllers/coordinatorController');
const sessionManager = require('../electron/services/coordinatorSessionManager');

async function runIpcTests() {
    console.log('================================================================');
    console.log(' INICIANDO TESTES DA ETAPA 2 - CONTROLLER IPC DA COORDENAÇÃO');
    console.log('================================================================\n');

    let lastBroadcastChannel = null;
    let lastBroadcastPayload = null;

    const mockMainWindow = {
        isDestroyed: () => false,
        webContents: {
            send: (channel, payload) => {
                lastBroadcastChannel = channel;
                lastBroadcastPayload = payload;
            }
        }
    };

    // Registra os handlers usando o mock
    registerCoordinatorHandlers(() => mockMainWindow);

    console.log('[TESTE 1] Verificando registro dos canais IPC obrigatórios...');
    const requiredChannels = [
        'coordinator:getStatus',
        'coordinator:setupPin',
        'coordinator:authenticate',
        'coordinator:lockSession',
        'coordinator:getSchoolOverview',
        'coordinator:getStudent360',
        'coordinator:getTeachersList',
        'coordinator:getTeacherShard',
        'coordinator:removeTeacher',
        'coordinator:syncDriveTeachers',
        'coordinator:ingestSnapshot',
        'coordinator:resolveStudent'
    ];

    for (const ch of requiredChannels) {
        assert(handlers.has(ch), `Canal IPC obrigatório não registrado: ${ch}`);
    }
    console.log(`  ✓ Teste 1 passou: Todos os ${requiredChannels.length} canais IPC registrados com sucesso.`);

    console.log('\n[TESTE 2] Testando coordinator:getStatus com cofre inicial...');
    const getStatusHandler = handlers.get('coordinator:getStatus');
    const statusRes = await getStatusHandler();
    assert.strictEqual(statusRes.success, true);
    console.log('  ✓ Teste 2 passou: Status inicial consultado com sucesso.');

    console.log('\n[TESTE 3] Testando guarda de segurança server-side sem autenticação...');
    const overviewHandler = handlers.get('coordinator:getSchoolOverview');
    sessionManager.lockSession('manual'); // Assegura que está trancado
    const deniedRes = await overviewHandler();
    assert.strictEqual(deniedRes.success, false);
    assert(deniedRes.error.includes('Acesso negado'));
    console.log('  ✓ Teste 3 passou: getSchoolOverview bloqueado com erro 403 server-side.');

    console.log('\n[TESTE 4] Testando coordinator:setupPin e coordinator:authenticate...');
    const setupHandler = handlers.get('coordinator:setupPin');
    const setupRes = await setupHandler(null, { pin: '9876', coordinatorName: 'Coord. Helena Rocha' });
    assert.strictEqual(setupRes.success, true);

    const authHandler = handlers.get('coordinator:authenticate');
    const authRes = await authHandler(null, { pin: '9876' });
    assert.strictEqual(authRes.success, true);
    assert(authRes.sessionToken);
    console.log('  ✓ Teste 4 passou: Setup e autenticação completados via IPC com token gerado.');

    console.log('\n[TESTE 5] Testando getSchoolOverview após elevação...');
    const allowedRes = await overviewHandler();
    assert.strictEqual(allowedRes.success, true);
    assert(allowedRes.overview);
    console.log('  ✓ Teste 5 passou: Acesso liberado após elevação.');

    console.log('\n[TESTE 6] Testando coordinator:lockSession e emissão de evento auto-lock...');
    const lockHandler = handlers.get('coordinator:lockSession');
    const lockRes = await lockHandler();
    assert.strictEqual(lockRes.success, true);
    assert.strictEqual(lastBroadcastChannel, 'coordinator:sessionLocked');
    assert.strictEqual(lastBroadcastPayload.reason, 'manual');
    console.log('  ✓ Teste 6 passou: Sessão trancada e evento emitido com sucesso.');

    console.log('\n[CLEANUP] Limpando ambiente de teste...');
    const fs = require('fs');
    const path = require('path');
    const vaultDir = path.join(__dirname, '..', 'coordinator_vault');
    if (fs.existsSync(path.join(vaultDir, 'auth_meta.json'))) {
        fs.unlinkSync(path.join(vaultDir, 'auth_meta.json'));
    }
    console.log('  ✓ Arquivo de teste auth_meta.json limpo com sucesso.');

    console.log('\n================================================================');
    console.log(' TODOS OS TESTES DA ETAPA 2 FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
    console.log('================================================================\n');
}

runIpcTests().catch(err => {
    console.error('FALHA NOS TESTES DA ETAPA 2:', err);
    process.exit(1);
});
