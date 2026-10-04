import fs from 'fs';
import path from 'path';

console.log('🧪 Iniciando Auditoria de Não Regressão - Página Settings.jsx (Hub-and-Spoke)');

const settingsPath = path.resolve('src/pages/Settings.jsx');
const content = fs.readFileSync(settingsPath, 'utf8');

const checks = [
  { name: 'Importação useApp', pass: content.includes('useApp') },
  { name: 'Importação Icons', pass: content.includes('Icons') },
  { name: 'Importação LicenseSettingsCard', pass: content.includes('LicenseSettingsCard') },
  { name: 'Estado activeSection implementado', pass: content.includes('activeSection') && content.includes('setActiveSection') },
  { name: 'Visão Hub implementada', pass: content.includes("activeSection === null") },
  { name: 'Seção Pedagógica (pedagogical)', pass: content.includes("activeSection === 'pedagogical'") },
  { name: 'Seção Unidades (units)', pass: content.includes("activeSection === 'units'") },
  { name: 'Seção Turmas (turmas)', pass: content.includes("activeSection === 'turmas'") },
  { name: 'Seção Disciplinar (disciplinary)', pass: content.includes("activeSection === 'disciplinary'") },
  { name: 'Seção Backup (backup)', pass: content.includes("activeSection === 'backup'") },
  { name: 'Seção IA (ai)', pass: content.includes("activeSection === 'ai'") },
  { name: 'Seção Segurança (security)', pass: content.includes("activeSection === 'security'") },
  { name: 'Seção Licença (license)', pass: content.includes("activeSection === 'license'") },
  { name: 'Botão Voltar Unificado', pass: content.includes('Todas as Configurações') || content.includes('setActiveSection(null)') },
  { name: 'Preservação handleSaveSettingsSubmit', pass: content.includes('handleSaveSettingsSubmit') },
  { name: 'Preservação handleAdvanceUnit', pass: content.includes('handleAdvanceUnit') },
  { name: 'Preservação handleSwitchToUnit', pass: content.includes('handleSwitchToUnit') },
  { name: 'Preservação authSave e authDisable', pass: content.includes('authSave') && content.includes('authDisable') },
  { name: 'Preservação Modais Globais', pass: content.includes('setIsParamsModalOpen') && content.includes('setIsMetricsModalOpen') && content.includes('setIsAIModalOpen') && content.includes('setIsDisciplinaryModalOpen') },
];

let failed = 0;
checks.forEach(c => {
  if (c.pass) {
    console.log(`  ✅ [PASS] ${c.name}`);
  } else {
    console.error(`  ❌ [FAIL] ${c.name}`);
    failed++;
  }
});

if (failed === 0) {
  console.log('\n🎉 Todos os 19 testes estruturais de não regressão foram APROVADOS com 100% de conformidade!');
  process.exit(0);
} else {
  console.error(`\n🚨 Falha em ${failed} verificações estruturais.`);
  process.exit(1);
}
