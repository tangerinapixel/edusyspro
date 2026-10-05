const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configurações de Criptografia do DB
const ENCRYPTION_SECRET = "EduSysPro_Local_Secure_Secret_Key_v3_2026";
const ALGORITHM = 'aes-256-cbc';

function getDerivedKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

function encryptData(text) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (e) {
        console.error("[DB] Falha ao criptografar:", e.message);
        return text;
    }
}

function decryptData(text) {
    if (typeof text !== 'string') return text;
    if (text.trim().startsWith('{')) return text; // É um JSON claro (não criptografado)
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text;
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("[DB] Falha ao descriptografar:", e.message);
        return text;
    }
}

// No desenvolvimento, usa a raiz do projeto. No app instalado, usa a pasta de dados do usuário (AppData)
const isDev = !app.isPackaged;
const dbDir = isDev ? path.join(__dirname, '..') : app.getPath('userData');
const dbPath = path.join(dbDir, 'school_data.json');

const defaultData = {
    metadata: {
        last_updated: new Date().toISOString(),
        app_version: "5.5.2"
    },
    settings: {
        behavior_start_score: 3.0,
        max_mini_testes: 14,
        max_mini_teste_score: 10,
        max_mini_testes_weight: 1.0,
        max_activities: 27,
        max_activities_weight: 1.0,
        max_provas: 1,
        max_provas_weight: 4.0,
        max_prova_score: 10,
        auto_backup_enabled: false,
        auto_backup_interval: 5,
        gemini_api_key: "",
        ai_prompt_template: `[DIRETRIZES DO ARQUITETO PEDAGÓGICO]
Atue como Professor Mentor e Especialista em Didática com PhD, especialista na BNCC e nas Coleções Didáticas Oficiais (Superação para Língua Portuguesa e Transformar para MPV).

[ESTRUTURA CURRICULAR BNCC]
1. Objetivo Geral: Focado na autonomia, emancipação crítica e domínio prático do estudante.
2. Objetivos Específicos: Três metas claras, mensuráveis e aplicáveis ao componente curricular.
3. Habilidades da BNCC: Descrição sintética com código oficial e síntese direta de no máximo 2 linhas.

[ESTRUTURA OBRIGATÓRIA DE CADA AULA]
• Conceito (10 min): Mínimo de 1 parágrafo denso e didático contextualizando o tema, iniciando obrigatoriamente por "Professor, inicie a aula...".
• Atividades Práticas (20 min):
  - Texto Base Inédito contextualizado, rico em detalhes e exemplos cotidianos.
  - Desafio Investigativo numerado:
    1. Questão de Análise Conceitual e Reflexiva.
    2. Questão de Aplicação Prática e Socioemocional.
    3. Questão de Produção Textual / Aplicação Prática mão na massa.
• Socialização / Correção (20 min): Dinâmica de debate, correção coletiva e mediação pedagógica.
• Gabarito Comentado: Estritamente sucinto e objetivo (máximo 1 a 2 linhas por questão), contendo apenas a resposta/ideia-núcleo esperada e critério direto de correção.

[REGRAS DE ESTILO E LINGUAGEM]
Texto elegante, claro, formatado sem asteriscos soltos. Tom estimulante, rigorosamente alinhado à faixa etária e ao nível da turma.`,
        penalties: {
            conversa: -0.15,
            entra_sai: -0.10,
            falta_material: -0.10,
            desrespeito: -0.25
        },
        occurrence_types: [
            { id: "conversa", title: "Conversa", color: "amber", penalty: -0.15 },
            { id: "entra_sai", title: "Entra/Sai", color: "orange", penalty: -0.10 },
            { id: "falta_material", title: "Mat.", color: "rose", penalty: -0.10 },
            { id: "desrespeito", title: "Desrespeito", color: "red", penalty: -0.25 },
        ]
    },
    turmas: [
        { id: 1, name: '6º Ano', max_activities: 27, max_activities_weight: 1.0, max_mini_testes: 14, max_mini_testes_weight: 1.0, max_mini_teste_score: 10, max_provas: 1, max_provas_weight: 4.0, max_prova_score: 10, weekly_schedule: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 } },
        { id: 2, name: '7º Ano', max_activities: 27, max_activities_weight: 1.0, max_mini_testes: 14, max_mini_testes_weight: 1.0, max_mini_teste_score: 10, max_provas: 1, max_provas_weight: 4.0, max_prova_score: 10, weekly_schedule: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 } },
        { id: 3, name: '8º Ano', max_activities: 27, max_activities_weight: 1.0, max_mini_testes: 14, max_mini_testes_weight: 1.0, max_mini_teste_score: 10, max_provas: 1, max_provas_weight: 4.0, max_prova_score: 10, weekly_schedule: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 } },
        { id: 4, name: '9º Ano', max_activities: 27, max_activities_weight: 1.0, max_mini_testes: 14, max_mini_testes_weight: 1.0, max_mini_teste_score: 10, max_provas: 1, max_provas_weight: 4.0, max_prova_score: 10, weekly_schedule: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 } }
    ],
    students: [],
    activities: [], // { id, student_id, date, is_completed }
    activity_topics: [], // { date, topic, turma_id }
    occurrences: [], // { id, student_id, date, type, points }
    mini_testes: [],  // { id, student_id, name, score }
    trabalhos: [],    // { id, student_id, name, score }
    provas: [],       // { id, student_id, name, score, unit_id }
    bonus: [],        // { id, student_id, name, score, unit_id }
    turma_unit_params: [], // { turma_id, unit_id, max_activities, max_activities_weight, max_mini_testes, max_mini_testes_weight, max_mini_teste_score, max_provas, max_provas_weight, max_prova_score }
    units: [
        { id: 1, name: "1ª Unidade", is_active: true,  is_closed: false, created_at: new Date().toISOString().split('T')[0] },
        { id: 2, name: "2ª Unidade", is_active: false, is_closed: false, created_at: null },
        { id: 3, name: "3ª Unidade", is_active: false, is_closed: false, created_at: null }
    ],
    auth: {
        is_enabled: false,
        user_name: "",
        password_hash: null,
        recovery_key: null
    }
};

let dbCache = null;

/**
 * Aplica migrações de esquema e garante a integridade dos dados.
 * Útil para converter bancos de dados antigos (Backups) para o formato atual.
 */
