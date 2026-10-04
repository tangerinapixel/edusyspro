/**
 * Bateria Completa e Unificada de Testes de Não-Regressão Automatizados
 * Sistema de Gestão Pedagógica - EduSys Pro
 */
const path = require('path');
const fs = require('fs');

async function runFullSuite() {
    console.log('================================================================');
    console.log('EXECUTANDO SUÍTE INTEGRADA DE NÃO-REGRESSÃO E HOMOLOGAÇÃO');
    console.log('================================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    function assertTest(description, condition) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  [PASS] ${description}`);
        } else {
            console.error(`  [FAIL] ${description}`);
        }
    }

    // BLOCO 1: FILTROS E INTEGRIDADE DO ACERVO PEDAGÓGICO
    console.log('BLOCO 1: FILTRAGEM E PERSISTÊNCIA DO ACERVO DIDÁTICO');
    const planArchiveService = require('../electron/services/planArchiveService');
    const archiveFile = path.join(__dirname, '..', 'lesson_plans_archive.json');

    assertTest('Arquivo físico lesson_plans_archive.json existe e é legível', fs.existsSync(archiveFile));
    const plansData = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    assertTest('Nenhum registro no acervo possui turmaId ou unitId nulo', !plansData.some(p => p.turmaId === null || p.unitId === null));

    // Teste de isolamento de 9º ano
    const res9ano = await planArchiveService.listPlans({ turmaId: 4, turmaName: 'Português 9º Ano', unitId: 3, unitLabel: '3ª Unidade' });
    assertTest('Filtro 9º Ano / 3ª Unidade retorna exatamente 0 planos (sem vazar 6º ano)', res9ano.count === 0);

    const res9anoUnid2 = await planArchiveService.listPlans({ turmaId: 4, turmaName: 'Português 9º Ano', unitId: 2, unitLabel: '2ª Unidade' });
    assertTest('Filtro 9º Ano / 2ª Unidade retorna 1 plano pertencente ao 9º ano', res9anoUnid2.count === 1 && res9anoUnid2.plans[0].turmaId === 4);

    const res6ano = await planArchiveService.listPlans({ turmaId: 5, turmaName: 'MPV / 6º Ano' });
    assertTest('Filtro MPV / 6º Ano retorna os 8 planos pertencentes ao 6º ano', res6ano.count === 8);

    const resTodas = await planArchiveService.listPlans({});
    assertTest('Filtro Todas as Turmas retorna todos os 9 planos arquivados', resTodas.count === 9);

    // BLOCO 2: MATRIZ DE CALIBRAÇÃO COGNITIVA POR SÉRIE (6º AO 9º ANO)
    console.log('\nBLOCO 2: CALIBRAÇÃO COGNITIVA POR SÉRIE');
    const cognitiveService = require('../electron/services/cognitiveTierService');

    assertTest('Detecção precisa de 6º Ano em turma "Português  6º Ano"', cognitiveService.detectGradeLevel('Português  6º Ano') === 6);
    assertTest('Detecção precisa de 6º Ano em turma "MPV / 6º Ano"', cognitiveService.detectGradeLevel('MPV / 6º Ano') === 6);
    assertTest('Detecção precisa de 7º Ano em turma "Português 7º Ano"', cognitiveService.detectGradeLevel('Português 7º Ano') === 7);
    assertTest('Detecção precisa de 8º Ano em turma "Português 8º Ano"', cognitiveService.detectGradeLevel('Português 8º Ano') === 8);
    assertTest('Detecção precisa de 9º Ano em turma "Português 9º Ano"', cognitiveService.detectGradeLevel('Português 9º Ano') === 9);

    const prompt6 = cognitiveService.buildCognitivePromptInstruction('Português 6º Ano');
    assertTest('Diretriz do 6º Ano impõe textos curtos e proíbe termos técnicos', prompt6.includes('2 a 3 parágrafos') && prompt6.includes('TERMINANTEMENTE PROIBIDO qualquer termo técnico'));

    const prompt8 = cognitiveService.buildCognitivePromptInstruction('Português 8º Ano');
    assertTest('Diretriz do 8º Ano proíbe expressamente "operadores argumentativos"', prompt8.includes('operadores argumentativos') && prompt8.includes('TERMINANTEMENTE PROIBIDO'));
    assertTest('Diretriz do 8º Ano exige exemplos entre parênteses para articuladores', prompt8.includes('exemplos entre parênteses'));

    const prompt9 = cognitiveService.buildCognitivePromptInstruction('Português 9º Ano');
    assertTest('Diretriz do 9º Ano proíbe pedantismo de vestibular/concurso', prompt9.includes('concurso/vestibular'));

    // BLOCO 3: INTEGRIDADE DE SERVIÇOS E CONTROLADORES
    console.log('\nBLOCO 3: INTEGRIDADE SINTÁTICA E ARQUITETURAL DOS SERVIÇOS');
    const examServicePath = path.join(__dirname, '..', 'electron', 'services', 'examGeneratorService.js');
    const aiControllerPath = path.join(__dirname, '..', 'electron', 'controllers', 'aiController.js');

    assertTest('examGeneratorService.js contém importação de cognitiveTierService', fs.readFileSync(examServicePath, 'utf8').includes('cognitiveTierService'));
    assertTest('examGeneratorService.js contém injeção de DNA do Arquiteto (settings)', fs.readFileSync(examServicePath, 'utf8').includes('DNA DO ARQUITETO'));
    assertTest('aiController.js contém importação de cognitiveTierService', fs.readFileSync(aiControllerPath, 'utf8').includes('cognitiveTierService'));
    assertTest('aiController.js injeta cognitiveTierPrompt nas instruções de IA', fs.readFileSync(aiControllerPath, 'utf8').includes('cognitiveTierPrompt'));

    // BLOCO 4: CALIBRAÇÃO DE UX NO FRONTEND
    console.log('\nBLOCO 4: CALIBRAÇÃO DE UX E RESPONSIVIDADE DO ACERVO');
    const acervoPagePath = path.join(__dirname, '..', 'src', 'pages', 'AcervoPedagogico.jsx');
    const acervoDetailPath = path.join(__dirname, '..', 'src', 'components', 'acervo', 'AcervoDetailView.jsx');
    const acervoCardPath = path.join(__dirname, '..', 'src', 'components', 'acervo', 'AcervoCardGrid.jsx');

    const acervoPageContent = fs.readFileSync(acervoPagePath, 'utf8');
    assertTest('AcervoPedagogico.jsx contém truncate responsivo e tooltip title no sub-header', acervoPageContent.includes('truncate') && acervoPageContent.includes('title={selectedPlan'));

    const acervoDetailContent = fs.readFileSync(acervoDetailPath, 'utf8');
    assertTest('AcervoDetailView.jsx contém truncate responsivo e title no cabeçalho de aula', acervoDetailContent.includes('truncate') && acervoDetailContent.includes('title={plan.tema'));

    const acervoCardContent = fs.readFileSync(acervoCardPath, 'utf8');
    assertTest('AcervoCardGrid.jsx possui atributo title para leitura completa no hover', acervoCardContent.includes('title={plan.tema'));

    console.log('\n================================================================');
    console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`);
    console.log(`TESTES APROVADOS: ${passedTests}`);
    console.log(`TESTES COM FALHA: ${totalTests - passedTests}`);
    console.log('================================================================');

    if (passedTests === totalTests) {
        console.log('STATUS: HOMOLOGAÇÃO TOTAL CONCLUÍDA COM 100% DE SUCESSO.');
    } else {
        console.error('STATUS: DETECTADAS NÃO-CONFORMIDADES.');
        process.exit(1);
    }
}

runFullSuite();
