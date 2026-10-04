/* eslint-env node */
/**
 * Serviço Especialista: Cofre Federado e Inteligência da Coordenação Pedagógica
 * Gerencia o armazenamento particionado (Sharding), cache LRU, agregação 360º
 * de alunos e auditoria multi-docente sem sobrecarregar a memória RAM.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const sessionManager = require('./coordinatorSessionManager');
const identityResolver = require('./coordinatorIdentityResolver');
const diagnosisArchiveService = require('./diagnosisArchiveService');

// Chave padrão da aplicação para abertura de backups de professores
const DEFAULT_APP_SECRET = "EduSysPro_Local_Secure_Secret_Key_v3_2026";
const ALGORITHM = 'aes-256-cbc';

const isDev = !app || !app.isPackaged;
const vaultBaseDir = isDev
    ? path.join(__dirname, '..', '..', 'coordinator_vault')
    : (app && typeof app.getPath === 'function' 
        ? path.join(app.getPath('userData'), 'coordinator_vault') 
        : path.join(__dirname, '..', '..', 'coordinator_vault'));

const manifestPath = path.join(vaultBaseDir, 'manifest.json');
const aggregatesPath = path.join(vaultBaseDir, 'aggregates_cache.json');
const teachersDir = path.join(vaultBaseDir, 'teachers');

// Cache LRU em memória (máximo 3 snapshots de professores abertos simultaneamente)
const LRU_MAX_SIZE = 3;
const lruTeacherCache = new Map();

function ensureDirectories() {
    try {
        if (!fs.existsSync(vaultBaseDir)) {
            fs.mkdirSync(vaultBaseDir, { recursive: true });
        }
        if (!fs.existsSync(teachersDir)) {
            fs.mkdirSync(teachersDir, { recursive: true });
        }
        if (!fs.existsSync(manifestPath)) {
            const initialManifest = {
                vault_version: '2.1.0',
                created_at: new Date().toISOString(),
                last_vault_sync: new Date().toISOString(),
                teachers_index: {},
                canonical_students: {}
            };
            fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');
        }
    } catch (e) {
        console.error('[CoordinatorService] Falha ao assegurar diretórios do cofre:', e.message);
    }
}

/**
 * Descriptografa payload padrão do EduSys Pro.
 */
function decryptPayload(rawText) {
    if (typeof rawText !== 'string') return rawText;
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch (_) {
            // Continua tentativa de decriptação
        }
    }

    try {
        const textParts = trimmed.split(':');
        if (textParts.length !== 2) return null;
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');
        const key = crypto.createHash('sha256').update(DEFAULT_APP_SECRET).digest();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (err) {
        console.warn('[CoordinatorService] Falha ao descriptografar payload com chave padrão:', err.message);
        return null;
    }
}

/**
 * Lê o manifest.json defensivamente.
 */
function readManifest() {
    ensureDirectories();
    try {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        if (!raw || !raw.trim()) {
            return { vault_version: '2.1.0', teachers_index: {}, canonical_students: {} };
        }
        return JSON.parse(raw);
    } catch (err) {
        console.error('[CoordinatorService] Erro ao ler manifest.json:', err.message);
        return { vault_version: '2.1.0', teachers_index: {}, canonical_students: {} };
    }
}

/**
 * Escreve o manifest.json de forma atômica.
 */