function applyMigrations(data) {
    let migrated = false;

    // 1. Garantir campos de primeiro nível
    if (!data.metadata) { data.metadata = { ...defaultData.metadata }; migrated = true; }
    if (!data.settings) { data.settings = { ...defaultData.settings }; migrated = true; }
    if (!data.turmas) { data.turmas = [...defaultData.turmas]; migrated = true; }
    if (!data.students) { data.students = []; migrated = true; }
    if (!data.activities) { data.activities = []; migrated = true; }
    if (!data.activity_topics) { data.activity_topics = []; migrated = true; }
    if (!data.occurrences) { data.occurrences = []; migrated = true; }
    if (!data.mini_testes) { data.mini_testes = []; migrated = true; }
    if (!data.trabalhos) { data.trabalhos = []; migrated = true; }
    if (!data.provas) { data.provas = []; migrated = true; }
    if (!data.bonus) { data.bonus = []; migrated = true; }
    if (!data.auth) { data.auth = { ...defaultData.auth }; migrated = true; }
    if (data.auth && data.auth.user_name === undefined) { data.auth.user_name = ""; migrated = true; }

    // 1.5 Migração: Backup Automático & Prompt Template
    if (data.settings.auto_backup_enabled === undefined) {
        data.settings.auto_backup_enabled = false;
        data.settings.auto_backup_interval = 5;
        migrated = true;
    }
    if (!data.settings.ai_prompt_template || data.settings.ai_prompt_template.includes('Estrutura de Agente IA') || data.settings.ai_prompt_template.includes('Estrutura de 4 sessões') || !data.settings.ai_prompt_template.includes('PERÍODO DAS AULAS')) {
        data.settings.ai_prompt_template = defaultData.settings.ai_prompt_template;
        migrated = true;
    } else if (data.settings.ai_prompt_template.includes('Respostas aprofundadas')) {
        data.settings.ai_prompt_template = data.settings.ai_prompt_template.replace(
            '• Gabarito Comentado: Respostas aprofundadas, modelos de resposta e critérios para respostas pessoais.',
            '• Gabarito Comentado: Estritamente sucinto e objetivo (máximo 1 a 2 linhas por questão), contendo apenas a resposta/ideia-núcleo esperada e critério direto de correção.'
        );
        migrated = true;
    }

    // 2. Migração: Critérios Disciplinares Dinâmicos (v2.0.4)
    if (!data.settings.occurrence_types) {
        const currentPenalties = data.settings.penalties || {};
        data.settings.occurrence_types = [
            { id: "conversa", title: "Conversa", color: "amber", penalty: currentPenalties.conversa ?? -0.15 },
            { id: "entra_sai", title: "Entra/Sai", color: "orange", penalty: currentPenalties.entra_sai ?? -0.10 },
            { id: "falta_material", title: "Mat.", color: "rose", penalty: currentPenalties.falta_material ?? -0.10 },
            { id: "desrespeito", title: "Desrespeito", color: "red", penalty: currentPenalties.desrespeito ?? -0.25 },
        ];
        migrated = true;
    }

    // 3. Migração: Estudantes e Tópicos sem ID de Turma (v2.0.0)
    data.students.forEach(s => {
        if (!s.turma_id) {
            s.turma_id = 2; // Default para 7º Ano
            migrated = true;
        }
    });

    // 4. Migração: Ícones de Turma (v3.1.2)
    data.turmas.forEach(t => {
        if (!t.icon) {
            t.icon = 'classe';
            migrated = true;
        }
    });
    data.activity_topics.forEach(t => {
        if (!t.turma_id) {
            t.turma_id = 2;
            migrated = true;
        }
    });

    // 4. Migração: Parâmetros Pedagógicos por Turma (v2.0.4)
    if (data.settings.max_provas === undefined) { data.settings.max_provas = 1; migrated = true; }
    if (data.settings.max_provas_weight === undefined) { data.settings.max_provas_weight = 4.0; migrated = true; }
    if (data.settings.max_prova_score === undefined) { data.settings.max_prova_score = 10; migrated = true; }

    const gs = data.settings;
    const defaultSchedule = {
        use_two_weeks: false,
        week1: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 },
        week2: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 }
    };
    const normalizeWeeklyScheduleServer = (sched) => {
        if (!sched) return { ...defaultSchedule };
        if (typeof sched === 'object' && ('week1' in sched || 'use_two_weeks' in sched)) {
            return {
                use_two_weeks: Boolean(sched.use_two_weeks),
                week1: sched.week1 ? { ...defaultSchedule.week1, ...sched.week1 } : { ...defaultSchedule.week1 },
                week2: sched.week2 ? { ...defaultSchedule.week2, ...sched.week2 } : { ...defaultSchedule.week2 }
            };
        }
        return {
            use_two_weeks: false,
            week1: { ...defaultSchedule.week1, ...sched },
            week2: { ...defaultSchedule.week2, ...sched }
        };
    };

    data.turmas.forEach(t => {
        if (t.max_activities === undefined || typeof t.max_activities !== 'number') { t.max_activities = Number(t.max_activities) || 27; migrated = true; }
        if (t.max_activities_weight === undefined || typeof t.max_activities_weight !== 'number') { t.max_activities_weight = Number(t.max_activities_weight) || 1.0; migrated = true; }
        if (t.max_mini_testes === undefined || typeof t.max_mini_testes !== 'number') { t.max_mini_testes = Number(t.max_mini_testes) || 14; migrated = true; }
        if (t.max_mini_testes_weight === undefined || typeof t.max_mini_testes_weight !== 'number') { t.max_mini_testes_weight = Number(t.max_mini_testes_weight) || 1.0; migrated = true; }
        if (t.max_mini_teste_score === undefined || typeof t.max_mini_teste_score !== 'number') { t.max_mini_teste_score = Number(t.max_mini_teste_score) || 10; migrated = true; }
        if (t.max_provas === undefined || typeof t.max_provas !== 'number') { t.max_provas = Number(t.max_provas) || 1; migrated = true; }
        if (t.max_provas_weight === undefined || typeof t.max_provas_weight !== 'number') { t.max_provas_weight = Number(t.max_provas_weight) || 4.0; migrated = true; }
        if (t.max_prova_score === undefined || typeof t.max_prova_score !== 'number') { t.max_prova_score = Number(t.max_prova_score) || 10; migrated = true; }
        if (!t.weekly_schedule) {
            t.weekly_schedule = normalizeWeeklyScheduleServer(null);
            migrated = true;
        }
    });

    // 5. Migração: Sistema de Unidades Escolares (v3.4.0)
    if (!data.units) {
        const today = new Date().toISOString().split('T')[0];
        data.units = [
            { id: 1, name: "1ª Unidade", is_active: true,  is_closed: false, created_at: today },
            { id: 2, name: "2ª Unidade", is_active: false, is_closed: false, created_at: null },
            { id: 3, name: "3ª Unidade", is_active: false, is_closed: false, created_at: null }
        ];
        // Atribui unit_id = 1 a TODOS os registros transacionais existentes
        const transactional = ['activities', 'activity_topics', 'occurrences', 'mini_testes', 'trabalhos', 'provas'];
        transactional.forEach(table => {
            if (Array.isArray(data[table])) {
                data[table].forEach(r => { if (r.unit_id === undefined) r.unit_id = 1; });
            }
        });
        migrated = true;
        console.log('[DB] Migração v3.4.0: Sistema de Unidades aplicado.');
    }

    // 6. Migração: Limpeza de tópicos copiados na Unidade 2 e 3 (v3.5.0)
    // Remove qualquer activity_topic que tenha unit_id > 1 se a unidade correspondente não tiver nenhuma atividade concluída.
    // Isso reverte a cópia automática antiga e garante que as unidades comecem limpas de acordo com a Opção A.
    if (data.activity_topics && data.activity_topics.length > 0) {
        const initialCount = data.activity_topics.length;
        data.activity_topics = data.activity_topics.filter(t => {
            if (t.unit_id > 1) {
                const hasActivities = (data.activities || []).some(a => a.unit_id === t.unit_id);
                return hasActivities;
            }
            return true;
        });
        if (data.activity_topics.length !== initialCount) {
            migrated = true;
            console.log(`[DB] Migração v3.5.0: Removidos ${initialCount - data.activity_topics.length} tópicos copiados das Unidades 2 e 3.`);
        }
    }

    // 7. Migração: Garantir unit_id na Agenda da Unidade (v4.0.4)
    if (!data.unit_agenda) {
        data.unit_agenda = [];
        migrated = true;
    } else {
        data.unit_agenda.forEach(a => {
            if (a.unit_id === undefined) {
                a.unit_id = 1;
                migrated = true;
            }
        });
    }

    // 8. Migração: Parâmetros Pedagógicos por (Turma, Unidade) (v5.1.0)
    if (!data.turma_unit_params) {
        data.turma_unit_params = [];
        migrated = true;
    }

    const unitsList = data.units || [];
    (data.turmas || []).forEach(t => {
        unitsList.forEach(u => {
            let paramEntry = data.turma_unit_params.find(p => p.turma_id === t.id && p.unit_id === u.id);
            if (!paramEntry) {
                paramEntry = {
                    turma_id: t.id,
                    unit_id: u.id,
                    max_activities: typeof t.max_activities === 'number' ? t.max_activities : 27,
                    max_activities_weight: typeof t.max_activities_weight === 'number' ? t.max_activities_weight : 1.0,
                    max_mini_testes: typeof t.max_mini_testes === 'number' ? t.max_mini_testes : 14,
                    max_mini_testes_weight: typeof t.max_mini_testes_weight === 'number' ? t.max_mini_testes_weight : 1.0,
                    max_mini_teste_score: typeof t.max_mini_teste_score === 'number' ? t.max_mini_teste_score : 10,
                    max_provas: typeof t.max_provas === 'number' ? t.max_provas : 1,
                    max_provas_weight: typeof t.max_provas_weight === 'number' ? t.max_provas_weight : 4.0,
                    max_prova_score: typeof t.max_prova_score === 'number' ? t.max_prova_score : 10
                };
                data.turma_unit_params.push(paramEntry);
                migrated = true;
            } else {
                const intKeys = ['max_activities', 'max_mini_testes', 'max_provas'];
                const floatKeys = ['max_activities_weight', 'max_mini_testes_weight', 'max_mini_teste_score', 'max_provas_weight', 'max_prova_score'];
                intKeys.forEach(k => {
                    if (typeof paramEntry[k] !== 'number') {
                        paramEntry[k] = Number(paramEntry[k]) || 0;
                        migrated = true;
                    }
                });
                floatKeys.forEach(k => {
                    if (typeof paramEntry[k] !== 'number') {
                        paramEntry[k] = Number(paramEntry[k]) || 0;
                        migrated = true;
                    }
                });
            }
        });
    });

    return { data, migrated };
}


