/* eslint-env node */
/**
 * Serviço Especialista: Dossiê 360º Segmentado por Unidades
 * Responsável por computar métricas, comparativos ponderados e histórico
 * por unidade letiva específica ou consolidado global (Todas as Unidades),
 * preservando a integridade federada multi-docente sem alterar os shards originais.
 */

const sessionManager = require('./coordinatorSessionManager');
const coordinatorService = require('./coordinatorService');
const identityResolver = require('./coordinatorIdentityResolver');
const diagnosisArchiveService = require('./diagnosisArchiveService');

/**
 * Computa as métricas de nota de um aluno para uma unidade letiva isolada (1..3).
 * Aplica as regras oficiais do EduSys Pro:
 * Média = Comportamento + Mini-testes + Provas + Lições/Atividades + Trabalhos + Bônus (teto 10.0)
 */
function computeSingleUnitMetrics(payload, localStudentId, localTurmaId, targetUnitId = 1) {
    if (!payload || !Array.isArray(payload.students)) return null;

    const student = (payload.students || []).find(s => s.id === localStudentId);
    if (!student) return null;

    const targetTurmaIdNum = localTurmaId || student.turma_id;
    const studentTurma = (payload.turmas || []).find(t => t.id === targetTurmaIdNum);
    const unitIdNum = Number(targetUnitId) || 1;

    // Parâmetros da turma para a unidade de referência
    const unitParams = (payload.turma_unit_params || []).find(
        p => p.turma_id === targetTurmaIdNum && Number(p.unit_id) === unitIdNum
    );

    const settings = payload.settings || {
        behavior_start_score: 3.0,
        max_mini_testes: 14,
        max_mini_teste_score: 10,
        max_mini_testes_weight: 1.0,
        max_activities: 27,
        max_activities_weight: 1.0,
        max_provas: 1,
        max_provas_weight: 4.0,
        max_prova_score: 10
    };

    const turmaMaxActivities       = typeof unitParams?.max_activities === 'number' ? unitParams.max_activities : (typeof studentTurma?.max_activities === 'number' ? studentTurma.max_activities : (settings.max_activities ?? 27));
    const turmaMaxActivitiesWeight = typeof unitParams?.max_activities_weight === 'number' ? unitParams.max_activities_weight : (typeof studentTurma?.max_activities_weight === 'number' ? studentTurma.max_activities_weight : (settings.max_activities_weight ?? 1.0));
    const turmaMaxMiniTestes       = typeof unitParams?.max_mini_testes === 'number' ? unitParams.max_mini_testes : (typeof studentTurma?.max_mini_testes === 'number' ? studentTurma.max_mini_testes : (settings.max_mini_testes ?? 14));
    const turmaMaxMiniTestesWeight = typeof unitParams?.max_mini_testes_weight === 'number' ? unitParams.max_mini_testes_weight : (typeof studentTurma?.max_mini_testes_weight === 'number' ? studentTurma.max_mini_testes_weight : (settings.max_mini_testes_weight ?? 1.0));
    const turmaMaxMiniTesteScore   = typeof unitParams?.max_mini_teste_score === 'number' ? unitParams.max_mini_teste_score : (typeof studentTurma?.max_mini_teste_score === 'number' ? studentTurma.max_mini_teste_score : (settings.max_mini_teste_score ?? 10));
    const turmaMaxProvas           = typeof unitParams?.max_provas === 'number' ? unitParams.max_provas : (typeof studentTurma?.max_provas === 'number' ? studentTurma.max_provas : (settings.max_provas ?? 1));
    const turmaMaxProvasWeight     = typeof unitParams?.max_provas_weight === 'number' ? unitParams.max_provas_weight : (typeof studentTurma?.max_provas_weight === 'number' ? studentTurma.max_provas_weight : (settings.max_provas_weight ?? 4.0));
    const turmaMaxProvaScore       = typeof unitParams?.max_prova_score === 'number' ? unitParams.max_prova_score : (typeof studentTurma?.max_prova_score === 'number' ? studentTurma.max_prova_score : (settings.max_prova_score ?? 10));

    // 1. Comportamento (ocorrências da unidade — sem vazamento para outros trimestres)
    const allOccs = (payload.occurrences || []).filter(o => o.student_id === localStudentId);
    const filteredOccs = allOccs.filter(o => Number(o.unit_id || 1) === unitIdNum);

    const totalPenalties = filteredOccs.reduce((acc, curr) => acc + (curr.points !== undefined ? curr.points : 0), 0);
    const startScore = typeof settings.behavior_start_score === 'number' ? settings.behavior_start_score : 3.0;
    let behaviorScore = startScore + totalPenalties;
    if (behaviorScore < 0) behaviorScore = 0;

    // 2. Mini-Testes
    const rawMiniTestes = (payload.mini_testes || []).filter(t => t.student_id === localStudentId);
    const testesDoAluno = rawMiniTestes.filter(t => Number(t.unit_id || 1) === unitIdNum);

    let totalMiniTestes = 0;
    if (testesDoAluno.length > 0 && turmaMaxMiniTesteScore > 0) {
        const somaNormalizada = testesDoAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxMiniTesteScore), 0);
        const limit = turmaMaxMiniTestes || 1;
        totalMiniTestes = Math.min((somaNormalizada * turmaMaxMiniTestesWeight) / limit, turmaMaxMiniTestesWeight);
    }

    // 3. Lições de Casa / Atividades Concluídas
    const rawActs = (payload.activities || []).filter(a => a.student_id === localStudentId && a.is_completed);
    const studentActs = rawActs.filter(a => Number(a.unit_id || 1) === unitIdNum);

    const peso_por_licao = turmaMaxActivities > 0 ? turmaMaxActivitiesWeight / turmaMaxActivities : 0;
    const licaoScore = Math.min(studentActs.length * peso_por_licao, turmaMaxActivitiesWeight);

    // 4. Trabalhos
    const rawTrabalhos = (payload.trabalhos || []).filter(t => t.student_id === localStudentId);
    const trabalhosAluno = rawTrabalhos.filter(t => Number(t.unit_id || 1) === unitIdNum);
    const trabalhoScore = trabalhosAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);

    // 5. Provas
    const rawProvas = (payload.provas || []).filter(t => t.student_id === localStudentId);
    const provasAluno = rawProvas.filter(t => Number(t.unit_id || 1) === unitIdNum);

    let provaScore = 0;
    if (provasAluno.length > 0 && turmaMaxProvaScore > 0) {
        const somaNormalizada = provasAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxProvaScore), 0);
        const limit = turmaMaxProvas || 1;
        provaScore = Math.min((somaNormalizada * turmaMaxProvasWeight) / limit, turmaMaxProvasWeight);
    }

    // 6. Bônus
    const rawBonus = (payload.bonus || []).filter(b => b.student_id === localStudentId);
    const bonusAluno = rawBonus.filter(b => Number(b.unit_id || 1) === unitIdNum);
    const bonusScore = bonusAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);

    // Média Final da Unidade
    let totalMedia = behaviorScore + totalMiniTestes + provaScore + licaoScore + trabalhoScore + bonusScore;
    if (totalMedia < 0) totalMedia = 0;
    if (totalMedia > 10) totalMedia = 10;
    const mediaFinal = Math.floor(totalMedia * 100) / 100;

    return {
        unitId: unitIdNum,
        behaviorScore: Number(behaviorScore.toFixed(2)),
        pointsLost: totalPenalties,
        totalMiniTestes: Number(totalMiniTestes.toFixed(2)),
        testesLista: testesDoAluno,
        licao: Number(licaoScore.toFixed(2)),
        licaoCheckCount: studentActs.length,
        trabalho: Number(trabalhoScore.toFixed(2)),
        trabalhosLista: trabalhosAluno,
        prova: Number(provaScore.toFixed(2)),
        provasLista: provasAluno,
        bonus: Number(bonusScore.toFixed(2)),
        bonusLista: bonusAluno,
        occurrencesCount: filteredOccs.length,
        mediaFinal: mediaFinal
    };
}