function writeManifest(manifestData) {
    ensureDirectories();
    try {
        manifestData.last_vault_sync = new Date().toISOString();
        const tmp = `${manifestPath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(manifestData, null, 2), 'utf8');
        fs.renameSync(tmp, manifestPath);
        return true;
    } catch (err) {
        console.error('[CoordinatorService] Erro crítico ao salvar manifest.json:', err.message);
        throw new Error('Falha ao persistir índice do cofre.');
    }
}

/**
 * Obtém snapshot de um professor com Cache LRU.
 */
function getTeacherShard(teacherId) {
    if (lruTeacherCache.has(teacherId)) {
        const cached = lruTeacherCache.get(teacherId);
        // Atualiza posição no LRU
        lruTeacherCache.delete(teacherId);
        lruTeacherCache.set(teacherId, cached);
        return cached;
    }

    const shardPath = path.join(teachersDir, `${teacherId}.json`);
    if (!fs.existsSync(shardPath)) {
        return null;
    }

    try {
        const raw = fs.readFileSync(shardPath, 'utf8');
        const data = JSON.parse(raw);

        if (lruTeacherCache.size >= LRU_MAX_SIZE) {
            const oldestKey = lruTeacherCache.keys().next().value;
            lruTeacherCache.delete(oldestKey);
        }

        lruTeacherCache.set(teacherId, data);
        return data;
    } catch (err) {
        console.error(`[CoordinatorService] Erro ao carregar shard do professor ${teacherId}:`, err.message);
        return null;
    }
}

/**
 * Salva snapshot de um professor em shard isolado de forma atômica.
 */
function writeTeacherShard(teacherId, payload) {
    ensureDirectories();
    const shardPath = path.join(teachersDir, `${teacherId}.json`);
    const tmp = `${shardPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, shardPath);

    // Atualiza cache LRU
    if (lruTeacherCache.has(teacherId)) {
        lruTeacherCache.delete(teacherId);
    }
    if (lruTeacherCache.size >= LRU_MAX_SIZE) {
        const oldestKey = lruTeacherCache.keys().next().value;
        lruTeacherCache.delete(oldestKey);
    }
    lruTeacherCache.set(teacherId, payload);
}

/**
 * Ingestão e catalogação de um backup de professor no cofre.
 * @param {Object} backupPackage Objeto ou string contendo o snapshot
 * @param {Object} sourceMeta Informações da origem (ex: drive file id, local path)
 */
async function ingestTeacherSnapshot(backupPackage, sourceMeta = {}) {
    sessionManager.assertCoordinatorAccess();

    if (!backupPackage) {
        throw new Error('Pacote de dados do professor não fornecido.');
    }

    // Normaliza envelope se contido em envelope de integridade
    let rawPayload = backupPackage;
    let uploadedAt = sourceMeta.uploadedAt || new Date().toISOString();
    let fileHash = sourceMeta.hash || null;

    if (backupPackage && backupPackage._edusys === true && backupPackage.payload) {
        rawPayload = backupPackage.payload;
        uploadedAt = backupPackage.uploaded_at || uploadedAt;
        fileHash = backupPackage.hash || fileHash;
    }

    // Calcula hash do payload se não fornecido
    if (!fileHash) {
        const strToHash = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
        fileHash = crypto.createHash('sha256').update(strToHash, 'utf8').digest('hex');
    }

    // Descriptografa dados do professor
    let parsedData = decryptPayload(rawPayload);
    if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Não foi possível ler ou descriptografar os dados do professor. Verifique se o arquivo é válido.');
    }

    const teacherName = String(
        parsedData.auth?.user_name || 
        sourceMeta.teacherName || 
        'Professor Cadastrado'
    ).trim();

    // Gera ID único determinístico para o professor com base no nome
    const teacherId = `prof_${crypto.createHash('sha256').update(identityResolver.normalizeStr(teacherName), 'utf8').digest('hex').slice(0, 12)}`;

    const manifest = readManifest();
    const existingIndex = manifest.teachers_index[teacherId];

    // Detecção de Idempotência (Hash idêntico)
    if (existingIndex && existingIndex.backup_hash === fileHash) {
        return {
            success: true,
            status: 'SKIPPED_IDENTICAL',
            teacherId,
            teacherName,
            message: 'O backup deste professor já está catalogado e em sua versão mais recente.'
        };
    }

    // Detecção de Stale Data (Arquivo recebido mais antigo que o atual)
    if (existingIndex && existingIndex.last_backup_at) {
        const existingTime = new Date(existingIndex.last_backup_at).getTime();
        const incomingTime = new Date(uploadedAt).getTime();
        if (incomingTime < existingTime) {
            console.warn(`[CoordinatorService] Backup rejeitado para ${teacherName}: arquivo recebido (${uploadedAt}) é mais antigo que o atual (${existingIndex.last_backup_at}).`);
            return {
                success: false,
                status: 'REJECTED_STALE_DATA',
                teacherId,
                teacherName,
                error: 'O backup recebido é anterior à versão já presente no cofre.'
            };
        }
    }

    // Normalização das turmas e disciplinas
    const rawTurmas = Array.isArray(parsedData.turmas) ? parsedData.turmas : [];
    const rawStudents = Array.isArray(parsedData.students) ? parsedData.students : [];
    const turmaNames = rawTurmas.map(t => t.name).filter(Boolean);

    // Extrai disciplina predominante ou informada
    const discipline = sourceMeta.discipline || (rawTurmas[0]?.discipline || (rawTurmas[0] ? identityResolver.extractDiscipline(rawTurmas[0].name, rawTurmas[0].icon) : 'Geral'));

    // Ingestão simultânea de diagnósticos de IA do acervo persistente
    let diagnosesList = Array.isArray(parsedData.diagnoses) ? [...parsedData.diagnoses] : [];
    try {
        const archiveRecords = diagnosisArchiveService.readArchiveFile ? diagnosisArchiveService.readArchiveFile() : [];
        if (archiveRecords.length > 0) {
            const studentIdSet = new Set(rawStudents.map(s => String(s.id)));
            const studentNameSet = new Set(rawStudents.map(s => identityResolver.normalizeStr(s.name)));
            const matchedArchive = archiveRecords.filter(d => 
                studentIdSet.has(String(d.student_id)) || studentNameSet.has(identityResolver.normalizeStr(d.student_name))
            );
            const existingIds = new Set(diagnosesList.map(d => String(d.id || `${d.student_id}_${d.created_at || ''}`)));
            matchedArchive.forEach(d => {
                const key = String(d.id || `${d.student_id}_${d.created_at || ''}`);
                if (!existingIds.has(key)) {
                    existingIds.add(key);
                    diagnosesList.push(d);
                }
            });
        }
    } catch (e) {
        console.warn('[CoordinatorService] Falha ao integrar diagnósticos do acervo:', e.message);
    }

    const shardPayload = {
        teacher_id: teacherId,
        teacher_name: teacherName,
        discipline,
        synced_at: new Date().toISOString(),
        last_backup_at: uploadedAt,
        backup_hash: fileHash,
        source: sourceMeta.source || 'manual_import',
        payload: {
            turmas: rawTurmas,
            students: rawStudents,
            activities: Array.isArray(parsedData.activities) ? parsedData.activities : [],
            activity_topics: Array.isArray(parsedData.activity_topics) ? parsedData.activity_topics : [],
            occurrences: Array.isArray(parsedData.occurrences) ? parsedData.occurrences : [],
            mini_testes: Array.isArray(parsedData.mini_testes) ? parsedData.mini_testes : [],
            trabalhos: Array.isArray(parsedData.trabalhos) ? parsedData.trabalhos : [],
            provas: Array.isArray(parsedData.provas) ? parsedData.provas : [],
            bonus: Array.isArray(parsedData.bonus) ? parsedData.bonus : [],
            units: Array.isArray(parsedData.units) ? parsedData.units : [],
            diagnoses: diagnosesList,
            settings: parsedData.settings || null,
            turma_unit_params: Array.isArray(parsedData.turma_unit_params) ? parsedData.turma_unit_params : [],
            plans: Array.isArray(parsedData.plans) ? parsedData.plans : []
        }
    };

    // Salva o shard do professor de forma atômica
    writeTeacherShard(teacherId, shardPayload);

    // Atualiza o índice do manifest
    manifest.teachers_index[teacherId] = {
        id: teacherId,
        name: teacherName,
        discipline,
        turmas: turmaNames,
        last_backup_at: uploadedAt,
        backup_hash: fileHash,
        source: sourceMeta.source || 'manual_import',
        records_count: {
            students: rawStudents.length,
            activities: shardPayload.payload.activities.length,
            occurrences: shardPayload.payload.occurrences.length,
            provas: shardPayload.payload.provas.length,
            diagnoses: shardPayload.payload.diagnoses.length,
            plans: shardPayload.payload.plans.length
        }
    };

    // Atualiza a tabela de mapeamento canônico de estudantes
    manifest.canonical_students = identityResolver.mapTeacherStudentsToCanonical(
        manifest.canonical_students,
        teacherId,
        teacherName,
        discipline,
        rawStudents,
        rawTurmas
    );

    writeManifest(manifest);
    recalculateAggregatesCache(manifest);

    console.log(`[CoordinatorService] Professor ingerido com sucesso: ${teacherName} (${teacherId})`);

    return {
        success: true,
        status: 'INGESTED_OK',
        teacherId,
        teacherName,
        discipline,
        studentsCount: rawStudents.length
    };
}

