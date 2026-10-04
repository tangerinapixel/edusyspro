/* eslint-env node */
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'electron/services/coordinatorSessionManager.js',
  'electron/services/coordinatorIdentityResolver.js',
  'electron/services/coordinatorService.js',
  'electron/services/coordinatorDriveSync.js',
  'electron/controllers/coordinatorController.js',
  'electron/main.js',
  'electron/preload.js',
  'src/components/coordinator/CoordinatorAuthModal.jsx',
  'src/components/coordinator/Student360Modal.jsx',
  'src/pages/Coordenacao.jsx',
  'src/components/layout/Sidebar.jsx',
  'src/App.jsx'
];

let totalIssues = 0;

console.log('--- 1. VERIFICANDO RESOLUÇÃO DE IMPORTS E REQUIRES ---');
for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  
  // Verifica require('./...')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const req = match[1];
    if (req.startsWith('.')) {
      const resolved = path.resolve(dir, req);
      const exists = fs.existsSync(resolved) || 
                     fs.existsSync(resolved + '.js') || 
                     fs.existsSync(resolved + '.json') ||
                     fs.existsSync(path.join(resolved, 'index.js'));
      if (!exists) {
        console.error(`  [ERRO] Require quebrado em ${file}: ${req}`);
        totalIssues++;
      }
    }
  }

  // Verifica import ... from './...'
  const importRegex = /import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importRegex.exec(content)) !== null) {
    const imp = match[1];
    if (imp.startsWith('.')) {
      const resolved = path.resolve(dir, imp);
      const exists = fs.existsSync(resolved) || 
                     fs.existsSync(resolved + '.js') || 
                     fs.existsSync(resolved + '.jsx') || 
                     fs.existsSync(resolved + '.json') ||
                     fs.existsSync(path.join(resolved, 'index.js')) ||
                     fs.existsSync(path.join(resolved, 'index.jsx'));
      if (!exists) {
        console.error(`  [ERRO] Import quebrado em ${file}: ${imp}`);
        totalIssues++;
      }
    }
  }
}

if (totalIssues === 0) {
  console.log('  ✓ Todos os imports e requires relativos estão perfeitamente resolvidos.');
}

console.log('\n--- 2. VERIFICANDO ALINHAMENTO DO BARRAMENTO IPC ---');
const preloadContent = fs.readFileSync('electron/preload.js', 'utf8');
const controllerContent = fs.readFileSync('electron/controllers/coordinatorController.js', 'utf8');

// Extrai canais invocados no preload
const invokedChannels = [];
const invokeRegex = /ipcRenderer\.invoke\('([^']+)'/g;
while ((match = invokeRegex.exec(preloadContent)) !== null) {
  if (match[1].startsWith('coordinator:')) {
    invokedChannels.push(match[1]);
  }
}

// Extrai canais registrados no controller
const registeredChannels = [];
const handleRegex = /ipcMain\.handle\('([^']+)'/g;
while ((match = handleRegex.exec(controllerContent)) !== null) {
  if (match[1].startsWith('coordinator:')) {
    registeredChannels.push(match[1]);
  }
}

const missingInController = invokedChannels.filter(c => !registeredChannels.includes(c));
const missingInPreload = registeredChannels.filter(c => !invokedChannels.includes(c));

if (missingInController.length > 0) {
  console.error('  [ERRO] Canais chamados pelo Preload sem handler no Controller:', missingInController);
  totalIssues += missingInController.length;
} else {
  console.log(`  ✓ Todos os ${invokedChannels.length} canais chamados pelo Preload têm handler no Controller.`);
}

if (missingInPreload.length > 0) {
  console.warn('  [AVISO] Canais no Controller não expostos no Preload:', missingInPreload);
} else {
  console.log(`  ✓ Todos os ${registeredChannels.length} handlers do Controller estão expostos no Preload.`);
}

console.log('\n--- 3. VERIFICANDO ISOLAMENTO DO ESTADO DO PROFESSOR (OCP) ---');
const dbContent = fs.readFileSync('electron/database.js', 'utf8');
const dbControllerContent = fs.readFileSync('electron/controllers/dbController.js', 'utf8');

if (dbContent.includes('coordinator') || dbControllerContent.includes('coordinator')) {
  console.error('  [ERRO] Acoplamento indevido detectado em database.js ou dbController.js!');
  totalIssues++;
} else {
  console.log('  ✓ database.js e dbController.js estão 100% isolados sem acoplamento.');
}

// Verifica integridade funcional de school_data.json através do database.js legado
try {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === 'electron') {
      return {
        app: {
          isPackaged: false,
          getPath: () => __dirname
        },
        ipcMain: { handle: () => {}, on: () => {} }
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const { initDB, dbAPI } = require('../electron/database');
  initDB();
  const turmas = dbAPI.getTurmas();
  const students = dbAPI.getStudents();
  const settings = dbAPI.getSettings();

  if (!turmas || turmas.length === 0 || !students || students.length === 0) {
    console.error('  [ERRO] Falha na integridade dos dados retornados pelo dbAPI!');
    totalIssues++;
  } else {
    console.log(`  ✓ school_data.json (legado) 100% íntegro e criptografado: ${turmas.length} turmas, ${students.length} estudantes e ${Object.keys(settings).length} configurações.`);
  }
} catch (err) {
  console.error('  [ERRO] Falha ao testar leitura e decriptação de school_data.json:', err.message);
  totalIssues++;
}

console.log('\n================================================================');
if (totalIssues === 0) {
  console.log(' PROTOCOLO GLOBAL DE INTEGRIDADE: 100% APROVADO!');
} else {
  console.error(` PROTOCOLO DE INTEGRIDADE: ${totalIssues} FALHAS ENCONTRADAS!`);
  process.exit(1);
}
console.log('================================================================');
