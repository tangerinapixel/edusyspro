/**
 * Serviço Especialista: Acervo e Memória Pedagógica Contínua
 * Gerencia a persistência, consulta, exclusão e compilação curricular
 * de planos de aula e atividades aplicadas ao longo das semanas letivas.
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isDev = !app || !app.isPackaged;
const dbDir = isDev ? path.join(__dirname, '..', '..') : (app && typeof app.getPath === 'function' ? app.getPath('userData') : path.join(__dirname, '..', '..'));
const archiveFilePath = path.join(dbDir, 'lesson_plans_archive.json');

/**
 * Assegura que o diretório de persistência existe defensivamente (crítico em produção empacotada).
 */
function ensureArchiveDir() {
    try {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    } catch (e) {
        console.error('[PlanArchiveService] Erro ao criar diretório do acervo:', e.message);
    }
}

/**
 * Normaliza strings para comparações insensíveis a acentos, pontuações e maiúsculas.
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
 * Extrai o dígito ordinal de unidade a partir de uma string (ex: "3ª Unidade" -> 3).
 */
function extractUnitNumber(unitStr) {
    if (!unitStr) return null;
    const match = String(unitStr).match(/(\d+)/);
    return match ? Number(match[1]) : null;
}

/**
 * Avalia se um plano pertence à turma filtrada, com suporte a ID e equivalência textual/disciplinar.
 */
function matchesTurma(plan, filterTurmaId, filterTurmaName) {
    if (filterTurmaId === undefined || filterTurmaId === null || filterTurmaId === '' || filterTurmaId === 'todas') {
        return true;
    }

    const normFilterName = normalizeStr(filterTurmaName);
    const normPlanTurmaName = normalizeStr(plan.turmaName || plan.turma || plan.publico || '');

    // Se temos identificadores textuais, validar integridade de série e componente curricular
    if (normFilterName && normPlanTurmaName) {
        const filterSerie = normFilterName.match(/(\d+)\s*(?:º|o|ª|a)?\s*ano/i);
        const planSerie = normPlanTurmaName.match(/(\d+)\s*(?:º|o|ª|a)?\s*ano/i);

        // Se ambas informam a série e são diferentes (ex: "9 ano" vs "6 ano"), rejeitar categoricamente
        if (filterSerie && planSerie && filterSerie[1] !== planSerie[1]) {
            return false;
        }

        // Se houver conflito explícito entre componentes curriculares (ex: Português vs MPV vs Geografia etc.), rejeitar
        const discKeys = ['portugues', 'mpv', 'matematica', 'historia', 'geografia', 'ciencias', 'ingles', 'arte', 'educacao fisica'];
        const planDiscNorm = normalizeStr(plan.disciplina || '');

        for (const k of discKeys) {
            if (normFilterName.includes(k)) {
                const otherKey = discKeys.find(other => other !== k && (normPlanTurmaName.includes(other) || planDiscNorm.includes(other)));
                if (otherKey) {
                    return false;
                }
            }
        }

        // Equivalência direta ou inclusão mútua
        if (normFilterName === normPlanTurmaName || normPlanTurmaName.includes(normFilterName) || normFilterName.includes(normPlanTurmaName)) {
            return true;
        }
    }

    // Casamento direto por turmaId numérico/string
    if (plan.turmaId !== null && plan.turmaId !== undefined) {
        if (String(plan.turmaId) === String(filterTurmaId)) {
            return true;
        }
    }

    return false;
}

/**
 * Avalia se um plano pertence à unidade filtrada, com suporte a ID e label ordinal.
 */
function matchesUnit(plan, filterUnitId, filterUnitLabel) {
    if (filterUnitId === undefined || filterUnitId === null || filterUnitId === '' || filterUnitId === 'todas') {
        return true;
    }

    // Casamento direto por ID numérico/string
    if (plan.unitId !== null && plan.unitId !== undefined) {
        if (String(plan.unitId) === String(filterUnitId)) {
            return true;
        }
    }

    // Fallback: extração e comparação de número ordinal (ex: 3ª Unidade -> 3)
    const planUnitNum = extractUnitNumber(plan.unitLabel || plan.unidade);
    const filterUnitNum = extractUnitNumber(filterUnitLabel || filterUnitId);
    if (planUnitNum !== null && filterUnitNum !== null && planUnitNum === filterUnitNum) {
        return true;
    }

    return false;
}

/**
 * Lê de forma segura a coleção de planos arquivados com auto-recuperação de metadados legados.
 */
