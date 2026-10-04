/**
 * Serviço Especialista: Matriz de Calibração Cognitiva e Gradação Pedagógica (6º ao 9º Ano)
 * Modula o nível de leitura, complexidade sintática e vocabulário gerado pela IA
 * para assegurar adequação real à faixa etária da Educação Básica brasileira.
 */

/**
 * Detecta a série escolar (6, 7, 8 ou 9) a partir de múltiplos identificadores textuais.
 * @param  {...any} candidateStrings - Strings contendo nome da turma, público, tema, etc.
 * @returns {number|null} - Número da série (6, 7, 8, 9) ou null se não detectado.
 */
function detectGradeLevel(...candidateStrings) {
    for (const raw of candidateStrings) {
        if (!raw || typeof raw !== 'string') continue;
        const text = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (/(?:6|sexto)\s*(?:º|o|ª|a)?\s*ano/i.test(text) || /\b6\s*º/i.test(text)) return 6;
        if (/(?:7|setimo)\s*(?:º|o|ª|a)?\s*ano/i.test(text) || /\b7\s*º/i.test(text)) return 7;
        if (/(?:8|oitavo)\s*(?:º|o|ª|a)?\s*ano/i.test(text) || /\b8\s*º/i.test(text)) return 8;
        if (/(?:9|nono)\s*(?:º|o|ª|a)?\s*ano/i.test(text) || /\b9\s*º/i.test(text)) return 9;
    }

    // Segunda passagem: busca dígitos isolados associados a contexto escolar
    for (const raw of candidateStrings) {
        if (!raw || typeof raw !== 'string') continue;
        const text = raw.toLowerCase();
        const isolatedMatch = text.match(/\b([6-9])\b/);
        if (isolatedMatch) {
            return parseInt(isolatedMatch[1], 10);
        }
    }

    return null;
}

/**
 * Retorna as diretrizes pedagógicas e cognitivas rigorosas para a série identificada.
 * @param {number|null} grade - Série (6, 7, 8 ou 9)
 * @returns {object} - Objeto estruturado com rótulo, foco e regras mandatórias.
 */
function getCognitiveTierGuidelines(grade) {
    switch (grade) {
        case 6:
            return {
                grade: 6,
                label: "6º Ano do Ensino Fundamental (Fase de Transição e Acolhimento Leitor)",
                textGuidelines: "Textos-base curtos (2 a 3 parágrafos concisos e objetivos). Frases na ordem direta (sujeito + verbo + complemento). Vocabulário cotidiano e acessível. Situações concretas e visuais do dia a dia da comunidade.",
                questionGuidelines: "Enunciados curtos e cristalinos. Perguntas focadas estritamente em informações explícitas no texto (Quem fez? Onde aconteceu? Quando? O que significa a palavra X no trecho?). Desafios práticos com desenhos, listas ou pequenos relatos de 2 a 3 linhas.",
                prohibitedTerms: "É TERMINANTEMENTE PROIBIDO qualquer termo técnico gramatical ou teórico abstrato (como 'coesão', 'anáfora', 'operadores', 'subordinação', 'semiótica', 'metalinguagem')."
            };

        case 7:
            return {
                grade: 7,
                label: "7º Ano do Ensino Fundamental (Expansão de Repertório e Primeiras Inferências)",
                textGuidelines: "Narrativas com diálogos, causos, crônicas e fábulas modernas. Frases com conectivos básicos de tempo e lugar. Palavras novas devem ser facilmente compreendidas pelo próprio contexto da história.",
                questionGuidelines: "Perguntas de causa e consequência imediatas ('Por que o personagem tomou essa decisão?', 'O que causou essa situação?'). Identificação de sentimentos e ações dos personagens. Explicação com as próprias palavras.",
                prohibitedTerms: "É TERMINANTEMENTE PROIBIDO o uso de metalinguagem formal universitária (como 'progressão temática', 'elementos coesivos', 'função apelativa'). Comandos devem ser diretos e amigáveis."
            };

        case 8:
            return {
                grade: 8,
                label: "8º Ano do Ensino Fundamental (Início da Argumentação e Senso Crítico Sem Jargões)",
                textGuidelines: "Textos de opinião contextualizados, notícias locais, cartas da comunidade e debates sobre convivência. Apresentação clara de pontos de vista diferentes sobre um mesmo problema cotidiano.",
                questionGuidelines: "Comandos práticos: 'Qual é a opinião do autor?', 'Que motivo ele apresenta para defender essa ideia?'. Quando pedir análise de palavras de ligação, use OBRIGATORIAMENTE exemplos entre parênteses: 'No texto, encontre uma palavra (como mas, porém, porque, além disso) que mostra uma ideia contrária/explicação'.",
                prohibitedTerms: "É TERMINANTEMENTE PROIBIDO o uso de jargões acadêmicos como 'operadores argumentativos', 'tese implícita', 'estratégia modalizadora' ou 'coesão sequencial anafórica'."
            };

        case 9:
            return {
                grade: 9,
                label: "9º Ano do Ensino Fundamental (Maturidade Leitora e Pensamento Crítico Autônomo)",
                textGuidelines: "Artigos de opinião mais consistentes, crônicas reflexivas, reportagens e dilemas éticos/sociais. Relações entre causa, efeito e ponto de vista do autor.",
                questionGuidelines: "Comparação entre perspectivas divergentes, identificação de ironia ou humor, reflexão crítica sobre a mensagem central e produção textual com proposta de solução prática. Comandos reflexivos sem pedantismo acadêmico.",
                prohibitedTerms: "É TERMINANTEMENTE PROIBIDO o tom formalista estéril de concurso/vestibular. O foco é a leitura emancipatória, a clareza e a cidadania ativa do estudante."
            };

        default:
            return {
                grade: null,
                label: "Ensino Fundamental II (Linguagem Acessível e Humanizada)",
                textGuidelines: "Textos envolventes, contextualizados à realidade concreta dos estudantes, com estrutura clara e vocabulário vivo.",
                questionGuidelines: "Comandos objetivos, empáticos e livres de jargões acadêmicos. Exemplos entre parênteses sempre que citar conectivos ou categorias de palavras.",
                prohibitedTerms: "PROIBIDO o uso de metalinguagem hermética ou terminologia excessivamente técnica universitária."
            };
    }
}

/**
 * Constrói o bloco de prompt mandatório para ser injetado nos geradores de IA.
 * @param  {...any} candidateStrings - Strings contendo nome da turma, público, tema, etc.
 * @returns {string} - Fragmento de prompt formatado com as travas cognitivas.
 */
function buildCognitivePromptInstruction(...candidateStrings) {
    const grade = detectGradeLevel(...candidateStrings);
    const guidelines = getCognitiveTierGuidelines(grade);

    return `\n[CALIBRAÇÃO COGNITIVA MANDATÓRIA DA SÉRIE: ${guidelines.label.toUpperCase()}]
- Perfil do Público-Alvo: Esta turma é de ${guidelines.label}.
- Diretrizes dos Textos de Leitura: ${guidelines.textGuidelines}
- Diretrizes das Perguntas e Desafios: ${guidelines.questionGuidelines}
- Termos Terminantemente Proibidos: ${guidelines.prohibitedTerms}
- Regra de Ouro: A excelência pedagógica aqui é a CLAREZA e a ACESSIBILIDADE. Nunca presuma que os alunos conhecem nomenclaturas abstratas; avalie a compreensão real da mensagem.`;
}

module.exports = {
    detectGradeLevel,
    getCognitiveTierGuidelines,
    buildCognitivePromptInstruction
};