function initDB() {
    if (!fs.existsSync(dbPath)) {
        const jsonStr = JSON.stringify(defaultData, null, 2);
        fs.writeFileSync(dbPath, encryptData(jsonStr));
        dbCache = defaultData;
    } else {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        try {
            const decryptedRaw = decryptData(raw);
            const parsed = JSON.parse(decryptedRaw);
            let { data, migrated } = applyMigrations(parsed);
            
            // Força a versão do metadado para 5.5.2
            if (data.metadata && data.metadata.app_version !== "5.5.2") {
                data.metadata.app_version = "5.5.2";
                migrated = true;
            }
            
            dbCache = data;
            
            if (migrated) {
                console.log("[DB] Atualização ou migração detectada. Salvando banco.");
                saveDB();
            }
        } catch (e) {
            console.error('[DB] Erro ao carregar banco de dados:', e);
            dbCache = defaultData;
            saveDB();
        }
    }
}

function saveDB() {
    if (dbCache) {
        try {
            dbCache.metadata.last_updated = new Date().toISOString();
            const jsonStr = JSON.stringify(dbCache, null, 2);
            const tmpPath = dbPath + '.tmp';
            fs.writeFileSync(tmpPath, encryptData(jsonStr));
            fs.renameSync(tmpPath, dbPath);
        } catch (e) {
            console.error('[DB] Erro fatal no salvamento atômico:', e);
        }
    }
}