function readArchiveFile() {
    try {
        ensureArchiveDir();
        if (!fs.existsSync(archiveFilePath)) {
            fs.writeFileSync(archiveFilePath, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const raw = fs.readFileSync(archiveFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];

        // Auto-heal / migração retrocompatível de registros históricos
        let modified = false;
        const healed = data.map(p => {
            if (!p || typeof p !== 'object') return p;
            let pMod = false;
            // Se unitId estiver nulo mas houver informação ordinal na etiqueta
            if (p.unitId === null || p.unitId === undefined) {
                const uNum = extractUnitNumber(p.unitLabel || p.unidade);
                if (uNum !== null) {
                    p.unitId = uNum;
                    pMod = true;
                }
            }
            // Se turmaId for nulo ou inconsistente com MPV / 6º Ano (turma ID 5)
            if ((p.turmaId === null || p.turmaId === 1) && (p.turmaName === 'MPV / 6º Ano' || p.turma === 'MPV / 6º Ano')) {
                p.turmaId = 5;
                pMod = true;
            }
            if (pMod) modified = true;
            return p;
        });

        if (modified) {
            try {
                fs.writeFileSync(archiveFilePath, JSON.stringify(healed, null, 2), 'utf8');
            } catch (wErr) {
                console.warn('[PlanArchiveService] Aviso ao persistir auto-heal:', wErr.message);
            }
        }

        return healed;
    } catch (err) {
        console.error('[PlanArchiveService] Erro ao ler acervo de planos:', err.message);
        return [];
    }
}

/**
 * Salva com garantia atômica a lista de planos arquivados.
 */
function writeArchiveFile(plans) {
    try {
        ensureArchiveDir();
        const safeData = Array.isArray(plans) ? plans : [];
        fs.writeFileSync(archiveFilePath, JSON.stringify(safeData, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[PlanArchiveService] Erro ao gravar acervo de planos:', err.message);
        throw new Error('Falha ao gravar arquivo de acervo pedagógico.');
    }
}

/**
 * Salva ou atualiza um plano de aula com metadados estruturados.
 */
async function savePlan(planData = {}) {
    if (!planData || typeof planData !== 'object') {
        throw new Error('Dados do plano inválidos para salvamento.');
    }

    const plans = readArchiveFile();
    const now = new Date().toISOString();

    const planId = planData.id || `plan_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const existingIndex = plans.findIndex(p => p.id === planId);

    // Extração e normalização de habilidades BNCC
    let bnccCodes = [];
    if (Array.isArray(planData.bnccCodes)) {
        bnccCodes = planData.bnccCodes;
    } else if (typeof planData.habilidades === 'string') {
        const matches = planData.habilidades.match(/EF\d{2}[A-Z]{2}\d{2}/gi);
        if (matches) bnccCodes = Array.from(new Set(matches.map(m => m.toUpperCase())));
    }

    // Normalização das aulas da semana
    const aulas = Array.isArray(planData.aulas) ? planData.aulas : [];
    const totalAulas = aulas.length;
    const aulaDatesList = aulas.map(a => a.data).filter(d => d && String(d).trim().length > 0);

    // Determina o período defensivamente
    let periodo = planData.periodo;
    if (!periodo || periodo.trim() === '' || periodo.trim().toLowerCase() === 'a definir') {
        if (aulaDatesList.length > 0) {
            const firstD = aulaDatesList[0];
            const lastD = aulaDatesList[aulaDatesList.length - 1];
            periodo = (firstD === lastD) ? firstD : `${firstD} a ${lastD}`;
        } else {
            periodo = 'A definir';
        }
    }

    // Determina as datas agrupadas defensivamente
    let datas = planData.datas;
    if (!datas || datas.trim() === '' || datas.trim().toLowerCase() === 'a definir') {
        if (aulaDatesList.length > 0) {
            const dateCountMap = {};
            aulaDatesList.forEach(d => {
                dateCountMap[d] = (dateCountMap[d] || 0) + 1;
            });
            datas = Object.entries(dateCountMap)
                .map(([d, cnt]) => `${d} (${cnt} ${cnt > 1 ? 'aulas' : 'aula'})`)
                .join(', ');
        } else {
            datas = `${totalAulas} aula(s)`;
        }
    }

    const turmaIdent = planData.turmaName || planData.turma || planData.publico || 'Turma Geral';
    const unitIdent = planData.unitLabel || planData.unidade || 'Unidade Vigente';
    const profIdent = planData.professorName || planData.professor || 'Professor(a)';

    const safeTurmaId = planData.turmaId !== undefined && planData.turmaId !== null ? Number(planData.turmaId) : null;
    const safeUnitId = planData.unitId !== undefined && planData.unitId !== null ? Number(planData.unitId) : extractUnitNumber(unitIdent);

    const record = {
        id: planId,
        turmaId: safeTurmaId,
        turma: turmaIdent,
        turmaName: turmaIdent,
        unitId: safeUnitId,
        unidade: unitIdent,
        unitLabel: unitIdent,
        disciplina: planData.disciplina || 'Componente Curricular',
        tema: planData.tema || 'Plano Semanal de Aula',
        publico: planData.publico || turmaIdent,
        duracao: planData.duracao || `${totalAulas} aula(s) de 50 minutos`,
        periodo: periodo,
        datas: datas,
        cronogramaDetallado: planData.cronogramaDetallado || [],
        professor: profIdent,
        professorName: profIdent,
        bnccCodes: bnccCodes,
        totalAulas: totalAulas,
        aulas: aulas,
        objetivoGeral: planData.objetivoGeral || planData.objetivo || '',
        objetivosEspecificos: Array.isArray(planData.objetivosEspecificos) ? planData.objetivosEspecificos : [],
        conteudos: Array.isArray(planData.conteudos) ? planData.conteudos : [],
        habilidadesBNCC: Array.isArray(planData.habilidadesBNCC) ? planData.habilidadesBNCC : [],
        fullData: {
            ...planData,
            turma: turmaIdent,
            turmaName: turmaIdent,
            unidade: unitIdent,
            unitLabel: unitIdent,
            professor: profIdent,
            professorName: profIdent,
            periodo: periodo,
            datas: datas,
            aulas: aulas
        },
        createdAt: existingIndex >= 0 ? plans[existingIndex].createdAt : now,
        updatedAt: now
    };


    if (existingIndex >= 0) {
        plans[existingIndex] = record;
    } else {
        plans.unshift(record);
    }

    writeArchiveFile(plans);
    return { success: true, plan: record };
}

/**
 * Lista planos do acervo com suporte a filtros por turma, unidade, componente e busca resiliente.
 */
async function listPlans(filters = {}) {
    const plans = readArchiveFile();
    const { turmaId, unitId, disciplina, search, turmaName, unitLabel } = filters;

    let filtered = plans;

    if (turmaId !== undefined && turmaId !== null && turmaId !== '' && turmaId !== 'todas') {
        filtered = filtered.filter(p => matchesTurma(p, turmaId, turmaName));
    }

    if (unitId !== undefined && unitId !== null && unitId !== '' && unitId !== 'todas') {
        filtered = filtered.filter(p => matchesUnit(p, unitId, unitLabel));
    }

    if (disciplina && String(disciplina).trim() !== '') {
        const discQuery = String(disciplina).toLowerCase().trim();
        filtered = filtered.filter(p => String(p.disciplina || '').toLowerCase().includes(discQuery));
    }

    if (search && String(search).trim() !== '') {
        const q = String(search).toLowerCase().trim();
        filtered = filtered.filter(p => {
            const temaMatch = String(p.tema || '').toLowerCase().includes(q);
            const bnccMatch = (p.bnccCodes || []).some(code => code.toLowerCase().includes(q));
            const aulasMatch = (p.aulas || []).some(a => (a.titulo || '').toLowerCase().includes(q));
            return temaMatch || bnccMatch || aulasMatch;
        });
    }

    // Ordenar do mais recente para o mais antigo
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { success: true, count: filtered.length, plans: filtered };
}

/**
 * Busca um plano específico pelo ID.
 */
async function getPlanById(planId) {
    const plans = readArchiveFile();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
        return { success: false, error: 'Plano não encontrado no acervo.' };
    }
    return { success: true, plan };
}

/**
 * Exclui um plano do acervo pelo ID.
 */
async function deletePlan(planId) {
    const plans = readArchiveFile();
    const initialLen = plans.length;
    const remaining = plans.filter(p => p.id !== planId);

    if (remaining.length === initialLen) {
        return { success: false, error: 'Plano não localizado para exclusão.' };
    }

    writeArchiveFile(remaining);
    return { success: true, deletedId: planId };
}

/**
 * Compila a súmula curricular de múltiplas semanas selecionadas para servir de contexto para a IA.
 */
async function compileCurricularSummary(planIds = []) {
    if (!Array.isArray(planIds) || planIds.length === 0) {
        return { success: false, error: 'Nenhum plano fornecido para compilação.' };
    }

    const plans = readArchiveFile();
    const selectedPlans = plans.filter(p => planIds.includes(p.id));

    if (selectedPlans.length === 0) {
        return { success: false, error: 'Nenhum dos planos selecionados foi encontrado no acervo.' };
    }

    // Ordenar cronologicamente (da primeira semana para a última)
    selectedPlans.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const allBnccCodes = new Set();
    const weeksModules = [];

    selectedPlans.forEach((plan, idx) => {
        (plan.bnccCodes || []).forEach(c => allBnccCodes.add(c));

        const aulasSummary = (plan.aulas || []).map((aula, aIdx) => {
            const tit = aula.titulo || `Aula ${aIdx + 1}`;
            const obj = aula.objetivo ? `Objetivo: ${aula.objetivo}` : '';
            return `- ${tit} ${obj}`.trim();
        });

        weeksModules.push({
            semanaIndex: idx + 1,
            planId: plan.id,
            tema: plan.tema,
            disciplina: plan.disciplina,
            habilidades: plan.bnccCodes || [],
            aulasSummary: aulasSummary
        });
    });

    const summaryText = weeksModules.map(w => {
        return `[SEMANA ${w.semanaIndex}: ${w.tema.toUpperCase()}]\nComponente: ${w.disciplina}\nHabilidades BNCC: ${w.habilidades.join(', ') || 'Gerais'}\nAulas Ministradas:\n${w.aulasSummary.join('\n')}`;
    }).join('\n\n');

    return {
        success: true,
        totalWeeks: selectedPlans.length,
        aggregatedBnccCodes: Array.from(allBnccCodes),
        weeksModules,
        summaryText
    };
}

module.exports = {
    savePlan,
    listPlans,
    getPlanById,
    deletePlan,
    compileCurricularSummary
};
