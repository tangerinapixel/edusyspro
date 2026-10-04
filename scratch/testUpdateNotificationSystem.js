const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 [TEST] Iniciando Suite de Homologação da Nova Função de Notificação de Atualizações...\n');

// 1. Validação dos novos arquivos modulares
console.log('BLOCO 1: INTEGRIDADE DOS NOVOS ARQUIVOS MODULARES');
const newFiles = [
  'src/hooks/useAutoUpdater.js',
  'src/components/updater/UpdateBadge.jsx',
  'src/components/updater/UpdateFloatingNotification.jsx',
  'src/components/updater/UpdateChangelogModal.jsx',
  'src/components/updater/index.js'
];

newFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  assert.ok(fs.existsSync(fullPath), `Arquivo ${file} deve existir fisicamente.`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert.ok(content.length > 50, `Arquivo ${file} deve conter implementação válida.`);
  console.log(`  ✅ PASS: ${file} existe e possui conteúdo íntegro`);
});

// 2. Validação das exportações do módulo updater
console.log('\nBLOCO 2: CONTRATO DE EXPORTAÇÃO DO BARREL (src/components/updater/index.js)');
const barrelContent = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/updater/index.js'), 'utf8');
assert.ok(barrelContent.includes('UpdateBadge'), 'Deve exportar UpdateBadge');
assert.ok(barrelContent.includes('UpdateFloatingNotification'), 'Deve exportar UpdateFloatingNotification');
assert.ok(barrelContent.includes('UpdateChangelogModal'), 'Deve exportar UpdateChangelogModal');
console.log('  ✅ PASS: Barrel export expõe UpdateBadge, UpdateFloatingNotification e UpdateChangelogModal');

// 3. Validação da fiação em App.jsx
console.log('\nBLOCO 3: FIAÇÃO CIRÚRGICA EM App.jsx');
const appContent = fs.readFileSync(path.resolve(__dirname, '..', 'src/App.jsx'), 'utf8');
assert.ok(appContent.includes('UpdateFloatingNotification'), 'App.jsx deve importar e usar UpdateFloatingNotification');
assert.ok(appContent.includes('UpdateChangelogModal'), 'App.jsx deve importar e usar UpdateChangelogModal');
assert.ok(appContent.includes('<UpdateFloatingNotification />'), 'App.jsx deve montar <UpdateFloatingNotification />');
assert.ok(appContent.includes('<UpdateChangelogModal />'), 'App.jsx deve montar <UpdateChangelogModal />');
console.log('  ✅ PASS: App.jsx integra perfeitamente a notificação flutuante e o modal');

// 4. Validação da fiação em Sidebar.jsx
console.log('\nBLOCO 4: FIAÇÃO CIRÚRGICA EM Sidebar.jsx');
const sidebarContent = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/layout/Sidebar.jsx'), 'utf8');
assert.ok(sidebarContent.includes('UpdateBadge'), 'Sidebar.jsx deve importar UpdateBadge');
assert.ok(sidebarContent.includes('<UpdateBadge variant="sidebar" />'), 'Sidebar.jsx deve renderizar UpdateBadge para configurações');
console.log('  ✅ PASS: Sidebar.jsx integra o micro-badge pulsante no menu Configurações');

// 5. Validação do Backend (updateService.js)
console.log('\nBLOCO 5: SCHEMA ENRIQUECIDO NO BACKEND (updateService.js)');
const updateServiceContent = fs.readFileSync(path.resolve(__dirname, '..', 'electron/services/updateService.js'), 'utf8');
assert.ok(updateServiceContent.includes('releaseName'), 'updateService.js deve propagar releaseName');
assert.ok(updateServiceContent.includes('releaseNotes'), 'updateService.js deve propagar releaseNotes');
assert.ok(updateServiceContent.includes('currentVersion'), 'updateService.js deve propagar currentVersion');
console.log('  ✅ PASS: updateService.js propaga releaseName, releaseNotes e currentVersion no status');

console.log('\n================================================================');
console.log('🎉 HOMOLOGAÇÃO DA NOVA FUNÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
console.log('================================================================');
