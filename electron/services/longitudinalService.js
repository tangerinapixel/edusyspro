const { dbAPI } = require('../database');

/**
 * Módulo de Inteligência Longitudinal Comparativa
 * Responsável por consultar e sintetizar o histórico de unidades anteriores (read-only)
 * para alimentar o Mentor Pedagógico no Chat e no Gerador de Pareceres.
 */

function getLongitudinalSummary(turmaId, currentUnitId = 1) {
    if (!turmaId) return null;
    
    const tId = parseInt(turmaId);
    const cUnitId = parseInt(currentUnitId) || 1;
    if (isNaN(tId)) return null;

    const allUnits = dbAPI.getUnits() || [];
    if (allUnits.length <= 1) return null;

    const students = dbAPI.getStudents(tId) || [];
    if (students.length === 0) return null;

    // Obtém as notas computadas de todas as unidades
    const gradesByUnit = {};
    let unitsWithDataCount = 0;

    allUnits.forEach(unit => {
        const grades = dbAPI.getStudentComputedGrades(tId, unit.id) || [];
        gradesByUnit[unit.id] = new Map(grades.map(g => [g.student_id, g]));
        if (grades.length > 0) {
            unitsWithDataCount++;
        }
    });

    if (unitsWithDataCount <= 1) return null;

    const currentGradesMap = gradesByUnit[cUnitId] || new Map();
    const otherUnits = allUnits.filter(u => u.id !== cUnitId).sort((a, b) => a.id - b.id);
    const pastUnits = allUnits.filter(u => u.id < cUnitId).sort((a, b) => a.id - b.id);

    const studentEvolution = students.map(student => {
        const cur = currentGradesMap.get(student.id) || {};
        const curMedia = Number(cur.mediaFinal ?? 0);
        const curBehavior = Number(cur.behaviorScore ?? 0);

        // Histórico de todas as unidades
        const allUnitRecords = allUnits.map(unit => {
            const grade = gradesByUnit[unit.id]?.get(student.id);
            if (!grade) {
                return {
                    unitId: unit.id,
                    unitName: unit.name,
                    hasRecord: false,
                    mediaFinal: null,
                    behaviorScore: null,
                    licaoCheckCount: 0,
                    testesCount: 0,
                    provasCount: 0,
                    trabalhosCount: 0,
                    bonus: 0
                };
            }
            return {
                unitId: unit.id,
                unitName: unit.name,
                hasRecord: true,
                mediaFinal: Number(grade.mediaFinal ?? 0),
                behaviorScore: Number(grade.behaviorScore ?? 3.0),
                licaoCheckCount: Number(grade.licaoCheckCount ?? 0),
                testesCount: (grade.testesLista || []).length,
                provasCount: (grade.provasLista || []).length,
                trabalhosCount: (grade.trabalhosLista || []).length,
                bonus: Number(grade.bonus ?? 0)
            };
        });

        // Retrocompatibilidade total com aiController (history = unidades de comparação)
        const comparisonTargetUnits = pastUnits.length > 0 ? pastUnits : otherUnits;
        const history = comparisonTargetUnits.map(u => allUnitRecords.find(r => r.unitId === u.id));

        const validRecords = allUnitRecords.filter(r => r.hasRecord);
        const hasPreviousHistory = validRecords.length >= 2;

        let deltaMedia = 0;
        let trend = "estável";

        if (hasPreviousHistory) {
            const first = validRecords[0];
            const last = validRecords[validRecords.length - 1];
            deltaMedia = Math.round((last.mediaFinal - first.mediaFinal) * 100) / 100;
            if (deltaMedia >= 0.5) trend = "ascendente";
            else if (deltaMedia <= -0.5) trend = "queda";
        }

        return {
            studentId: student.id,
            name: student.name,
            history,
            allUnitRecords,
            hasPreviousHistory,
            currentMedia: curMedia,
            currentBehavior: curBehavior,
            deltaMedia,
            trend
        };
    });

    return {
        turmaId: tId,
        currentUnitId: cUnitId,
        allUnits,
        pastUnits: pastUnits.length > 0 ? pastUnits : otherUnits,
        studentEvolution
    };
}

