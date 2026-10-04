/**
 * Motor Especialista de Avaliações Formais Escolares com IA
 * Gera instrumentos avaliativos estruturados (1 a 20 questões) com diversidade tipológica
 * (Múltipla Escolha, Associação de Colunas, Completar Lacunas e Dissertativas),
 * controle estrito de textos-base (máximo 1 ou 2) e gabarito docente oficial.
 */

const { executeAIRotation, parseJSONSafely } = require('./aiService');
const { dbAPI } = require('../database');
const { buildCognitivePromptInstruction } = require('./cognitiveTierService');
const { enrichBnccCodes } = require('./bnccService');

async function generateExamWithAI(params = {}) {
    const {
        disciplina = 'Língua Portuguesa',
        tema = 'Conteúdo Curricular da Unidade',
        publico = 'Ensino Fundamental II',
        unitLabel = '1ª Unidade',
        professorName = 'Professor(a)',
        numQuestions = 10,
        questionTypes = {},
        maxTexts = 1,
        bnccCodes = [],
        planData = null,
        isSpecificLesson = false,
        targetLessonNumber = null,
        targetLessonNumbers = []
    } = params;

    // Normalização e travas seguras de parâmetros
    const totalQ = Math.max(1, Math.min(20, parseInt(numQuestions, 10) || 10));
    const parsedTexts = parseInt(maxTexts, 10);
    const totalTexts = isNaN(parsedTexts) ? 1 : Math.max(0, Math.min(2, parsedTexts));

    // Identificação dos números das aulas selecionadas
    const lessonNums = Array.isArray(targetLessonNumbers) && targetLessonNumbers.length > 0
        ? targetLessonNumbers
        : (targetLessonNumber ? [targetLessonNumber] : []);

    const formatLessonList = (nums) => {
        if (!Array.isArray(nums) || nums.length === 0) return '';
        const padded = nums.map(n => String(n).padStart(2, '0'));
        if (padded.length === 1) return `Aula ${padded[0]}`;
        if (padded.length === 2) return `Aulas ${padded[0]} e ${padded[1]}`;
        return `Aulas ${padded.slice(0, -1).join(', ')} e ${padded[padded.length - 1]}`;
    };
    const lessonLabelStr = formatLessonList(lessonNums);

    // Identificação dos tipos de questão selecionados
    const enabledTypes = [];
    if (questionTypes.multipla_escolha !== false) enabledTypes.push('Múltipla Escolha (4 opções: A, B, C, D)');
    if (questionTypes.associacao !== false) enabledTypes.push('Associação / Relacionar Colunas');
    if (questionTypes.lacunas !== false) enabledTypes.push('Preenchimento de Lacunas (Completar termos conceituais)');
    if (questionTypes.dissertativa !== false) enabledTypes.push('Dissertativa / Discursiva Reflexiva');

    if (enabledTypes.length === 0) {
        enabledTypes.push('Múltipla Escolha (4 opções: A, B, C, D)', 'Dissertativa / Discursiva Reflexiva');
    }

    // Contextualização a partir das aulas da semana ou aulas específicas em foco
    let contextoAulas = '';
    if (isSpecificLesson && Array.isArray(planData?.aulas) && planData.aulas.length > 0) {
        contextoAulas = planData.aulas.map((aula, idx) => {
            const num = lessonNums[idx] || (idx + 1);
            const tit = aula.titulo || `Aula ${num}`;
            const obj = aula.objetivo ? `Objetivo: ${aula.objetivo}` : '';
            const des = aula.desenvolvimento ? `Conteúdo: ${aula.desenvolvimento.substring(0, 250)}...` : '';
            const ativ = aula.atividades ? `Atividades: ${aula.atividades.substring(0, 200)}...` : '';
            return `AULA ${num}: ${tit}\n- ${obj}\n${des ? `- ${des}\n` : ''}${ativ ? `- ${ativ}` : ''}`.trim();
        }).join('\n\n');
    } else if (planData && Array.isArray(planData.aulas) && planData.aulas.length > 0) {
        contextoAulas = planData.aulas.map((aula, idx) => {
            const tit = aula.titulo || `Aula ${idx + 1}`;
            const obj = aula.objetivo ? `Objetivo: ${aula.objetivo}` : '';
            return `- ${tit} ${obj}`.trim();
        }).join('\n');
    }

    // Normalização e enriquecimento de habilidades BNCC para a avaliação
    const candidateBncc = (Array.isArray(bnccCodes) && bnccCodes.length > 0)
        ? bnccCodes
        : (planData?.bnccCodes || planData?.habilidadesBNCC || []);

    const enrichedBncc = enrichBnccCodes(candidateBncc);

    let bnccInstruction = '';
    let bnccListSummary = '';

    if (enrichedBncc.length > 0) {
        bnccListSummary = enrichedBncc.map(b => b.codigo).join(', ');
        const bnccItemsFormatted = enrichedBncc.map(b => {
            return b.descricao ? `• [${b.codigo}]: ${b.descricao}` : `• [${b.codigo}]`;
        }).join('\n');

        bnccInstruction = `\n\n[HABILIDADES BNCC AVALIADAS]:\nAs questões desta prova DEVEM mensurar de forma autêntica as seguintes habilidades oficiais da BNCC:\n${bnccItemsFormatted}\nAssegure que os enunciados e critérios de correção mobilizem os mesmos verbos cognitivos e objetos de conhecimento prescritos nessas habilidades.`;
    } else if (planData?.habilidades) {
        bnccListSummary = String(planData.habilidades);
    } else {
        bnccListSummary = 'Alinhado à BNCC vigente';
    }

    // Recuperação das diretrizes personalizadas do professor (DNA do Arquiteto) e API Key
    let customMasterPrompt = '';
    let userApiKey = '';
    try {
        const settings = dbAPI?.getSettings ? dbAPI.getSettings() : null;
        if (settings?.ai_prompt_template && settings.ai_prompt_template.trim().length > 0) {
            customMasterPrompt = `\n\nDIRETRIZES DO PROFESSOR (DNA DO ARQUITETO):\n${settings.ai_prompt_template.trim()}`;
        }
        if (settings?.gemini_api_key) {
            userApiKey = settings.gemini_api_key;
        }
    } catch (e) {
        console.warn('[ExamGeneratorService] Aviso ao carregar configurações de IA:', e.message);
    }

    // Calibração cognitiva mandatória de acordo com a série escolar detectada
    const candidateContext = [publico, planData?.turmaName, planData?.turma, planData?.publico, tema].filter(Boolean);
    const cognitiveTierPrompt = buildCognitivePromptInstruction(...candidateContext);

    const specificScopeInstruction = isSpecificLesson && lessonLabelStr
        ? `\n7. ESCOPO CIRÚRGICO DA AVALIAÇÃO: Esta prova deve avaliar RIGOROSA E EXCLUSIVAMENTE o conteúdo, conceitos e habilidades trabalhados nas aulas selecionadas (${lessonLabelStr} — ${tema}). Não formule questões sobre conteúdos que não pertençam a este conjunto específico de aulas.`
        : '';

    const systemInstruction = `STATUS: ELITE PEDAGOGICAL ASSESSMENT SPECIALIST
Você é um formulador sênior de instrumentos formais de avaliação escolar para a Educação Básica brasileira, especialista em taxonomia de Bloom, psicometria educacional e diretrizes da BNCC.${customMasterPrompt}${bnccInstruction}${cognitiveTierPrompt}
Sua missão é criar uma PROVA ESCOLAR FORMAL, autêntica, desafiadora, equilibrada e impecavelmente formatada em JSON estrito.

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Responda ESTRITAMENTE em formato JSON válido, sem texto conversacional antes ou depois.
${totalTexts === 0
    ? '2. SEM TEXTOS DE APOIO: A avaliação NÃO DEVE conter textos de apoio ou seções de leitura ("textosApoio": []). As questões devem ser diretas, com enunciados objetivos e contextualizados formulados diretamente sobre os conteúdos, conceitos e situações-problema.'
    : `2. TEXTOS DE APOIO: Deve conter NO MÁXIMO ${totalTexts} texto(s) de apoio unificado(s) de alta qualidade pedagógica, servindo de âncora para a prova inteira.`}
3. QUANTIDADE DE QUESTÕES: Deve formular RIGOROSAMENTE ${totalQ} questões sequenciais (de 1 até ${totalQ}). Nem mais, nem menos.
4. TIPOS DE QUESTÕES PERMITIDOS NESTA AVALIAÇÃO:
${enabledTypes.map(t => `   * ${t}`).join('\n')}
Distribua a quantidade de ${totalQ} questões equilibradamente entre esses tipos permitidos.
5. FORMATO DE CADA TIPO:
   - "multipla_escolha": Deve ter 4 alternativas claras ("A", "B", "C", "D"), uma única correta e distratores plausíveis.
   - "associacao": Deve ter "colunaA" (itens conceituais numerados 1, 2, 3...) e "colunaB" (itens com parênteses vazios "( )" para o aluno preencher com os números de A). A "respostaCorreta" DEVE ser a sequência numérica exata preenchida nos parênteses da Coluna B de cima para baixo (exemplo: "2, 1" ou "3, 1, 4, 2"). O "criterioCorrecao" deve detalhar a correlação de cada par.
   - "lacunas": Frase ou parágrafo conceitual rico com lacunas demarcadas como "__________" e as palavras corretas no gabarito.
   - "dissertativa": Pergunta contextualizada que exige raciocínio crítico, capacidade de síntese e explicação com as próprias palavras.
6. GABARITO DOCENTE E ESPELHO RESUMIDO: Cada questão deve conter resposta correta exata e critério pedagógico claro de correção para o professor. Para questões de associação, tanto o 'gabaritoResumido' quanto a 'respostaCorreta' DEVEM registrar a sequência numérica direta dos parênteses da Coluna B (de cima para baixo), como "Q2: 2, 1" ou "2 - 1", facilitando a correção visual imediata pelo docente.${specificScopeInstruction}`;

    const userPrompt = `Por favor, elabore o Instrumento Oficial de Avaliação Formal com as seguintes especificações:
- Disciplina: ${disciplina}
- Tema / Foco Avaliado: ${tema}${isSpecificLesson && lessonLabelStr ? ` (Avaliação Focada: ${lessonLabelStr})` : ''}
- Segmento / Turma: ${publico}
- Unidade Letiva: ${unitLabel}
- Habilidades / BNCC: ${bnccListSummary}
${contextoAulas ? `\n${isSpecificLesson ? 'Conteúdo Detalhado das Aulas em Avaliação:' : 'Eixos Trabalhados na Semana Pedagógica:'}\n${contextoAulas}\n` : ''}
- Quantidade Exata de Questões: ${totalQ}
- Quantidade Máxima de Textos de Apoio: ${totalTexts === 0 ? '0 (Nenhum texto de leitura - prova direta contendo somente perguntas)' : totalTexts}
- Formatos de Questões a Incluir: ${enabledTypes.join('; ')}

ESTRUTURA JSON EXIGIDA:
{
  "titulo": "${isSpecificLesson && lessonLabelStr ? `Avaliação Formal • ${lessonLabelStr}` : `Avaliação Formal de ${disciplina}`}",
  "tema": "${tema}",
  "textosApoio": ${totalTexts === 0 ? '[]' : `[
    {
      "id": 1,
      "titulo": "Título do Texto 1",
      "conteudo": "Conteúdo do texto de leitura e interpretação..."
    }
  ]`},
  "questoes": [
    {
      "numero": 1,
      "tipo": "multipla_escolha",
      "enunciado": "${totalTexts === 0 ? 'Assinale a alternativa correta sobre o conceito de...' : 'Com base no Texto 1, assinale a alternativa correta...'}",
      "opcoes": [
        { "letra": "A", "texto": "Texto da alternativa A" },
        { "letra": "B", "texto": "Texto da alternativa B" },
        { "letra": "C", "texto": "Texto da alternativa C" },
        { "letra": "D", "texto": "Texto da alternativa D" }
      ],
      "respostaCorreta": "B",
      "criterioCorrecao": "Explicação concisa do porquê a B é a correta."
    },
    {
      "numero": 2,
      "tipo": "associacao",
      "enunciado": "Relacione os conceitos da Coluna A com suas definições na Coluna B:",
      "colunaA": [
        { "numero": "1", "texto": "Conceito A" },
        { "numero": "2", "texto": "Conceito B" }
      ],
      "colunaB": [
        { "texto": "Definição correspondente ao conceito 2", "corresponde": "2" },
        { "texto": "Definição correspondente ao conceito 1", "corresponde": "1" }
      ],
      "respostaCorreta": "2, 1",
      "criterioCorrecao": "Sequência dos parênteses (de cima para baixo): 2, 1. O primeiro item de B relaciona-se a (2) Conceito B; o segundo item relaciona-se a (1) Conceito A."
    },
    {
      "numero": 3,
      "tipo": "lacunas",
      "enunciado": "Complete as lacunas da frase abaixo com os termos conceituais adequados:",
      "textoComLacunas": "O processo de __________ ocorreu principalmente devido à __________.",
      "respostaCorreta": "Termo 1 / Termo 2",
      "criterioCorrecao": "Aceitar sinônimos conceituais válidos."
    },
    {
      "numero": 4,
      "tipo": "dissertativa",
      "enunciado": "Explique com suas palavras como...",
      "linhasSugeridas": 4,
      "respostaCorreta": "Espera-se que o estudante destaque...",
      "criterioCorrecao": "Atribuir nota integral se contemplar..."
    }
  ],
  "gabaritoResumido": "Q1: B | Q2: 2, 1 | Q3: Termo 1 / Termo 2 | Q4: Dissertativa"
}`;

    try {
        const rawAiResponse = await executeAIRotation(userPrompt, userApiKey, systemInstruction);
        const parsed = parseJSONSafely(rawAiResponse);

        if (!parsed || !Array.isArray(parsed.questoes) || parsed.questoes.length === 0) {
            throw new Error("A IA não retornou uma lista válida de questões.");
        }

        if (totalTexts === 0) {
            parsed.textosApoio = [];
        }

        // Pós-processamento e normalização pedagógica defensiva para questões de associação
        parsed.questoes.forEach((q) => {
            if (q.tipo === 'associacao') {
                if (Array.isArray(q.colunaB) && q.colunaB.length > 0) {
                    q.colunaB.forEach(b => {
                        if (typeof b.corresponde === 'string' && /^[A-Za-z]$/.test(b.corresponde.trim())) {
                            // Se o modelo retornou letra (ex: 'A', 'B'), converte para o índice numérico equivalente (1, 2)
                            const letterCode = b.corresponde.trim().toUpperCase().charCodeAt(0) - 64;
                            b.corresponde = String(letterCode);
                        }
                    });

                    const allCorresp = q.colunaB.map(b => b.corresponde).filter(Boolean);
                    if (allCorresp.length === q.colunaB.length && (!q.respostaCorreta || /[A-Za-z]/.test(q.respostaCorreta))) {
                        q.respostaCorreta = allCorresp.join(' – ');
                    }
                }
            }
        });

        return {
            success: true,
            exam: parsed
        };
    } catch (err) {
        console.error("[ExamGeneratorService] Falha ao gerar exame com IA:", err);
        return {
            success: false,
            error: err.message || "Erro desconhecido ao gerar avaliação com IA."
        };
    }
}

module.exports = {
    generateExamWithAI
};
