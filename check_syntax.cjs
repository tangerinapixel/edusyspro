const parser = require('./node_modules/@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('./src/App.jsx', 'utf8');
const lines = code.split('\n');

function tryParse(testCode) {
  try {
    parser.parse(testCode, { sourceType: 'module', plugins: ['jsx'] });
    return null;
  } catch(e) {
    return e.loc.line;
  }
}

// Bissetar dentro de dashboard (1228-1325) com o arquivo completo após
const fullEnd = lines.slice(1325).join('\n');

let prevOk = true;
for (let cutLine = 1228; cutLine <= 1326; cutLine++) {
  const testStr = lines.slice(0, cutLine).join('\n') + '\n' + fullEnd;
  const err = tryParse(testStr);
  const wasOk = err === null;
  const trimmed = (lines[cutLine - 1] || '').trim().substring(0, 70);
  
  if (prevOk && !wasOk) {
    console.log(`\n🎯 PROBLEMA ENCONTRADO em L${cutLine}!`);
    console.log(`   Conteúdo: [${trimmed}]`);
    console.log(`   Erro em: L${err}`);
    console.log('\nContexto ampliado:');
    for (let c = cutLine - 5; c <= cutLine + 5 && c <= lines.length; c++) {
      const marker = c === cutLine ? '>>> ' : '    ';
      console.log(`${marker}L${c}: ${lines[c-1]}`);
    }
    break;
  }
  prevOk = wasOk;
}

if (prevOk) console.log('✅ Bloco dashboard (1228-1325) OK');
