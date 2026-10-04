const { ipcMain } = require('electron');
const { dbAPI } = require('../database');
const {
    executeAIRotation,
    getAICache,
    setAICache,
    generateHashKey,
    parseJSONSafely
} = require('../services/aiService');
const { getStudentLongitudinalProfile } = require('../services/longitudinalService');
const { generateExamWithAI } = require('../services/examGeneratorService');
const { executeMentorChat, executeMentorStream } = require('../services/mentorService');
const { buildCognitivePromptInstruction } = require('../services/cognitiveTierService');
const { enrichBnccCodes, getBnccSkill } = require('../services/bnccService');
const { checkLicenseStatus } = require('../services/licenseService');

function registerAiHandlers() {
    // Gerador Especialista de Avaliações Formais com IA
    ipcMain.handle('ai:generateExam', async (_, params) => {
        const license = checkLicenseStatus();
        if (!license.canOperate) {
            return {
                success: false,
                error: license.message || 'Licença expirada ou não ativada. Renove sua assinatura para gerar novas avaliações com IA.',
                isLicenseBlocked: true
            };
        }
        return await generateExamWithAI(params);
    });

    // Gerador de Planos de Aula
    ipcMain.handle('ai:generateLessonPlan', async (_, { publico, disciplina, tema, duracao, cronogramaDetallado, unitLabel, professorName, bnccCodes, bnccDetails }) => {
        const license = checkLicenseStatus();
        if (!license.canOperate) {
            return {
                success: false,
                error: license.message || 'Licença expirada ou não ativada. Renove sua assinatura para gerar novos planos de aula com IA.',
                isLicenseBlocked: true
            };
        }
        try {
            const discRaw = String(disciplina || "").trim();
            const isMPV = /mpv|projeto\s*de\s*vida|mundo\s*do\s*trabalho/i.test(discRaw);
            const isMatematica = /matem[aá]tica|álgebra|geometria/i.test(discRaw);
            const isHistoria = /hist[oó]ria/i.test(discRaw);
            const isGeografia = /geografia/i.test(discRaw);
            const isCiencias = /ci[eê]ncias|biologia|f[ií]sica|qu[ií]mica/i.test(discRaw);
            const isIngles = /ingl[eê]s|l[ií]ngua\s*inglesa/i.test(discRaw);
            const isArte = /arte|artes/i.test(discRaw);
            const isEdFisica = /educa[cç][aã]o\s*f[ií]sica|ed\.?\s*f[ií]sica/i.test(discRaw);
            const isPortugues = /portugu[eê]s|l[ií]ngua\s*portuguesa/i.test(discRaw) || (!isMPV && !isMatematica && !isHistoria && !isGeografia && !isCiencias && !isIngles && !isArte && !isEdFisica && !discRaw);

            let disciplinaFormatted = "LÍNGUA PORTUGUESA";
            let pedagogicalReference = "especialista na BNCC e na Coleção Superação (Editora Moderna)";
            let specificGuidelines = "Foco em leitura, escrita, oralidade, análise linguística e semiótica alinhadas rigorosamente à BNCC.";

            if (isMPV) {
                disciplinaFormatted = "MPV";
                pedagogicalReference = "especialista na BNCC (Competências Gerais, Socioemocionais e Projeto de Vida) e na Coleção Transformar (Editora Camargo Sá)";
                specificGuidelines = "Foco em autoconhecimento, inteligência socioemocional, cidadania ativa, planejamento de metas, ética e inserção no mundo do trabalho alinhadas à BNCC.";
            } else if (isGeografia) {
                disciplinaFormatted = "GEOGRAFIA";
                pedagogicalReference = "especialista na BNCC e no ensino de Geografia (Pensamento Espacial, Dinâmica Territorial, Sociedade e Natureza)";
                specificGuidelines = "Foco na análise da paisagem, dinâmica socioespacial, relações entre sociedade e ambiente, cartografia e cidadania planetária alinhadas rigorosamente à BNCC.";
            } else if (isHistoria) {
                disciplinaFormatted = "HISTÓRIA";
                pedagogicalReference = "especialista na BNCC e no ensino de História (Crítica Documental, Temporalidades e Historicidade)";
                specificGuidelines = "Foco na análise de fontes históricas, diversidade sociocultural, cidadania crítica e processos históricos contextualizados alinhados à BNCC.";
            } else if (isCiencias) {
                disciplinaFormatted = "CIÊNCIAS";
                pedagogicalReference = "especialista na BNCC e no ensino de Ciências da Natureza (Letramento Científico e Investigação)";
                specificGuidelines = "Foco na observação científica, experimentação, matéria e energia, vida e evolução, terra e universo alinhadas à BNCC.";
            } else if (isMatematica) {
                disciplinaFormatted = "MATEMÁTICA";
                pedagogicalReference = "especialista na BNCC e no ensino de Matemática (Resolução de Problemas, Modelagem e Pensamento Algébrico)";
                specificGuidelines = "Foco no raciocínio lógico, números, álgebra, geometria, grandezas e medidas e probabilidade e estatística alinhados à BNCC.";
            } else if (isIngles) {
                disciplinaFormatted = "LÍNGUA INGLESA";
                pedagogicalReference = "especialista na BNCC e no ensino de Língua Inglesa (Língua Franca e Multiletramentos)";
                specificGuidelines = "Foco na interação oral situada, leitura reflexiva, escrita comunicativa e dimensão intercultural alinhadas à BNCC.";
            } else if (isArte) {
                disciplinaFormatted = "ARTE";
                pedagogicalReference = "especialista na BNCC e no ensino de Arte (Fruição, Criação e Expressão Cultural)";
                specificGuidelines = "Foco nas linguagens de artes visuais, dança, música e teatro com valorização do patrimônio e da diversidade cultural.";
            } else if (isEdFisica) {
                disciplinaFormatted = "EDUCAÇÃO FÍSICA";
                pedagogicalReference = "especialista na BNCC e na cultura corporal de movimento";
                specificGuidelines = "Foco na experimentação, fruição, reflexão sobre a prática corporal, trabalho em equipe e saúde integral.";
            } else if (!isPortugues && discRaw.length > 0) {
                disciplinaFormatted = discRaw.toUpperCase();
                pedagogicalReference = `especialista na BNCC para o componente curricular de ${disciplinaFormatted}`;
                specificGuidelines = `Foco nos objetos de conhecimento e habilidades estruturantes da BNCC para ${disciplinaFormatted}.`;
            }

            const enrichedBncc = enrichBnccCodes(bnccDetails || bnccCodes);
            const activeBnccList = enrichedBncc.map(b => b.codigo);
            const hasSelectedBncc = enrichedBncc.length > 0;
            const bnccListFormatted = hasSelectedBncc ? activeBnccList.join(', ') : '';

            const cacheKey = generateHashKey('plan_json_v5', { publico, disciplina: disciplinaFormatted, tema, duracao, cronogramaDetallado, unitLabel, professorName, bnccCodes: activeBnccList });
            const cachedText = getAICache(cacheKey);
            if (cachedText) {
                console.log('[Elite-AI Cache] Verificando plano de aula em JSON do cache...');
                try {
                    const parsedData = typeof cachedText === 'string' ? JSON.parse(cachedText) : cachedText;
                    if (parsedData && Array.isArray(parsedData.aulas) && parsedData.aulas.length > 0) {
                        return { success: true, data: parsedData, cached: true };
                    } else {
                        console.log('[Elite-AI Cache] Cache possuía 0 aulas salvas, ignorando cache e regerando.');
                    }
                } catch (e) {
                    console.log('[Elite-AI Cache] Cache antigo inválido, regerando...');
                }
            }

            const settings = dbAPI.getSettings();
            const activeUnitStr = unitLabel || "UNIDADE VIGENTE";
            const activeProfStr = professorName || "Professor(a)";

            const totalCalculado = (cronogramaDetallado && Array.isArray(cronogramaDetallado) && cronogramaDetallado.length > 0)
                ? cronogramaDetallado.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)
                : 0;

            let totalAulasReal = totalCalculado;
            if (totalAulasReal <= 0) {
                const match = String(duracao || "").match(/(\d+)/);
                totalAulasReal = match ? parseInt(match[1]) : 4;
            }

            let mapAulas = [];
            let aulaIdx = 1;
            if (cronogramaDetallado && Array.isArray(cronogramaDetallado) && cronogramaDetallado.length > 0) {
                cronogramaDetallado.forEach(item => {
                    const cnt = Number(item.count) || 1;
                    for(let i = 0; i < cnt; i++) {
                        mapAulas.push({
                            label: `Aula ${aulaIdx}`,
                            date: item.date || ''
                        });
                        aulaIdx++;
                    }
                });
            }
            if (mapAulas.length === 0) {
                for (let i = 1; i <= totalAulasReal; i++) {
                    mapAulas.push({
                        label: `Aula ${i}`,
                        date: ''
                    });
                }
            }

            const firstDate = (cronogramaDetallado && cronogramaDetallado.length > 0) ? cronogramaDetallado[0].date : "";
            const lastDate = (cronogramaDetallado && cronogramaDetallado.length > 0) ? cronogramaDetallado[cronogramaDetallado.length - 1].date : "";
            const periodoStr = (firstDate && lastDate && firstDate !== lastDate) 
                ? `${firstDate} a ${lastDate}` 
                : (firstDate || "A definir");
            const datasStr = (cronogramaDetallado && cronogramaDetallado.length > 0)
                ? cronogramaDetallado.map(c => `${c.date} (${c.count} ${c.count > 1 ? 'aulas' : 'aula'})`).join(', ')
                : `${totalAulasReal} aula(s)`;

            const customMasterPrompt = settings?.ai_prompt_template && settings.ai_prompt_template.trim().length > 0
                ? `\n\nDIRETRIZES DO PROFESSOR (DNA DO ARQUITETO):\n${settings.ai_prompt_template.trim()}`
                : '';

            const bnccDetailedList = enrichedBncc.map(b => {
                return b.descricao ? `• [${b.codigo}]: ${b.descricao}` : `• [${b.codigo}]: Síntese da habilidade oficial`;
            }).join('\n');

            const bnccMandatoryPrompt = hasSelectedBncc
                ? `\n\n[HABILIDADES BNCC MANDATÓRIAS SELECIONADAS PELO PROFESSOR]:\nO professor definiu OBRIGATORIAMENTE as seguintes habilidades oficiais da BNCC para este plano:\n${bnccDetailedList}\n\nDIRETRIZES PEDAGÓGICAS DE APLICAÇÃO MANDATÓRIA:\n1. CAMPO 'habilidadesBNCC': DEVE conter EXATAMENTE cada habilidade selecionada com seu código oficial e síntese descritiva completa (ex: "EF07GE01: Avaliar, por meio de exemplos..."). NUNCA omita a descrição textual.\n2. ESTRUTURA CURRICULAR: O 'objetivoGeral', os 'objetivosEspecificos' e os tópicos de 'conteudos' DEVEM ser estruturados com base direta nos objetos de conhecimento destas habilidades.\n3. ATIVIDADES PRÁTICAS E TEXTO INÉDITO EM CADA AULA: O Texto Base Inédito e os 3 Desafios Investigativos DEVEM exercitar e mensurar rigorosamente os verbos de ação cognitiva e as competências descritas nas habilidades acima.`
                : '';

            const cognitiveTierPrompt = buildCognitivePromptInstruction(publico, tema);

            const formatFinalBncc = (item) => {
                if (!item) return "";
                const itemStr = String(item).trim();
                if (itemStr.includes(':') && itemStr.length > 12) return itemStr;
                const cleanCode = itemStr.replace(/^[•\s\-_\[\]]+/, '').split(':')[0].trim().toUpperCase();
                const found = enrichedBncc.find(b => b.codigo === cleanCode) || getBnccSkill(cleanCode);
                if (found && found.descricao) {
                    return `${found.codigo}: ${found.descricao}`;
                }
                return itemStr;
            };

            // ESTRATÉGIA DE ALTA PERFORMANCE: Tentativa de Geração Unificada em 1 requisição ágil
            let headerData = null;
            let aulasData = [];

            const mapAulasStr = mapAulas.map((a) => `${a.label}${a.date ? ` (${a.date})` : ''}`).join(', ');

            const unifiedSystemInstruction = `Atue como um Professor Mentor e Especialista em Didática com PhD, ${pedagogicalReference}.${customMasterPrompt}${bnccMandatoryPrompt}${cognitiveTierPrompt}
Sua resposta DEVE SER EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO. É PROIBIDO incluir qualquer texto introdutório/conclusivo e É PROIBIDO envolver a resposta em blocos de código Markdown (\`\`\`json).

Estrutura JSON obrigatória:
{
  "objetivoGeral": "Texto denso do objetivo geral focado na autonomia do estudante...",
  "objetivosEspecificos": [ "Objetivo 1...", "Objetivo 2...", "Objetivo 3..." ],
  "conteudos": [ "Tópico 1...", "Tópico 2...", "Tópico 3..." ],
  "habilidadesBNCC": [ "CODIGO_BNCC: Síntese curta e direta da habilidade (máx 2 linhas)" ],
  "aulas": [
    {
      "numero": 1,
      "titulo": "Título da Aula",
      "conceito": "Professor, inicie a aula explicando que...",
      "atividades": "Texto Base Inédito: [Título]\\n\\n[Primeiro parágrafo do texto...]\\n\\n[Segundo parágrafo...]\\n\\nDesafio Investigativo:\\n1. [Questão 1]\\n2. [Questão 2]\\n3. [Questão 3]",
      "socializacao": "Orientações sobre a dinâmica de correção e debate...",
      "gabarito": "1. Resposta/critério sucinto\\n2. Resposta/critério sucinto\\n3. Resposta/critério sucinto"
    }
  ]
}

REGRAS RIGOROSAS:
1. Gere o array 'aulas' contendo EXATAMENTE ${mapAulas.length} itens correspondentes a: ${mapAulasStr}.
2. SINTAXE DE STRINGS NO JSON: Use obrigatoriamente \\n para quebras de linha nos campos de texto. NUNCA quebre linhas brutas dentro de aspas. Escape aspas com \\".
3. CONCEITO: Mínimo de 1 parágrafo denso e didático, iniciando obrigatoriamente com "Professor, inicie a aula...".
4. ATIVIDADES: Texto base inédito contextualizado com OBRIGATÓRIO espaçamento de linha dupla (\\n\\n) após o título do texto inédito e entre os parágrafos, seguido de 3 desafios reflexivos/práticos numerados.
5. GABARITO: Estritamente sucinto e objetivo (máximo de 1 a 2 linhas por questão numerada 1, 2 e 3). Para questões discursivas/pessoais, traga apenas a ideia-núcleo esperada e o critério direto de aceitação, sem modelos longos de redação.
6. FORMATAÇÃO: Sem asteriscos soltos. Texto elegante, claro e aplicável.`;

            const bnccMention = hasSelectedBncc ? ` Habilidades BNCC obrigatórias:\n${bnccDetailedList}.` : '';
            const unifiedPrompt = `Disciplina: "${disciplinaFormatted}". Tema: "${tema}". Público-alvo: "${publico}". Duração: "${duracao}". Cronograma: ${datasStr}.${bnccMention} ${specificGuidelines} Gere o plano de ensino completo com o esqueleto pedagógico BNCC e o detalhamento de todas as ${mapAulas.length} aulas previstas.`;

            try {
                const rawUnified = await executeAIRotation(unifiedPrompt, settings.gemini_api_key, unifiedSystemInstruction);
                const parsedUnified = parseJSONSafely(rawUnified);
                if (parsedUnified && parsedUnified.objetivoGeral && Array.isArray(parsedUnified.aulas) && parsedUnified.aulas.length > 0) {
                    const resolvedBncc = (parsedUnified.habilidadesBNCC && parsedUnified.habilidadesBNCC.length > 0)
                        ? parsedUnified.habilidadesBNCC.map(formatFinalBncc)
                        : (hasSelectedBncc ? enrichedBncc.map(b => b.descricao ? `${b.codigo}: ${b.descricao}` : b.codigo) : []);

                    headerData = {
                        objetivoGeral: parsedUnified.objetivoGeral,
                        objetivosEspecificos: parsedUnified.objetivosEspecificos || [],
                        conteudos: parsedUnified.conteudos || [],
                        habilidadesBNCC: resolvedBncc
                    };

                    aulasData = parsedUnified.aulas.map((aula, idx) => {
                        const targetAula = mapAulas[idx] || { date: '', label: `Aula ${idx + 1}` };
                        return {
                            numero: idx + 1,
                            data: targetAula.date || aula.data || '',
                            titulo: aula.titulo || `${targetAula.label}`,
                            qtdAulas: "1 aula",
                            conceito: aula.conceito || "",
                            atividades: aula.atividades || "",
                            socializacao: aula.socializacao || "",
                            gabarito: aula.gabarito || ""
                        };
                    });
                }
            } catch (errUnified) {
                console.warn("[Elite-AI] Tentativa unificada falhou ou foi truncada. Acionando fallback modular...", errUnified.message);
            }

            // FALLBACK MODULAR: Se a unificada não preencheu o cabeçalho, gera o esqueleto BNCC isoladamente
            if (!headerData) {
                const headerSystemInstruction = `Atue como um Professor Mentor e Especialista em Didática com PhD, ${pedagogicalReference}.${customMasterPrompt}${bnccMandatoryPrompt}${cognitiveTierPrompt}
Sua resposta DEVE SER EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO. É PROIBIDO incluir qualquer texto introdutório/conclusivo e É PROIBIDO envolver a resposta em blocos de código Markdown (\`\`\`json).

Estrutura JSON obrigatória:
{
  "objetivoGeral": "Texto denso do objetivo geral focado na autonomia do estudante...",
  "objetivosEspecificos": [
    "Objetivo 1...",
    "Objetivo 2...",
    "Objetivo 3..."
  ],
  "conteudos": [
    "Tópico teórico 1...",
    "Tópico teórico 2...",
    "Tópico teórico 3..."
  ],
  "habilidadesBNCC": [
    "CODIGO_BNCC: Síntese curta e direta da habilidade (máximo 1 a 2 linhas)"
  ]
}`;

                const headerPrompt = `Disciplina: "${disciplinaFormatted}". Tema: "${tema}". Público-alvo: "${publico}".${bnccMention} ${specificGuidelines} Gere o esqueleto pedagógico completo contendo objetivo geral, 3 objetivos específicos, tópicos de conteúdo e as habilidades da BNCC com descrição CURTA, SINTÉTICA e DIRETA ao ponto baseada nas habilidades selecionadas.`;

                const rawHeader = await executeAIRotation(headerPrompt, settings.gemini_api_key, headerSystemInstruction);
                headerData = parseJSONSafely(rawHeader);

                if (headerData) {
                    if ((!headerData.habilidadesBNCC || headerData.habilidadesBNCC.length === 0) && hasSelectedBncc) {
                        headerData.habilidadesBNCC = enrichedBncc.map(b => b.descricao ? `${b.codigo}: ${b.descricao}` : b.codigo);
                    } else if (Array.isArray(headerData.habilidadesBNCC)) {
                        headerData.habilidadesBNCC = headerData.habilidadesBNCC.map(formatFinalBncc);
                    }
                }
            }

            // Se ainda faltarem aulas no array aulasData, gera as pendentes aula a aula com resiliência
            if (aulasData.length < mapAulas.length) {
                const startIndex = aulasData.length;
                const summaryContext = `Disciplina: ${disciplinaFormatted} | Tema: ${tema} | BNCC: [${bnccListFormatted}] | Obj. Geral: ${headerData?.objetivoGeral || tema}`;

                for (let i = startIndex; i < mapAulas.length; i++) {
                    const currentAula = mapAulas[i];
                    const datePart = currentAula.date ? ` na data ${currentAula.date}` : "";
                    
                    const aulaPrompt = `Contexto: ${summaryContext}. Gere o conteúdo denso e completo para a ${currentAula.label}${datePart}. Garanta que o Texto Base e os 3 Desafios Investigativos desta aula exercitem e mobilizem rigorosamente as seguintes habilidades BNCC: [${bnccListFormatted}]. Retorne estritamente o JSON com as chaves: titulo, conceito, atividades, socializacao, gabarito.`;

                    const aulaSystemInstruction = `Atue como um Professor Mentor e Especialista em Didática com PhD, ${pedagogicalReference}.${customMasterPrompt}${bnccMandatoryPrompt}${cognitiveTierPrompt}
Sua resposta DEVE SER EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO. É PROIBIDO incluir qualquer texto introdutório/conclusivo e É PROIBIDO envolver a resposta em blocos de código Markdown (\`\`\`json).

Estrutura JSON obrigatória:
{
  "titulo": "Título da Aula",
  "conceito": "Professor, inicie a aula explicando que...",
  "atividades": "Texto Base Inédito: [Título]\\n\\n[Primeiro parágrafo do texto...]\\n\\n[Segundo parágrafo...]\\n\\nDesafio Investigativo:\\n1. [Questão 1]\\n2. [Questão 2]\\n3. [Questão 3]",
  "socializacao": "Orientações sobre a dinâmica de correção e debate...",
  "gabarito": "1. Resposta/critério sucinto\\n2. Resposta/critério sucinto\\n3. Resposta/critério sucinto"
}

REGRAS RIGOROSAS:
1. SINTAXE DE STRINGS NO JSON: Use obrigatoriamente \\n para quebras de linha nos campos de texto. NUNCA quebre linhas brutas dentro de aspas. Escape aspas internas com \\".
2. CONCEITO: Mínimo de 1 parágrafo denso e didático, iniciando obrigatoriamente com "Professor, inicie a aula...".
3. ATIVIDADES: Texto base inédito contextualizado com OBRIGATÓRIO espaçamento de linha dupla (\\n\\n) após o título do texto inédito e entre os parágrafos, seguido de 3 desafios reflexivos/práticos numerados.
4. GABARITO: Estritamente sucinto e objetivo (máximo de 1 a 2 linhas por questão numerada 1, 2 e 3). Para questões discursivas/pessoais, traga apenas a ideia-núcleo esperada e o critério direto de aceitação, sem modelos longos de redação.
5. FORMATAÇÃO: Sem asteriscos soltos. Texto elegante, claro e aplicável.`;

                    try {
                        const rawAula = await executeAIRotation(aulaPrompt, settings.gemini_api_key, aulaSystemInstruction);
                        const parsedAula = parseJSONSafely(rawAula);

                        aulasData.push({
                            numero: i + 1,
                            data: currentAula.date,
                            titulo: parsedAula.titulo || `${currentAula.label}`,
                            qtdAulas: "1 aula",
                            conceito: parsedAula.conceito || "",
                            atividades: parsedAula.atividades || "",
                            socializacao: parsedAula.socializacao || "",
                            gabarito: parsedAula.gabarito || ""
                        });
                    } catch (errAula) {
                        console.error(`[Elite-AI] Erro individual na aula ${i + 1}:`, errAula.message);
                        aulasData.push({
                            numero: i + 1,
                            data: currentAula.date,
                            titulo: `${currentAula.label} - ${tema}`,
                            qtdAulas: "1 aula",
                            conceito: `Professor, inicie a aula explorando os fundamentos de ${tema}.`,
                            atividades: `Texto Base Inédito: Estudo Prático sobre ${tema}\n\nAtividade prática direcionada para a turma.\n\nDesafio Investigativo:\n1. Analise o tema proposto.\n2. Desenvolva as soluções para o desafio.\n3. Apresente as conclusões.`,
                            socializacao: "Realize a correção coletiva e estimule a participação dos estudantes.",
                            gabarito: "Respostas orientadas pela reflexão crítica e prática."
                        });
                    }
                }
            }

            const planData = {
                unidade: activeUnitStr,
                periodo: periodoStr,
                professor: activeProfStr,
                disciplina: disciplinaFormatted,
                turma: publico,
                datas: datasStr,
                duracao: duracao,
                tema: tema,
                bnccCodes: activeBnccList,
                objetivoGeral: headerData.objetivoGeral || '',
                objetivosEspecificos: headerData.objetivosEspecificos || [],
                conteudos: headerData.conteudos || [],
                habilidadesBNCC: headerData.habilidadesBNCC || [],
                aulas: aulasData
            };

            if (planData && Array.isArray(planData.aulas) && planData.aulas.length > 0) {
                setAICache(cacheKey, JSON.stringify(planData));
            }
            return { success: true, data: planData, cached: false };
        } catch (error) {
            console.error("Erro no Gerador de Planos:", error);
            return { success: false, error: error.message };
        }
    });

    // IA: Diagnóstico Pedagógico do Aluno
    ipcMain.handle('ai:generateStudentReport', async (_, { name, stats, occurrences, turmaName, unitName, turmaId, unitId, detailedEvals, studentId }) => {
        try {
            const currentDateStr = new Date().toLocaleDateString('pt-BR');

            // Obter histórico longitudinal se disponível (Unidade 2+)
            let longitudinalInfo = "";
            let longitudinalProfile = null;
            try {
                if (turmaId && unitId) {
                    longitudinalProfile = getStudentLongitudinalProfile(studentId, unitId, turmaId, name);
                    if (longitudinalProfile && longitudinalProfile.hasPreviousHistory) {
                        const validHist = longitudinalProfile.history.filter(h => h.hasRecord);
                        const histDesc = validHist.map(h => `${h.unitName}: Média ${h.mediaFinal.toFixed(2)} (Conduta: ${h.behaviorScore.toFixed(2)}, Lições: ${h.licaoCheckCount})`).join(' | ');
                        const deltaSign = longitudinalProfile.deltaMedia > 0 ? `+${longitudinalProfile.deltaMedia.toFixed(2)}` : longitudinalProfile.deltaMedia.toFixed(2);
                        longitudinalInfo = `\nHISTÓRICO COMPARATIVO LONGITUDINAL (Unidades Anteriores):
- Registros Passados: [${histDesc}]
- Desempenho Atual vs Unidade Anterior: Variação de ${deltaSign} pontos na média (Tendência Geral: ${longitudinalProfile.trend.toUpperCase()}).
- DIRETRIZ: Ao redigir os tópicos "1. Panorama Comparativo" e "2. Análise de Tendência e Dedicação", mencione explicitamente essa evolução em relação à unidade anterior (se o estudante cresceu, manteve estabilidade ou apresentou queda de rendimento).`;
                    }
                }
            } catch (longitudinalErr) {
                console.warn('[Report Longitudinal Profile] Falha não impeditiva ao ler perfil longitudinal:', longitudinalErr.message);
            }

            const cacheKey = generateHashKey('report_v6', { name, turmaId, unitId, stats, occurrences, detailedEvals, longitudinalProfile });
            const cachedText = getAICache(cacheKey);
            if (cachedText) {
                console.log('[Elite-AI Cache] Retornando diagnóstico do estudante do cache instantâneo.');
                const sanitizedCached = cachedText.replace(/\[\s*Data\s*(Atual|de\s*Emissão)?\s*\]/gi, currentDateStr);
                return { success: true, text: sanitizedCached, cached: true };
            }

            const prompt = `Você é um Assistente Pedagógico Digital e Analista de Dados Educacionais. Gere um relatório pedagógico analítico de acompanhamento para o estudante ${name} com base estritamente nos dados coletados no decorrer da unidade. Data de Emissão: ${currentDateStr}.
            
            CONTEXTO DO ALUNO: Estudante: ${name} | Turma: ${turmaName || "Turma"} | Período: ${unitName || "Unidade Atual"}.

            DIRETRIZES DE ESTILO E FORMATAÇÃO:
            - NÃO inclua cabeçalhos redundantes no início da resposta (como "Relatório pedagógico...", "IDENTIFICAÇÃO DO CONTEXTO", "Estudante:", "Turma:", "Período:" ou separadores "---"), pois o boletim oficial já possui cabeçalho próprio. Inicie a resposta DIRETAMENTE no tópico "1. Panorama Comparativo".
            - Escreva um parecer focado nos dados coletados (lições entregues em relação às ministradas até hoje, comportamento, notas).
            - AVISO TEMPORAL CRÍTICO: A unidade está em andamento. Avalie o progresso do aluno com base nas atividades REALIZADAS até a data atual. Diferencie com clareza o que já foi aplicado do que é avaliação futura (provas, trabalhos e lições a realizar).
            - PROIBIDO: Usar termos clínicos de psicologia ou medicina.
            - PROIBIDO: Adicionar blocos de assinatura final de autoria fictícios ou menções a departamentos.

            REGRAS OBRIGATÓRIAS SOBRE ESCALAS E PESOS DAS NOTAS:
            - A média escolar máxima é 10.0 pontos, composta por pesos específicos por categoria.
            - ATENÇÃO CRÍTICA À CATEGORIA TRABALHOS: A cota máxima total da categoria Trabalhos é de 1.00 ponto na média geral. Portanto, notas como 0.84 ou 0.90 NÃO são notas na escala tradicional de 0 a 10; elas representam 84% e 90% de aproveitamento (desempenho excelente/muito bom). É ESTRITAMENTE PROIBIDO classificar notas decimais de trabalho (como 0.84 de 1.00) como "lacuna", "dificuldade drástica" ou "problema operacional". Elogie adequadamente o aproveitamento percentual conquistado pelo estudante!
            - As Provas e Mini-Testes já estão acompanhados de suas respectivas porcentagens de aproveitamento calculadas contra os tetos de pontuação.
            - O Comportamento parte da pontuação base (${stats.behaviorStartScore || '3.0'} pontos) e sofre apenas deduções por ocorrências.

            DADOS DA UNIDADE:
            - Média Atual: ${stats.mediaFinal} (Média da Turma: ${stats.classAverage}) | Ranking na Turma: ${stats.rank}
            - Comportamento Disciplinar: ${stats.behaviorScore} de ${stats.behaviorStartScore || '3.0'} pontos base | Ocorrências: ${occurrences.map(o => o.type).join(", ") || "Nenhuma ocorrência registrada"}.
            - Lições de Casa: ${stats.deliveredActivitiesCount ?? stats.licaoCheckCount ?? 0} entregues de ${stats.appliedActivitiesCount ?? 0} aulas já ministradas até hoje (Adesão Real: ${stats.realAdhesionRate ?? 100}% nas aulas que já aconteceram). Meta trimestral: ${stats.totalPlannedActivities ?? 21} lições (peso total: ${stats.activitiesWeight ?? 1.0} pt). Lições futuras a realizar: ${stats.futureActivitiesCount ?? 0}.
            - Mini-Testes: ${detailedEvals?.miniTestes && detailedEvals.miniTestes.length > 0 ? detailedEvals.miniTestes.join("; ") : "Nenhum mini-teste aplicado até o momento"}.
            - Provas: ${detailedEvals?.provas && detailedEvals.provas.length > 0 ? detailedEvals.provas.join("; ") : "Nenhuma prova aplicada até o momento"}.
            - Trabalhos: ${detailedEvals?.trabalhos && detailedEvals.trabalhos.length > 0 ? detailedEvals.trabalhos.join("; ") : "Nenhum trabalho aplicado até o momento"}.
            - Tendência Geral: ${stats.trend} | Assuntos Ministrados: ${stats.topics}.${longitudinalInfo ? '\n            ' + longitudinalInfo : ''}

            ESTRUTURA OBRIGATÓRIA:
            1. Panorama Comparativo (Desempenho atual nas aulas já realizadas vs compromisso demonstrado e evolução comparada à unidade anterior quando houver)
            2. Análise de Tendência e Dedicação (Trajetória de aprendizagem, engajamento e ritmo de entrega)
            3. Lacunas Cognitivas ou Oportunidades de Melhoria
            4. Plano de Ação Estratégico (3 intervenções práticas para as atividades e avaliações futuras).`;

            let text = await executeAIRotation(prompt);
            if (text) {
                text = text.replace(/\[\s*Data\s*(Atual|de\s*Emissão)?\s*\]/gi, currentDateStr);
                setAICache(cacheKey, text);
            }
            return { success: true, text };
        } catch (error) {
            console.error("Erro no Diagnóstico:", error);
            return { success: false, error: error.message };
        }
    });

    // IA: Chat Assistente de Contexto Geral (Mentor Pedagógico Desacoplado)
    ipcMain.handle('ai:chat', async (_, params) => {
        try {
            return await executeMentorChat(params);
        } catch (error) {
            console.error("Erro no Chat IA:", error);
            let userFriendlyError = error.message;
            if (error.message && (error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('ENOTFOUND'))) {
                userFriendlyError = "Parece que você está sem conexão com a internet. Verifique sua rede para que o Mentor Pedagógico possa te ajudar!";
            }
            return { success: false, error: userFriendlyError };
        }
    });

    ipcMain.handle('ai:chatStream', async (event, params) => {
        try {
            const sender = event.sender;
            return await executeMentorStream(params, (chunk) => {
                if (sender && !sender.isDestroyed()) {
                    sender.send('ai:chatStreamChunk', chunk);
                }
            });
        } catch (error) {
            console.error("Erro no Chat IA Stream:", error);
            let userFriendlyError = error.message;
            if (error.message && (error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('ENOTFOUND'))) {
                userFriendlyError = "Parece que você está sem conexão com a internet. Verifique sua rede para que o Mentor Pedagógico possa te ajudar!";
            }
            return { success: false, error: userFriendlyError };
        }
    });
}

module.exports = {
    registerAiHandlers
};