/**
 * Calcula a nota e métricas consolidadas de um aluno em uma disciplina específica (shard do professor).
 * Replica com precisão cirúrgica a fórmula ponderada oficial do EduSys Pro:
 * Média = Comportamento + Mini-testes + Provas + Lições/Atividades + Trabalhos + Bônus (teto 10.0)
 */
function computeStudentDisciplineMetrics(payload, localStudentId, localTurmaId) {
    if (!payload || !Array.isArray(payload.students)) return null;

    const student = (payload.students || []).find(s => s.id === localStudentId);
    if (!student) return null;

    const targetTurmaId = localTurmaId || student.turma_id;
    const studentTurma = (payload.turmas || []).find(t => t.id === targetTurmaId);
    
    // Unidade ativa de referência
    const activeUnit = (payload.units || []).find(u => u.is_active) || (payload.units || [])[0] || { id: 1 };
    const activeUnitId = activeUnit.id;

    const unitParams = (payload.turma_unit_params || []).find(p => p.turma_id === targetTurmaId && p.unit_id === activeUnitId);
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

    // 1. Comportamento
    const occs = (payload.occurrences || []).filter(o => o.student_id === localStudentId);
    const totalPenalties = occs.reduce((acc, curr) => acc + (curr.points !== undefined ? curr.points : 0), 0);
    const startScore = typeof settings.behavior_start_score === 'number' ? settings.behavior_start_score : 3.0;
    let behaviorScore = startScore + totalPenalties;
    if (behaviorScore < 0) behaviorScore = 0;

    // 2. Mini-Testes
    const testesDoAluno = (payload.mini_testes || []).filter(t => t.student_id === localStudentId);
    let totalMiniTestes = 0;
    if (testesDoAluno.length > 0 && turmaMaxMiniTesteScore > 0) {
        const somaNormalizada = testesDoAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxMiniTesteScore), 0);
        const limit = turmaMaxMiniTestes || 1;
        totalMiniTestes = Math.min((somaNormalizada * turmaMaxMiniTestesWeight) / limit, turmaMaxMiniTestesWeight);
    }

    // 3. Lições de Casa / Atividades
    const studentActs = (payload.activities || []).filter(a => a.student_id === localStudentId && a.is_completed);
    const peso_por_licao = turmaMaxActivities > 0 ? turmaMaxActivitiesWeight / turmaMaxActivities : 0;
    const licaoScore = Math.min(studentActs.length * peso_por_licao, turmaMaxActivitiesWeight);

    // 4. Trabalhos
    const trabalhosAluno = (payload.trabalhos || []).filter(t => t.student_id === localStudentId);
    const trabalhoScore = trabalhosAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);

    // 5. Provas
    const provasAluno = (payload.provas || []).filter(t => t.student_id === localStudentId);
    let provaScore = 0;
    if (provasAluno.length > 0 && turmaMaxProvaScore > 0) {
        const somaNormalizada = provasAluno.reduce((acc, curr) => acc + ((curr.score || 0) / turmaMaxProvaScore), 0);
        const limit = turmaMaxProvas || 1;
        provaScore = Math.min((somaNormalizada * turmaMaxProvasWeight) / limit, turmaMaxProvasWeight);
    }

    // 6. Bônus
    const bonusAluno = (payload.bonus || []).filter(b => b.student_id === localStudentId);
    const bonusScore = bonusAluno.reduce((acc, curr) => acc + (curr.score || 0), 0);

    // Média Final
    let totalMedia = behaviorScore + totalMiniTestes + provaScore + licaoScore + trabalhoScore + bonusScore;
    if (totalMedia < 0) totalMedia = 0;
    if (totalMedia > 10) totalMedia = 10;
    const mediaFinal = Math.floor(totalMedia * 100) / 100;

    return {
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
        occurrencesCount: occs.length,
        mediaFinal: mediaFinal
    };
}

