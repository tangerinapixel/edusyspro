/* eslint-env node */
/**
 * Suíte de Testes Automatizados de Não-Regressão
 * Módulo: Coordenação Pedagógica Multi-Curricular & Dossiê
 */

const path = require('path');
const fs = require('fs');

async function runRegressionSuite() {
    console.log("================================================================================");
    console.log(" INICIANDO TESTES AUTOMATIZADOS DE NÃO-REGRESSÃO - COORDENAÇÃO PEDAGÓGICA");
    console.log("================================================================================\n");

    const sessionManager = require('../electron/services/coordinatorSessionManager');
    const identityResolver = require('../electron/services/coordinatorIdentityResolver');
    const coordinatorService = require('../electron/services/coordinatorService');
    const unitDossierService = require('../electron/services/coordinatorUnitDossierService');

    let totalTests = 0;
    let passedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (!condition) {
            console.error(`  ❌ FALHA no Teste ${totalTests}: ${message}`);
            throw new Error(message);
        } else {
            passedTests++;
            console.log(`  ✓ Teste ${totalTests} passou: ${message}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 1: Autenticação Segura e Elevação de Sessão
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 1] Autenticação da Coordenação e Sessão Segura");
    sessionManager.setupCoordinatorPin('2026', 'Genilson Freitas');
    const auth = sessionManager.verifyAndElevate('2026');
    assert(auth.success === true, "Elevação de sessão da coordenação via PIN e PBKDF2");
    assert(sessionManager.isSessionActive() === true, "Guarda de sessão ativa em memória");

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 2: Integridade Multi-Curricular do Índice de Docentes (manifest.json)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 2] Atribuições Curriculares e Indexação de Docentes");
    const overview = coordinatorService.getSchoolOverview();
    assert(overview.success === true, "Visão geral da escola obtida com sucesso");
    assert(overview.teachers.length === 1, "Exatamente 1 professor integrado no cofre");

    const prof = overview.teachers[0];
    assert(prof.name === 'Roni Moreira', "Nome do docente identificado como Roni Moreira");
    assert(Array.isArray(prof.disciplines) && prof.disciplines.length === 2, "Docente possui exatamente 2 disciplinas lecionadas");
    assert(prof.disciplines.includes('Língua Portuguesa'), "Cadeira de Língua Portuguesa indexada");
    assert(prof.disciplines.includes('Projeto de Vida (MPV)'), "Cadeira de Projeto de Vida (MPV) indexada");

    const mapLP = prof.disciplines_map['Língua Portuguesa'];
    const mapMPV = prof.disciplines_map['Projeto de Vida (MPV)'];
    assert(mapLP && mapLP.count === 4, "Língua Portuguesa lecionada para exatamente 4 turmas (6º ao 9º)");
    assert(mapMPV && mapMPV.count === 4, "Projeto de Vida (MPV) lecionado para exatamente 4 turmas (6º ao 9º)");
    assert(prof.turmas.length === 8, "Total consolidado de 8 turmas atribuídas");

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 3: Desacoplamento Fidedigno entre Docentes e Disciplinas de Estudantes
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 3] Contagem Real de Docentes e Componentes Curriculares por Aluno");
    assert(overview.students.length > 0, "Lista de estudantes canônicos carregada");
    
    // Testa amostra de estudantes da escola
    overview.students.slice(0, 10).forEach((st) => {
        assert(st.teachers_count === 1, `Estudante "${st.canonical_name}" possui exatamente 1 docente real vinculado (Prof. Roni Moreira)`);
        assert(st.disciplines_count === 2, `Estudante "${st.canonical_name}" cursa exatamente 2 componentes curriculares (LP + MPV)`);
        assert(st.teacher_names.includes('Roni Moreira'), `Estudante "${st.canonical_name}" aponta para o docente correto`);
        assert(st.disciplines.includes('Língua Portuguesa') && st.disciplines.includes('Projeto de Vida (MPV)'), `Estudante "${st.canonical_name}" contém as duas disciplinas discriminadas`);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 4: Não-Omissão de Disciplinas no Cache de Agregados Escolar
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 4] Cache de Agregados e Métricas Globais da Instituição");
    const agg = overview.overview;
    assert(Array.isArray(agg.disciplines), "Array de disciplinas globais presente no cache");
    assert(agg.disciplines.includes('Língua Portuguesa'), "Língua Portuguesa presente no filtro institucional");
    assert(agg.disciplines.includes('Projeto de Vida (MPV)'), "Projeto de Vida (MPV) presente no filtro institucional");
    assert(typeof agg.school_average === 'number' && !isNaN(agg.school_average), `Média escolar computada com sucesso (${agg.school_average})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 5: Dossiê 360º de Aluno Individual e Motor de Notas
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 5] Dossiê 360º de Aluno e Consistência Multi-Disciplinar");
    const sampleStudent = overview.students[0];
    const dossierRes = coordinatorService.getStudent360(sampleStudent.canonical_id);
    assert(dossierRes.success === true, "Dossiê 360º aberto via coordinatorService");
    assert(dossierRes.student.canonical_name === sampleStudent.canonical_name, "Nome do estudante canônico congruente no Dossiê");
    assert(dossierRes.student.disciplines.length === 2, "Dossiê consolida as 2 disciplinas cursadas pelo estudante");
    assert(typeof dossierRes.student.overall_average === 'number', `Média geral ponderada válida (${dossierRes.student.overall_average})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TESTE 6: Dossiê Segmentado por Unidade (coordinatorUnitDossierService)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n[BLOCO 6] Dossiê Segmentado por Unidades (1ª Unidade vs Todas)");
    const unit1Res = unitDossierService.getStudent360ByUnit(sampleStudent.canonical_id, 1);
    assert(unit1Res.success === true, "Dossiê filtrado para 1ª Unidade gerado com sucesso");
    assert(unit1Res.selected_unit === 1, "Unidade ativa do Dossiê é 1");
    assert(Array.isArray(unit1Res.dossier.disciplines) && unit1Res.dossier.disciplines.length === 2, "Disciplinas presentes no dossiê da unidade 1");

    // Limpeza da sessão
    sessionManager.lockSession();

    console.log("\n================================================================================");
    console.log(` RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO (100%)`);
    console.log(" NENHUMA REGRESSÃO DETECTADA NO BACKEND, COFRE OU MOTORES DE CÁLCULO");
    console.log("================================================================================\n");
}

runRegressionSuite().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("FATAL ERROR NA SUÍTE DE TESTES:", err);
    process.exit(1);
});
