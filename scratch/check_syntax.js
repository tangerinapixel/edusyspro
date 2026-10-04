const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');

const JSXParser = acorn.Parser.extend(jsx());

try {
  const code = fs.readFileSync('e:/Gestão Pedagógica - Novo/src/components/modals/GlobalModals.jsx', 'utf8');
  JSXParser.parse(code, { sourceType: 'module', ecmaVersion: 2020 });
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax Error:', e.message);
  console.error('At position:', e.pos);
  console.error('Line:', e.loc ? e.loc.line : 'unknown');
}