/**
 * Recalcula o cache de agregados da escola para resposta instantânea na UI.
 */
function recalculateAggregatesCache(manifest) {
    try {
        const canonicalList = Object.values(manifest.canonical_students || {});
        const teachersList = Object.values(manifest.teachers_index || {});

        const totalStudents = canonicalList.length;
        const totalTeachers = teachersList.length;

        let totalGradesSum = 0;
        let totalGradesCount = 0;
        const allDiagnosesKeys = new Set();

        // 1. Contabiliza diagnósticos nos shards
        teachersList.forEach(t => {
            const shard = getTeacherShard(t.id);
            if (shard && shard.payload) {
                (shard.payload.diagnoses || []).forEach(d => {
                    const idKey = String(d.id || `${d.student_id}_${d.created_at || ''}`);
                    allDiagnosesKeys.add(idKey);
                });
            }
        });

        // 2. Contabiliza diagnósticos no acervo
        try {
            const archiveRecords = diagnosisArchiveService.readArchiveFile ? diagnosisArchiveService.readArchiveFile() : [];
            archiveRecords.forEach(d => {
                const idKey = String(d.id || `${d.student_id}_${d.created_at || ''}`);
                allDiagnosesKeys.add(idKey);
            });
        } catch (_) { /* ignore */ }

        // 3. Calcula médias de todos os alunos canônicos
        canonicalList.forEach(st => {
            (st.enrolled_teachers || []).forEach(enroll => {
                const shard = getTeacherShard(enroll.teacher_id);
                if (shard && shard.payload) {
                    const metrics = computeStudentDisciplineMetrics(shard.payload, enroll.local_student_id, enroll.local_turma_id);
                    if (metrics && typeof metrics.mediaFinal === 'number' && !isNaN(metrics.mediaFinal)) {
                        totalGradesSum += metrics.mediaFinal;
                        totalGradesCount++;
                    }
                }
            });
        });

        const schoolAverage = totalGradesCount > 0
            ? Number((totalGradesSum / totalGradesCount).toFixed(2))
            : null;

        const aggregates = {
            calculated_at: new Date().toISOString(),
            total_students: totalStudents,
            total_canonical_students: totalStudents,
            total_teachers: totalTeachers,
            total_diagnoses_indexed: allDiagnosesKeys.size,
            school_average: schoolAverage,
            disciplines: [...new Set(teachersList.map(t => t.discipline).filter(Boolean))],
            turmas: [...new Set(teachersList.flatMap(t => t.turmas || []).filter(Boolean))]
        };

        const tmp = `${aggregatesPath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(aggregates, null, 2), 'utf8');
        fs.renameSync(tmp, aggregatesPath);
        return aggregates;
    } catch (err) {
        console.warn('[CoordinatorService] Falha ao atualizar aggregates_cache:', err.message);
        return null;
    }
}

/**
 * Lista todos os professores registrados no cofre.
 */
function listTeachers() {
    sessionManager.assertCoordinatorAccess();
    const manifest = readManifest();
    return {
        success: true,
        teachers: Object.values(manifest.teachers_index || {}),
        lastSync: manifest.last_vault_sync
    };
}

/**
 * Remove um professor do cofre e desindexa seus dados.
 */
function removeTeacher(teacherId) {
    sessionManager.assertCoordinatorAccess();
    const manifest = readManifest();

    if (!manifest.teachers_index[teacherId]) {
        return { success: false, error: 'Professor não localizado no cofre.' };
    }

    delete manifest.teachers_index[teacherId];
    manifest.canonical_students = identityResolver.pruneTeacherFromCanonicalMap(manifest.canonical_students, teacherId);

    // Remove shard e limpa cache LRU
    const shardPath = path.join(teachersDir, `${teacherId}.json`);
    if (fs.existsSync(shardPath)) {
        try { fs.unlinkSync(shardPath); } catch (_) { /* ignore */ }
    }
    lruTeacherCache.delete(teacherId);

    writeManifest(manifest);
    recalculateAggregatesCache(manifest);

    return { success: true, removedId: teacherId };
}

/**
 * Gera o Raio-X Dossiê 360º de um estudante através de todas as disciplinas.
 * @param {string} canonicalStudentId ID canônico do estudante
 */
function getStudent360(canonicalStudentId) {
    sessionManager.assertCoordinatorAccess();
    const manifest = readManifest();
    const studentMeta = manifest.canonical_students?.[canonicalStudentId];

    if (!studentMeta) {
        return { success: false, error: 'Estudante não localizado no índice canônico.' };
    }

    const disciplinesData = [];
    const allOccurrences = [];
    const allDiagnoses = [];
    const seenDiagnosisIds = new Set();

    // Itera apenas sobre os professores onde o aluno está matriculado
    (studentMeta.enrolled_teachers || []).forEach(enroll => {
        const shard = getTeacherShard(enroll.teacher_id);
        if (!shard || !shard.payload) return;

        const payload = shard.payload;
        const localId = enroll.local_student_id;
        const localTurmaId = enroll.local_turma_id;

        // Ocorrências deste aluno nesta matéria/turma
        const teacherOccurrences = (payload.occurrences || [])
            .filter(o => o.student_id === localId)
            .map(o => ({
                ...o,
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name
            }));
        allOccurrences.push(...teacherOccurrences);

        // Atividades e Lições
        const studentActivities = (payload.activities || []).filter(a => a.student_id === localId);
        const deliveredCount = studentActivities.filter(a => a.is_completed).length;

        // Provas e Avaliações
        const studentProvas = (payload.provas || []).filter(p => p.student_id === localId);
        const studentMiniTestes = (payload.mini_testes || []).filter(m => m.student_id === localId);
        const studentTrabalhos = (payload.trabalhos || []).filter(t => t.student_id === localId);
        const studentBonus = (payload.bonus || []).filter(b => b.student_id === localId);

        // Diagnósticos Pedagógicos IA deste shard
        const studentDiagnoses = (payload.diagnoses || [])
            .filter(d => String(d.student_id) === String(localId) || identityResolver.normalizeStr(d.student_name) === studentMeta.normalized_name)
            .map(d => ({
                ...d,
                discipline: enroll.discipline,
                teacher_name: enroll.teacher_name,
                turma_name: enroll.turma_name
            }));

        studentDiagnoses.forEach(d => {
            const dKey = String(d.id || `${d.discipline || ''}_${d.created_at || ''}_${d.student_id || ''}_${d.diagnosis_text ? d.diagnosis_text.slice(0, 15) : ''}`);
            if (!seenDiagnosisIds.has(dKey)) {
                seenDiagnosisIds.add(dKey);
                allDiagnoses.push(d);
            }
        });

        // Motor de Notas Real com ponderação oficial EduSys Pro
        const computed = computeStudentDisciplineMetrics(payload, localId, localTurmaId);
        
        // Média de provas avulsas caso seja um snapshot simplificado sem settings
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
            delivered_activities: computed ? computed.licaoCheckCount : deliveredCount,
            occurrences_count: teacherOccurrences.length,
            average_score: finalScore,
            mediaFinal: finalScore,
            behaviorScore: computed ? computed.behaviorScore : 3.0,
            evaluations_count: studentProvas.length + studentMiniTestes.length,
            provas: studentProvas,
            mini_testes: studentMiniTestes,
            trabalhos: studentTrabalhos,
            bonus: studentBonus,
            computed: computed
        });
    });

    // Ingestão adicional a partir do acervo de diagnósticos de IA (student_diagnoses_archive.json)
    try {
        const archiveRecords = diagnosisArchiveService.readArchiveFile ? diagnosisArchiveService.readArchiveFile() : [];
        const normStudentName = studentMeta.normalized_name || identityResolver.normalizeStr(studentMeta.canonical_name);
        const enrolledLocalIds = new Set((studentMeta.enrolled_teachers || []).map(e => String(e.local_student_id)));

        archiveRecords.forEach(d => {
            const matchesId = enrolledLocalIds.has(String(d.student_id));
            const matchesName = identityResolver.normalizeStr(d.student_name) === normStudentName;
            if (matchesId || matchesName) {
                const dKey = String(d.id || `${d.unit_id || ''}_${d.created_at || ''}_${d.student_id || ''}`);
                if (!seenDiagnosisIds.has(dKey)) {
                    seenDiagnosisIds.add(dKey);
                    allDiagnoses.push({
                        ...d,
                        discipline: d.discipline || studentMeta.display_turma || 'Geral',
                        teacher_name: d.author_name || 'Docente'
                    });
                }
            }
        });
    } catch (_) { /* ignore */ }

    // Média geral ponderada multi-disciplinar
    const validScores = disciplinesData.map(d => d.average_score).filter(s => typeof s === 'number' && !isNaN(s));
    const overallAverage = validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
        : 0;

    // Consolidação de todas as avaliações individuais por disciplina/docente
    const allEvaluations = [];
    disciplinesData.forEach(d => {
        (d.provas || []).forEach(p => {
            allEvaluations.push({
                discipline: d.discipline,
                teacher_name: d.teacher_name,
                turma_name: d.turma_name,
                activity_name: p.title || p.name || 'Prova Oficial',
                type: 'Prova',
                unit_id: p.unit_id || 1,
                score: p.score,
                weight: p.weight || 4.0
            });
        });
        (d.mini_testes || []).forEach(m => {
            allEvaluations.push({
                discipline: d.discipline,
                teacher_name: d.teacher_name,
                turma_name: d.turma_name,
                activity_name: m.title || m.name || 'Mini-Teste',
                type: 'Mini-Teste',
                unit_id: m.unit_id || 1,
                score: m.score,
                weight: m.weight || 1.0
            });
        });
        (d.trabalhos || []).forEach(t => {
            allEvaluations.push({
                discipline: d.discipline,
                teacher_name: d.teacher_name,
                turma_name: d.turma_name,
                activity_name: t.title || t.name || 'Trabalho / Seminário',
                type: 'Trabalho',
                unit_id: t.unit_id || 1,
                score: t.score,
                weight: t.weight || 1.0
            });
        });
        (d.bonus || []).forEach(b => {
            allEvaluations.push({
                discipline: d.discipline,
                teacher_name: d.teacher_name,
                turma_name: d.turma_name,
                activity_name: b.title || b.name || 'Atividade Bônus',
                type: 'Bônus',
                unit_id: b.unit_id || 1,
                score: b.score,
                weight: 0
            });
        });
    });

    const summary = {
        overall_average: overallAverage,
        disciplines: disciplinesData.map(d => ({
            discipline: d.discipline,
            teacher_name: d.teacher_name,
            turma_name: d.turma_name,
            average: d.average_score,
            evaluations_count: d.evaluations_count,
            delivered_activities: d.delivered_activities,
            occurrences_count: d.occurrences_count,
            behavior_score: d.behaviorScore
        }))
    };

    const availableUnits = [
        { id: 'ALL', name: 'Todas as Unidades' },
        { id: 1, name: '1ª Unidade', is_active: true },
        { id: 2, name: '2ª Unidade', is_active: false },
        { id: 3, name: '3ª Unidade', is_active: false }
    ];

    const dossierResult = {
        canonical_id: studentMeta.canonical_id,
        canonical_name: studentMeta.canonical_name,
        turma_base: studentMeta.turma_base,
        display_turma: studentMeta.display_turma,
        turmas: studentMeta.turmas || [studentMeta.display_turma],
        overall_average: overallAverage,
        selected_unit: 'ALL',
        available_units: availableUnits,
        multi_disciplinary_summary: summary,
        disciplines: disciplinesData,
        evaluations: allEvaluations,
        occurrences: allOccurrences,
        diagnoses: allDiagnoses
    };

    return {
        success: true,
        selected_unit: 'ALL',
        available_units: availableUnits,
        student: dossierResult,
        dossier: dossierResult
    };
}

/**
 * Retorna as métricas globais e lista de estudantes canônicos para a visão geral.
 */
function getSchoolOverview() {
    sessionManager.assertCoordinatorAccess();
    const manifest = readManifest();

    let cachedAggregates = null;
    if (fs.existsSync(aggregatesPath)) {
        try {
            cachedAggregates = JSON.parse(fs.readFileSync(aggregatesPath, 'utf8'));
        } catch (_) { /* ignore */ }
    }

    if (!cachedAggregates || cachedAggregates.school_average === undefined) {
        cachedAggregates = recalculateAggregatesCache(manifest);
    }

    const studentsList = Object.values(manifest.canonical_students || {}).map(s => {
        const turmasList = s.turmas || (s.enrolled_teachers ? [...new Set(s.enrolled_teachers.map(e => e.turma_name).filter(Boolean))] : [s.display_turma]);
        return {
            canonical_id: s.canonical_id,
            canonical_name: s.canonical_name,
            display_turma: s.display_turma,
            turmas: turmasList,
            disciplines_count: (s.enrolled_teachers || []).length
        };
    });

    return {
        success: true,
        overview: cachedAggregates,
        students: studentsList,
        teachers: Object.values(manifest.teachers_index || {})
    };
}

module.exports = {
    ensureDirectories,
    ingestTeacherSnapshot,
    listTeachers,
    removeTeacher,
    getTeacherShard,
    getStudent360,
    getSchoolOverview,
    recalculateAggregatesCache,
    computeStudentDisciplineMetrics
};