/**
 * Computa as métricas de nota de um aluno para uma unidade letiva específica (ou consolidada).
 * No modo consolidado ('ALL'), calcula a Média Anual como a média aritmética das unidades
 * em andamento ou já concluídas no ano letivo.
 * 
 * @param {Object} payload Snapshot do professor (shard)
 * @param {number|string} localStudentId ID local do estudante na base do professor
 * @param {number|string} localTurmaId ID da turma local
 * @param {string|number} targetUnitId ID da unidade ('ALL' ou número 1..3)
 */
function computeUnitSpecificDisciplineMetrics(payload, localStudentId, localTurmaId, targetUnitId = 'ALL') {
    if (!payload || !Array.isArray(payload.students)) return null;

    const isAll = targetUnitId === 'ALL' || targetUnitId === null || targetUnitId === undefined;

    if (!isAll) {
        return computeSingleUnitMetrics(payload, localStudentId, localTurmaId, Number(targetUnitId));
    }

    // Modo 'ALL' (Consolidado Anual):
    const unitIds = [1, 2, 3];
    const activeUnitObj = (payload.units || []).find(u => u.is_active) || { id: 1 };
    const activeUnitIdNum = Number(activeUnitObj.id) || 1;

    // Computa métricas de cada trimestre
    const unitsMetrics = unitIds.map(uId => computeSingleUnitMetrics(payload, localStudentId, localTurmaId, uId)).filter(Boolean);
    if (!unitsMetrics || unitsMetrics.length === 0) {
        return null;
    }

    // Filtra apenas unidades ativas, encerradas ou que possuam lançamentos na disciplina
    const evaluatedUnits = unitsMetrics.filter((m) => {
        const shardUnit = (payload.units || []).find(u => Number(u.id) === m.unitId);
        const hasEvaluations = (m.provasLista.length > 0 || m.testesLista.length > 0 || m.trabalhosLista.length > 0 || m.licaoCheckCount > 0 || m.occurrencesCount > 0);
        const isStarted = shardUnit ? (shardUnit.is_active || shardUnit.is_closed || Boolean(shardUnit.created_at)) : (m.unitId <= activeUnitIdNum);
        return isStarted || hasEvaluations;
    });

    const activeList = evaluatedUnits.length > 0 ? evaluatedUnits : [unitsMetrics[0]];

    // Média aritmética anual das unidades consideradas
    const sumMedias = activeList.reduce((acc, curr) => acc + (curr?.mediaFinal || 0), 0);
    const avgMediaAnual = activeList.length > 0 ? sumMedias / activeList.length : 0;
    const mediaFinal = Math.floor(avgMediaAnual * 100) / 100;

    // Comportamento médio anual
    const sumBehavior = activeList.reduce((acc, curr) => acc + (curr?.behaviorScore || 3.0), 0);
    const avgBehavior = activeList.length > 0 ? sumBehavior / activeList.length : 3.0;

    // Totais acumulados para contadores
    const allTestes = unitsMetrics.flatMap(m => m.testesLista);
    const allProvas = unitsMetrics.flatMap(m => m.provasLista);
    const allTrabalhos = unitsMetrics.flatMap(m => m.trabalhosLista);
    const allBonus = unitsMetrics.flatMap(m => m.bonusLista);
    const totalOccs = unitsMetrics.reduce((acc, m) => acc + m.occurrencesCount, 0);
    const totalPenalties = unitsMetrics.reduce((acc, m) => acc + m.pointsLost, 0);
    const totalLicoes = unitsMetrics.reduce((acc, m) => acc + m.licaoCheckCount, 0);

    return {
        unitId: 'ALL',
        behaviorScore: Number(avgBehavior.toFixed(2)),
        pointsLost: totalPenalties,
        totalMiniTestes: Number((activeList.reduce((acc, m) => acc + m.totalMiniTestes, 0) / activeList.length).toFixed(2)),
        testesLista: allTestes,
        licao: Number((activeList.reduce((acc, m) => acc + m.licao, 0) / activeList.length).toFixed(2)),
        licaoCheckCount: totalLicoes,
        trabalho: Number((activeList.reduce((acc, m) => acc + m.trabalho, 0) / activeList.length).toFixed(2)),
        trabalhosLista: allTrabalhos,
        prova: Number((activeList.reduce((acc, m) => acc + m.prova, 0) / activeList.length).toFixed(2)),
        provasLista: allProvas,
        bonus: Number((activeList.reduce((acc, m) => acc + m.bonus, 0) / activeList.length).toFixed(2)),
        bonusLista: allBonus,
        occurrencesCount: totalOccs,
        mediaFinal: mediaFinal
    };
}

