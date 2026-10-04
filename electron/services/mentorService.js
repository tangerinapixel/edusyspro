const { GoogleGenerativeAI } = require("@google/generative-ai");
const { dbAPI } = require('../database');
const { 
    getLongitudinalSummary, 
    formatLongitudinalChatContext, 
    getStudentMultiUnitDetailedDossier 
} = require('./longitudinalService');
const { 
    getPrioritizedKeys, 
    withTimeout, 
    MODELS_PRIORITY, 
    quarantineKey, 
    markKeySuccess,
    executeAIRotation
} = require('./aiService');

const MENTOR_SYSTEM_INSTRUCTION = `STATUS: AGENTE EM OPERAÇÃO
NOME: Mentor Pedagógico EduSys Pro
OBJETIVO: Análise de dados e suporte ao professor.

[REGRA DE AVALIAÇÃO TEMPORAL 100% DINÂMICA]
- A unidade letiva está EM ANDAMENTO.
- Distinga rigorosamente: (A) Atividades/Aulas já ministradas até hoje; (B) Atividades entregues pelo aluno; (C) Atividades faltantes passadas; (D) Atividades e avaliações futuras.
- Se foram ministradas 10 lições até hoje de 21 do trimestre, e o aluno fez 8: ele entregou 8 de 10 ministradas (80% de adesão real nas aulas passadas). As 11 lições restantes são FUTURAS.
- Provas e trabalhos não aplicados ainda são avaliações futuras. NUNCA julgue o aluno por avaliações pendentes de aplicação futura.

[INTELIGÊNCIA COMPARATIVA E HISTÓRICO LONGITUDINAL]
- Quando houver dados de unidades anteriores na seção de histórico comparativo, você tem visão panorâmica de todo o ano letivo.
- Use essas informações sempre que o professor perguntar sobre progresso, comparação entre unidades/trimestres ou evolução de um aluno, correlacionando médias, adesão de lições e comportamento.

[REGRA DE ESCALAS, PESOS E INTERPRETAÇÃO DE NOTAS - RIGOR PEDAGÓGICO]
- A média escolar máxima do estudante é 10.0 pontos, calculada pela composição ponderada de categorias distintas.
- ATENÇÃO CRÍTICA À ESCALA DE TRABALHOS E LIÇÕES: As categorias Trabalhos e Lições de Casa possuem cota máxima de 1.00 ponto na média geral.
- Portanto, notas como 0.84, 0.90 ou 0.75 NÃO são notas na escala tradicional de 0 a 10; elas são frações de 1.00 ponto e representam 84%, 90% e 75% de aproveitamento (desempenho excelente/muito bom).
- É TERMINANTEMENTE PROIBIDO interpretar notas decimais de trabalhos ou lições (como 0.84 de 1.00) como notas baixas, insuficientes, vermelhas ou indicativo de falha. Trata-se de 84% de aproveitamento conquistado pelo aluno.
- Sempre interprete notas avaliando o aproveitamento percentual conquistado pelo estudante em relação ao teto máximo daquela categoria.

[RESTRIÇÕES CRÍTICAS DE RESPOSTA]
- PROIBIDO: Iniciar resposta com "Olá", "Oi", "Prezado" ou se apresentar.
- PROIBIDO: Usar a frase "Como seu Mentor Digital..." ou qualquer variação de apresentação.
- OBRIGATÓRIO: Ir direto à análise ou resposta técnica pedida pelo professor.
- EXCEÇÃO: Apenas se o histórico de conversa estiver VAZIO, você pode fazer uma breve saudação inicial de UMA frase.`;

