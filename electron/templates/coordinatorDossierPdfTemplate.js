/* eslint-env node */
/**
 * Motor de Diagramação Documental: Dossiê Oficial 360º do Estudante
 * Gera documento HTML/CSS de alta fidelidade para exportação em PDF (A4)
 * com cabeçalho timbrado institucional, matriz de notas, laudos pedagógicos e assinaturas.
 */

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatMarkdown(text) {
    if (!text) return '';
    let html = String(text).trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    html = html.replace(/^### +(.*?)$/gm, '<h3 style="font-size: 11px; font-weight: 800; color: #4338ca; margin-top: 8px; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.3px;">$1</h3>');
    html = html.replace(/^## +(.*?)$/gm, '<h2 style="font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 10px; margin-bottom: 4px;">$1</h2>');
    html = html.replace(/^# +(.*?)$/gm, '<h1 style="font-size: 13px; font-weight: 800; color: #1e293b; margin-top: 12px; margin-bottom: 6px;">$1</h1>');

    html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li style="margin-bottom: 2px; padding-left: 2px; font-size: 10px; line-height: 1.45; color: #334155;">$1</li>');
    html = html.replace(/(<li.*?>.*?<\/li>)/g, '<ul style="margin-top: 3px; margin-bottom: 6px; padding-left: 16px; list-style-type: disc;">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul style="[^"]*">/g, '');

    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '<p style="margin-bottom: 6px; font-size: 10px; line-height: 1.5; color: #334155;">');

    return html;
}

function getScoreBadgeClass(score) {
    if (score === null || score === undefined || isNaN(score)) return 'score-neutral';
    if (score >= 7.0) return 'score-high';
    if (score >= 5.0) return 'score-medium';
    return 'score-low';
}

function generateCoordinatorStudentDossierHTML(dossier, options = {}) {
    const student = dossier || {};
    const schoolName = options.schoolName || 'SISTEMA DE ENSINO INTEGRADO';
    const coordinatorName = options.coordinatorName || 'Coordenação Pedagógica';
    const unitLabel = options.selectedUnitName || (options.selectedUnit === 'ALL' ? 'Todas as Unidades' : `${options.selectedUnit}ª Unidade`);
    const disciplineFilter = options.selectedDiscipline || 'ALL';

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Filtragem de dados pelo funil de disciplina se aplicável
    let rawDisciplines = student.disciplines || [];
    let rawEvaluations = student.evaluations || [];
    let rawOccurrences = student.occurrences || [];
    let rawDiagnoses = student.diagnoses || [];

    if (disciplineFilter !== 'ALL') {
        rawDisciplines = rawDisciplines.filter(d => d.discipline === disciplineFilter);
        rawEvaluations = rawEvaluations.filter(e => e.discipline === disciplineFilter);
        rawOccurrences = rawOccurrences.filter(o => o.discipline === disciplineFilter);
        rawDiagnoses = rawDiagnoses.filter(d => d.discipline === disciplineFilter);
    }

    // Recálculo da média da visualização
    const validScores = rawDisciplines.map(d => d.average_score).filter(s => typeof s === 'number' && !isNaN(s));
    const effectiveAverage = validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
        : (student.overall_average || 0);

    // Linhas da Tabela de Disciplinas
    const disciplinesRows = rawDisciplines.map(d => {
        const score = d.average_score;
        const scoreFormatted = (score !== null && score !== undefined && !isNaN(score)) ? Number(score).toFixed(1) : '---';
        const badgeClass = getScoreBadgeClass(score);

        return `
            <tr>
                <td style="font-weight: 700; color: #1e293b;">${escapeHTML(d.discipline || 'Componente')}</td>
                <td style="color: #475569;">Prof. ${escapeHTML(d.teacher_name || 'Docente')}</td>
                <td style="text-align: center; color: #475569;">${d.delivered_activities || 0}</td>
                <td style="text-align: center; color: #475569;">${d.behaviorScore !== undefined ? Number(d.behaviorScore).toFixed(1) : '3.0'}</td>
                <td style="text-align: center; color: #475569;">${d.evaluations_count || 0}</td>
                <td style="text-align: right;">
                    <span class="badge ${badgeClass}">${scoreFormatted}</span>
                </td>
            </tr>
        `;
    }).join('');

    // Linhas da Tabela de Avaliações
    const evaluationsRows = rawEvaluations.map(ev => {
        const scoreFormatted = (ev.score !== null && ev.score !== undefined && !isNaN(ev.score)) ? Number(ev.score).toFixed(1) : '---';
        return `
            <tr>
                <td style="font-weight: 700; color: #1e293b;">${escapeHTML(ev.activity_name || ev.name || 'Avaliação')}</td>
                <td><span class="type-pill">${escapeHTML(ev.type || 'Avaliação')}</span></td>
                <td style="color: #475569;">${escapeHTML(ev.discipline || '')}</td>
                <td style="text-align: center; color: #64748b;">${ev.unit_id ? `${ev.unit_id}ª Unidade` : '1ª Unidade'}</td>
                <td style="text-align: right; font-weight: 800; color: #1e293b;">${scoreFormatted}</td>
            </tr>
        `;
    }).join('');

    // Linhas de Ocorrências
    const occurrencesHTML = rawOccurrences.length === 0
        ? `<div class="empty-box">Nenhuma ocorrência disciplinar registrada para este período. Conduta exemplar.</div>`
        : rawOccurrences.map(occ => `
            <div class="occurrence-card">
                <div>
                    <strong>${escapeHTML(occ.type || 'Ocorrência Disciplinar')}</strong>
                    <span class="penalty-tag">${occ.points !== undefined ? `${occ.points} pts` : '-0.15 pts'}</span>
                    <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                        ${escapeHTML(occ.discipline || '')} • Prof. ${escapeHTML(occ.teacher_name || '')} • ${escapeHTML(occ.date || '')}
                    </div>
                </div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b;">
                    ${occ.unit_id ? `${occ.unit_id}ª Unid.` : '1ª Unid.'}
                </div>
            </div>
        `).join('');

    // Diagnósticos IA formatados
    const diagnosesHTML = rawDiagnoses.length === 0
        ? `<div class="empty-box">Nenhum parecer pedagógico arquivado para os parâmetros selecionados.</div>`
        : rawDiagnoses.map(diag => `
            <div class="diagnosis-card">
                <div class="diagnosis-header">
                    <div>
                        <strong>${escapeHTML(diag.discipline || 'Componente')}</strong>
                        <span class="unit-badge">${diag.unit_id ? `${diag.unit_id}ª Unidade` : '1ª Unidade'}</span>
                        <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">
                            Docente: Prof. ${escapeHTML(diag.teacher_name || diag.author_name || 'Docente')} • Emissão: ${diag.created_at ? new Date(diag.created_at).toLocaleDateString('pt-BR') : dateStr}
                        </div>
                    </div>
                </div>
                <div class="diagnosis-body">
                    ${formatMarkdown(diag.diagnosis_text || diag.text)}
                </div>
            </div>
        `).join('');

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Dossiê Escolar 360º - ${escapeHTML(student.canonical_name || 'Estudante')}</title>
        <style>
            @page {
                size: A4 portrait;
                margin: 12mm 14mm 14mm 14mm;
            }
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #1e293b;
                background-color: #ffffff;
                margin: 0;
                padding: 0;
                font-size: 10.5px;
                line-height: 1.4;
            }

            /* Header Oficial */
            .header-table {
                width: 100%;
                border-bottom: 2px solid #4338ca;
                padding-bottom: 8px;
                margin-bottom: 12px;
            }
            .header-title h1 {
                margin: 0;
                font-size: 15px;
                font-weight: 900;
                color: #1e1b4b;
                letter-spacing: -0.3px;
                text-transform: uppercase;
            }
            .header-title p {
                margin: 2px 0 0 0;
                font-size: 9.5px;
                font-weight: 700;
                color: #4338ca;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .header-meta {
                text-align: right;
                font-size: 9px;
                color: #64748b;
                font-weight: 500;
            }

            /* Box do Aluno */
            .student-info-box {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 14px;
            }
            .student-info-grid {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
            }
            .student-name {
                font-size: 13px;
                font-weight: 800;
                color: #0f172a;
            }
            .student-sub {
                font-size: 10px;
                color: #64748b;
                margin-top: 1px;
            }
            .scope-pills {
                display: flex;
                gap: 6px;
            }
            .scope-badge {
                display: inline-block;
                padding: 3px 8px;
                background-color: #e0e7ff;
                color: #3730a3;
                border: 1px solid #c7d2fe;
                border-radius: 6px;
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
            }
            .scope-badge-green {
                background-color: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }

            /* KPIs */
            .kpi-row {
                display: flex;
                gap: 8px;
                margin-bottom: 14px;
            }
            .kpi-card {
                flex: 1;
                background-color: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 10px;
                text-align: center;
            }
            .kpi-title {
                font-size: 8.5px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .kpi-value {
                font-size: 16px;
                font-weight: 900;
                color: #1e293b;
                margin-top: 2px;
            }

            /* Seções e Tabelas */
            .section-title {
                font-size: 11px;
                font-weight: 800;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-top: 12px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
                font-size: 10px;
            }
            th {
                background-color: #f1f5f9;
                color: #475569;
                font-size: 8.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                padding: 6px 8px;
                border-bottom: 1px solid #cbd5e1;
                text-align: left;
            }
            td {
                padding: 5px 8px;
                border-bottom: 1px solid #f1f5f9;
            }
            tr:nth-child(even) td {
                background-color: #fafafa;
            }

            /* Badges de Nota */
            .badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9.5px;
                font-weight: 800;
            }
            .score-high {
                background-color: #ecfdf5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            .score-medium {
                background-color: #fffbeb;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            .score-low {
                background-color: #fff1f2;
                color: #9f1239;
                border: 1px solid #fecdd3;
            }
            .score-neutral {
                background-color: #f1f5f9;
                color: #475569;
                border: 1px solid #e2e8f0;
            }
            .type-pill {
                display: inline-block;
                padding: 1.5px 5px;
                background-color: #f1f5f9;
                color: #475569;
                border-radius: 4px;
                font-size: 8.5px;
                font-weight: 700;
            }

            /* Ocorrências */
            .occurrence-card {
                border: 1px solid #e2e8f0;
                background-color: #ffffff;
                border-radius: 6px;
                padding: 6px 10px;
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .penalty-tag {
                display: inline-block;
                margin-left: 4px;
                padding: 1px 4px;
                background-color: #fee2e2;
                color: #991b1b;
                border-radius: 4px;
                font-size: 8px;
                font-weight: 800;
            }

            /* Diagnósticos IA */
            .diagnosis-card {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                background-color: #ffffff;
                margin-bottom: 10px;
                page-break-inside: avoid;
                overflow: hidden;
            }
            .diagnosis-header {
                background-color: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                padding: 6px 10px;
            }
            .unit-badge {
                display: inline-block;
                margin-left: 4px;
                padding: 1px 5px;
                background-color: #e0e7ff;
                color: #3730a3;
                border-radius: 4px;
                font-size: 8px;
                font-weight: 800;
            }
            .diagnosis-body {
                padding: 8px 10px;
                font-size: 9.5px;
                color: #334155;
            }
            .empty-box {
                padding: 14px;
                text-align: center;
                color: #64748b;
                font-size: 10px;
                border: 1px dashed #cbd5e1;
                border-radius: 6px;
                background-color: #fafafa;
                margin-bottom: 10px;
            }

            /* Assinaturas */
            .signature-area {
                margin-top: 24px;
                display: flex;
                justify-content: space-around;
                page-break-inside: avoid;
            }
            .signature-box {
                width: 200px;
                border-top: 1px solid #94a3b8;
                padding-top: 4px;
                text-align: center;
                font-size: 9.5px;
                color: #475569;
                font-weight: 600;
            }

            /* Rodapé */
            .footer-table {
                width: 100%;
                margin-top: 18px;
                border-top: 1px solid #e2e8f0;
                padding-top: 6px;
                font-size: 8.5px;
                color: #94a3b8;
                page-break-inside: avoid;
            }
        </style>
    </head>
    <body>
        <table class="header-table">
            <tr>
                <td class="header-title" style="vertical-align: middle;">
                    <h1>${escapeHTML(schoolName)}</h1>
                    <p>Dossiê Pedagógico 360º • Coordenação Escolar</p>
                </td>
                <td class="header-meta" style="vertical-align: middle;">
                    <div>Emitido em ${dateStr} às ${timeStr}</div>
                    <div style="font-weight: 700; color: #4338ca; margin-top: 2px;">DOCUMENTO OFICIAL AUDITADO</div>
                </td>
            </tr>
        </table>

        <div class="student-info-box">
            <div class="student-info-grid">
                <div>
                    <div class="student-name">${escapeHTML(student.canonical_name || 'Estudante')}</div>
                    <div class="student-sub">Turma: <strong>${escapeHTML(student.display_turma || student.turma_base || 'Geral')}</strong> • ID Canônico: ${escapeHTML(student.canonical_id || '---')}</div>
                </div>
                <div class="scope-pills">
                    <span class="scope-badge">${escapeHTML(unitLabel)}</span>
                    <span class="scope-badge ${disciplineFilter !== 'ALL' ? 'scope-badge-green' : ''}">
                        ${disciplineFilter === 'ALL' ? 'Multidisciplinar' : escapeHTML(disciplineFilter)}
                    </span>
                </div>
            </div>
        </div>

        <div class="kpi-row">
            <div class="kpi-card">
                <div class="kpi-title">Média do Período</div>
                <div class="kpi-value">${effectiveAverage.toFixed(1)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Componentes</div>
                <div class="kpi-value">${rawDisciplines.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Avaliações</div>
                <div class="kpi-value">${rawEvaluations.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Ocorrências</div>
                <div class="kpi-value" style="color: ${rawOccurrences.length > 0 ? '#b45309' : '#059669'};">${rawOccurrences.length}</div>
            </div>
        </div>

        <div class="section-title">Quadro de Rendimento por Disciplina</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 32%;">Disciplina</th>
                    <th style="width: 28%;">Docente Responsável</th>
                    <th style="text-align: center; width: 10%;">Lições</th>
                    <th style="text-align: center; width: 10%;">Conduta</th>
                    <th style="text-align: center; width: 10%;">Testes</th>
                    <th style="text-align: right; width: 10%;">Média</th>
                </tr>
            </thead>
            <tbody>
                ${disciplinesRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #94a3b8;">Nenhum componente listado.</td></tr>'}
            </tbody>
        </table>

        ${rawEvaluations.length > 0 ? `
            <div class="section-title">Detalhamento dos Instrumentos Avaliativos</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 36%;">Instrumento</th>
                        <th style="width: 18%;">Tipo</th>
                        <th style="width: 24%;">Disciplina</th>
                        <th style="text-align: center; width: 12%;">Período</th>
                        <th style="text-align: right; width: 10%;">Nota</th>
                    </tr>
                </thead>
                <tbody>
                    ${evaluationsRows}
                </tbody>
            </table>
        ` : ''}

        <div class="section-title">Histórico Disciplinar e Comportamental</div>
        ${occurrencesHTML}

        <div class="section-title" style="margin-top: 14px;">Pareceres e Diagnósticos Pedagógicos (IA)</div>
        ${diagnosesHTML}

        <div class="signature-area">
            <div class="signature-box">
                ${escapeHTML(coordinatorName)}<br>
                <span style="font-size: 8px; color: #94a3b8; font-weight: 400;">Coordenação Pedagógica</span>
            </div>
            <div class="signature-box">
                Assinatura do(a) Responsável Legal<br>
                <span style="font-size: 8px; color: #94a3b8; font-weight: 400;">Ciente em: ____/____/________</span>
            </div>
        </div>

        <table class="footer-table">
            <tr>
                <td>EduSys Pro • Sistema Integrado de Gestão Pedagógica</td>
                <td style="text-align: right;">Documento Gerado Institucionalmente • Autenticidade Registrada</td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

module.exports = {
    generateCoordinatorStudentDossierHTML
};