const dbAPI = {
    // Turmas
    getTurmas: () => dbCache.turmas || [],
    addTurma: (name, icon, weekly_schedule, customParams = {}) => {
        const nextId = dbCache.turmas.length > 0 ? Math.max(...dbCache.turmas.map(t => t.id)) + 1 : 1;
        const defaultSchedule = {
            use_two_weeks: false,
            week1: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 },
            week2: { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 }
        };
        const newTurma = { 
            id: nextId, 
            name, 
            icon: icon || 'classe',
            weekly_schedule: weekly_schedule || defaultSchedule,
            max_activities: customParams.max_activities !== undefined ? (parseInt(customParams.max_activities) || 0) : 27,
            max_activities_weight: customParams.max_activities_weight !== undefined ? (parseFloat(customParams.max_activities_weight) || 0) : 1.0,
            max_mini_testes: customParams.max_mini_testes !== undefined ? (parseInt(customParams.max_mini_testes) || 0) : 14,
            max_mini_testes_weight: customParams.max_mini_testes_weight !== undefined ? (parseFloat(customParams.max_mini_testes_weight) || 0) : 1.0,
            max_mini_teste_score: customParams.max_mini_teste_score !== undefined ? (parseFloat(customParams.max_mini_teste_score) || 0) : 10,
            max_provas: customParams.max_provas !== undefined ? (parseInt(customParams.max_provas) || 0) : 1,
            max_provas_weight: customParams.max_provas_weight !== undefined ? (parseFloat(customParams.max_provas_weight) || 0) : 4.0,
            max_prova_score: customParams.max_prova_score !== undefined ? (parseFloat(customParams.max_prova_score) || 0) : 10
        };
        dbCache.turmas.push(newTurma);
        if (!dbCache.turma_unit_params) dbCache.turma_unit_params = [];
        (dbCache.units || []).forEach(u => {
            dbCache.turma_unit_params.push({
                turma_id: nextId,
                unit_id: u.id,
                max_activities: newTurma.max_activities,
                max_activities_weight: newTurma.max_activities_weight,
                max_mini_testes: newTurma.max_mini_testes,
                max_mini_testes_weight: newTurma.max_mini_testes_weight,
                max_mini_teste_score: newTurma.max_mini_teste_score,
                max_provas: newTurma.max_provas,
                max_provas_weight: newTurma.max_provas_weight,
                max_prova_score: newTurma.max_prova_score
            });
        });
        saveDB();
        return { success: true, turma: newTurma };
    },
    updateTurma: (id, name, icon, weekly_schedule) => {
        const idx = dbCache.turmas.findIndex(t => t.id === parseInt(id));
        if (idx !== -1) {
            dbCache.turmas[idx].name = name;
            if (icon) dbCache.turmas[idx].icon = icon;
            if (weekly_schedule) dbCache.turmas[idx].weekly_schedule = weekly_schedule;
            saveDB();
            return { success: true };
        }
        return { error: 'Turma não encontrada' };
    },
    deleteTurma: (id) => {
        const tId = parseInt(id);
        // 1. Encontrar alunos desta turma
        const studentIds = dbCache.students
            .filter(s => s.turma_id === tId)
            .map(s => s.id);

        // 2. Limpar todos os registros dos alunos (Cascata manual)
        dbCache.activities = dbCache.activities.filter(a => !studentIds.includes(a.student_id));
        dbCache.occurrences = dbCache.occurrences.filter(o => !studentIds.includes(o.student_id));
        dbCache.mini_testes = dbCache.mini_testes.filter(t => !studentIds.includes(t.student_id));
        dbCache.trabalhos = dbCache.trabalhos.filter(t => !studentIds.includes(t.student_id));
        dbCache.provas = dbCache.provas.filter(t => !studentIds.includes(t.student_id));
        
        // 3. Remover os Alunos
        dbCache.students = dbCache.students.filter(s => s.turma_id !== tId);
        
        // 4. Remover Tópicos de Atividades da Turma
        dbCache.activity_topics = dbCache.activity_topics.filter(t => t.turma_id !== tId);
        
        // 5. Remover Parâmetros de Unidades da Turma
        dbCache.turma_unit_params = (dbCache.turma_unit_params || []).filter(p => p.turma_id !== tId);

        // 6. Remover a Turma
        dbCache.turmas = dbCache.turmas.filter(t => t.id !== tId);

        saveDB();
        return { success: true };
    },

    // Configurações Globais (Settings)
    getSettings: () => {
        return dbCache?.settings || defaultData.settings;
    },
    saveSettings: (newSettings) => {
        if (dbCache) {
            dbCache.settings = { ...dbCache.settings, ...newSettings };
            saveDB();
            return { success: true };
        }
        return { error: 'DB não cacheado' };
    },
    // Parâmetros Pedagógicos por Turma e Unidade
    updateTurmaParams: (turmaId, params, unitId) => {
        const tId = parseInt(turmaId);
        const idx = dbCache.turmas.findIndex(t => t.id === tId);
        if (idx === -1) return { error: 'Turma não encontrada' };
        
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const resolvedUnitId = unitId !== undefined && unitId !== null ? parseInt(unitId) : (activeUnit?.id ?? 1);
        
        if (!dbCache.turma_unit_params) dbCache.turma_unit_params = [];
        let unitEntry = dbCache.turma_unit_params.find(p => p.turma_id === tId && p.unit_id === resolvedUnitId);
        if (!unitEntry) {
            unitEntry = {
                turma_id: tId,
                unit_id: resolvedUnitId,
                max_activities: dbCache.turmas[idx].max_activities ?? 27,
                max_activities_weight: dbCache.turmas[idx].max_activities_weight ?? 1.0,
                max_mini_testes: dbCache.turmas[idx].max_mini_testes ?? 14,
                max_mini_testes_weight: dbCache.turmas[idx].max_mini_testes_weight ?? 1.0,
                max_mini_teste_score: dbCache.turmas[idx].max_mini_teste_score ?? 10,
                max_provas: dbCache.turmas[idx].max_provas ?? 1,
                max_provas_weight: dbCache.turmas[idx].max_provas_weight ?? 4.0,
                max_prova_score: dbCache.turmas[idx].max_prova_score ?? 10
            };
            dbCache.turma_unit_params.push(unitEntry);
        }
        
        const intKeys = ['max_activities', 'max_mini_testes', 'max_provas'];
        const floatKeys = ['max_activities_weight', 'max_mini_testes_weight', 'max_mini_teste_score', 'max_provas_weight', 'max_prova_score'];
        
        intKeys.forEach(key => {
            if (params[key] !== undefined) {
                const val = parseInt(params[key]);
                const cleanVal = isNaN(val) ? 0 : Math.max(0, val);
                unitEntry[key] = cleanVal;
                // Atualiza também na turma como fallback
                dbCache.turmas[idx][key] = cleanVal;
            }
        });
        floatKeys.forEach(key => {
            if (params[key] !== undefined) {
                const val = parseFloat(params[key]);
                const cleanVal = isNaN(val) ? 0 : Math.max(0, val);
                unitEntry[key] = cleanVal;
                // Atualiza também na turma como fallback
                dbCache.turmas[idx][key] = cleanVal;
            }
        });
        saveDB();
        return { success: true, turma: dbCache.turmas[idx], unitParams: unitEntry };
    },
    getTurmaUnitParams: (turmaId, unitId) => {
        const tId = parseInt(turmaId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const resolvedUnitId = unitId !== undefined && unitId !== null ? parseInt(unitId) : (activeUnit?.id ?? 1);
        
        if (!dbCache.turma_unit_params) dbCache.turma_unit_params = [];
        let entry = dbCache.turma_unit_params.find(p => p.turma_id === tId && p.unit_id === resolvedUnitId);
        
        const fallbackTurma = (dbCache.turmas || []).find(t => t.id === tId);
        if (!entry && fallbackTurma) {
            entry = {
                turma_id: tId,
                unit_id: resolvedUnitId,
                max_activities: fallbackTurma.max_activities ?? 27,
                max_activities_weight: fallbackTurma.max_activities_weight ?? 1.0,
                max_mini_testes: fallbackTurma.max_mini_testes ?? 14,
                max_mini_testes_weight: fallbackTurma.max_mini_testes_weight ?? 1.0,
                max_mini_teste_score: fallbackTurma.max_mini_teste_score ?? 10,
                max_provas: fallbackTurma.max_provas ?? 1,
                max_provas_weight: fallbackTurma.max_provas_weight ?? 4.0,
                max_prova_score: fallbackTurma.max_prova_score ?? 10
            };
            dbCache.turma_unit_params.push(entry);
            saveDB();
        }
        return entry || null;
    },
    getAllTurmaUnitParams: () => {
        return dbCache?.turma_unit_params || [];
    },
    // Gerenciamento de Tipos de Ocorrência (Dinâmico)
    getOccurrenceTypes: () => {
        return dbCache.settings.occurrence_types || defaultData.settings.occurrence_types;
    },
    addOccurrenceType: (title, penalty, color) => {
        const types = dbCache.settings.occurrence_types;
        const id = title.toLowerCase().trim().replace(/\s+/g, '_') + '_' + Date.now();
        const newType = { id, title, penalty: parseFloat(penalty) || 0, color: color || "indigo" };
        types.push(newType);
        saveDB();
        return { success: true, type: newType };
    },
    updateOccurrenceType: (id, data) => {
        const types = dbCache.settings.occurrence_types;
        const idx = types.findIndex(t => t.id === id);
        if (idx !== -1) {
            types[idx] = { ...types[idx], ...data };
            saveDB();
            return { success: true };
        }
        return { error: 'Tipo não encontrado' };
    },
    deleteOccurrenceType: (id) => {
        const types = dbCache.settings.occurrence_types;
        dbCache.settings.occurrence_types = types.filter(t => t.id !== id);
        saveDB();
        return { success: true };
    },

    // Alunos
    getStudents: (turmaId) => {
        let list = dbCache?.students || [];
        if (turmaId) {
            list = list.filter(s => s.turma_id === parseInt(turmaId));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    },
    addStudent: (name, turmaId) => {
        if (!dbCache.students.find(s => s.name === name && s.turma_id === parseInt(turmaId))) {
            const nextId = dbCache.students.length > 0 ? Math.max(...dbCache.students.map(s => s.id)) + 1 : 1;
            dbCache.students.push({ id: nextId, name, turma_id: parseInt(turmaId) });
            saveDB();
            return { success: true, id: nextId };
        }
        return { error: 'Aluno já existe nesta turma' };
    },
    addStudentsBulk: (namesArray, turmaId) => {
        let addedCount = 0;
        let nextId = dbCache.students.length > 0 ? Math.max(...dbCache.students.map(s => s.id)) + 1 : 1;
        const tId = parseInt(turmaId);
        namesArray.forEach(rawName => {
            const name = rawName.trim();
            if (name && !dbCache.students.find(s => s.name.toLowerCase() === name.toLowerCase() && s.turma_id === tId)) {
                dbCache.students.push({ id: nextId++, name, turma_id: tId });
                addedCount++;
            }
        });
        if (addedCount > 0) saveDB();
        return { success: true, added: addedCount };
    },
    removeStudent: (id) => {
        dbCache.students = dbCache.students.filter(s => s.id !== id);
        dbCache.activities = dbCache.activities.filter(a => a.student_id !== id);
        dbCache.occurrences = dbCache.occurrences.filter(o => o.student_id !== id);
        dbCache.mini_testes = dbCache.mini_testes.filter(t => t.student_id !== id);
        dbCache.trabalhos = dbCache.trabalhos.filter(t => t.student_id !== id);
        dbCache.provas = dbCache.provas.filter(t => t.student_id !== id);
        dbCache.bonus = (dbCache.bonus || []).filter(b => b.student_id !== id);
        saveDB();
        return { success: true };
    },

    // Mini Testes
    getMiniTestes: () => dbCache.mini_testes || [],
    addMiniTeste: (studentId, name, score) => {
        const nextId = dbCache.mini_testes.length > 0 ? Math.max(...dbCache.mini_testes.map(t => t.id)) + 1 : 1;
        dbCache.mini_testes.push({ id: nextId, student_id: Number(studentId), name, score: parseFloat(score) || 0 });
        saveDB();
        return { success: true };
    },
    removeMiniTeste: (id) => {
        dbCache.mini_testes = dbCache.mini_testes.filter(t => t.id !== id);
        saveDB();
        return { success: true };
    },

    // Atividades / Lição de Casa
    getActivities: () => {
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        return (dbCache.activities || []).filter(a => a.unit_id === activeUnitId);
    },
    toggleActivity: (studentId, date) => {
        const sId = Number(studentId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        const existing = (dbCache.activities || []).find(a => a.student_id === sId && a.date === date && a.unit_id === activeUnitId);
        if (existing) {
            dbCache.activities = dbCache.activities.filter(a => a.id !== existing.id);
        } else {
            const nextId = dbCache.activities.length > 0 ? Math.max(...dbCache.activities.map(a => a.id)) + 1 : 1;
            dbCache.activities.push({ id: nextId, student_id: sId, date, is_completed: true, unit_id: activeUnitId });
        }
        saveDB();
        return { success: true };
    },

    // Assuntos das Atividades
    getActivityTopics: (turmaId, unitId) => {
        const activeUnitId = unitId ? parseInt(unitId) : ((dbCache.units || []).find(u => u.is_active)?.id ?? 1);
        let list = (dbCache.activity_topics || []).filter(t => t.unit_id === activeUnitId);
        if (turmaId) {
            list = list.filter(t => t.turma_id === parseInt(turmaId));
        }
        return list;
    },
    saveActivityTopic: (date, topic, turmaId) => {
        if (!dbCache.activity_topics) dbCache.activity_topics = [];
        const tId = parseInt(turmaId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        const existing = dbCache.activity_topics.find(t => t.date === date && t.turma_id === tId && t.unit_id === activeUnitId);
        if (existing) {
            existing.topic = topic;
        } else {
            dbCache.activity_topics.push({ date, topic, turma_id: tId, unit_id: activeUnitId });
        }
        saveDB();
        return { success: true };
    },
    deleteActivityDate: (date, turmaId) => {
        if (!dbCache.activities) dbCache.activities = [];
        if (!dbCache.activity_topics) dbCache.activity_topics = [];
        const tId = parseInt(turmaId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;

        // Deletar assunto da turma na unidade ativa
        dbCache.activity_topics = dbCache.activity_topics.filter(t => !(t.date === date && t.turma_id === tId && t.unit_id === activeUnitId));

        // Deletar atividades dos alunos dessa turma na unidade ativa
        const studentIdsInTurma = dbCache.students.filter(s => s.turma_id === tId).map(s => s.id);
        dbCache.activities = dbCache.activities.filter(a => !(a.date === date && studentIdsInTurma.includes(a.student_id) && a.unit_id === activeUnitId));

        saveDB();
        return { success: true };
    },
    updateActivityDate: (oldDate, newDate, turmaId) => {
        if (!dbCache.activities) dbCache.activities = [];
        if (!dbCache.activity_topics) dbCache.activity_topics = [];
        const tId = parseInt(turmaId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;

        // 1. Verificar se a nova data já existe para esta turma na unidade ativa (evitar duplicidade)
        const conflict = dbCache.activity_topics.find(t => t.date === newDate && t.turma_id === tId && t.unit_id === activeUnitId);
        if (conflict) {
            return { error: 'A data de destino já possui registros. Remova-a primeiro ou escolha outra.' };
        }

        // 2. Atualizar ou Criar Assunto (Tópico) na unidade ativa
        const topic = dbCache.activity_topics.find(t => t.date === oldDate && t.turma_id === tId && t.unit_id === activeUnitId);
        if (topic) {
            topic.date = newDate;
        } else {
            dbCache.activity_topics.push({ date: newDate, topic: "", turma_id: tId, unit_id: activeUnitId });
        }

        // 3. Atualizar Atividades dos alunos dessa turma na unidade ativa
        const studentIdsInTurma = dbCache.students.filter(s => s.turma_id === tId).map(s => s.id);
        dbCache.activities.forEach(a => {
            if (a.date === oldDate && studentIdsInTurma.includes(a.student_id) && a.unit_id === activeUnitId) {
                a.date = newDate;
            }
        });

        saveDB();
        return { success: true };
    },

    // Ocorrências Diárias
    getOccurrences: (date) => {
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        const list = (dbCache.occurrences || []).filter(o => o.unit_id === activeUnitId);
        if (!date) return list;
        return list.filter(o => o.date === date);
    },
    addOccurrence: (occurrenceData) => {
        const nextId = dbCache.occurrences.length > 0 ? Math.max(...dbCache.occurrences.map(o => o.id)) + 1 : 1;
        const types = dbCache.settings.occurrence_types || defaultData.settings.occurrence_types;
        const typeConfig = types.find(t => t.id === occurrenceData.type);
        const points = typeConfig ? typeConfig.penalty : 0;
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        const newRecord = { 
            id: nextId, 
            ...occurrenceData, 
            student_id: Number(occurrenceData.student_id),
            points,
            unit_id: activeUnitId
        };
        dbCache.occurrences.push(newRecord);
        saveDB();
        return { success: true, record: newRecord };
    },
    removeOccurrence: (id) => {
        dbCache.occurrences = dbCache.occurrences.filter(o => o.id !== id);
        saveDB();
        return { success: true };
    },

    // Motor de Lançamentos Múltiplos (Idêntico ao Mini-Teste com Idempotência)
    addEvaluationItem: (category, studentId, name, score) => {
        if (!dbCache[category]) dbCache[category] = [];
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;
        const sId = Number(studentId);
        const trimmedName = (name || '').trim();

        // Idempotência: Se já existir avaliação com o mesmo nome não-vazio para este aluno nesta unidade, atualiza a nota
        const existingIdx = trimmedName.length > 0 ? dbCache[category].findIndex(i => 
            Number(i.student_id) === sId && 
            i.unit_id === activeUnitId && 
            (i.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
        ) : -1;

        if (existingIdx !== -1) {
            dbCache[category][existingIdx].score = parseFloat(score) || 0;
            saveDB();
            return { success: true, item: dbCache[category][existingIdx], updated: true };
        }

        const nextId = dbCache[category].length > 0 ? Math.max(...dbCache[category].map(i => i.id)) + 1 : 1;
        const newItem = { id: nextId, student_id: sId, name: trimmedName, score: parseFloat(score) || 0, unit_id: activeUnitId };
        dbCache[category].push(newItem);
        saveDB();
        return { success: true, item: newItem, updated: false };
    },
    removeEvaluationItem: (category, id) => {
        if (!dbCache[category]) return { error: 'Categoria inválida' };
        dbCache[category] = dbCache[category].filter(i => Number(i.id) !== Number(id));
        saveDB();
        return { success: true };
    },
    updateEvaluationItem: (category, id, name, score) => {
        if (!dbCache[category]) return { error: 'Categoria inválida' };
        const idx = dbCache[category].findIndex(i => i.id == id);
        if (idx !== -1) {
            dbCache[category][idx].name = name;
            dbCache[category][idx].score = parseFloat(score) || 0;
            saveDB();
            return { success: true };
        }
        return { error: 'Item não encontrado' };
    },
    reorderEvaluationItems: (category, studentId, startIndex, endIndex) => {
        if (!dbCache[category]) return { error: 'Categoria inválida' };
        
        const sId = Number(studentId);
        const activeUnit = (dbCache.units || []).find(u => u.is_active);
        const activeUnitId = activeUnit?.id ?? 1;

        // Pega todos os itens desse estudante na unidade ativa (que são os exibidos e arrastados no modal)
        const activeUnitItems = dbCache[category].filter(i => i.student_id === sId && i.unit_id === activeUnitId);
        
        // Pega os itens desse estudante em OUTRAS unidades
        const otherUnitItems = dbCache[category].filter(i => i.student_id === sId && i.unit_id !== activeUnitId);
        
        // Pega todos os itens dos OUTROS estudantes
        const otherStudentsItems = dbCache[category].filter(i => i.student_id !== sId);
        
        if (startIndex < 0 || startIndex >= activeUnitItems.length || endIndex < 0 || endIndex >= activeUnitItems.length) {
            return { error: 'Índices inválidos para reordenação' };
        }
        
        // Executa a reordenação apenas no subconjunto da unidade ativa
        const [removed] = activeUnitItems.splice(startIndex, 1);
        activeUnitItems.splice(endIndex, 0, removed);
        
        // Reconstrói o array global contendo:
        // 1. Itens dos outros alunos
        // 2. Itens do aluno atual de outras unidades (para manter o histórico intacto)
        // 3. Itens do aluno atual na unidade ativa (reordenados)
        dbCache[category] = [...otherStudentsItems, ...otherUnitItems, ...activeUnitItems];
        
        saveDB();
        return { success: true };
    },

    // ==== UNIDADES ESCOLARES ====
    getUnits: () => dbCache.units || [],

    getActiveUnit: () => {
        return (dbCache.units || []).find(u => u.is_active) || null;
    },

    // Avança para a próxima unidade não encerrada.
    // Copia os tópicos (assuntos) da unidade atual como modelo para a nova.
    advanceUnit: () => {
        const units = dbCache.units || [];
        const currentActiveIdx = units.findIndex(u => u.is_active);
        if (currentActiveIdx === -1) return { error: 'Nenhuma unidade ativa encontrada.' };

        const nextUnit = units.find((u, i) => i > currentActiveIdx && !u.is_closed);
        if (!nextUnit) return { error: 'Não há mais unidades disponíveis. Esta é a última unidade.' };

        // Encerra a unidade atual
        units[currentActiveIdx].is_active = false;
        units[currentActiveIdx].is_closed = true;
        units[currentActiveIdx].closed_at = new Date().toISOString().split('T')[0];

        // Ativa a próxima e registra data de início
        const nextIdx = units.findIndex(u => u.id === nextUnit.id);
        units[nextIdx].is_active = true;
        units[nextIdx].created_at = new Date().toISOString().split('T')[0];

        // Herança de Parâmetros: clona os parâmetros da unidade encerrada para a nova unidade (se ainda não existirem)
        if (!dbCache.turma_unit_params) dbCache.turma_unit_params = [];
        (dbCache.turmas || []).forEach(t => {
            const previousParams = dbCache.turma_unit_params.find(p => p.turma_id === t.id && p.unit_id === units[currentActiveIdx].id);
            let nextUnitParams = dbCache.turma_unit_params.find(p => p.turma_id === t.id && p.unit_id === nextUnit.id);
            if (!nextUnitParams) {
                dbCache.turma_unit_params.push({
                    turma_id: t.id,
                    unit_id: nextUnit.id,
                    max_activities: previousParams?.max_activities ?? t.max_activities ?? 27,
                    max_activities_weight: previousParams?.max_activities_weight ?? t.max_activities_weight ?? 1.0,
                    max_mini_testes: previousParams?.max_mini_testes ?? t.max_mini_testes ?? 14,
                    max_mini_testes_weight: previousParams?.max_mini_testes_weight ?? t.max_mini_testes_weight ?? 1.0,
                    max_mini_teste_score: previousParams?.max_mini_teste_score ?? t.max_mini_teste_score ?? 10,
                    max_provas: previousParams?.max_provas ?? t.max_provas ?? 1,
                    max_provas_weight: previousParams?.max_provas_weight ?? t.max_provas_weight ?? 4.0,
                    max_prova_score: previousParams?.max_prova_score ?? t.max_prova_score ?? 10
                });
            }
        });

        // A nova unidade começa limpa, sem copiar lições anteriores (Opção A)
        dbCache.units = units;
        saveDB();
        return { success: true, activeUnit: units[nextIdx] };
    },

    // Navega para qualquer unidade (inclusive encerradas) sem alterar is_closed.
    // Útil para revisar ou corrigir dados de unidades anteriores.
    switchToUnit: (unitId) => {
        const uId = parseInt(unitId);
        const units = dbCache.units || [];
        const target = units.find(u => u.id === uId);
        if (!target) return { error: 'Unidade não encontrada.' };

        // Remove is_active de todas e ativa somente a escolhida
        units.forEach(u => { u.is_active = (u.id === uId); });

        dbCache.units = units;
        saveDB();
        return { success: true, activeUnit: target };
    },

    // Auxiliar para arredondamento correto (2 casas decimais)
    // Evita problemas de ponto flutuante que truncam notas de 6.90 para 6.89
    floorGrade: (val) => {
        if (!val || isNaN(val)) return 0;
        return Number(Math.round(val + "e+2") + "e-2");
    },

    // Motor Centralizado de Notas (Cálculo ao Vivo)
    getStudentComputedGrades: (turmaId, unitId) => {
        let studentList = dbCache.students || [];
        if (turmaId) {
            studentList = studentList.filter(s => s.turma_id === parseInt(turmaId));
        }

        // Unidade ativa: usa o paramêtro ou loca a ativa no banco
        const activeUnitId = unitId
            ? parseInt(unitId)
            : ((dbCache.units || []).find(u => u.is_active)?.id ?? 1);

        const currentSettings = dbCache.settings || defaultData.settings;

        return studentList.map(student => {
            // Resolução Dinâmica e Estrita: busca os parâmetros da (turma, unidade) de CADA estudante
            const targetTurmaId = student.turma_id || (turmaId ? parseInt(turmaId) : null);
            const studentTurma = (dbCache.turmas || []).find(t => t.id === targetTurmaId);
            const unitParams = (dbCache.turma_unit_params || []).find(p => p.turma_id === targetTurmaId && p.unit_id === activeUnitId);

            const turmaMaxActivities       = typeof unitParams?.max_activities === 'number' ? unitParams.max_activities : (typeof studentTurma?.max_activities === 'number' ? studentTurma.max_activities : 27);
            const turmaMaxActivitiesWeight = typeof unitParams?.max_activities_weight === 'number' ? unitParams.max_activities_weight : (typeof studentTurma?.max_activities_weight === 'number' ? studentTurma.max_activities_weight : 1.0);
            const turmaMaxMiniTestes       = typeof unitParams?.max_mini_testes === 'number' ? unitParams.max_mini_testes : (typeof studentTurma?.max_mini_testes === 'number' ? studentTurma.max_mini_testes : 14);
            const turmaMaxMiniTestesWeight = typeof unitParams?.max_mini_testes_weight === 'number' ? unitParams.max_mini_testes_weight : (typeof studentTurma?.max_mini_testes_weight === 'number' ? studentTurma.max_mini_testes_weight : 1.0);
            const turmaMaxMiniTesteScore   = typeof unitParams?.max_mini_teste_score === 'number' ? unitParams.max_mini_teste_score : (typeof studentTurma?.max_mini_teste_score === 'number' ? studentTurma.max_mini_teste_score : 10);
            const turmaMaxProvas           = typeof unitParams?.max_provas === 'number' ? unitParams.max_provas : (typeof studentTurma?.max_provas === 'number' ? studentTurma.max_provas : 1);
            const turmaMaxProvasWeight     = typeof unitParams?.max_provas_weight === 'number' ? unitParams.max_provas_weight : (typeof studentTurma?.max_provas_weight === 'number' ? studentTurma.max_provas_weight : 4.0);
            const turmaMaxProvaScore       = typeof unitParams?.max_prova_score === 'number' ? unitParams.max_prova_score : (typeof studentTurma?.max_prova_score === 'number' ? studentTurma.max_prova_score : 10);

            // Nota Comportamento (Inicia no valor dinâmico) — filtrado pela unidade ativa
            const occs = (dbCache.occurrences || []).filter(o => o.student_id === student.id && o.unit_id === activeUnitId);
            const occurrenceTypes = currentSettings.occurrence_types || defaultData.settings.occurrence_types;
            
            // Aplica a penalidade salva no histórico — filtrado pela unidade ativa
            const totalPenalties = occs.reduce((acc, curr) => {
                return acc + (curr.points !== undefined ? curr.points : 0);
            }, 0);
            
            let behaviorScore = currentSettings.behavior_start_score + totalPenalties; 
            if (behaviorScore < 0) behaviorScore = 0;

            // Mini-Teste: Σ( (nota_bruta / max_score) ) / qtd_aplicada * weight — filtrado pela unidade ativa
            const testesDoAluno = (dbCache.mini_testes || []).filter(t => t.student_id === student.id && t.unit_id === activeUnitId);
            const maxScore = turmaMaxMiniTesteScore;
            
            let totalMiniTestes = 0;
            if (testesDoAluno.length > 0 && maxScore > 0) {
                const somaNormalizada = testesDoAluno.reduce((acc, curr) => {
                    // Normaliza cada nota contra o teto da turma
                    const notaNormalizada = (curr.score || 0) / maxScore;
                    return acc + notaNormalizada;
                }, 0);
                
                // Modelo Acumulativo: cada teste soma pontos até atingir o limite (peso)
                // totalMiniTestes = somaNormalizada * (peso_total_mini_testes / max_mini_testes)
                const maxMiniTestesLimit = turmaMaxMiniTestes || 1;
                totalMiniTestes = Math.min((somaNormalizada * turmaMaxMiniTestesWeight) / maxMiniTestesLimit, turmaMaxMiniTestesWeight);
            }
            
            // Lição de Casa: tasks_done * (1.0 / max_activities) — filtrado pela unidade ativa
            const studentActs = (dbCache.activities || []).filter(a => a.student_id === student.id && a.is_completed && a.unit_id === activeUnitId);
            const MAX_ACTIVITIES = turmaMaxActivities;
            const VALOR_TOTAL_LICAO = turmaMaxActivitiesWeight;
            const peso_por_licao = MAX_ACTIVITIES > 0 ? VALOR_TOTAL_LICAO / MAX_ACTIVITIES : 0;
            let licaoScore = Math.min(studentActs.length * peso_por_licao, VALOR_TOTAL_LICAO);
            
            // Trabalhos (Soma Simples) — filtrado pela unidade ativa
            const trabalhosAluno = (dbCache.trabalhos || []).filter(t => t.student_id === student.id && t.unit_id === activeUnitId);
            const trabalho = trabalhosAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);
            
            // Provas (Soma Normalizada e Ponderada) — filtrado pela unidade ativa
            const provasAluno = (dbCache.provas || []).filter(t => t.student_id === student.id && t.unit_id === activeUnitId);
            const maxProvaScore = turmaMaxProvaScore;
            
            let prova = 0;
            if (provasAluno.length > 0 && maxProvaScore > 0) {
                const somaNormalizada = provasAluno.reduce((acc, curr) => {
                    const notaNormalizada = (curr.score || 0) / maxProvaScore;
                    return acc + notaNormalizada;
                }, 0);
                
                const maxProvasLimit = turmaMaxProvas || 1;
                prova = Math.min((somaNormalizada * turmaMaxProvasWeight) / maxProvasLimit, turmaMaxProvasWeight);
            }
            
            // Atividades Bônus (Soma Direta de Pontos Extras) — filtrado pela unidade ativa
            const bonusAluno = (dbCache.bonus || []).filter(b => b.student_id === student.id && b.unit_id === activeUnitId);
            const totalBonus = bonusAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);
            
            let totalMedia = behaviorScore + totalMiniTestes + prova + licaoScore + trabalho + totalBonus;
            if (totalMedia < 0) totalMedia = 0;
            if (totalMedia > 10) totalMedia = 10; // Teto absoluto da média escolar

            const mediaFinal = dbAPI.floorGrade(totalMedia);

            // Diagnóstico Pedagógico de Alerta (Respeitando o ciclo da unidade e parâmetros da turma):
            const targetUnit = (dbCache.units || []).find(u => u.id === activeUnitId);
            const isUnitClosed = Boolean(targetUnit?.is_closed);
            const turmaTopics = (dbCache.activity_topics || []).filter(t => t.turma_id === targetTurmaId && t.unit_id === activeUnitId);
            const classProvas = (dbCache.provas || []).filter(p => p.unit_id === activeUnitId && (dbCache.students || []).some(s => s.turma_id === targetTurmaId && s.id === p.student_id));
            const classTotalStudents = (dbCache.students || []).filter(s => s.turma_id === targetTurmaId).length;
            const classHasProvas = classTotalStudents > 0 && classProvas.length >= Math.ceil(classTotalStudents * 0.5);

            const alertReasons = [];

            // 1. Risco Disciplinar: penalidades severas acumuladas ou conduta crítica
            const isSeverePenalty = totalPenalties <= -1.0 || behaviorScore < 2.0;
            if (isSeverePenalty) {
                alertReasons.push('disciplinar');
            }

            // 2. Risco de Engajamento/Lições: pendência crônica nas tarefas já lecionadas
            if (turmaTopics.length >= 3) {
                const completionRate = studentActs.length / turmaTopics.length;
                if (completionRate < 0.5) {
                    alertReasons.push('licoes');
                }
            }

            // 3. Risco Acadêmico / Avaliativo:
            if (isUnitClosed) {
                // Unidade encerrada: aprovação formal cobra média final >= 5.0
                if (mediaFinal < 5.0) {
                    alertReasons.push('media_final');
                }
            } else {
                // Unidade em andamento: avalia apenas o que já foi aplicado
                if (provasAluno.length > 0 && turmaMaxProvaScore > 0) {
                    const provaAvg = (provasAluno.reduce((acc, c) => acc + (c.score || 0), 0) / provasAluno.length);
                    if ((provaAvg / turmaMaxProvaScore) < 0.5) {
                        alertReasons.push('avaliativo');
                    }
                } else if (classHasProvas && provasAluno.length === 0) {
                    // Turma realizou prova oficial e este aluno não possui nota
                    alertReasons.push('avaliativo');
                } else if (testesDoAluno.length >= 2 && turmaMaxMiniTesteScore > 0) {
                    // Sem prova ainda, mas com baixo rendimento (< 50%) nos mini-testes realizados
                    const miniAvg = (testesDoAluno.reduce((acc, c) => acc + (c.score || 0), 0) / testesDoAluno.length);
                    if ((miniAvg / turmaMaxMiniTesteScore) < 0.5) {
                        alertReasons.push('avaliativo');
                    }
                }
            }

            const isAlert = alertReasons.length > 0;

            const occurrenceBreakdown = occs.reduce((acc, curr) => {
                const typeConfig = occurrenceTypes.find(t => t.id === curr.type);
                const title = typeConfig ? typeConfig.title : curr.type;
                acc[title] = (acc[title] || 0) + 1;
                return acc;
            }, {});

            return {
                student_id: student.id,
                turma_id: student.turma_id,
                unit_id: activeUnitId,
                name: student.name,
                pointsLost: totalPenalties,
                behaviorScore: behaviorScore,
                totalMiniTestes: totalMiniTestes,
                testesLista: testesDoAluno,
                trabalhosLista: trabalhosAluno,
                provasLista: provasAluno,
                prova: prova,
                bonusLista: bonusAluno,
                bonus: totalBonus,
                licao: licaoScore,
                licaoCheckCount: studentActs.length,
                trabalho: trabalho,
                mediaFinal,
                isAlert,
                alertReasons,
                occurrencesCount: occs.length,
                occurrenceBreakdown,
                maxActivities: turmaMaxActivities,
                maxActivitiesWeight: turmaMaxActivitiesWeight,
                maxMiniTestes: turmaMaxMiniTestes,
                maxMiniTestesWeight: turmaMaxMiniTestesWeight,
                maxMiniTesteScore: turmaMaxMiniTesteScore,
                maxProvas: turmaMaxProvas,
                maxProvasWeight: turmaMaxProvasWeight,
                maxProvaScore: turmaMaxProvaScore
            };
        });
    },
    // Metadata para Cloud Sync
    getMetadata: () => {
        if (!dbCache || !dbCache.metadata) return { last_updated: new Date(0).toISOString() };
        return dbCache.metadata;
    },
    /**
     * Retorna o banco atual serializado e criptografado, direto da memória (dbCache).
     * Usa a mesma lógica de saveDB — sem I/O de disco, sem race condition.
     * É a fonte canonica de verdade para uploads de backup.
     * @returns {string} String criptografada pronta para envio à nuvem.
     */
    getEncryptedData: () => {
        if (!dbCache) throw new Error('[DB] getEncryptedData: dbCache não inicializado.');
        const jsonStr = JSON.stringify(dbCache, null, 2);
        return encryptData(jsonStr);
    },
    importData: (externalData) => {
        try {
            let rawData = typeof externalData === 'string' ? externalData : JSON.stringify(externalData);
            let decryptedData = decryptData(rawData);
            let parsed = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;
            
            // Validação básica de integridade
            if (!parsed || typeof parsed !== 'object') throw new Error('Dados inválidos');

            // Aplica migrações para garantir que dados antigos (Restore) sejam compatíveis com a versão atual
            const { data, migrated } = applyMigrations(parsed);
            
            dbCache = data;
            saveDB();
            return { success: true };
        } catch (e) {
            console.error('Erro na importação:', e);
            return { error: 'O arquivo de backup parece estar corrompido ou é incompatível.' };
        }
    },

    // Segurança & Autenticação
    getAuth: () => dbCache.auth || defaultData.auth,
    saveAuth: (authData) => {
        if (dbCache) {
            dbCache.auth = { ...dbCache.auth, ...authData };
            saveDB();
            return { success: true };
        }
        return { error: 'DB não cacheado' };
    },

    getUnitAgenda: (turmaId, activeUnitId) => {
        let list = dbCache.unit_agenda || [];
        const unitId = parseInt(activeUnitId) || (dbCache.units || []).find(u => u.is_active)?.id || 1;
        list = list.filter(a => a.unit_id === unitId);
        if (turmaId) {
            list = list.filter(a => a.turma_id === parseInt(turmaId));
        }
        return list;
    },
    addUnitAgendaItem: (turmaId, itemData) => {
        if (!dbCache.unit_agenda) dbCache.unit_agenda = [];
        const nextId = dbCache.unit_agenda.length > 0 ? Math.max(...dbCache.unit_agenda.map(a => a.id)) + 1 : 1;
        const activeUnitId = parseInt(itemData.unit_id) || (dbCache.units || []).find(u => u.is_active)?.id || 1;
        const newItem = {
            id: nextId,
            turma_id: parseInt(turmaId),
            unit_id: activeUnitId,
            semana: itemData.semana || '',
            referencia: itemData.referencia || '',
            atividade: itemData.atividade || '',
            criterio: itemData.criterio || '',
            is_corrected: itemData.is_corrected || false,
            is_special_row: itemData.is_special_row || false
        };
        dbCache.unit_agenda.push(newItem);
        saveDB();
        return { success: true, item: newItem };
    },
    updateUnitAgendaItem: (id, itemData) => {
        if (!dbCache.unit_agenda) return { error: 'Agenda não inicializada' };
        const idx = dbCache.unit_agenda.findIndex(a => a.id === parseInt(id));
        if (idx !== -1) {
            dbCache.unit_agenda[idx] = { ...dbCache.unit_agenda[idx], ...itemData };
            saveDB();
            return { success: true };
        }
        return { error: 'Item não encontrado' };
    },
    deleteUnitAgendaItem: (id) => {
        if (!dbCache.unit_agenda) return { error: 'Agenda não inicializada' };
        dbCache.unit_agenda = dbCache.unit_agenda.filter(a => a.id !== parseInt(id));
        saveDB();
        return { success: true };
    },
    toggleAgendaCorrection: (id) => {
        if (!dbCache.unit_agenda) return { error: 'Agenda não inicializada' };
        const idx = dbCache.unit_agenda.findIndex(a => a.id === parseInt(id));
        if (idx !== -1) {
            dbCache.unit_agenda[idx].is_corrected = !dbCache.unit_agenda[idx].is_corrected;
            saveDB();
            return { success: true };
        }
        return { error: 'Item não encontrado' };
    },

    // ===================================================================
    // SNAPSHOT LOCAL — Segurança antes de operações destrutivas (Restore)
    // ===================================================================

    /**
     * Cria uma cópia de segurança do banco atual em `school_data.snapshot`.
     * Deve ser chamado ANTES de qualquer operação de restore/importação externa.
     * Usa escrita atômica (.tmp → rename) para garantir integridade.
     * @returns {{ success: boolean, snapshotPath?: string, error?: string }}
     */
    createLocalSnapshot: () => {
        const snapshotPath = dbPath + '.snapshot';
        const tmpPath = snapshotPath + '.tmp';
        try {
            // Serializa e criptografa direto da memória (sem I/O de disco)
            const currentRaw = dbAPI.getEncryptedData();
            fs.writeFileSync(tmpPath, currentRaw);
            fs.renameSync(tmpPath, snapshotPath);
            console.log('[DB Snapshot] Snapshot local criado com sucesso em:', snapshotPath);
            return { success: true, snapshotPath };
        } catch (e) {
            console.error('[DB Snapshot] Falha ao criar snapshot:', e.message);
            // Limpa arquivo temporário se existir
            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
            return { success: false, error: 'Falha ao criar snapshot local: ' + e.message };
        }
    },

    /**
     * Restaura o banco a partir do snapshot local criado por `createLocalSnapshot`.
     * Chamado automaticamente em caso de falha no restore da nuvem.
     * @returns {{ success: boolean, error?: string }}
     */
    restoreFromSnapshot: () => {
        const snapshotPath = dbPath + '.snapshot';
        const tmpPath = dbPath + '.tmp';
        try {
            if (!fs.existsSync(snapshotPath)) {
                return { success: false, error: 'Nenhum snapshot encontrado para rollback.' };
            }
            const snapshotRaw = fs.readFileSync(snapshotPath);
            fs.writeFileSync(tmpPath, snapshotRaw);
            fs.renameSync(tmpPath, dbPath);

            // Recarrega o cache em memória a partir do arquivo restaurado
            const decryptedRaw = decryptData(snapshotRaw.toString('utf-8'));
            const parsed = JSON.parse(decryptedRaw);
            const { data } = applyMigrations(parsed);
            dbCache = data;

            console.log('[DB Snapshot] Rollback concluído. Banco restaurado do snapshot local.');
            return { success: true };
        } catch (e) {
            console.error('[DB Snapshot] Falha crítica no rollback:', e.message);
            return { success: false, error: 'Falha ao restaurar snapshot local: ' + e.message };
        }
    },

    /**
     * Remove o arquivo de snapshot após um restore bem-sucedido.
     * Limpeza obrigatória para não acumular arquivos obsoletos.
     */
    deleteSnapshot: () => {
        const snapshotPath = dbPath + '.snapshot';
        try {
            if (fs.existsSync(snapshotPath)) {
                fs.unlinkSync(snapshotPath);
                console.log('[DB Snapshot] Snapshot removido após restore bem-sucedido.');
            }
        } catch (e) {
            console.warn('[DB Snapshot] Aviso: não foi possível remover o snapshot:', e.message);
        }
    }
};

module.exports = { initDB, dbAPI, dbPath };