/**
 * Consulta e consolida o Dossiê 360º de um estudante, segmentado por unidade letiva.
 * 
 * @param {string} canonicalStudentId ID canônico do estudante
 * @param {string|number} targetUnitId 'ALL' para visão geral ou ID da unidade (1..4)
 */
function getStudent360ByUnit(canonicalStudentId, targetUnitId = 'ALL') {
    sessionManager.assertCoordinatorAccess();

    if (!canonicalStudentId) {
        return { success: false, error: 'ID canônico do estudante não informado.' };
    }

    // Obtém visão geral para ler estudantes do índice
    const overviewRes = coordinatorService.getSchoolOverview();
    if (!overviewRes || !overviewRes.success) {
        return { success: false, error: 'Falha ao acessar o índice do cofre da escola.' };
    }

    // Localiza o estudante pelo canonical_id
    const studentMeta = (overviewRes.students || []).find(s => s.canonical_id === canonicalStudentId);
    if (!studentMeta) {
        return { success: false, error: 'Estudante não localizado no índice institucional.' };
    }

    // Obtém dossiê base para recuperar a lista de professores matriculados
    const baseDossier = coordinatorService.getStudent360(canonicalStudentId);
    if (!baseDossier || !baseDossier.success || !baseDossier.dossier) {
        return { success: false, error: 'Não foi possível carregar os registros base do estudante.' };
    }

    const isAll = targetUnitId === 'ALL' || targetUnitId === null || targetUnitId === undefined;
    const disciplinesData = [];
    const allOccurrences = [];
    const allDiagnoses = [];
    const allEvaluations = [];
    const seenDiagnosisIds = new Set();
    const collectedUnitsMap = new Map();

    // Adiciona a opção universal "Todas as Unidades" no catálogo de unidades
    collectedUnitsMap.set('ALL', { id: 'ALL', name: 'Todas as Unidades' });

    // Itera pelas disciplinas e shards de docentes vinculados
    (baseDossier.dossier.disciplines || []).forEach(enroll => {
        const shard = coordinatorService.getTeacherShard(enroll.teacher_id);
        if (!shard || !shard.payload) return;

        const payload = shard.payload;
        const localId = enroll.local_student_id;
        const localTurmaId = enroll.local_turma_id;

        // Catalogação das unidades existentes nos shards (máximo 3 unidades institucionais)
        (payload.units || []).forEach(u => {
            const uIdNum = Number(u?.id);
            if (u && uIdNum >= 1 && uIdNum <= 3 && !collectedUnitsMap.has(String(uIdNum))) {
                collectedUnitsMap.set(String(uIdNum), {
                    id: uIdNum,
                    name: u.name || `${uIdNum}ª Unidade`,
                    is_active: !!u.is_active
                });
            }
        });

        // 1. Ocorrências filtradas (registros legados sem unit_id pertencem à 1ª Unidade)
        const teacherOccurrences = (payload.occurrences || [])
            .filter(o => o.student_id === localId)
            .filter(o => isAll || Number(o.unit_id || 1) === Number(targetUnitId))
            .map(o => ({
                ...o,
                unit_id: Number(o.unit_id || 1),
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name
            }));
        allOccurrences.push(...teacherOccurrences);

        // 2. Instrumentos Avaliativos (Provas, Mini-Testes, Trabalhos, Bônus)
        const filterByUnit = (list) => (list || [])
            .filter(item => item.student_id === localId)
            .filter(item => isAll || Number(item.unit_id || 1) === Number(targetUnitId));

        const studentProvas = filterByUnit(payload.provas);
        const studentMiniTestes = filterByUnit(payload.mini_testes);
        const studentTrabalhos = filterByUnit(payload.trabalhos);
        const studentBonus = filterByUnit(payload.bonus);

        studentProvas.forEach(p => {
            allEvaluations.push({
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name,
                activity_name: p.title || p.name || 'Prova Oficial',
                type: 'Prova',
                unit_id: Number(p.unit_id || 1),
                score: p.score,
                weight: p.weight || 4.0
            });
        });

        studentMiniTestes.forEach(m => {
            allEvaluations.push({
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name,
                activity_name: m.title || m.name || 'Mini-Teste',
                type: 'Mini-Teste',
                unit_id: Number(m.unit_id || 1),
                score: m.score,
                weight: m.weight || 1.0
            });
        });

        studentTrabalhos.forEach(t => {
            allEvaluations.push({
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name,
                activity_name: t.title || t.name || 'Trabalho / Seminário',
                type: 'Trabalho',
                unit_id: Number(t.unit_id || 1),
                score: t.score,
                weight: t.weight || 1.0
            });
        });

        studentBonus.forEach(b => {
            allEvaluations.push({
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name,
                activity_name: b.title || b.name || 'Atividade Bônus',
                type: 'Bônus',
                unit_id: Number(b.unit_id || 1),
                score: b.score,
                weight: 0
            });
        });

        // 3. Diagnósticos de IA deste shard
        const normName = identityResolver.normalizeStr(studentMeta.canonical_name);
        const studentDiagnoses = (payload.diagnoses || [])
            .filter(d => String(d.student_id) === String(localId) || identityResolver.normalizeStr(d.student_name) === normName)
            .filter(d => isAll || Number(d.unit_id || 1) === Number(targetUnitId))
            .map(d => ({
                ...d,
                unit_id: Number(d.unit_id || 1),
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name
            }));

        studentDiagnoses.forEach(d => {
            const dKey = String(d.id || `${d.discipline || ''}_${d.created_at || ''}_${d.student_id || ''}`);
            if (!seenDiagnosisIds.has(dKey)) {
                seenDiagnosisIds.add(dKey);
                allDiagnoses.push(d);
            }
        });

        // 4. Cálculo Ponderado da Disciplina para a Unidade Alvo
        const computed = computeUnitSpecificDisciplineMetrics(payload, localId, localTurmaId, targetUnitId);
        
        const provaScores = studentProvas.map(p => Number(p.score || 0));
        const avgProva = provaScores.length > 0 ? provaScores.reduce((a, b) => a + b, 0) / provaScores.length : 0;
        const finalScore = computed ? computed.mediaFinal : Number(avgProva.toFixed(2));

        disciplinesData.push({
            teacher_id: enroll.teacher_id,
            teacher_name: enroll.teacher_name,
            discipline: enroll.discipline,
            turma_name: enroll.turma_name,
            local_turma_id: localTurmaId,
            local_student_id: localId,
            delivered_activities: computed ? computed.licaoCheckCount : 0,
            occurrences_count: teacherOccurrences.length,
            average_score: finalScore,
            mediaFinal: finalScore,
            behaviorScore: computed ? computed.behaviorScore : 3.0,
            evaluations_count: studentProvas.length + studentMiniTestes.length + studentTrabalhos.length,
            provas: studentProvas,
            mini_testes: studentMiniTestes,
            trabalhos: studentTrabalhos,
            bonus: studentBonus,
            computed: computed
        });
    });

    // Diagnósticos arquivados persistentes adicionais
    try {
        const archiveRecords = diagnosisArchiveService.readArchiveFile ? diagnosisArchiveService.readArchiveFile() : [];
        const normStudentName = identityResolver.normalizeStr(studentMeta.canonical_name);
        const enrolledLocalIds = new Set((baseDossier.dossier.disciplines || []).map(e => String(e.local_student_id)));

        archiveRecords.forEach(d => {
            const matchesId = enrolledLocalIds.has(String(d.student_id));
            const matchesName = identityResolver.normalizeStr(d.student_name) === normStudentName;
            const matchesUnit = isAll || Number(d.unit_id || 1) === Number(targetUnitId);

            if ((matchesId || matchesName) && matchesUnit) {
                const dKey = String(d.id || `${d.unit_id || ''}_${d.created_at || ''}_${d.student_id || ''}`);
                if (!seenDiagnosisIds.has(dKey)) {
                    seenDiagnosisIds.add(dKey);
                    allDiagnoses.push({
                        ...d,
                        unit_id: Number(d.unit_id || 1),
                        discipline: d.discipline || studentMeta.display_turma || 'Geral',
                        teacher_name: d.author_name || 'Docente'
                    });
                }
            }
        });
    } catch (_) { /* ignore */ }

    // Média geral da escola (para a unidade selecionada)
    const validScores = disciplinesData.map(d => d.average_score).filter(s => typeof s === 'number' && !isNaN(s));
    const overallAverage = validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
        : 0;

    // Se nenhuma unidade foi coletada nos shards, provê padrão trimestral (1ª a 3ª Unidade)
    if (collectedUnitsMap.size <= 1) {
        [1, 2, 3].forEach(uNum => {
            collectedUnitsMap.set(String(uNum), {
                id: uNum,
                name: `${uNum}ª Unidade`,
                is_active: uNum === 1
            });
        });
    }

    const availableUnits = Array.from(collectedUnitsMap.values());

    const resultDossier = {
        canonical_id: studentMeta.canonical_id,
        canonical_name: studentMeta.canonical_name,
        turma_base: studentMeta.display_turma,
        display_turma: studentMeta.display_turma,
        turmas: studentMeta.turmas || [studentMeta.display_turma],
        overall_average: overallAverage,
        selected_unit: targetUnitId,
        available_units: availableUnits,
        disciplines: disciplinesData,
        evaluations: allEvaluations,
        occurrences: allOccurrences,
        diagnoses: allDiagnoses
    };

    return {
        success: true,
        selected_unit: targetUnitId,
        available_units: availableUnits,
        student: resultDossier,
        dossier: resultDossier
    };
}

module.exports = {
    computeUnitSpecificDisciplineMetrics,
    getStudent360ByUnit
};
