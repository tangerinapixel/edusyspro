/**
 * Teste de Homologação e Não-Regressão da Calibração Cognitiva por Série
 */
const cognitive = require('../electron/services/cognitiveTierService');

console.log('================================================================');
console.log('INICIANDO HOMOLOGAÇÃO: CALIBRAÇÃO COGNITIVA POR SÉRIE (6º AO 9º)');
console.log('================================================================\n');

let allPassed = true;

// 1. Matriz de Turmas Reais do Sistema
const realTurmas = [
    { name: 'Português  6º Ano', expected: 6 },
    { name: 'Português 7º Ano', expected: 7 },
    { name: 'Português 8º Ano', expected: 8 },
    { name: 'Português 9º Ano', expected: 9 },
    { name: 'MPV / 6º Ano', expected: 6 },
    { name: 'MPV / 7º Ano', expected: 7 },
    { name: 'MPV / 8º Ano', expected: 8 },
    { name: 'MPV / 9º Ano', expected: 9 },
    { name: 'Turma Geral', expected: null }
];

console.log('1. Teste de Detecção com Nomes Reais das Turmas:');
for (const t of realTurmas) {
    const detected = cognitive.detectGradeLevel(t.name);
    const pass = detected === t.expected;
    if (!pass) allPassed = false;
    console.log(`   [${pass ? 'PASS' : 'FAIL'}] "${t.name}" -> Detectado: ${detected} (Esperado: ${t.expected})`);
}

// 2. Validação Específica do 6º Ano (Acolhimento e Transição)
console.log('\n2. Diretrizes Específicas do 6º Ano:');
const p6 = cognitive.buildCognitivePromptInstruction('Português 6º Ano');
const p6Checks = [
    { label: 'Identificação 6º Ano', cond: p6.includes('6º ANO') },
    { label: 'Foco em Acolhimento Leitor', cond: p6.includes('Acolhimento Leitor') },
    { label: 'Textos Curtos (2 a 3 parágrafos)', cond: p6.includes('2 a 3 parágrafos') },
    { label: 'Proibição de Termos Gramaticais Abstratos', cond: p6.includes('TERMINANTEMENTE PROIBIDO qualquer termo técnico') }
];
for (const c of p6Checks) {
    if (!c.cond) allPassed = false;
    console.log(`   [${c.cond ? 'PASS' : 'FAIL'}] ${c.label}`);
}

// 3. Validação Específica do 8º Ano (Eliminação de "Operadores Argumentativos")
console.log('\n3. Diretrizes Específicas do 8º Ano (Caso Relatado pelo Professor):');
const p8 = cognitive.buildCognitivePromptInstruction('Português 8º Ano');
const p8Checks = [
    { label: 'Identificação 8º Ano', cond: p8.includes('8º ANO') },
    { label: 'Proibição Expressa de "operadores argumentativos"', cond: p8.includes('operadores argumentativos') && p8.includes('TERMINANTEMENTE PROIBIDO') },
    { label: 'Obrigatoriedade de Exemplos entre Parênteses', cond: p8.includes('exemplos entre parênteses') },
    { label: 'Regra de Ouro (Clareza e Acessibilidade)', cond: p8.includes('A excelência pedagógica aqui é a CLAREZA') }
];
for (const c of p8Checks) {
    if (!c.cond) allPassed = false;
    console.log(`   [${c.cond ? 'PASS' : 'FAIL'}] ${c.label}`);
}

// 4. Validação Específica do 9º Ano (Maturidade Sem Pedantismo)
console.log('\n4. Diretrizes Específicas do 9º Ano:');
const p9 = cognitive.buildCognitivePromptInstruction('Português 9º Ano');
const p9Checks = [
    { label: 'Identificação 9º Ano', cond: p9.includes('9º ANO') },
    { label: 'Maturidade Leitora e Pensamento Crítico', cond: p9.includes('Maturidade Leitora') },
    { label: 'Proibição de Tom Formalista de Concurso/Vestibular', cond: p9.includes('concurso/vestibular') }
];
for (const c of p9Checks) {
    if (!c.cond) allPassed = false;
    console.log(`   [${c.cond ? 'PASS' : 'FAIL'}] ${c.label}`);
}

console.log('\n================================================================');
if (allPassed) {
    console.log('RESULTADO FINAL: TODOS OS TESTES PASSARAM COM SUCESSO (100% OK)');
} else {
    console.log('RESULTADO FINAL: FORAM DETECTADAS FALHAS NA HOMOLOGAÇÃO.');
    process.exit(1);
}
console.log('================================================================');
