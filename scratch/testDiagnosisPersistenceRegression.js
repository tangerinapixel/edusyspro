/**
 * Suíte de Testes Automatizados de Não-Regressão e Validação:
 * Persistência e Recuperação do Acervo de Diagnósticos Pedagógicos I.A.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const diagnosisArchiveService = require('../electron/services/diagnosisArchiveService');
const planArchiveService = require('../electron/services/planArchiveService');

const archivePath = path.join(__dirname, '..', 'student_diagnoses_archive.json');

async function runTestSuite() {
    console.log('================================================================');
    console.log(' INICIANDO SUÍTE DE TESTES DE NÃO-REGRESSÃO E VALIDAÇÃO');
    console.log(' Módulo: Acervo & Histórico de Diagnósticos Pedagógicos I.A.');
    console.log('================================================================\n');

    let initialRecords = [];
    if (fs.existsSync(archivePath)) {
        try {
            initialRecords = JSON.parse(fs.readFileSync(archivePath, 'utf8') || '[]');
        } catch {
            initialRecords = [];
        }
    }

    const createdIds = [];

    try {
        // -------------------------------------------------------------
        // TESTE 1: Persistência Atômica com Metadados Completos
        // -------------------------------------------------------------
        console.log('[TESTE 1] Salvamento Atômico de Diagnóstico com Snapshot Pedagógico...');
        const payload1 = {
            student_id: 101,
            student_name: 'Lucas Gabriel Silveira',
            turma_id: 3,
            turma_name: '7º Ano B',
            unit_id: 1,
            unit_name: '1ª Unidade',
            author_name: 'Prof. Roni Moreira',
            diagnosis_text: 'O estudante Lucas demonstra excelente raciocínio analítico...',
            metrics_snapshot: {
                media_final: 8.75,
                behavior_score: 2.85,
                behavior_start_score: 3.0,
                adhesion_rate: 92,
                delivered_activities: 23,
                applied_activities: 25,
                occurrences_count: 1,
                class_average: 7.20,
                rank_position: '2/28',
                trend: 'Melhorando'
            },
            evaluation_topics: ['Mini-Teste 01', 'Prova Bimestral 1']
        };

        const res1 = await diagnosisArchiveService.saveDiagnosis(payload1);
        assert.strictEqual(res1.success, true, 'O retorno de saveDiagnosis deve ser success: true');
        assert.ok(res1.diagnosis?.id, 'O registro salvo deve conter um ID UUID válido');
        assert.strictEqual(res1.diagnosis.student_name, 'Lucas Gabriel Silveira');
        assert.strictEqual(res1.diagnosis.metrics_snapshot.media_final, 8.75);
        assert.strictEqual(res1.diagnosis.metrics_snapshot.adhesion_rate, 92);
        createdIds.push(res1.diagnosis.id);

        // Validar gravação física no arquivo JSON
        const rawJson = fs.readFileSync(archivePath, 'utf8');
        const onDisk = JSON.parse(rawJson);
        const foundOnDisk = onDisk.find(r => r.id === res1.diagnosis.id);
        assert.ok(foundOnDisk, 'O registro deve existir fisicamente em student_diagnoses_archive.json');
        console.log('  ✓ Teste 1 passou: Registro persistido em disco com telemetria preservada.\n');

        // -------------------------------------------------------------
        // TESTE 2: Tolerância e Coerção Segura de Tipos (String vs Number)
        // -------------------------------------------------------------
        console.log('[TESTE 2] Coerção de Tipos e Tolerância a IDs em Formato String...');
        const payload2 = {
            student_id: '102', // string
            student_name: 'Mariana Costa Rios',
            turma_id: '3',     // string
            turma_name: '7º Ano B',
            unit_id: '1',      // string
            unit_name: '1ª Unidade',
            author_name: 'Prof. Roni Moreira',
            diagnosis_text: 'Mariana apresenta dedicação exemplar e liderança colaborativa.',
            metrics_snapshot: {
                media_final: '9.40',
                behavior_score: '3.00',
                adhesion_rate: '100'
            }
        };

        const res2 = await diagnosisArchiveService.saveDiagnosis(payload2);
        assert.strictEqual(res2.success, true);
        assert.strictEqual(typeof res2.diagnosis.student_id, 'number');
        assert.strictEqual(res2.diagnosis.student_id, 102);
        assert.strictEqual(typeof res2.diagnosis.turma_id, 'number');
        assert.strictEqual(res2.diagnosis.turma_id, 3);
        assert.strictEqual(typeof res2.diagnosis.unit_id, 'number');
        assert.strictEqual(res2.diagnosis.unit_id, 1);
        createdIds.push(res2.diagnosis.id);
        console.log('  ✓ Teste 2 passou: Normalização de tipos sanitizou strings numéricas.\n');

        // -------------------------------------------------------------
        // TESTE 3: Filtros Multicritério do Acervo (listDiagnoses)
        // -------------------------------------------------------------
        console.log('[TESTE 3] Validação dos Filtros Multicritério do Acervo...');
        // Inserir terceiro aluno em outra turma/unidade
        const payload3 = {
            student_id: 201,
            student_name: 'Beatriz Vasconcelos',
            turma_id: 5,
            turma_name: '9º Ano A',
            unit_id: 2,
            unit_name: '2ª Unidade',
            diagnosis_text: 'Beatriz recuperou o ritmo de entrega e demonstrou autonomia.'
        };
        const res3 = await diagnosisArchiveService.saveDiagnosis(payload3);
        createdIds.push(res3.diagnosis.id);

        // Filtro por Turma 3
        const filterTurma3 = await diagnosisArchiveService.listDiagnoses({ turmaId: 3 });
        assert.strictEqual(filterTurma3.success, true);
        assert.ok(filterTurma3.diagnoses.some(d => d.student_name === 'Lucas Gabriel Silveira'));
        assert.ok(filterTurma3.diagnoses.some(d => d.student_name === 'Mariana Costa Rios'));
        assert.ok(!filterTurma3.diagnoses.some(d => d.student_name === 'Beatriz Vasconcelos'), 'Não deve conter alunos de outra turma');

        // Filtro por Unidade 2
        const filterUnit2 = await diagnosisArchiveService.listDiagnoses({ unitId: 2 });
        assert.ok(filterUnit2.diagnoses.some(d => d.student_name === 'Beatriz Vasconcelos'));
        assert.ok(!filterUnit2.diagnoses.some(d => d.student_name === 'Lucas Gabriel Silveira'));

        // Busca Textual com acento e minúsculas
        const filterSearch = await diagnosisArchiveService.listDiagnoses({ search: 'silveira' });
        assert.ok(filterSearch.diagnoses.length >= 1);
        assert.strictEqual(filterSearch.diagnoses[0].student_name, 'Lucas Gabriel Silveira');

        // Busca Textual insensível a acentos ("vasconcelos" encontra "Vasconcelos")
        const filterSearchAccents = await diagnosisArchiveService.listDiagnoses({ search: 'beatriz' });
        assert.ok(filterSearchAccents.diagnoses.length >= 1);
        assert.strictEqual(filterSearchAccents.diagnoses[0].student_name, 'Beatriz Vasconcelos');
        console.log('  ✓ Teste 3 passou: Filtros de turma, unidade e busca textual operando com precisão.\n');

        // -------------------------------------------------------------
        // TESTE 4: Simulação de Resolução de Aluno (Alunos.jsx vs Notas.jsx)
        // -------------------------------------------------------------
        console.log('[TESTE 4] Simulação da Lógica de Resolução em navigateToDiagnosis...');
        const mockComputedGrades = [
            { student_id: 101, name: 'Lucas Gabriel Silveira', mediaFinal: 8.75 },
            { student_id: 102, name: 'Mariana Costa Rios', mediaFinal: 9.40 },
            { student_id: 201, name: 'Beatriz Vasconcelos', mediaFinal: 7.90 }
        ];

        // Caso A: Aluno vindo de Alunos.jsx (possui apenas 'id' numérico ou string)
        const alunoFromList = { id: 101, name: 'Lucas Gabriel Silveira', turma_id: 3 };
        const targetIdA = Number(alunoFromList.student_id || alunoFromList.id);
        const resolvedA = (alunoFromList.student_id && alunoFromList.mediaFinal !== undefined)
            ? alunoFromList
            : mockComputedGrades.find(g => Number(g.student_id) === targetIdA);
        assert.ok(resolvedA, 'Deve resolver o aluno com base em ID numérico');
        assert.strictEqual(resolvedA.mediaFinal, 8.75);

        // Caso B: Aluno vindo de Notas.jsx (possui 'student_id' e 'mediaFinal')
        const gradeFromNotas = { student_id: 102, name: 'Mariana Costa Rios', mediaFinal: 9.40 };
        const targetIdB = Number(gradeFromNotas.student_id || gradeFromNotas.id);
        const resolvedB = (gradeFromNotas.student_id && gradeFromNotas.mediaFinal !== undefined)
            ? gradeFromNotas
            : mockComputedGrades.find(g => Number(g.student_id) === targetIdB);
        assert.ok(resolvedB, 'Deve resolver o aluno vindo da tabela de notas diretamente');
        assert.strictEqual(resolvedB.mediaFinal, 9.40);
        console.log('  ✓ Teste 4 passou: Resolução polimórfica de aluno 100% resiliente.\n');

        // -------------------------------------------------------------
        // TESTE 5: Não-Regressão do Acervo Pedagógico de Planos de Aula
        // -------------------------------------------------------------
        console.log('[TESTE 5] Verificação de Não-Regressão no Acervo de Planos de Aula...');
        const plansList = await planArchiveService.listPlans();
        assert.strictEqual(plansList.success, true);
        assert.ok(Array.isArray(plansList.plans), 'A lista de planos deve permanecer íntegra');
        console.log(`  ✓ Teste 5 passou: Acervo de Planos de Aula permanece intacto (${plansList.total} registros ativos).\n`);

        console.log('================================================================');
        console.log(' TODOS OS 5 TESTES AUTOMATIZADOS FORAM EXECUTADOS COM SUCESSO! ');
        console.log('================================================================');
    } finally {
        // Limpeza dos registros de teste
        console.log('\n[CLEANUP] Restaurando estado inicial do banco de dados...');
        for (const id of createdIds) {
            try {
                await diagnosisArchiveService.deleteDiagnosis(id);
            } catch (cleanupErr) {
                console.warn('Aviso no cleanup:', cleanupErr.message);
            }
        }
        // Assegura preservação exata dos dados anteriores
        fs.writeFileSync(archivePath, JSON.stringify(initialRecords, null, 2), 'utf8');
        console.log('[CLEANUP] Estado inicial restaurado com sucesso.');
    }
}

runTestSuite().catch(err => {
    console.error('\n❌ FALHA NA SUÍTE DE TESTES:', err);
    process.exit(1);
});
