const fs = require('fs');
const crypto = require('crypto');

const ENCRYPTION_SECRET = "EduSysPro_Local_Secure_Secret_Key_v3_2026";
const ALGORITHM = 'aes-256-cbc';

function getDerivedKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

const raw = fs.readFileSync('school_data.json', 'utf8');
const dbCache = decrypt(raw);

function testEvaluation(unitId) {
    console.log(`\n=================== TESTANDO UNIDADE ${unitId} ===================`);
    const targetUnit = (dbCache.units || []).find(u => u.id === unitId);
    const isUnitClosed = Boolean(targetUnit?.is_closed);
    console.log(`Unidade ${unitId}: Nome="${targetUnit?.name}", is_closed=${isUnitClosed}, is_active=${targetUnit?.is_active}`);

    let totalSchoolStudents = 0;
    let totalSchoolAlerts = 0;

    for (let turma of dbCache.turmas) {
        const studentList = dbCache.students.filter(s => s.turma_id === turma.id);
        const turmaTopics = (dbCache.activity_topics || []).filter(t => t.turma_id === turma.id && t.unit_id === unitId);
        const classProvas = (dbCache.provas || []).filter(p => p.unit_id === unitId && studentList.some(s => s.id === p.student_id));
        // A turma só é considerada como tendo realizado prova oficial se pelo menos 50% dos alunos tiverem nota lançada
        const classHasProvas = studentList.length > 0 && classProvas.length >= Math.ceil(studentList.length * 0.5);

        let turmaAlertCount = 0;
        let reasonsBreakdown = { disciplinar: 0, licoes: 0, avaliativo: 0, media_final: 0 };
        let sampleAlerts = [];

        studentList.forEach(student => {
            const targetTurmaId = student.turma_id;
            const studentTurma = (dbCache.turmas || []).find(t => t.id === targetTurmaId);
            const unitParams = (dbCache.turma_unit_params || []).find(p => p.turma_id === targetTurmaId && p.unit_id === unitId);

            const turmaMaxActivities       = typeof unitParams?.max_activities === 'number' ? unitParams.max_activities : (typeof studentTurma?.max_activities === 'number' ? studentTurma.max_activities : 27);
            const turmaMaxActivitiesWeight = typeof unitParams?.max_activities_weight === 'number' ? unitParams.max_activities_weight : (typeof studentTurma?.max_activities_weight === 'number' ? studentTurma.max_activities_weight : 1.0);
            const turmaMaxMiniTestes       = typeof unitParams?.max_mini_testes === 'number' ? unitParams.max_mini_testes : (typeof studentTurma?.max_mini_testes === 'number' ? studentTurma.max_mini_testes : 14);
            const turmaMaxMiniTestesWeight = typeof unitParams?.max_mini_testes_weight === 'number' ? unitParams.max_mini_testes_weight : (typeof studentTurma?.max_mini_testes_weight === 'number' ? studentTurma.max_mini_testes_weight : 1.0);
            const turmaMaxMiniTesteScore   = typeof unitParams?.max_mini_teste_score === 'number' ? unitParams.max_mini_teste_score : (typeof studentTurma?.max_mini_teste_score === 'number' ? studentTurma.max_mini_teste_score : 10);
            const turmaMaxProvas           = typeof unitParams?.max_provas === 'number' ? unitParams.max_provas : (typeof studentTurma?.max_provas === 'number' ? studentTurma.max_provas : 1);
            const turmaMaxProvasWeight     = typeof unitParams?.max_provas_weight === 'number' ? unitParams.max_provas_weight : (typeof studentTurma?.max_provas_weight === 'number' ? studentTurma.max_provas_weight : 4.0);
            const turmaMaxProvaScore       = typeof unitParams?.max_prova_score === 'number' ? unitParams.max_prova_score : (typeof studentTurma?.max_prova_score === 'number' ? studentTurma.max_prova_score : 10);

            // Comportamento
            const occs = (dbCache.occurrences || []).filter(o => o.student_id === student.id && o.unit_id === unitId);
            const totalPenalties = occs.reduce((acc, curr) => acc + (curr.points !== undefined ? curr.points : 0), 0);
            let behaviorScore = (dbCache.settings.behavior_start_score || 3.0) + totalPenalties;
            if (behaviorScore < 0) behaviorScore = 0;

            // Mini testes
            const testesDoAluno = (dbCache.mini_testes || []).filter(t => t.student_id === student.id && t.unit_id === unitId);
            let totalMiniTestes = 0;
            if (testesDoAluno.length > 0 && turmaMaxMiniTesteScore > 0) {
                const soma = testesDoAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxMiniTesteScore), 0);
                totalMiniTestes = Math.min((soma * turmaMaxMiniTestesWeight) / (turmaMaxMiniTestes || 1), turmaMaxMiniTestesWeight);
            }

            // Atividades
            const studentActs = (dbCache.activities || []).filter(a => a.student_id === student.id && a.is_completed && a.unit_id === unitId);
            const peso_por_licao = turmaMaxActivities > 0 ? turmaMaxActivitiesWeight / turmaMaxActivities : 0;
            let licaoScore = Math.min(studentActs.length * peso_por_licao, turmaMaxActivitiesWeight);

            // Trabalhos
            const trabalhosAluno = (dbCache.trabalhos || []).filter(t => t.student_id === student.id && t.unit_id === unitId);
            const trabalho = trabalhosAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);

            // Provas
            const provasAluno = (dbCache.provas || []).filter(p => p.student_id === student.id && p.unit_id === unitId);
            let prova = 0;
            if (provasAluno.length > 0 && turmaMaxProvaScore > 0) {
                const soma = provasAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxProvaScore), 0);
                prova = Math.min((soma * turmaMaxProvasWeight) / (turmaMaxProvas || 1), turmaMaxProvasWeight);
            }

            let totalMedia = behaviorScore + totalMiniTestes + prova + licaoScore + trabalho;
            if (totalMedia < 0) totalMedia = 0;
            if (totalMedia > 10) totalMedia = 10;
            const mediaFinal = Math.round(totalMedia * 100) / 100;

            // === NOVA LÓGICA DE ALERTA MATURADA ===
            const alertReasons = [];

            // 1. Risco Disciplinar: perda severa de pontos de comportamento
            const isSeverePenalty = totalPenalties <= -1.0 || behaviorScore < 2.0;
            if (isSeverePenalty) {
                alertReasons.push('disciplinar');
                reasonsBreakdown.disciplinar++;
            }

            // 2. Risco de Engajamento/Lições: se pelo menos 3 tópicos foram lecionados e o aluno entregou menos de 50%
            if (turmaTopics.length >= 3) {
                const completionRate = studentActs.length / turmaTopics.length;
                if (completionRate < 0.5) {
                    alertReasons.push('licoes');
                    reasonsBreakdown.licoes++;
                }
            }

            // 3. Risco Acadêmico / Avaliativo
            if (isUnitClosed) {
                // Se a unidade já encerrou, cobra a aprovação escolar formal (5.0)
                if (mediaFinal < 5.0) {
                    alertReasons.push('media_final');
                    reasonsBreakdown.media_final++;
                }
            } else {
                // Se a unidade está em andamento:
                // Se o aluno fez prova e tirou menos de 50%
                if (provasAluno.length > 0 && turmaMaxProvaScore > 0) {
                    const provaAvg = (provasAluno.reduce((acc, c) => acc + (c.score || 0), 0) / provasAluno.length);
                    if ((provaAvg / turmaMaxProvaScore) < 0.5) {
                        alertReasons.push('avaliativo');
                        reasonsBreakdown.avaliativo++;
                    }
                } else if (classHasProvas && provasAluno.length === 0) {
                    // Turma inteira fez prova, mas o aluno não fez
                    alertReasons.push('avaliativo');
                    reasonsBreakdown.avaliativo++;
                } else if (testesDoAluno.length >= 2 && turmaMaxMiniTesteScore > 0) {
                    // Aluno com pelo menos 2 mini-testes e média neles inferior a 50%
                    const miniAvg = (testesDoAluno.reduce((acc, c) => acc + (c.score || 0), 0) / testesDoAluno.length);
                    if ((miniAvg / turmaMaxMiniTesteScore) < 0.5) {
                        alertReasons.push('avaliativo');
                        reasonsBreakdown.avaliativo++;
                    }
                }
            }

            const isAlert = alertReasons.length > 0;
            if (isAlert) {
                turmaAlertCount++;
                if (sampleAlerts.length < 2) {
                    sampleAlerts.push({
                        name: student.name,
                        mediaFinal,
                        behaviorScore,
                        totalPenalties,
                        actsDone: `${studentActs.length}/${turmaTopics.length}`,
                        alertReasons
                    });
                }
            }
        });

        totalSchoolStudents += studentList.length;
        totalSchoolAlerts += turmaAlertCount;
        console.log(`Turma [${turma.id}] ${turma.name}: ${turmaAlertCount}/${studentList.length} em Alerta. Motivos:`, JSON.stringify(reasonsBreakdown));
        if (sampleAlerts.length > 0) {
            console.log('   Amostra de Alertas:', JSON.stringify(sampleAlerts));
        }
    }

    console.log(`TOTAL ESCOLA UNIDADE ${unitId}: ${totalSchoolAlerts}/${totalSchoolStudents} em Alerta (${((totalSchoolAlerts/totalSchoolStudents)*100).toFixed(1)}%)`);
}

testEvaluation(1);
testEvaluation(2);
