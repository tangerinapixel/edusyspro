/**
 * Suíte de Testes Automatizados de Validação Ponta a Ponta:
 * Mecanismo de Atualização Sob Demanda e Consentimento do Usuário (Etapa 4)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 [TEST] Iniciando Suite de Validação do Mecanismo de Atualização Sob Demanda...\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Motivo: ${err.message}`);
  }
}

// 1. Validação do updateService.js
runTest('updateService.js desativa autoDownload e autoInstallOnAppQuit para respeitar a decisão do professor', () => {
  const content = fs.readFileSync(path.join(__dirname, '../electron/services/updateService.js'), 'utf-8');
  assert.ok(content.includes('autoUpdater.autoDownload = false'), 'autoDownload deve ser false');
  assert.ok(content.includes('autoUpdater.autoInstallOnAppQuit = false'), 'autoInstallOnAppQuit deve ser false');
  assert.ok(content.includes("ipcMain.handle('updater:download'"), 'Canal IPC updater:download deve existir');
  assert.ok(content.includes("autoUpdater.downloadUpdate()"), 'Deve acionar downloadUpdate() sob demanda');
  assert.ok(content.includes("ipcMain.handle('updater:install'"), 'Canal IPC updater:install deve existir');
});

// 2. Validação do preload.js
runTest('preload.js expõe todos os métodos do ciclo de vida de atualização com segurança', () => {
  const content = fs.readFileSync(path.join(__dirname, '../electron/preload.js'), 'utf-8');
  assert.ok(content.includes("updaterDownload: () => ipcRenderer.invoke('updater:download')"), 'updaterDownload exposto');
  assert.ok(content.includes("updaterInstall: () => ipcRenderer.invoke('updater:install')"), 'updaterInstall exposto');
  assert.ok(content.includes("updaterCheck: () => ipcRenderer.invoke('updater:check')"), 'updaterCheck exposto');
  assert.ok(content.includes("onUpdaterStatus: (callback)"), 'onUpdaterStatus exposto');
  assert.ok(content.includes("updaterGetStatus: () => ipcRenderer.invoke('updater:getStatus')"), 'updaterGetStatus exposto');
});

// 3. Validação do useAutoUpdater.js
runTest('useAutoUpdater.js gerencia flags declarativas e disparo de download sob demanda', () => {
  const content = fs.readFileSync(path.join(__dirname, '../src/hooks/useAutoUpdater.js'), 'utf-8');
  assert.ok(content.includes('startDownload'), 'startDownload deve existir no hook');
  assert.ok(content.includes('isDownloaded'), 'isDownloaded deve ser retornado');
  assert.ok(content.includes('isDownloading'), 'isDownloading deve ser retornado');
  assert.ok(content.includes('sessionStorage.removeItem(SNOOZE_SESSION_KEY)'), 'startDownload deve resetar o snooze de sessão');
});

// 4. Validação dos componentes de interface (UI)
runTest('UpdateFloatingNotification.jsx apresenta botão [Baixar], barra de progresso e [Reiniciar]', () => {
  const content = fs.readFileSync(path.join(__dirname, '../src/components/updater/UpdateFloatingNotification.jsx'), 'utf-8');
  assert.ok(content.includes('startDownload'), 'Consome startDownload');
  assert.ok(content.includes('availableToDownload'), 'Calcula availableToDownload');
  assert.ok(content.includes('<span>Baixar</span>'), 'Renderiza botão [Baixar]');
  assert.ok(content.includes('<span>Reiniciar</span>'), 'Renderiza botão [Reiniciar]');
  assert.ok(content.includes('Mais Tarde'), 'Mantém opção de adiar respeitando o professor');
});

runTest('UpdateChangelogModal.jsx integra botão de download, progresso e transparência', () => {
  const content = fs.readFileSync(path.join(__dirname, '../src/components/updater/UpdateChangelogModal.jsx'), 'utf-8');
  assert.ok(content.includes('startDownload'), 'Consome startDownload');
  assert.ok(content.includes('<span>Baixar Atualização</span>'), 'Renderiza botão [Baixar Atualização]');
  assert.ok(content.includes('<span>Reiniciar e Instalar Agora</span>'), 'Renderiza botão [Reiniciar e Instalar]');
  assert.ok(content.includes('Download transparente sob demanda'), 'Apresenta nota de consentimento e franquia de dados');
});

// 5. Validação da sincronização em LicenseSettingsCard.jsx
runTest('LicenseSettingsCard.jsx consome useAutoUpdater e elimina estado duplicado', () => {
  const content = fs.readFileSync(path.join(__dirname, '../src/components/license/LicenseSettingsCard.jsx'), 'utf-8');
  assert.ok(content.includes("import { useAutoUpdater } from '../../hooks/useAutoUpdater'"), 'Importa useAutoUpdater');
  assert.ok(content.includes('isAvailableToDownload'), 'Consome isAvailableToDownload');
  assert.ok(content.includes('startDownload'), 'Consome startDownload');
  assert.ok(content.includes('openFloating'), 'Consome openFloating');
  assert.ok(!content.includes('const [updaterState, setUpdaterState]'), 'Não deve ter estado local isolado duplicado');
});

// 6. Validação do ciclo de vida de sessão no useAutoUpdater.js
runTest('useAutoUpdater.js garante escopo de sessão e purga bloqueios legados', () => {
  const content = fs.readFileSync(path.join(__dirname, '../src/hooks/useAutoUpdater.js'), 'utf-8');
  assert.ok(content.includes("const SNOOZE_SESSION_KEY = 'edusys_updater_snoozed_session_version'"), 'Usa chave de sessão');
  assert.ok(content.includes("sessionStorage.getItem(SNOOZE_SESSION_KEY)"), 'Consulta sessionStorage');
  assert.ok(content.includes("localStorage.removeItem('edusys_updater_snoozed_version')"), 'Purga chave legada do localStorage no boot');
  assert.ok(content.includes("localStorage.removeItem('edusys_updater_snoozed_at')"), 'Purga timestamp legado do localStorage');
});

console.log(`\n================================================================`);
console.log(`Testes Executados: ${totalTests} | Aprovados: ${passedTests} | Falhas: ${totalTests - passedTests}`);
if (totalTests === passedTests) {
  console.log('🎉 TODAS AS VALIDAÇÕES DA ETAPA 4 FORAM HOMOLOGADAS COM SUCESSO!');
  process.exit(0);
} else {
  console.error('❌ HOUVE FALHAS NA VALIDAÇÃO.');
  process.exit(1);
}