function normalizeText(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function findTargetStudent(userMessage, students = []) {
    if (!userMessage || students.length === 0) return null;
    const cleanMsg = normalizeText(userMessage);
    const msgWords = cleanMsg.split(/[^a-z0-9]+/).filter(w => w.length >= 3);

    for (const student of students) {
        const studentName = student.name || "";
        const cleanStudentName = normalizeText(studentName);
        if (!cleanStudentName) continue;

        if (cleanMsg.includes(cleanStudentName)) {
            return student;
        }

        const nameParts = cleanStudentName.split(/[^a-z0-9]+/).filter(p => p.length >= 3);
        if (nameParts.length > 0) {
            const firstName = nameParts[0];
            if (msgWords.includes(firstName)) {
                return student;
            }
            if (nameParts.length >= 2) {
                const firstTwo = `${nameParts[0]} ${nameParts[1]}`;
                if (cleanMsg.includes(firstTwo)) {
                    return student;
                }
            }
        }
    }
    return null;
}

function isDeepAnalysisNeeded(userMessage, students = [], history = []) {
    if (!userMessage) return { needed: false, targetStudent: null };
    const cleanMsg = normalizeText(userMessage);
    
    // 1. Saudações ou mensagens curtas de acolhimento/introdução (com histórico curto)
    const isGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|e aí|e ai|opa|salve|quem é você|quem e voce|o que você faz|o que voce faz|ajuda|help|menu|iniciar)[\s!.?)]*$/i.test(userMessage.trim());
    if (isGreeting && (history || []).length <= 2) {
        return { needed: false, targetStudent: null };
    }

    // 2. Reconhecimento inteligente de aluno citado na mensagem (por primeiro nome ou nome completo)
    const targetStudent = findTargetStudent(userMessage, students);
    if (targetStudent) {
        return { needed: true, targetStudent };
    }

    // 3. Palavras-chave pedagógicas, analíticas, comparativas e operacionais
    const deepTerms = [
        'aluno', 'aluna', 'nota', 'media', 'licao', 'licoes',
        'visto', 'comportamento', 'ocorrencia', 'rendimento', 'desempenho',
        'recuperacao', 'prova', 'teste', 'trabalho', 'evolucao',
        'melhorou', 'piorou', 'quem', 'qual', 'quais', 'analise', 'diagnostico',
        'falta', 'pendencia', 'relatorio', 'comparativo', 'comparar', 'compare',
        'quadro', 'dossie', 'grafico', 'situacao', 'ranking', 'abaixo', 'acima',
        'dificuldade', 'atrasad', 'unidade', 'unidades', 'dados', 'puxe', 'mostre',
        'historico', 'progresso', 'diferenca', 'trimestre', 'bimestre', 'boletim'
    ];

    if (deepTerms.some(term => cleanMsg.includes(term))) {
        return { needed: true, targetStudent: null };
    }

    // 4. Se a conversa recente já estava discutindo dados de alunos
    const recentHistory = (history || []).slice(-2);
    const hasRecentDataDiscussion = recentHistory.some(m => {
        const histMsg = normalizeText(m.content || '');
        return m.role === 'user' && deepTerms.some(term => histMsg.includes(term));
    });

    return { needed: hasRecentDataDiscussion, targetStudent: null };
}

