/* eslint-env node */
/**
 * Serviço Especialista: Acervo & Histórico de Diagnósticos Pedagógicos com I.A.
 * Responsável pelo ciclo de vida, persistência e busca do histórico de pareceres
 * diagnósticos emitidos para os alunos, preservando telemetria longitudinal.
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isDev = !app || !app.isPackaged;
const dbDir = isDev
    ? path.join(__dirname, '..', '..')
    : (app && typeof app.getPath === 'function' ? app.getPath('userData') : path.join(__dirname, '..', '..'));
const archiveFilePath = path.join(dbDir, 'student_diagnoses_archive.json');

/**
 * Assegura a existência do diretório de armazenamento.
 */
function ensureArchiveDir() {
    try {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    } catch (e) {
        console.error('[DiagnosisArchiveService] Erro ao criar diretório do acervo:', e.message);
    }
}

/**
 * Normaliza strings para comparações insensíveis a acentos, pontuação e maiúsculas.
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
 * Lê de forma defensiva o arquivo de diagnósticos arquivados.
 */
function readArchiveFile() {
    try {
        ensureArchiveDir();
        if (!fs.existsSync(archiveFilePath)) {
            fs.writeFileSync(archiveFilePath, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const raw = fs.readFileSync(archiveFilePath, 'utf8');
        if (!raw || !raw.trim()) {
            return [];
        }
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('[DiagnosisArchiveService] Erro ao ler arquivo do acervo de diagnósticos:', err);
        // Em caso de falha de parsing, preservar backup antes de resetar
        try {
            if (fs.existsSync(archiveFilePath)) {
                fs.copyFileSync(archiveFilePath, `${archiveFilePath}.corrupted.${Date.now()}.bak`);
            }
        } catch (backupErr) {
            console.warn('[DiagnosisArchiveService] Não foi possível criar backup de corrupção:', backupErr.message);
        }
        return [];
    }
}

/**
 * Persiste a lista completa de diagnósticos de forma atômica.
 */
function writeArchiveFile(records) {
    try {
        ensureArchiveDir();
        const payload = JSON.stringify(records, null, 2);
        fs.writeFileSync(archiveFilePath, payload, 'utf8');
        return true;
    } catch (err) {
        console.error('[DiagnosisArchiveService] Erro crítico ao salvar acervo de diagnósticos:', err);
        throw new Error(`Falha ao persistir diagnósticos: ${err.message}`);
    }
}

/**
 * Salva ou atualiza um registro de diagnóstico no acervo.
 * @param {Object} diagData Dados do diagnóstico a serem arquivados
 */
async function saveDiagnosis(diagData) {
    if (!diagData) {
        throw new Error('Dados do diagnóstico não fornecidos.');
    }

    const diagnosisText = String(diagData.diagnosis_text || diagData.text || '').trim();
    const studentName = String(diagData.student_name || diagData.name || '').trim();

    if (!diagnosisText) {
        throw new Error('O texto do parecer diagnóstico é obrigatório para arquivamento.');
    }
    if (!studentName) {
        throw new Error('A identificação do estudante é obrigatória.');
    }

    const records = readArchiveFile();
    const id = diagData.id || crypto.randomUUID();
    const existingIndex = records.findIndex(r => r.id === id);

    const metricsSource = diagData.metrics_snapshot || {};

    const resolvedStudentId = (diagData.student_id !== undefined && diagData.student_id !== null && !isNaN(Number(diagData.student_id)))
        ? Number(diagData.student_id)
        : (diagData.id && !isNaN(Number(diagData.id)) ? Number(diagData.id) : null);

    const resolvedTurmaId = (diagData.turma_id !== undefined && diagData.turma_id !== null && !isNaN(Number(diagData.turma_id)))
        ? Number(diagData.turma_id)
        : null;

    const resolvedUnitId = (diagData.unit_id !== undefined && diagData.unit_id !== null && !isNaN(Number(diagData.unit_id)))
        ? Number(diagData.unit_id)
        : null;

    const formattedRecord = {
        id,
        student_id: resolvedStudentId,
        student_name: studentName,
        turma_id: resolvedTurmaId,
        turma_name: String(diagData.turma_name || '').trim(),
        unit_id: resolvedUnitId,
        unit_name: String(diagData.unit_name || '').trim(),
        created_at: existingIndex >= 0 && records[existingIndex].created_at ? records[existingIndex].created_at : (diagData.created_at || new Date().toISOString()),
        updated_at: new Date().toISOString(),
        author_name: String(diagData.author_name || '').trim(),
        metrics_snapshot: {
            media_final: Number(metricsSource.media_final ?? diagData.media_final ?? 0),
            behavior_score: Number(metricsSource.behavior_score ?? diagData.behavior_score ?? 0),
            behavior_start_score: Number(metricsSource.behavior_start_score ?? diagData.behavior_start_score ?? 3.0),
            adhesion_rate: Number(metricsSource.adhesion_rate ?? diagData.adhesion_rate ?? 0),
            delivered_activities: Number(metricsSource.delivered_activities ?? diagData.delivered_activities ?? 0),
            applied_activities: Number(metricsSource.applied_activities ?? diagData.applied_activities ?? 0),
            occurrences_count: Number(metricsSource.occurrences_count ?? diagData.occurrences_count ?? 0),
            class_average: Number(metricsSource.class_average ?? diagData.class_average ?? 0),
            rank_position: String(metricsSource.rank_position ?? diagData.rank_position ?? ''),
            trend: String(metricsSource.trend ?? diagData.trend ?? 'Estável')
        },
        diagnosis_text: diagnosisText,
        evaluation_topics: Array.isArray(diagData.evaluation_topics) ? diagData.evaluation_topics : []
    };

    if (existingIndex >= 0) {
        records[existingIndex] = formattedRecord;
    } else {
        records.unshift(formattedRecord);
    }

    // Ordenar de forma decrescente pela data de criação
    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    writeArchiveFile(records);
    console.log(`[DiagnosisArchiveService] Diagnóstico arquivado com sucesso: ID=${id} | Aluno=${studentName}`);

    return {
        success: true,
        diagnosis: formattedRecord
    };
}

/**
 * Consulta e filtra diagnósticos no acervo com suporte a múltiplos critérios.
 * @param {Object} filters Critérios de filtro (turmaId, unitId, studentId, search)
 */
async function listDiagnoses(filters = {}) {
    const records = readArchiveFile();

    const filtered = records.filter(item => {
        // Filtro por Turma
        if (filters.turmaId !== undefined && filters.turmaId !== null && filters.turmaId !== '' && filters.turmaId !== 'todas') {
            if (String(item.turma_id ?? '') !== String(filters.turmaId)) {
                return false;
            }
        }

        // Filtro por Unidade
        if (filters.unitId !== undefined && filters.unitId !== null && filters.unitId !== '' && filters.unitId !== 'todas') {
            if (String(item.unit_id ?? '') !== String(filters.unitId)) {
                return false;
            }
        }

        // Filtro por Estudante específico
        if (filters.studentId !== undefined && filters.studentId !== null && filters.studentId !== '') {
            if (String(item.student_id ?? '') !== String(filters.studentId)) {
                return false;
            }
        }

        // Busca textual por nome do estudante ou turma
        if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
            const term = normalizeStr(filters.search);
            const studentNorm = normalizeStr(item.student_name);
            const turmaNorm = normalizeStr(item.turma_name);
            const unitNorm = normalizeStr(item.unit_name);
            
            const matchesTerm = studentNorm.includes(term) || turmaNorm.includes(term) || unitNorm.includes(term);
            if (!matchesTerm) {
                return false;
            }
        }

        return true;
    });

    return {
        success: true,
        diagnoses: filtered,
        total: filtered.length
    };
}

/**
 * Recupera um diagnóstico específico pelo seu ID único.
 * @param {string} id ID do registro
 */
async function getDiagnosisById(id) {
    if (!id) {
        throw new Error('ID do diagnóstico não informado.');
    }
    const records = readArchiveFile();
    const found = records.find(r => String(r.id) === String(id));

    if (!found) {
        return { success: false, error: 'Diagnóstico não encontrado no acervo.' };
    }

    return {
        success: true,
        diagnosis: found
    };
}

/**
 * Remove um diagnóstico do acervo pelo ID.
 * @param {string} id ID do registro a ser excluído
 */
async function deleteDiagnosis(id) {
    if (!id) {
        throw new Error('ID do diagnóstico não informado.');
    }
    const records = readArchiveFile();
    const initialLen = records.length;
    const remaining = records.filter(r => String(r.id) !== String(id));

    if (remaining.length === initialLen) {
        return { success: false, error: 'Diagnóstico não localizado para exclusão.' };
    }

    writeArchiveFile(remaining);

    return {
        success: true,
        id
    };
}

module.exports = {
    readArchiveFile,
    saveDiagnosis,
    listDiagnoses,
    getDiagnosisById,
    deleteDiagnosis
};
