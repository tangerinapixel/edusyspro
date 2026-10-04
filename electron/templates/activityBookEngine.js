/**
 * Motor Editorial Isolado: Cadernos de Atividades Discentes
 * Gera documentos A4 profissionais com suporte a múltiplos formatos pedagógicos
 * (Caderno Prático Diário, Avaliação Formal/Prova, Estudo Dirigido, Modo Xerox e Gabarito Docente).
 */

const { formatMarkdown } = require('./pdfTemplates');

async function generateActivityBookHTML(planData, title, settings, unitLabel, professorName, options = {}) {
    const schoolName = settings?.school_name || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let data = planData || {};
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = { tema: title || 'Atividades Pedagógicas' };
        }
    }

    const escapeHTML = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');
    };

    // Opções de personalização com fallbacks seguros
    const format = options.format || 'caderno_padrao'; // 'caderno_padrao' | 'avaliacao_formal' | 'estudo_dirigido'
    const isXerox = options.printMode === 'economico_xerox';
    const includeSelfAssessment = Boolean(options.includeSelfAssessment);
    const includeFamilySignature = Boolean(options.includeFamilySignature);
    const includeTeacherGuide = Boolean(options.includeTeacherGuide);
    const maxScore = options.maxScore || '10,0';

    // Variáveis de Tema (Colorido Institucional vs Xerox)
    const primaryColor = isXerox ? '#000000' : '#4338ca';
    const primaryDark = isXerox ? '#000000' : '#312e81';
    const tagBg = isXerox ? '#000000' : '#4338ca';
    const tagText = '#ffffff';
    const borderColor = isXerox ? '#000000' : '#cbd5e1';
    const lightBorder = isXerox ? '#999999' : '#e2e8f0';

    const unidade = data.unidade || unitLabel || 'UNIDADE VIGENTE';
    const professor = data.professor || professorName || 'Professor(a)';
    const disciplina = data.disciplina || 'COMPONENTE CURRICULAR';
    const turma = data.turma || 'Turma';
    const tema = data.tema || title || 'Caderno de Atividades';
    const allAulas = Array.isArray(data.aulas) ? data.aulas : [];
    const targetLessonNumbers = Array.isArray(options.targetLessonNumbers) && options.targetLessonNumbers.length > 0
        ? options.targetLessonNumbers
        : (options.targetLessonNumber ? [options.targetLessonNumber] : []);
    const isSpecificLesson = Boolean(options.isSpecificLesson || targetLessonNumbers.length > 0);
    const formatLessonList = (nums) => {
        if (!Array.isArray(nums) || nums.length === 0) return '';
        const padded = nums.map(n => String(n).padStart(2, '0'));
        if (padded.length === 1) return `Aula ${padded[0]}`;
        if (padded.length === 2) return `Aulas ${padded[0]} e ${padded[1]}`;
        return `Aulas ${padded.slice(0, -1).join(', ')} e ${padded[padded.length - 1]}`;
    };
    const lessonLabelStr = formatLessonList(targetLessonNumbers);
    const targetLessonTitle = options.targetLessonTitle;
    const isUnitExam = options.isUnitExam !== undefined 
        ? Boolean(options.isUnitExam) 
        : (options.scopeMode === 'multissemanas' ? true : (options.scopeMode === 'plano_atual' ? false : true));
    const examHeaderTitle = isUnitExam ? 'INSTRUMENTO DE AVALIAÇÃO FORMAL' : 'MINI TESTE';

    // Filtro por aulas selecionadas (se fornecido via options.selectedLessonIndices)
    let selectedAulas = allAulas;
    if (Array.isArray(options.selectedLessonIndices) && options.selectedLessonIndices.length > 0) {
        const filtered = options.selectedLessonIndices
            .filter(idx => typeof idx === 'number' && idx >= 0 && idx < allAulas.length)
            .map(idx => allAulas[idx]);
        if (filtered.length > 0) {
            selectedAulas = filtered;
        }
    }

    // Gerador de linhas pautadas
    const renderPautas = (qtd = 4) => {
        let pautasHtml = '<div class="pauta-container">';
        for (let p = 0; p < qtd; p++) {
            pautasHtml += '<div class="pauta-linha"></div>';
        }
        pautasHtml += '</div>';
        return pautasHtml;
    };

    // Parser estruturado de atividades e questões
    const parseActivitiesData = (rawText) => {
        if (!rawText) return { preTexto: '', questoes: [] };

        let text = String(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        const regexQuestoes = /(?:^|\n)\s*(\d+)[\.\)]\s+([\s\S]*?)(?=(?:\n\s*\d+[\.\)]\s+)|$)/g;
        const matches = [...text.matchAll(regexQuestoes)];

        if (matches.length > 0) {
            const firstQuestaoIndex = text.indexOf(matches[0][0]);
            const preTexto = text.substring(0, firstQuestaoIndex).trim();
            const questoes = matches.map(m => m[2].trim());
            return { preTexto, questoes };
        }

        return { preTexto: text, questoes: [] };
    };

    // Parser e formatador clássico para Caderno Padrão e Estudo Dirigido
    const formatActivitiesContent = (rawText) => {
        if (!rawText) return '<p style="color: #64748b; font-style: italic;">Nenhuma atividade cadastrada para esta aula.</p>';

        const { preTexto, questoes } = parseActivitiesData(rawText);

        if (questoes.length > 0) {
            let resultHTML = '';
            if (preTexto) {
                let formattedPre = formatMarkdown(preTexto);
                formattedPre = formattedPre.replace(/(<strong>Texto Base In[eé]dito[^<]*<\/strong>|Texto Base In[eé]dito:[^<]*?)(<br\s*\/?>)+/gi, '<div class="texto-base-badge">$1</div>');
                resultHTML += '<div class="texto-base-card">' + formattedPre + '</div>';
            }

            resultHTML += '<div class="questoes-wrapper">';
            questoes.forEach((corpoQuestao, idx) => {
                const numQuestao = idx + 1;
                const questaoFormatada = formatMarkdown(corpoQuestao);

                resultHTML += '<div class="questao-item">' +
                    '<div class="questao-enunciado">' +
                        `<span class="questao-num">Questão ${numQuestao}</span>` +
                        '<div class="questao-texto">' + questaoFormatada + '</div>' +
                    '</div>' +
                    '<div class="questao-resposta-box">' +
                        '<span class="resposta-label">Resposta:</span>' +
                        renderPautas(4) +
                    '</div>' +
                '</div>';
            });
            resultHTML += '</div>';
            return resultHTML;
        }

        return '<div class="texto-base-card">' + formatMarkdown(preTexto) + '</div>' +
            '<div class="questao-resposta-box" style="margin-top: 14px;">' +
                '<span class="resposta-label">Espaço para Resolução / Anotações:</span>' +
                renderPautas(6) +
            '</div>';
    };

    const aulasComAtividades = selectedAulas.filter(a => a && a.atividades && a.atividades.trim().length > 0);
    const listaAulas = aulasComAtividades.length > 0 ? aulasComAtividades : selectedAulas;

    const sanitizeActivityTitle = (rawTitle, fallbackIndex) => {
        if (!rawTitle) return 'Atividade Prática ' + fallbackIndex;
        let clean = String(rawTitle).trim();
        clean = clean.replace(/^(?:aulas?\s+\d+(?:\s*(?:a|e)\s*\d+)?|\d+ª?\s*aula)\s*(?:\([^)]*\))?\s*[-–—:]\s*/i, '');
        clean = clean.replace(/\s*\(\s*\d+\s*aulas?\s*\)\s*$/i, '');
        clean = clean.replace(/^\s*\(\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*\)\s*[-–—:]?\s*/i, '');
        return clean.trim() || ('Atividade Prática ' + fallbackIndex);
    };

    let atividadesHTML = '';

    if (options.examData) {
        // Layout de Prova Oficial Elaborada por IA (1 a 20 questões com tipologia variada)
        const exam = options.examData;
        const examQuestoes = Array.isArray(exam.questoes) ? exam.questoes : [];
        const totalQuestionsCount = examQuestoes.length;
        const maxScoreNum = parseFloat(String(maxScore).replace(',', '.')) || 10.0;
        const valPerQuestionNum = totalQuestionsCount > 0 ? (maxScoreNum / totalQuestionsCount) : maxScoreNum;
        const valPerQuestionStr = Number.isInteger(valPerQuestionNum)
            ? valPerQuestionNum.toString()
            : valPerQuestionNum.toFixed(1).replace('.', ',');
        const formattedMaxScoreStr = Number.isInteger(maxScoreNum)
            ? maxScoreNum.toString()
            : maxScoreNum.toFixed(1).replace('.', ',');

        let questoesHTML = '';

        // Textos de Apoio Consolidados (máximo 1 ou 2 textos de fôlego para toda a prova)
        if (Array.isArray(exam.textosApoio) && exam.textosApoio.length > 0) {
            exam.textosApoio.forEach((txt, tIdx) => {
                const tit = txt.titulo || `Texto de Apoio ${tIdx + 1}`;
                const cont = formatMarkdown(txt.conteudo || '');
                questoesHTML += `
                    <div class="texto-base-card" style="page-break-inside: auto; margin-bottom: 14px;">
                        <div class="texto-base-badge">📖 ${escapeHTML(tit)}</div>
                        ${cont}
                    </div>
                `;
            });
        }

        // Renderização de cada Questão conforme seu formato pedagógico
        questoesHTML += '<div class="questoes-wrapper">';
        examQuestoes.forEach((q, qIdx) => {
            const numQ = q.numero || (qIdx + 1);
            const paddedNum = String(numQ).padStart(2, '0');
            const enunciadoFormatado = formatMarkdown(q.enunciado || '');

            let corpoEspecificoHTML = '';

            if (q.tipo === 'multipla_escolha' && Array.isArray(q.opcoes)) {
                corpoEspecificoHTML = `
                    <div class="opcoes-container" style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                        ${q.opcoes.map(op => `
                            <div class="opcao-item" style="display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.4;">
                                <span style="font-weight: 800; border: 1.5px solid ${isXerox ? '#000000' : '#6366f1'}; border-radius: 50%; width: 22px; height: 22px; min-width: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: ${isXerox ? '#000000' : '#4338ca'}; background: ${isXerox ? '#ffffff' : '#eef2ff'};">
                                    ${escapeHTML(op.letra || '')}
                                </span>
                                <span style="padding-top: 1.5px; color: #1e293b;">${formatMarkdown(op.texto || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (q.tipo === 'associacao') {
                corpoEspecificoHTML = `
                    <div class="associacao-container" style="margin-top: 8px; display: flex; gap: 20px; font-size: 12px; background: ${isXerox ? '#ffffff' : '#f8fafc'}; border: 1px solid ${lightBorder}; border-radius: 6px; padding: 10px 14px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: ${primaryDark}; margin-bottom: 6px; border-bottom: 1px solid ${lightBorder}; padding-bottom: 3px;">Coluna A</div>
                            ${(q.colunaA || []).map(item => `
                                <div style="margin-bottom: 5px; line-height: 1.35;">
                                    <strong style="color: ${isXerox ? '#000000' : '#4338ca'};">(${escapeHTML(item.numero || '')})</strong> ${formatMarkdown(item.texto || '')}
                                </div>
                            `).join('')}
                        </div>
                        <div style="width: 1px; background: ${lightBorder};"></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: ${primaryDark}; margin-bottom: 6px; border-bottom: 1px solid ${lightBorder}; padding-bottom: 3px;">Coluna B (Preencha com o nº de A)</div>
                            ${(q.colunaB || []).map(item => `
                                <div style="margin-bottom: 5px; line-height: 1.35; display: flex; align-items: flex-start; gap: 6px;">
                                    <span style="font-weight: 800; border-bottom: 1px solid ${isXerox ? '#000000' : '#94a3b8'}; width: 28px; display: inline-block; text-align: center;">(&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                                    <span>${formatMarkdown(item.texto || '')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (q.tipo === 'lacunas') {
                corpoEspecificoHTML = `
                    <div class="lacuna-box" style="margin-top: 8px; padding: 10px 14px; background: ${isXerox ? '#ffffff' : '#f8fafc'}; border: 1.5px dashed ${borderColor}; border-radius: 6px; font-size: 12.5px; line-height: 1.8;">
                        ${formatMarkdown(q.textoComLacunas || q.enunciado || '')}
                    </div>
                `;
            } else {
                // Dissertativa com pautas
                corpoEspecificoHTML = `
                    <div class="questao-resposta-box" style="margin-top: 8px;">
                        <span class="resposta-label">Resposta:</span>
                        ${renderPautas(q.linhasSugeridas || 4)}
                    </div>
                `;
            }

            questoesHTML += `
                <div class="questao-item" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 16px;">
                    <div class="questao-enunciado">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div>
                                <span class="questao-num" style="font-size: 11px; padding: 2.5px 8px;">Questão ${paddedNum}</span>
                                <span class="questao-peso" style="margin-left: 8px; font-weight: 700; color: ${primaryDark};">(Valor: ${valPerQuestionStr} pts)</span>
                            </div>
                            <span style="font-size: 10.5px; font-weight: 800; color: ${isXerox ? '#000000' : '#475569'}; border: 1px dashed ${borderColor}; padding: 2px 8px; border-radius: 4px;">Nota: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                        </div>
                        <div class="questao-texto">${enunciadoFormatado}</div>
                    </div>
                    ${corpoEspecificoHTML}
                </div>
            `;
        });
        questoesHTML += '</div>';

        atividadesHTML = questoesHTML;
    } else if (format === 'avaliacao_formal') {
        // Layout Exclusivo de Avaliação Formal / Prova a partir das aulas do plano:
        // Supressão de cabeçalhos de aula, numeração sequencial unificada,
        // cálculo dinâmico de valor por questão e Espelho/Quadro de Notas para o Professor.
        const parsedAulasList = listaAulas.map(aula => {
            const parsed = parseActivitiesData(aula.atividades);
            return {
                aula,
                preTexto: parsed.preTexto,
                questoes: parsed.questoes
            };
        });

        const totalQuestionsCount = parsedAulasList.reduce((acc, curr) => acc + curr.questoes.length, 0);
        const maxScoreNum = parseFloat(String(maxScore).replace(',', '.')) || 10.0;
        const valPerQuestionNum = totalQuestionsCount > 0 ? (maxScoreNum / totalQuestionsCount) : maxScoreNum;
        const valPerQuestionStr = Number.isInteger(valPerQuestionNum)
            ? valPerQuestionNum.toString()
            : valPerQuestionNum.toFixed(1).replace('.', ',');
        const formattedMaxScoreStr = Number.isInteger(maxScoreNum)
            ? maxScoreNum.toString()
            : maxScoreNum.toFixed(1).replace('.', ',');

        let questoesHTML = '';
        let globalQuestaoNum = 1;

        parsedAulasList.forEach(item => {
            if (item.preTexto) {
                let formattedPre = formatMarkdown(item.preTexto);
                formattedPre = formattedPre.replace(/(<strong>Texto Base In[eé]dito[^<]*<\/strong>|Texto Base In[eé]dito:[^<]*?)(<br\s*\/?>)+/gi, '<div class="texto-base-badge">📖 Texto de Apoio para Resolução das Questões</div>');
                if (!formattedPre.includes('texto-base-badge')) {
                    formattedPre = '<div class="texto-base-badge">📖 Texto de Apoio para Resolução das Questões</div>' + formattedPre;
                }
                questoesHTML += '<div class="texto-base-card" style="page-break-inside: auto;">' + formattedPre + '</div>';
            }

            if (item.questoes.length > 0) {
                questoesHTML += '<div class="questoes-wrapper">';
                item.questoes.forEach(corpoQuestao => {
                    const paddedNum = String(globalQuestaoNum).padStart(2, '0');
                    const questaoFormatada = formatMarkdown(corpoQuestao);

                    questoesHTML += '<div class="questao-item">' +
                        '<div class="questao-enunciado">' +
                            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                                '<div>' +
                                    `<span class="questao-num" style="font-size: 11px; padding: 2.5px 8px;">Questão ${paddedNum}</span>` +
                                    `<span class="questao-peso" style="margin-left: 8px; font-weight: 700; color: ${primaryDark};">(Valor: ${valPerQuestionStr} pts)</span>` +
                                '</div>' +
                                `<span style="font-size: 10.5px; font-weight: 800; color: ${isXerox ? '#000000' : '#475569'}; border: 1px dashed ${borderColor}; padding: 2px 8px; border-radius: 4px;">Nota: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>` +
                            '</div>' +
                            '<div class="questao-texto">' + questaoFormatada + '</div>' +
                        '</div>' +
                        '<div class="questao-resposta-box">' +
                            '<span class="resposta-label">Resposta:</span>' +
                            renderPautas(4) +
                        '</div>' +
                    '</div>';
                    globalQuestaoNum++;
                });
                questoesHTML += '</div>';
            } else if (item.preTexto) {
                questoesHTML += '<div class="questao-resposta-box" style="margin-top: 14px; margin-bottom: 16px;">' +
                    '<span class="resposta-label">Espaço para Resolução / Anotações:</span>' +
                    renderPautas(6) +
                '</div>';
            }
        });

        atividadesHTML = questoesHTML;
    } else {
        // Formato clássico padrão e estudo dirigido (preserva estrutura original intacta)
        let atividadeIndex = 1;
        atividadesHTML = listaAulas.map((aula) => {
            const tituloLimpo = sanitizeActivityTitle(aula.titulo, atividadeIndex);
            const cardHeader = '<div class="atividade-header-card">' +
                '<div class="atividade-header-left">' +
                    '<span class="atividade-tag">Atividade ' + atividadeIndex + '</span>' +
                    '<span class="atividade-titulo">' + escapeHTML(tituloLimpo) + '</span>' +
                '</div>' +
            '</div>';

            atividadeIndex++;
            const contentHTML = formatActivitiesContent(aula.atividades);

            return '<div class="atividade-bloco">' + cardHeader + contentHTML + '</div>';
        }).join('');
    }

    // Bloco opcional de autoavaliação metacognitiva
    let selfAssessmentHTML = '';
    if (includeSelfAssessment) {
        selfAssessmentHTML = `
            <div class="meta-box" style="page-break-inside: avoid; break-inside: avoid; margin-top: 20px; border: 1.5px solid ${isXerox ? '#000000' : '#cbd5e1'}; border-radius: 8px; padding: 10px 14px; background: ${isXerox ? '#ffffff' : '#f8fafc'};">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isXerox ? '#000000' : '#334155'}; margin-bottom: 6px;">
                    🎯 Autoavaliação do Estudante (Metacognição):
                </div>
                <div style="font-size: 11px; color: ${isXerox ? '#000000' : '#475569'}; margin-bottom: 6px;">
                    Como você avalia seu domínio e facilidade ao resolver estas atividades?
                </div>
                <div style="display: flex; gap: 20px; font-size: 10.5px; font-weight: 700; color: ${isXerox ? '#000000' : '#1e293b'};">
                    <span>[ &nbsp; ] Fácil (Compreendi com segurança)</span>
                    <span>[ &nbsp; ] Médio (Tive dúvidas pontuais)</span>
                    <span>[ &nbsp; ] Desafiador (Preciso de revisão)</span>
                </div>
            </div>
        `;
    }

    // Bloco opcional de visto do responsável
    let familySignatureHTML = '';
    if (includeFamilySignature) {
        familySignatureHTML = `
            <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 28px; margin-bottom: 12px; display: flex; justify-content: space-between; gap: 24px;">
                <div style="flex: 1; border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                    Visto do(a) Professor(a) / Data
                </div>
                <div style="flex: 1; border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                    Ciente do(a) Responsável Legal pelo Aluno
                </div>
            </div>
        `;
    }

    // Anexo opcional do Gabarito do Docente
    let teacherGuideHTML = '';
    if (includeTeacherGuide) {
        if (options.examData) {
            const exam = options.examData;
            const examQuestoes = Array.isArray(exam.questoes) ? exam.questoes : [];
            const effectiveGabaritoResumido = exam.gabaritoResumido || (examQuestoes.length > 0 ? examQuestoes.map((q, idx) => {
                const num = q.numero || (idx + 1);
                const qNum = `Q${String(num).padStart(2, '0')}`;
                let resp = q.respostaCorreta || 'Critério';
                if (q.tipo === 'associacao' && Array.isArray(q.colunaB) && q.colunaB.length > 0) {
                    const allHaveCorresponde = q.colunaB.every(b => b.corresponde !== undefined && b.corresponde !== null && String(b.corresponde).trim() !== '');
                    if (allHaveCorresponde) {
                        resp = q.colunaB.map(b => String(b.corresponde).trim()).join(' – ');
                    }
                }
                return `${qNum}: ${resp}`;
            }).join(' | ') : '');

            const gabaritoResumidoHTML = effectiveGabaritoResumido ? `
                <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; font-weight: 700; color: #0f172a;">
                    <strong style="color: #1e1b4b; text-transform: uppercase;">📋 Espelho Resumido de Respostas:</strong><br/>
                    ${formatMarkdown(effectiveGabaritoResumido)}
                </div>
            ` : '';

            const gabaritosList = examQuestoes.map((q, idx) => {
                const num = q.numero || (idx + 1);
                const paddedNum = String(num).padStart(2, '0');
                const resp = q.respostaCorreta ? escapeHTML(q.respostaCorreta) : 'Consultar critérios do docente.';
                const crit = q.criterioCorrecao ? formatMarkdown(q.criterioCorrecao) : '';

                let respostaContentHTML = '';

                if (q.tipo === 'associacao') {
                    // Obter ou deduzir a sequência correta
                    let seqStr = q.respostaCorreta || '';
                    if (Array.isArray(q.colunaB) && q.colunaB.length > 0) {
                        const allHaveCorresponde = q.colunaB.every(b => b.corresponde !== undefined && b.corresponde !== null && String(b.corresponde).trim() !== '');
                        if (allHaveCorresponde) {
                            seqStr = q.colunaB.map(b => String(b.corresponde).trim()).join(' – ');
                        }
                    }
                    if (!seqStr) {
                        seqStr = q.respostaCorreta ? escapeHTML(q.respostaCorreta) : 'Consultar critérios do docente.';
                    }

                    // Montar correlação visual item a item
                    let mappingHTML = '';
                    if (Array.isArray(q.colunaB) && q.colunaB.length > 0) {
                        const itemsMapping = q.colunaB.map(b => {
                            const correspVal = b.corresponde !== undefined && b.corresponde !== null ? String(b.corresponde).trim() : '';
                            const matchA = Array.isArray(q.colunaA)
                                ? q.colunaA.find(a => String(a.numero || '').trim() === correspVal || String(a.letra || '').trim().toLowerCase() === correspVal.toLowerCase())
                                : null;
                            const labelA = matchA ? `(Item ${escapeHTML(matchA.numero || matchA.letra || correspVal)}: ${escapeHTML(matchA.texto || '')})` : (correspVal ? `(Item ${escapeHTML(correspVal)})` : '');

                            return `
                                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; font-size: 11px; line-height: 1.35;">
                                    <span style="font-weight: 800; color: #15803d; background: #dcfce7; padding: 1px 7px; border-radius: 4px; border: 1px solid #bbf7d0; white-space: nowrap;">
                                        ( ${escapeHTML(correspVal || '—')} )
                                    </span>
                                    <span style="color: #334155; font-weight: 500;">${formatMarkdown(b.texto || '')}</span>
                                    ${labelA ? `
                                        <span style="color: #64748b; font-weight: 700;">➔</span>
                                        <span style="color: #1e293b; font-weight: 600;">${labelA}</span>
                                    ` : ''}
                                </div>
                            `;
                        }).join('');

                        mappingHTML = `
                            <div style="margin-top: 6px; margin-bottom: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
                                <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 5px;">
                                    📌 Correlação dos Parênteses (Coluna B ➔ Coluna A):
                                </div>
                                ${itemsMapping}
                            </div>
                        `;
                    }

                    respostaContentHTML = `
                        <div style="font-size: 12px; font-weight: 700; color: #15803d; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>✓ Sequência nos Parênteses (Coluna B, de cima para baixo):</span>
                            <span style="background: #dcfce7; color: #166534; border: 1.5px solid #86efac; padding: 2px 10px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: 900;">
                                ${escapeHTML(seqStr)}
                            </span>
                        </div>
                        ${mappingHTML}
                    `;
                } else {
                    respostaContentHTML = `
                        <div style="font-size: 12px; font-weight: 700; color: #15803d; margin-bottom: 4px;">
                            ✓ Resposta Oficial: ${resp}
                        </div>
                    `;
                }

                return `
                    <div style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                        <div style="font-size: 12px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                            Questão ${paddedNum} (${escapeHTML(q.tipo || 'Geral')}) — Resposta Oficial
                        </div>
                        ${respostaContentHTML}
                        ${crit ? `
                            <div style="margin-top: 6px; font-size: 10.5px; color: #4338ca; font-weight: 600;">
                                💡 Critério Pedagógico: ${crit}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            teacherGuideHTML = `
                <div style="page-break-before: always; break-before: page; margin-top: 24px;">
                    <div style="border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 16px;">
                        <h2 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a;">
                            Espelho de Correção e Gabarito Oficial da Avaliação
                        </h2>
                        <span style="font-size: 10px; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">
                            ⚠️ Documento Anexo de Uso Exclusivo do(a) Professor(a) — Não Distribuir aos Alunos
                        </span>
                    </div>
                    ${gabaritoResumidoHTML}
                    ${gabaritosList}
                </div>
            `;
        } else {
            const gabaritosList = listaAulas.map((aula, idx) => {
                const num = idx + 1;
                const gabaritoText = aula.gabarito ? formatMarkdown(aula.gabarito) : '<em style="color: #64748b;">Gabarito não detalhado no plano docente.</em>';
                const socializacaoText = aula.socializacao ? formatMarkdown(aula.socializacao) : '';

                return `
                    <div style="margin-bottom: 14px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                        <div style="font-size: 12px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                            Atividade ${num} — Resolução e Gabarito Esperado
                        </div>
                        <div style="font-size: 11px; line-height: 1.5; color: #0f172a;">
                            ${gabaritoText}
                        </div>
                        ${socializacaoText ? `
                            <div style="margin-top: 8px; font-size: 10px; color: #4338ca; font-weight: 600;">
                                💡 Critério Pedagógico: ${socializacaoText}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            teacherGuideHTML = `
                <div style="page-break-before: always; break-before: page; margin-top: 24px;">
                    <div style="border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 16px;">
                        <h2 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a;">
                            Espelho de Correção e Gabarito Comentado
                        </h2>
                        <span style="font-size: 10px; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">
                            ⚠️ Documento Anexo de Uso Exclusivo do(a) Professor(a) — Não Distribuir aos Alunos
                        </span>
                    </div>
                    ${gabaritosList}
                </div>
            `;
        }
    }

    const schoolNameEsc = escapeHTML(schoolName);
    const unidadeEsc = escapeHTML(unidade);
    const professorEsc = escapeHTML(professor);
    const disciplinaEsc = escapeHTML(disciplina);
    const turmaEsc = escapeHTML(turma);
    const temaEsc = escapeHTML(tema);

    // Construção do Cabeçalho de acordo com o Formato
    let headerHTML = '';
    if (format === 'avaliacao_formal') {
        headerHTML = `
            <div class="header-meta" style="border-bottom: 2.5px solid #000000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="header-meta-left">
                    <h1 style="font-size: 18px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; color: #94a3b8;">${schoolNameEsc}</h1>
                    <div style="font-size: 12px; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${examHeaderTitle} ${isSpecificLesson && lessonLabelStr ? `• ${lessonLabelStr}` : ''} • ${disciplinaEsc}
                    </div>
                </div>
                <div style="font-size: 10px; color: #475569; text-align: right; font-weight: 600;">
                    <div>${unidadeEsc}</div>
                    <div>Emissão: ${dateStr}</div>
                </div>
            </div>

            <div class="aluno-id-box" style="border: 1.5px solid #000000; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; background: #ffffff;">
                <div style="display: flex; gap: 12px; margin-bottom: 8px; align-items: center;">
                    <div style="flex: 3; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Estudante:</strong> <span class="campo-linha"></span>
                    </div>
                    <div style="width: 100px; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Nº:</strong> <span class="campo-linha"></span>
                    </div>
                    <div style="width: 130px; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Data:</strong> <span class="campo-linha"></span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="flex: 2; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Turma:</strong> ${turmaEsc}
                    </div>
                    <div style="flex: 2; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Professor(a):</strong> ${professorEsc}
                    </div>
                    <div style="border: 2px solid #000000; border-radius: 6px; padding: 4px 12px; text-align: center; min-width: 130px;">
                        <div style="font-size: 9px; font-weight: 800; text-transform: uppercase;">Nota Obtida</div>
                        <div style="font-size: 14px; font-weight: 900;">____ / ${maxScore}</div>
                    </div>
                </div>
            </div>

            <div style="border: 1px solid ${borderColor}; border-radius: 6px; padding: 6px 12px; font-size: 10.5px; line-height: 1.4; margin-bottom: 14px; background: ${isXerox ? '#ffffff' : '#f8fafc'};">
                <strong>Instruções ao Estudante:</strong> Leia com atenção cada enunciado. Responda com letra legível nas linhas pautadas. Respostas rasuradas ou ilegíveis podem comprometer a pontuação.
            </div>

            <div class="tema-banner" style="background: #ffffff; border-left: 4px solid ${primaryColor}; border-top: 1px solid ${lightBorder}; border-right: 1px solid ${lightBorder}; border-bottom: 1px solid ${lightBorder}; padding: 7px 14px; margin-bottom: 14px; border-radius: 0 8px 8px 0; font-size: 12.5px;">
                <strong style="color: ${primaryDark}; text-transform: uppercase; font-size: 11px; margin-right: 6px;">${isSpecificLesson ? (targetLessonNumbers.length > 1 ? 'Aulas Avaliadas:' : 'Foco da Aula Avaliada:') : 'Conteúdo Avaliado:'}</strong> ${temaEsc}
            </div>
        `;
    } else if (format === 'estudo_dirigido') {
        headerHTML = `
            <div class="header-meta" style="border-bottom: 2px solid ${borderColor}; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="header-meta-left">
                    <h1 style="font-size: 18px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; color: #94a3b8;">${schoolNameEsc}</h1>
                    <div style="font-size: 12.5px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase;">Guia de Estudo Dirigido e Investigação • ${disciplinaEsc}</div>
                </div>
                <div style="font-size: 10.5px; color: #64748b; font-weight: 600; text-align: right;">
                    <div>${unidadeEsc}</div>
                    <div>Emissão: ${dateStr}</div>
                </div>
            </div>

            <div class="aluno-id-box" style="border: 1.5px solid ${borderColor}; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; background: #ffffff;">
                <div style="display: flex; gap: 12px; margin-bottom: 8px; align-items: center;">
                    <div style="flex: 3; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Equipe / Aluno(a):</strong> <span class="campo-linha"></span>
                    </div>
                    <div style="width: 140px; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Data:</strong> <span class="campo-linha"></span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="flex: 1; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Turma:</strong> ${turmaEsc}
                    </div>
                    <div style="flex: 2; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Professor(a):</strong> ${professorEsc}
                    </div>
                    <div class="nota-box" style="border: 1.5px dashed ${borderColor}; border-radius: 6px; padding: 4px 14px; font-size: 11px; font-weight: 800; text-align: center; min-width: 95px;">
                        Avaliação / Visto
                    </div>
                </div>
            </div>

            <div class="tema-banner" style="background: #ffffff; border-left: 4px solid ${primaryColor}; border-top: 1px solid ${lightBorder}; border-right: 1px solid ${lightBorder}; border-bottom: 1px solid ${lightBorder}; padding: 7px 14px; margin-bottom: 14px; border-radius: 0 8px 8px 0; font-size: 12.5px;">
                <strong style="color: ${primaryDark}; text-transform: uppercase; font-size: 11px; margin-right: 6px;">Eixo Investigativo:</strong> ${temaEsc}
            </div>
        `;
    } else {
        // Formato clássico padrão (Caderno de Atividades Práticas - 100% idêntico ao atual)
        headerHTML = `
            <div class="header-meta" style="border-bottom: 2px solid ${borderColor}; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="header-meta-left">
                    <h1 style="font-size: 18px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; color: #94a3b8;">${schoolNameEsc}</h1>
                    <div style="font-size: 12.5px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase;">Caderno de Atividades Práticas • ${disciplinaEsc}</div>
                </div>
                <div style="font-size: 10.5px; color: #64748b; font-weight: 600; text-align: right;">
                    <div>Emissão: ${dateStr} às ${timeStr}</div>
                    <div>${unidadeEsc}</div>
                </div>
            </div>

            <div class="aluno-id-box" style="border: 1.5px solid ${borderColor}; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; background: #ffffff;">
                <div style="display: flex; gap: 12px; margin-bottom: 8px; align-items: center;">
                    <div style="flex: 3; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Estudante:</strong> <span class="campo-linha"></span>
                    </div>
                    <div style="width: 120px; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Nº:</strong> <span class="campo-linha"></span>
                    </div>
                    <div style="width: 140px; display: flex; align-items: center; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Data:</strong> <span class="campo-linha"></span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="flex: 1; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Turma:</strong> ${turmaEsc}
                    </div>
                    <div style="flex: 2; font-size: 12px; font-weight: 600;">
                        <strong style="text-transform: uppercase; font-size: 11px;">Professor(a):</strong> ${professorEsc}
                    </div>
                    <div class="nota-box" style="border: 1.5px dashed ${borderColor}; border-radius: 6px; padding: 4px 14px; font-size: 11px; font-weight: 800; text-align: center; min-width: 95px;">
                        Visto / Nota
                    </div>
                </div>
            </div>

            <div class="tema-banner" style="background: #ffffff; border-left: 4px solid ${primaryColor}; border-top: 1px solid ${lightBorder}; border-right: 1px solid ${lightBorder}; border-bottom: 1px solid ${lightBorder}; padding: 7px 14px; margin-bottom: 14px; border-radius: 0 8px 8px 0; font-size: 12.5px;">
                <strong style="color: ${primaryDark}; text-transform: uppercase; font-size: 11px; margin-right: 6px;">Assunto Central:</strong> ${temaEsc}
            </div>
        `;
    }

    const docSubTitle = format === 'avaliacao_formal' ? 'Instrumento Avaliativo' : 'Material Discente';

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${escapeHTML(disciplina)} - Atividades - ${escapeHTML(tema)}</title>
            <style>
                @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");
                @page { size: A4 portrait; margin: 8mm 12mm 10mm 12mm; }
                body, p, li, div { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.55; color: #1e293b; }
                body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; }
                .campo-linha { border-bottom: 1px solid ${isXerox ? '#000000' : '#94a3b8'}; display: inline-block; flex: 1; height: 16px; margin-left: 6px; }
                .atividade-bloco { margin-bottom: 18px; page-break-inside: auto; }
                .atividade-header-card { background: #ffffff; border: 1px solid ${borderColor}; border-left: 4px solid ${primaryColor}; padding: 7px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; page-break-after: avoid; break-after: avoid; }
                .atividade-header-left { display: flex; align-items: center; gap: 8px; }
                .atividade-tag { background: ${tagBg}; color: ${tagText} !important; font-size: 10.5px; font-weight: 800; text-transform: uppercase; padding: 2.5px 9px; border-radius: 4px; shrink-0; }
                .atividade-titulo { font-size: 13px; font-weight: 800; color: #0f172a !important; }
                .texto-base-card { background: #ffffff; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; text-align: justify; line-height: 1.6; font-size: 13px; color: #0f172a; page-break-inside: auto; }
                .texto-base-badge { font-weight: 800; font-size: 12.5px; color: ${primaryDark}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1.5px solid ${lightBorder}; padding-bottom: 4px; }
                .questoes-wrapper { margin-top: 10px; }
                .questao-item { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; border: 1px solid ${lightBorder}; border-radius: 8px; padding: 10px 14px; background: #ffffff; }
                .questao-enunciado { margin-bottom: 8px; }
                .questao-num { background: ${isXerox ? '#000000' : '#e0e7ff'}; color: ${isXerox ? '#ffffff' : '#3730a3'}; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 4px; }
                .questao-peso { font-size: 10px; font-weight: 700; color: ${isXerox ? '#000000' : '#4338ca'}; margin-left: 6px; }
                .questao-texto { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.55; }
                .questao-resposta-box { margin-top: 8px; }
                .resposta-label { font-size: 10.5px; font-weight: 800; color: ${isXerox ? '#000000' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.3px; display: block; margin-bottom: 3px; }
                .pauta-container { margin-top: 3px; }
                .pauta-linha { border-bottom: 1px dashed ${isXerox ? '#000000' : '#94a3b8'}; height: 26px; width: 100%; }
                .footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid ${lightBorder}; padding-top: 4px; font-size: 9.5px; color: ${isXerox ? '#000000' : '#94a3b8'}; font-weight: 600; background-color: #ffffff; height: 14px; }
            </style>
        </head>
        <body>
            <table style="width: 100%; border-collapse: collapse; border: none;">
                <tbody>
                    <tr>
                        <td style="padding: 0; border: none;">
                            ${headerHTML}
                            ${atividadesHTML}
                            ${selfAssessmentHTML}
                            ${familySignatureHTML}
                            ${teacherGuideHTML}
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="height: 20px; border: none;"></td>
                    </tr>
                </tfoot>
            </table>
            <div class="footer">
                <span>${schoolNameEsc} • ${docSubTitle}</span>
                <span>Caderno de Atividades • ${disciplinaEsc}</span>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    generateActivityBookHTML
};