// Constrói o contexto temporal, dinâmico e longitudinal específico para o Mentor Pedagógico
function buildOptimizedChatContext(turmaId, userMessage, history = [], unitId = null) {
    const turmas = dbAPI.getTurmas();
    const currentTurma = turmas.find(t => t.id === parseInt(turmaId));
    const targetUnitId = unitId ? parseInt(unitId) : (dbAPI.getActiveUnit()?.id ?? 1);
    const units = dbAPI.getUnits() || [];
    const activeUnit = units.find(u => u.id === targetUnitId) || dbAPI.getActiveUnit();
    const unitParams = dbAPI.getTurmaUnitParams(turmaId, targetUnitId);
    const studentStats = dbAPI.getStudentComputedGrades(turmaId, targetUnitId) || [];
    const activityTopics = dbAPI.getActivityTopics(turmaId, targetUnitId) || [];
    
    const elapsedActivitiesCount = activityTopics.length; 
    const totalPlannedActivities = unitParams?.max_activities ?? currentTurma?.max_activities ?? 27; 
    const futureActivitiesCount = Math.max(0, totalPlannedActivities - elapsedActivitiesCount);

    const maxMiniTestes = unitParams?.max_mini_testes ?? currentTurma?.max_mini_testes ?? 14;
    const maxProvas = unitParams?.max_provas ?? currentTurma?.max_provas ?? 1;
    const maxMiniTesteScore = unitParams?.max_mini_teste_score ?? currentTurma?.max_mini_teste_score ?? 10;
    const maxProvaScore = unitParams?.max_prova_score ?? currentTurma?.max_prova_score ?? 10;
    const maxTrabalhoWeight = 1.0;

    const studentNames = studentStats.map(s => s.name || '');
    const analysisDecision = isDeepAnalysisNeeded(userMessage, studentStats, history);
    const needsDeepAnalysis = analysisDecision.needed;
    const targetStudent = analysisDecision.targetStudent;

    let context = `CONTEXTO TEMPORAL DA TURMA: ${currentTurma?.name || "Geral"} (${activeUnit?.name || "Unidade Atual"})\n`;
    context += `• Total de Alunos Matriculados: ${studentStats.length}\n`;
    context += `• Aulas/Lições aplicadas no diário até hoje: ${elapsedActivitiesCount} | A realizar futuramente: ${futureActivitiesCount} | Meta total da unidade: ${totalPlannedActivities}\n`;
    context += `• Parâmetros de Peso na Média: Lição (${unitParams?.max_activities_weight ?? currentTurma?.max_activities_weight ?? 1.0} pt máx), MiniTestes (${unitParams?.max_mini_testes_weight ?? currentTurma?.max_mini_testes_weight ?? 1.0} pt máx), Trabalhos (${maxTrabalhoWeight.toFixed(2)} pt máx), Provas (${unitParams?.max_provas_weight ?? currentTurma?.max_provas_weight ?? 4.0} pts máx).\n`;

    if (!needsDeepAnalysis) {
        // TIER 1: MODO ÁGIL / CONTEXTO EXECUTIVO (Economia de 90%+ dos tokens para respostas ultrarrápidas em saudações)
        if (studentStats.length > 0) {
            const validMedias = studentStats.map(s => parseFloat(s.mediaFinal)).filter(m => !isNaN(m));
            const avgMedia = validMedias.length > 0 ? (validMedias.reduce((a, b) => a + b, 0) / validMedias.length).toFixed(1) : "N/D";
            context += `• Média Geral Atual da Turma: ${avgMedia}\n`;
            context += `• Alunos matriculados: ${studentNames.join(', ')}\n`;
        }
        if (activityTopics.length > 0) {
            const sortedTopics = [...activityTopics].sort((a, b) => a.date.localeCompare(b.date));
            const lastTopic = sortedTopics[sortedTopics.length - 1];
            context += `• Último tópico ministrado: ${lastTopic.date} - "${lastTopic.topic}"\n`;
        }

        const recentHistory = (history || []).slice(-6);
        const historyText = recentHistory.length > 0
            ? recentHistory.map(m => `${m.role === 'user' ? 'PROFESSOR' : 'VOCÊ'}: ${m.content}`).join('\n')
            : '(Início da conversa)';

        return `[DADOS TEMPORAIS E VISÃO GERAL DA TURMA]
${context}

[HISTÓRICO DA CONVERSA RECENTE]
${historyText}

[MENSAGEM DO PROFESSOR AGORA]
PROFESSOR: ${userMessage}

[DIRETRIZ DE ACOLHIMENTO E APRESENTAÇÃO - MODO ÁGIL]
1. O professor enviou uma saudação ou mensagem introdutória geral. Responda com agilidade, simpatia e prontidão pedagógica.
2. Você tem acesso à turma "${currentTurma?.name || 'Geral'}" (${activeUnit?.name || 'Unidade Atual'}).
3. Informe de forma concisa e amigável que você está pronto para analisar detalhadamente notas, lições pendentes, evolução longitudinal ou desempenho individual de qualquer aluno sob demanda.`;
    }

    // TIER 2A: ANÁLISE ESPECÍFICA DE ESTUDANTE (DOSSIÊ MULTIUNIDADES COMPLETO - ZERO VAZAMENTO DE OUTROS ALUNOS)
    if (targetStudent) {
        const studentId = targetStudent.student_id || targetStudent.id;
        const studentDossier = getStudentMultiUnitDetailedDossier(studentId, turmaId);

        let studentContext = `[DOSSIÊ EXCLUSIVO MULTIUNIDADES DO ESTUDANTE: ${targetStudent.name.toUpperCase()}]\n`;
        studentContext += `• Turma: ${currentTurma?.name || 'Geral'}\n`;
        studentContext += `• POLÍTICA DE PRIVACIDADE: Contexto focado 100% neste estudante. Zero vazamento de dados de outros alunos da turma.\n\n`;

        if (studentDossier && studentDossier.unitDetails && studentDossier.unitDetails.length > 0) {
            studentDossier.unitDetails.forEach(u => {
                const g = u.grade;
                studentContext += `=== ${u.unitName.toUpperCase()} ===\n`;
                studentContext += `• Média da Etapa: ${g.mediaFinal} | Conduta: ${Number(g.behaviorScore ?? 3).toFixed(2)}\n`;
                studentContext += `• Lições de Casa: ${g.licaoCheckCount || 0} entregues\n`;

                const testes = g.testesLista || [];
                if (testes.length > 0) {
                    const notasStr = testes.map(t => {
                        const sc = Number(t.score || 0);
                        const pct = maxMiniTesteScore > 0 ? Math.round((sc / maxMiniTesteScore) * 100) : 0;
                        return `${t.name}: ${sc.toFixed(1)} de ${maxMiniTesteScore} pts (${pct}%)`;
                    }).join(', ');
                    studentContext += `• Mini-Testes (${testes.length}): [${notasStr}]\n`;
                } else {
                    studentContext += `• Mini-Testes: Nenhum registrado nesta etapa\n`;
                }

                const trabalhos = g.trabalhosLista || [];
                if (trabalhos.length > 0) {
                    const trabStr = trabalhos.map(t => {
                        const sc = Number(t.score || 0);
                        const pct = Math.round((sc / maxTrabalhoWeight) * 100);
                        return `${t.name}: ${sc.toFixed(2)} de ${maxTrabalhoWeight.toFixed(2)} pt máx (${pct}% de aproveitamento)`;
                    }).join(', ');
                    studentContext += `• Trabalhos (${trabalhos.length}): [${trabStr}]\n`;
                }

                const provas = g.provasLista || [];
                if (provas.length > 0) {
                    const provasStr = provas.map(p => {
                        const sc = Number(p.score || 0);
                        const pct = maxProvaScore > 0 ? Math.round((sc / maxProvaScore) * 100) : 0;
                        return `${p.name}: ${sc.toFixed(1)} de ${maxProvaScore} pts (${pct}%)`;
                    }).join(', ');
                    studentContext += `• Provas (${provas.length}): [${provasStr}]\n`;
                } else {
                    studentContext += `• Provas: Nenhuma prova aplicada nesta etapa\n`;
                }

                if (g.occurrenceBreakdown && Object.keys(g.occurrenceBreakdown).length > 0) {
                    const occ = Object.entries(g.occurrenceBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ');
                    studentContext += `• Ocorrências Disciplinares: [${occ}]\n`;
                }
                studentContext += `\n`;
            });
        }

        const recentHistory = (history || []).slice(-6);
        const historyText = recentHistory.length > 0
            ? recentHistory.map(m => `${m.role === 'user' ? 'PROFESSOR' : 'VOCÊ'}: ${m.content}`).join('\n')
            : '(Início da conversa)';

        return `[DADOS OFICIAIS DO ESTUDANTE]
${studentContext}

[HISTÓRICO DA CONVERSA RECENTE]
${historyText}

[MENSAGEM DO PROFESSOR AGORA]
PROFESSOR: ${userMessage}

[DIRETRIZ DE ANÁLISE COMPARATIVA INDIVIDUAL]
1. Você tem em mãos o dossiê detalhado e completo de ${targetStudent.name} em TODAS as unidades letivas registradas.
2. Compare detalhadamente as unidades solicitadas pelo professor (ex: notas de testes, lições de casa entregues, provas e comportamento).
3. Seja didático, analítico, objetivo e profissional, destacando evoluções, estabilidades ou quedas de rendimento entre as unidades solicitadas.
4. Respeite estritamente as escalas de notas: Trabalhos e Lições possuem teto máximo de 1.00 ponto na média (ex: 0.84 de 1.00 = 84% de aproveitamento, jamais nota baixa).`;
    }

    // TIER 2B: MODO DE ANÁLISE PROFUNDA DA TURMA (Dossiê completo por aluno, ocorrências, cronograma e longitudinal)
    context += `\nRESUMO DINÂMICO DOS ALUNOS:\n`;
    studentStats.forEach(s => {
        const delivered = s.licaoCheckCount || 0;
        const missedPast = Math.max(0, elapsedActivitiesCount - delivered);
        const realAdhesionRate = elapsedActivitiesCount > 0 
            ? Math.min(100, Math.round((delivered / elapsedActivitiesCount) * 100))
            : 100;

        let line = `• ${s.name} | Média Atual: ${s.mediaFinal} | Comportamento: ${s.behaviorScore.toFixed(2)}\n`;
        line += `  - Lições de Casa: ${delivered} entregues de ${elapsedActivitiesCount} aplicadas até hoje (Adesão Real: ${realAdhesionRate}% | Atrasadas/Faltantes passadas: ${missedPast} | A realizar no futuro: ${futureActivitiesCount} | Meta Trimestre: ${totalPlannedActivities})`;
        
        const extras = [];
        
        // Mini-testes aplicados vs meta
        const appliedMiniTestes = s.testesLista || [];
        const remainingMiniTestes = Math.max(0, maxMiniTestes - appliedMiniTestes.length);
        if (appliedMiniTestes.length > 0) {
            const notasStr = appliedMiniTestes.map(t => {
                const sc = Number(t.score || 0);
                const pct = maxMiniTesteScore > 0 ? Math.round((sc / maxMiniTesteScore) * 100) : 0;
                return `${t.name}:${sc.toFixed(1)}/${maxMiniTesteScore} (${pct}%)`;
            }).join(', ');
            extras.push(`MiniTestes Aplicados (${appliedMiniTestes.length}/${maxMiniTestes}): [${notasStr}] (Faltam aplicar: ${remainingMiniTestes})`);
        } else {
            extras.push(`MiniTestes: Nenhum aplicado até o momento (${maxMiniTestes} previstos no futuro)`);
        }

        // Trabalhos aplicados
        const appliedTrabalhos = s.trabalhosLista || [];
        if (appliedTrabalhos.length > 0) {
            const notasStr = appliedTrabalhos.map(t => {
                const sc = Number(t.score || 0);
                const pct = Math.round((sc / maxTrabalhoWeight) * 100);
                return `${t.name}:${sc.toFixed(2)}/${maxTrabalhoWeight.toFixed(2)} (${pct}% de aproveitamento)`;
            }).join(', ');
            extras.push(`Trabalhos Aplicados (${appliedTrabalhos.length}): [${notasStr}]`);
        } else {
            extras.push(`Trabalhos: Nenhum aplicado até o momento`);
        }

        // Provas aplicadas vs meta
        const appliedProvas = s.provasLista || [];
        if (appliedProvas.length > 0) {
            const notasStr = appliedProvas.map(t => {
                const sc = Number(t.score || 0);
                const pct = maxProvaScore > 0 ? Math.round((sc / maxProvaScore) * 100) : 0;
                return `${t.name}:${sc.toFixed(1)}/${maxProvaScore} (${pct}%)`;
            }).join(', ');
            extras.push(`Provas Aplicados (${appliedProvas.length}/${maxProvas}): [${notasStr}]`);
        } else {
            extras.push(`Provas: Nenhuma prova aplicada ainda (${maxProvas} prevista no futuro)`);
        }

        if (s.occurrenceBreakdown && Object.keys(s.occurrenceBreakdown).length > 0) {
            const breakdown = Object.entries(s.occurrenceBreakdown).map(([t, c]) => `${t}: ${c}`).join(', ');
            extras.push(`Ocorrências Disciplinares: [${breakdown}]`);
        }

        if (extras.length > 0) {
            line += `\n  ↳ ${extras.join(' | ')}`;
        }
        context += line + `\n`;
    });

    if (activityTopics.length > 0) {
        context += `\nCRONOGRAMA DE AULAS MINISTRADAS ATÉ HOJE:\n`;
        const sortedTopics = [...activityTopics].sort((a, b) => a.date.localeCompare(b.date));
        const recentTopics = sortedTopics.slice(-10);
        recentTopics.forEach(t => {
            context += `• ${t.date}: "${t.topic}"\n`;
        });
    }

    try {
        const longitudinalData = getLongitudinalSummary(turmaId, targetUnitId);
        const longitudinalContext = formatLongitudinalChatContext(longitudinalData);
        if (longitudinalContext) {
            context += `\n${longitudinalContext}\n`;
        }
    } catch (longitudinalErr) {
        console.warn('[Mentor Longitudinal Context] Erro não impeditivo ao carregar histórico longitudinal:', longitudinalErr.message);
    }

    const recentHistory = (history || []).slice(-6);
    const historyText = recentHistory.length > 0
        ? recentHistory.map(m => `${m.role === 'user' ? 'PROFESSOR' : 'VOCÊ'}: ${m.content}`).join('\n')
        : '(Início da conversa)';

    return `[DADOS TEMPORAIS E CONTEXTO DINÂMICO DA TURMA]
${context}

[HISTÓRICO DA CONVERSA RECENTE]
${historyText}

[MENSAGEM DO PROFESSOR AGORA]
PROFESSOR: ${userMessage}

[DIRETRIZ DE ANÁLISE PEDAGÓGICA DINÂMICA]
1. Entenda que a unidade está EM ANDAMENTO.
2. Diferencie claramente o que JÁ FOI APLICADO do que AINDA SERÁ APLICADO NO FUTURO.
3. Exemplo: Se o professor aplicou 10 lições até hoje de 21 do trimestre, e o aluno entregou 8: ele tem 80% de adesão real nas aulas passadas (faltou em 2 já ministradas) e ainda possui 11 lições futuras para realizar.
4. Provas, trabalhos e mini-testes não aplicados ainda são oportunidades futuras e NÃO devem ser contados como nota zero ou negligência do aluno.
5. Se houver HISTÓRICO LONGITUDINAL COMPARATIVO entre unidades, utilize-o ativamente para responder a perguntas comparativas ou de evolução dos alunos ou da turma (ex.: "quem melhorou da unidade 1 para a 2?", "qual aluno teve queda?", "como fulano evoluiu ao longo das unidades?"), correlacionando notas passadas, adesão de lições e conduta disciplinar.
6. INTERPRETAÇÃO OBRIGATÓRIA DE ESCALAS: Trabalhos e Lições possuem cota máxima de 1.00 ponto na média escolar. Uma nota de 0.84 representa 84% de aproveitamento (desempenho excelente/muito bom). NUNCA interprete notas fracionárias decimais de 1.00 como notas baixas de escala 0 a 10.`;
}

// Motor de streaming dedicado exclusivamente ao Mentor Pedagógico
async function executeMentorStreamEngine(prompt, userKey = "", systemInstruction = MENTOR_SYSTEM_INSTRUCTION, onChunk = null) {
    const keysToTry = getPrioritizedKeys(userKey);
    let lastError = null;

    for (const modelName of MODELS_PRIORITY) {
        for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
            const currentKey = keysToTry[kIdx];
            try {
                const genAI = new GoogleGenerativeAI(currentKey);
                
                const modelConfig = { 
                    model: modelName,
                    generationConfig: { 
                        temperature: 0.7, 
                        topP: 0.95, 
                        topK: 40,
                        maxOutputTokens: 8192
                    }
                };

                if (systemInstruction) {
                    modelConfig.systemInstruction = systemInstruction;
                }

                const model = genAI.getGenerativeModel(modelConfig);

                // Timeout ágil de 8s para estabelecer conexão do primeiro chunk no chat
                const streamPromise = model.generateContentStream(prompt);
                const result = await withTimeout(
                    streamPromise,
                    8000,
                    `Timeout de conexão na chave #${kIdx + 1} (${modelName})`
                );

                let fullText = "";
                let firstChunkReceived = false;

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        if (!firstChunkReceived) {
                            firstChunkReceived = true;
                            markKeySuccess(currentKey);
                        }
                        fullText += chunkText;
                        if (onChunk) onChunk(chunkText);
                    }
                }

                if (fullText && fullText.trim().length > 0) {
                    markKeySuccess(currentKey);
                    return fullText;
                }
            } catch (err) {
                lastError = err;
                const msg = err.message || "";
                console.warn(`[Mentor Stream] Falha no ${modelName} (Chave #${kIdx + 1}): ${msg.substring(0, 120)}`);
                
                if (!msg.includes("404") && !msg.includes("not found") && !msg.includes("NOT_FOUND")) {
                    quarantineKey(currentKey, msg.substring(0, 50));
                }

                if (msg.includes("503") || msg.includes("500") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("UNAVAILABLE") || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("API_KEY_INVALID") || err.isTimeout) {
                    await new Promise(r => setTimeout(r, 150));
                    continue; 
                }
            }
        }
    }

    if (lastError && (lastError.message.includes("429") || lastError.message.includes("quota") || lastError.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("O limite de requisições gratuitas do Google Gemini foi atingido temporariamente (Erro 429 - Limite de Cota). Por favor, aguarde cerca de 30 segundos para tentar novamente, ou cadastre sua própria chave de API gratuita do Google Gemini nas Configurações para acesso prioritário.");
    }
    
    // Fallback para modo batch com timeout de 30s se o streaming falhar
    return executeAIRotation(prompt, userKey, systemInstruction, 30000);
}

