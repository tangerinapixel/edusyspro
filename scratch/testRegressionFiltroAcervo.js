/**
 * Script de Auditoria e Homologação de Não-Regressão: Filtros do Acervo Didático
 */
const planService = require('../electron/services/planArchiveService');
const fs = require('fs');
const path = require('path');

async function runRegressionSuite() {
    console.log('================================================================');
    console.log('INICIANDO AUDITORIA DE NÃO-REGRESSÃO: ACERVO DIDÁTICO & PROVAS');
    console.log('================================================================\n');

    let allPassed = true;

    // 1. Integridade do Arquivo de Persistência
    const archivePath = path.join(__dirname, '..', 'lesson_plans_archive.json');
    if (!fs.existsSync(archivePath)) {
        console.error('ERRO: lesson_plans_archive.json não existe!');
        process.exit(1);
    }
    const rawArchive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
    console.log(`[PASS] Arquivo físico lesson_plans_archive.json verificado (${rawArchive.length} planos arquivados).`);

    // Verificar se algum plano ainda tem turmaId ou unitId nulo
    const invalidRecords = rawArchive.filter(p => p.turmaId === null || p.unitId === null);
    if (invalidRecords.length > 0) {
        console.error(`[FAIL] ${invalidRecords.length} registros contêm turmaId ou unitId nulo!`);
        allPassed = false;
    } else {
        console.log('[PASS] Todos os registros no acervo possuem turmaId e unitId válidos e preenchidos.');
    }

    // 2. Cenário Original do Bug: Selecionado 9º Ano / 3ª Unidade
    // O usuário reportava que ao selecionar 9º ano / 3ª unidade, cards mostravam planos do 6º ano.
    const sc1 = await planService.listPlans({
        turmaId: 4, // Português 9º Ano
        turmaName: 'Português 9º Ano',
        unitId: 3,  // 3ª Unidade
        unitLabel: '3ª Unidade'
    });
    console.log(`\nCenário 1: 9º Ano / 3ª Unidade -> ${sc1.count} plano(s) retornado(s).`);
    const leaked6AnoInSc1 = sc1.plans.filter(p => (p.turmaName || '').includes('6º') || p.turmaId === 5 || p.turmaId === 1);
    if (leaked6AnoInSc1.length > 0) {
        console.error('[FAIL] VAZAMENTO DETECTADO: Planos do 6º ano apareceram na consulta do 9º ano!');
        allPassed = false;
    } else {
        console.log('[PASS] Nenhum plano do 6º ano vazou na consulta do 9º ano.');
    }
    if (sc1.count === 0) {
        console.log('[PASS] Corretamente retornou 0 planos (o plano existente do 9º ano pertence à 2ª unidade).');
    }

    // 3. Cenário: 9º Ano / 2ª Unidade (Onde existe o plano real de 9º ano)
    const sc2 = await planService.listPlans({
        turmaId: 4,
        turmaName: 'Português 9º Ano',
        unitId: 2,
        unitLabel: '2ª Unidade'
    });
    console.log(`\nCenário 2: 9º Ano / 2ª Unidade -> ${sc2.count} plano(s) retornado(s).`);
    if (sc2.count === 1 && sc2.plans[0].tema === 'Verbos no infinitivo' && sc2.plans[0].turmaId === 4) {
        console.log('[PASS] Plano do 9º ano localizado perfeitamente com metadados corretos.');
    } else {
        console.error('[FAIL] Falha ao recuperar plano do 9º ano na 2ª unidade.');
        allPassed = false;
    }

    // 4. Cenário: 9º Ano / Todas as Unidades
    const sc3 = await planService.listPlans({
        turmaId: 4,
        turmaName: 'Português 9º Ano',
        unitId: 'todas'
    });
    console.log(`\nCenário 3: 9º Ano / Todas as Unidades -> ${sc3.count} plano(s) retornado(s).`);
    if (sc3.count === 1 && sc3.plans[0].turmaId === 4) {
        console.log('[PASS] Apenas o plano do 9º ano foi retornado. Zero planos do 6º ano.');
    } else {
        console.error('[FAIL] Contagem inesperada para 9º ano / Todas as Unidades.');
        allPassed = false;
    }

    // 5. Cenário: MPV / 6º Ano (Turma ID 5)
    const sc4 = await planService.listPlans({
        turmaId: 5,
        turmaName: 'MPV / 6º Ano'
    });
    console.log(`\nCenário 4: MPV / 6º Ano -> ${sc4.count} plano(s) retornado(s).`);
    if (sc4.count === 8) {
        console.log('[PASS] Todos os 8 planos de MPV 6º ano recuperados com integridade.');
    } else {
        console.error(`[FAIL] Esperava 8 planos para MPV 6º ano, obteve ${sc4.count}`);
        allPassed = false;
    }

    // 6. Cenário: Todas as Turmas / Todas as Unidades
    const sc5 = await planService.listPlans({
        turmaId: 'todas',
        unitId: 'todas'
    });
    console.log(`\nCenário 5: Todas as Turmas / Todas as Unidades -> ${sc5.count} planos retornados.`);
    if (sc5.count === 9) {
        console.log('[PASS] O acervo completo de 9 planos foi retornado.');
    } else {
        console.error(`[FAIL] Esperava 9 planos no acervo geral, obteve ${sc5.count}`);
        allPassed = false;
    }

    console.log('\n================================================================');
    if (allPassed) {
        console.log('RESULTADO FINAL: TODOS OS 6 TESTES DE HOMOLOGAÇÃO PASSARAM COM SUCESSO (100% OK)');
    } else {
        console.log('RESULTADO FINAL: FORAM DETECTADAS FALHAS NOS TESTES.');
        process.exit(1);
    }
    console.log('================================================================');
}

runRegressionSuite();