function formatLongitudinalChatContext(summaryData) {
    if (!summaryData || !summaryData.studentEvolution || summaryData.studentEvolution.length === 0) {
        return "";
    }

    const { allUnits, studentEvolution } = summaryData;
    let text = `\n[HISTÓRICO LONGITUDINAL COMPARATIVO ENTRE TODAS AS UNIDADES]\n`;
    text += `• Unidades com registros no ano letivo: ${(allUnits || []).map(u => u.name).join(', ')}\n`;
    text += `• Matriz Comparativa Multidimensional dos Estudantes:\n`;

    studentEvolution.forEach(s => {
        const recordsWithData = (s.allUnitRecords || []).filter(r => r.hasRecord && (r.licaoCheckCount > 0 || r.testesCount > 0 || r.provasCount > 0 || r.mediaFinal > 0));
        if (recordsWithData.length <= 1) {
            const single = recordsWithData[0] || (s.allUnitRecords && s.allUnitRecords[0]);
            if (single) {
                text += `  - ${s.name}: ${single.unitName} (Média: ${Number(single.mediaFinal ?? 0).toFixed(2)}, Lições: ${single.licaoCheckCount})\n`;
            }
            return;
        }

        const unitBreakdown = recordsWithData
            .map(r => `${r.unitName} ➔ Média ${Number(r.mediaFinal ?? 0).toFixed(2)} (Lições: ${r.licaoCheckCount}, Testes: ${r.testesCount}, Provas: ${r.provasCount}, Conduta: ${Number(r.behaviorScore ?? 3.0).toFixed(2)})`)
            .join(' | ');

        const deltaFormatted = s.deltaMedia > 0 ? `+${s.deltaMedia.toFixed(2)}` : s.deltaMedia.toFixed(2);
        text += `  - ${s.name}: [${unitBreakdown}] (Evolução Global: ${deltaFormatted} pts | Tendência: ${s.trend.toUpperCase()})\n`;
    });

    text += `• DIRETRIZ LONGITUDINAL: Utilize ativamente estes comparativos para responder perguntas sobre evolução de notas entre unidades, comparativo de lições ou tendências de aprendizagem ao longo de todo o ano letivo.\n`;

    return text;
}

function getStudentLongitudinalProfile(studentId, currentUnitId, turmaId, studentName = "") {
    const summary = getLongitudinalSummary(turmaId, currentUnitId);
    if (!summary || !summary.studentEvolution) return null;

    const sId = Number(studentId);
    if (sId) {
        const found = summary.studentEvolution.find(s => s.studentId === sId);
        if (found) return found;
    }
    if (studentName) {
        const cleanName = String(studentName).trim().toLowerCase();
        return summary.studentEvolution.find(s => s.name && s.name.trim().toLowerCase() === cleanName) || null;
    }
    return null;
}

function getStudentMultiUnitDetailedDossier(studentId, turmaId) {
    if (!studentId || !turmaId) return null;
    const tId = parseInt(turmaId);
    const sId = parseInt(studentId);
    if (isNaN(tId) || isNaN(sId)) return null;

    const allUnits = dbAPI.getUnits() || [];
    const students = dbAPI.getStudents(tId) || [];
    const targetStudent = students.find(s => s.id === sId);
    if (!targetStudent) return null;

    const unitDetails = [];
    allUnits.forEach(unit => {
        const grades = dbAPI.getStudentComputedGrades(tId, unit.id) || [];
        const studentGrade = grades.find(g => g.student_id === sId);
        if (studentGrade) {
            unitDetails.push({
                unitId: unit.id,
                unitName: unit.name,
                hasData: (studentGrade.testesLista || []).length > 0 || studentGrade.licaoCheckCount > 0 || (studentGrade.provasLista || []).length > 0 || studentGrade.mediaFinal > 0,
                grade: studentGrade
            });
        }
    });

    return {
        student: targetStudent,
        turmaId: tId,
        unitDetails
    };
}

module.exports = {
    getLongitudinalSummary,
    formatLongitudinalChatContext,
    getStudentLongitudinalProfile,
    getStudentMultiUnitDetailedDossier
};
