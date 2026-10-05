/* eslint-env node */
/**
 * Resolvedor de Identidade e Deduplicação Multi-Docente
 * Unifica alunos cadastrados por diferentes professores sob um ID canônico imutável,
 * tolerando variações de grafia, acentuação e nomenclaturas de turma.
 */

const crypto = require('crypto');

/**
 * Normaliza strings para matching robusto:
 * Remove diacríticos (acentos), caracteres especiais e múltiplos espaços.
 */
function normalizeStr(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Chave canônica de matching para nomes de estudantes:
 * Remove acentos, caracteres especiais e preposições da língua portuguesa (da, de, do, das, dos)
 * que frequentemente divergem entre diferentes diários de classe (ex: "Katilly Silva" vs "Katilly da Silva").
 */
function canonicalNameKey(str) {
    if (!str || typeof str !== 'string') return '';
    const norm = normalizeStr(str);
    return norm.replace(/\b(da|de|do|das|dos)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extrai a série/turma base simplificada para unificação (ex: "6º Ano Matutino" -> "6 ano").
 */
function normalizeTurmaBase(turmaName) {
    if (!turmaName || typeof turmaName !== 'string') return 'geral';
    const norm = normalizeStr(turmaName);
    
    // Procura padrões de ano/série (ex: 6 ano, 7 ano, 1 ano medio, etc.)
    const matchAno = norm.match(/([1-9])\s*(ano|serie)/);
    if (matchAno) {
        return `${matchAno[1]} ano`;
    }

    const matchMedio = norm.match(/([1-3])\s*(medio|em)/);
    if (matchMedio) {
        return `${matchMedio[1]} medio`;
    }

    return norm.slice(0, 20) || 'geral';
}

/**
 * Detecta a disciplina a partir do nome ou ícone da turma quando não informada explicitamente.
 */
function extractDiscipline(turmaName = '', icon = '', fallback = 'Geral') {
    const raw = `${turmaName} ${icon}`;
    const norm = normalizeStr(raw);

    if (/\b(pt|port|lp|portugues|redacao|literatura|lingua portuguesa)\b/.test(norm)) {
        return 'Língua Portuguesa';
    }
    if (/\b(mat|matematica|geometria|algebra)\b/.test(norm)) {
        return 'Matemática';
    }
    if (/\b(mpv|projeto de vida|metodologia de projeto de vida)\b/.test(norm)) {
        return 'Projeto de Vida (MPV)';
    }
    if (norm.includes('historia')) {
        return 'História';
    }
    if (norm.includes('geografia')) {
        return 'Geografia';
    }
    if (norm.includes('ciencias') || norm.includes('biologia')) {
        return 'Ciências';
    }
    if (norm.includes('fisica')) {
        return 'Física';
    }
    if (norm.includes('quimica')) {
        return 'Química';
    }
    if (norm.includes('ingles') || norm.includes('english')) {
        return 'Língua Inglesa';
    }
    if (norm.includes('espanhol')) {
        return 'Espanhol';
    }
    if (norm.includes('arte') || norm.includes('artes')) {
        return 'Artes';
    }
    if (norm.includes('educacao fisica') || norm.includes('ed fisica') || norm.includes('edfisica')) {
        return 'Educação Física';
    }
    if (norm.includes('filosofia')) {
        return 'Filosofia';
    }
    if (norm.includes('sociologia')) {
        return 'Sociologia';
    }
    if (norm.includes('religiao') || norm.includes('ensino religioso')) {
        return 'Ensino Religioso';
    }
    if (norm.includes('robotica') || norm.includes('informatica') || norm.includes('tecnologia')) {
        return 'Tecnologia / Robótica';
    }

    const parts = (turmaName || '').split(/[/|-]|\b\d/);
    if (parts[0] && parts[0].trim().length >= 3) {
        return parts[0].trim();
    }

    return fallback || 'Geral';
}

/**
 * Gera um ID canônico determinístico baseado no nome do estudante e turma-base.
 * @param {string} studentName Nome do aluno
 * @param {string} turmaName Nome da turma
 */
function generateCanonicalStudentId(studentName, turmaName) {
    const cleanName = canonicalNameKey(studentName);
    const cleanTurma = normalizeTurmaBase(turmaName);
    
    if (!cleanName) {
        return `std_anon_${crypto.randomBytes(4).toString('hex')}`;
    }

    const hash = crypto.createHash('sha256')
        .update(`${cleanName}_${cleanTurma}`, 'utf8')
        .digest('hex')
        .slice(0, 16);

    return `std_${hash}`;
}

/**
 * Resolve e empacota os metadados canônicos de um estudante avulso.
 */
function resolveCanonicalStudent(studentName, turmaName) {
    const canonicalId = generateCanonicalStudentId(studentName, turmaName);
    return {
        canonical_id: canonicalId,
        canonical_name: studentName ? String(studentName).trim() : '',
        normalized_name: normalizeStr(studentName),
        turma_base: normalizeTurmaBase(turmaName),
        display_turma: turmaName || 'Turma'
    };
}

/**
 * Constrói ou atualiza o mapa canônico de alunos a partir dos professores indexados.
 * Suporta múltiplos vínculos (turmas/disciplinas) para o mesmo professor e múltiplos professores.
 * @param {Object} currentCanonicalMap Mapa atual de alunos canônicos
 * @param {string} teacherId ID único do professor
 * @param {string} teacherName Nome do professor
 * @param {string} discipline Disciplina lecionada (ou padrão)
 * @param {Array} rawStudents Lista de estudantes do banco do professor
 * @param {Array} rawTurmas Lista de turmas do banco do professor
 */
function mapTeacherStudentsToCanonical(currentCanonicalMap = {}, teacherId, teacherName, discipline, rawStudents = [], rawTurmas = []) {
    const resultMap = { ...currentCanonicalMap };
    const turmaObjLookup = {};
    (rawTurmas || []).forEach(t => {
        turmaObjLookup[String(t.id)] = t;
    });

    (rawStudents || []).forEach(st => {
        const studentName = String(st.name || '').trim();
        if (!studentName) return;

        const turmaObj = turmaObjLookup[String(st.turma_id)] || {};
        const turmaName = turmaObj.name || 'Turma';
        const turmaIcon = turmaObj.icon || '';
        const effectiveDiscipline = turmaObj.discipline || extractDiscipline(turmaName, turmaIcon, discipline);
        const canonicalId = generateCanonicalStudentId(studentName, turmaName);

        if (!resultMap[canonicalId]) {
            resultMap[canonicalId] = {
                canonical_id: canonicalId,
                canonical_name: studentName,
                normalized_name: normalizeStr(studentName),
                turma_base: normalizeTurmaBase(turmaName),
                display_turma: turmaName,
                turmas: [turmaName],
                enrolled_teachers: []
            };
        } else {
            if (!Array.isArray(resultMap[canonicalId].turmas)) {
                resultMap[canonicalId].turmas = [resultMap[canonicalId].display_turma || turmaName];
            }
            if (!resultMap[canonicalId].turmas.includes(turmaName)) {
                resultMap[canonicalId].turmas.push(turmaName);
            }
        }

        // Chave de unicidade de matrícula: professor + turma local
        const existingIdx = resultMap[canonicalId].enrolled_teachers.findIndex(
            e => e.teacher_id === teacherId && String(e.local_turma_id) === String(st.turma_id)
        );

        const enrollData = {
            teacher_id: teacherId,
            teacher_name: teacherName,
            discipline: effectiveDiscipline,
            local_student_id: st.id,
            local_turma_id: st.turma_id,
            turma_name: turmaName
        };

        if (existingIdx >= 0) {
            resultMap[canonicalId].enrolled_teachers[existingIdx] = enrollData;
        } else {
            resultMap[canonicalId].enrolled_teachers.push(enrollData);
        }
    });

    return resultMap;
}

/**
 * Remove as referências de um professor específico do mapa canônico.
 */
function pruneTeacherFromCanonicalMap(currentCanonicalMap, teacherId) {
    const nextMap = {};
    Object.keys(currentCanonicalMap || {}).forEach(cId => {
        const item = currentCanonicalMap[cId];
        const remaining = (item.enrolled_teachers || []).filter(e => e.teacher_id !== teacherId);
        if (remaining.length > 0) {
            const remainingTurmas = [...new Set(remaining.map(e => e.turma_name).filter(Boolean))];
            nextMap[cId] = {
                ...item,
                turmas: remainingTurmas.length > 0 ? remainingTurmas : (item.turmas || [item.display_turma]),
                display_turma: remainingTurmas[0] || item.display_turma,
                enrolled_teachers: remaining
            };
        }
    });
    return nextMap;
}

/**
 * Agrupa uma lista de turmas por suas respectivas disciplinas detectadas/definidas.
 * @param {Array} rawTurmas Lista de objetos de turma ou strings de nomes de turma
 * @param {string} defaultDiscipline Disciplina fallback
 * @returns {Object} Mapa com disciplinas, contagem e nomes de turmas
 */
function groupTurmasByDiscipline(rawTurmas = [], defaultDiscipline = 'Geral') {
    const map = {};
    (rawTurmas || []).forEach(t => {
        const turmaName = typeof t === 'string' ? t : (t.name || 'Turma');
        const turmaIcon = typeof t === 'object' && t.icon ? t.icon : '';
        const explicitDiscipline = typeof t === 'object' && t.discipline ? t.discipline : null;
        const disc = explicitDiscipline || extractDiscipline(turmaName, turmaIcon, defaultDiscipline);
        if (!map[disc]) {
            map[disc] = {
                discipline: disc,
                count: 0,
                turmas: []
            };
        }
        map[disc].count++;
        map[disc].turmas.push(turmaName);
    });
    return map;
}

module.exports = {
    normalizeStr,
    canonicalNameKey,
    normalizeTurmaBase,
    extractDiscipline,
    generateCanonicalStudentId,
    resolveCanonicalStudent,
    mapTeacherStudentsToCanonical,
    pruneTeacherFromCanonicalMap,
    groupTurmasByDiscipline
};