// Limpa saudações redundantes do início da mensagem para manter o tom consultivo direto
function cleanChatGreeting(text) {
    if (!text) return "";
    let finalChatText = text.replace(/^(Olá|Oi|Prezado|Como seu Mentor).*?[.!?]\s*/i, '');
    return finalChatText.length < 5 ? text : finalChatText;
}


// Ponto de entrada do Mentor em modo Batch (ai:chat)
async function executeMentorChat({ message, history, turmaId, unitId }) {
    if (!turmaId || isNaN(parseInt(turmaId))) {
        return {
            success: true,
            text: "Por favor, selecione uma turma no painel lateral antes de conversar com o Mentor Pedagógico para que eu possa analisar os dados e te ajudar de forma precisa."
        };
    }

    const settings = dbAPI.getSettings();
    const prompt = buildOptimizedChatContext(turmaId, message, history, unitId);
    const text = await executeAIRotation(prompt, settings.gemini_api_key, MENTOR_SYSTEM_INSTRUCTION, 30000);
    
    return { 
        success: true, 
        text: cleanChatGreeting(text) 
    };
}

// Ponto de entrada do Mentor em modo Streaming (ai:chatStream)
async function executeMentorStream({ message, history, turmaId, unitId }, onChunk) {
    if (!turmaId || isNaN(parseInt(turmaId))) {
        return {
            success: true,
            text: "Por favor, selecione uma turma no painel lateral antes de conversar com o Mentor Pedagógico para que eu possa analisar os dados e te ajudar de forma precisa."
        };
    }

    const settings = dbAPI.getSettings();
    const prompt = buildOptimizedChatContext(turmaId, message, history, unitId);
    const text = await executeMentorStreamEngine(
        prompt,
        settings.gemini_api_key,
        MENTOR_SYSTEM_INSTRUCTION,
        onChunk
    );

    return { 
        success: true, 
        text: cleanChatGreeting(text) 
    };
}

module.exports = {
    MENTOR_SYSTEM_INSTRUCTION,
    normalizeText,
    findTargetStudent,
    isDeepAnalysisNeeded,
    buildOptimizedChatContext,
    executeMentorStreamEngine,
    executeMentorChat,
    executeMentorStream,
    cleanChatGreeting
};
