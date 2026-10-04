function generateHTML(turmaName, unitName, grades, settings) {
    const schoolName = settings?.school_name || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let rowsHTML = "";
    grades.forEach((g) => {
        const rawLicao = Number(g.licao || 0);
        const rawMiniTestes = Number(g.totalMiniTestes || 0);
        const rawTrabalho = Number(g.trabalho || 0);
        const atividadesSoma = (Math.round((rawLicao + rawMiniTestes + rawTrabalho + Number.EPSILON) * 100) / 100).toFixed(2);
        
        const comportamento = Number(g.behaviorScore || 0).toFixed(2);
        const prova = Number(g.prova || 0).toFixed(2);
        const bonus = Number(g.bonus || 0).toFixed(2);
        const mediaFinal = Number(g.mediaFinal || 0).toFixed(2);
        
        const mediaClass = g.mediaFinal < 5.0 ? 'text-red' : 'text-indigo';

        rowsHTML += `
            <tr>
                <td style="text-align: left; font-weight: 600; color: #334155; white-space: nowrap;">${g.name}</td>
                <td style="text-align: center; color: #475569;">${atividadesSoma}</td>
                <td style="text-align: center; color: #475569;">${comportamento}</td>
                <td style="text-align: center; color: #475569;">${prova}</td>
                <td style="text-align: center; color: #b45309; font-weight: 600;">${bonus}</td>
                <td class="${mediaClass}" style="text-align: right; font-weight: 800; font-size: 15px;">${mediaFinal}</td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Boletim Consolidado - ${turmaName} - ${unitName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                 body, table, th, td {
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                 }
                 body {
                    margin: 0;
                    padding: 0;
                    color: #1e293b;
                    background-color: #ffffff;
                    -webkit-print-color-adjust: exact;
                 }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                .header-left h1 {
                    font-size: 22px;
                    font-weight: 800;
                    color: #4f46e5;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.5px;
                }
                .header-left p {
                    font-size: 12px;
                    color: #64748b;
                    margin: 0;
                    font-weight: 500;
                }
                .header-right {
                    text-align: right;
                }
                .badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .badge-turma {
                    background-color: #e0e7ff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                }
                .badge-unidade {
                    background-color: #faf5ff;
                    color: #6b21a8;
                    border: 1px solid #f3e8ff;
                    margin-left: 4px;
                }
                .header-right p {
                    font-size: 10px;
                    color: #94a3b8;
                    margin: 6px 0 0 0;
                    font-weight: 500;
                    white-space: nowrap;
                }
                h2.title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 15px 0;
                    letter-spacing: -0.2px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th {
                    background-color: #f8fafc;
                    border-bottom: 2px solid #e2e8f0;
                    color: #475569;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 10px 12px;
                }
                td {
                    font-variant-numeric: tabular-nums;
                    padding: 10px 12px;
                    font-size: 13px;
                    border-bottom: 1px solid #f1f5f9;
                }
                tr {
                    page-break-inside: avoid;
                }
                tr:nth-child(even) td {
                    background-color: #f8fafc;
                }
                .text-red {
                    color: #dc2626 !important;
                }
                .text-indigo {
                    color: #4f46e5 !important;
                }
                .signature-area {
                    margin-top: 50px;
                    display: flex;
                    justify-content: flex-end;
                    page-break-inside: avoid;
                }
                .signature-box {
                    border-top: 1px dashed #cbd5e1;
                    width: 220px;
                    text-align: center;
                    padding-top: 6px;
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                }
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 8px;
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1>${schoolName}</h1>
                    <p>Relatório Consolidado de Rendimento</p>
                </div>
                <div class="header-right">
                    <span class="badge badge-turma">${turmaName}</span>
                    <span class="badge badge-unidade">${unitName}</span>
                    <p>Gerado em ${dateStr} às ${timeStr}</p>
                </div>
            </div>
            
            <h2 class="title">Boletim Informativo de Notas</h2>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left; width: 38%;">Estudante</th>
                        <th style="text-align: center; width: 20%;">Ativ. + Testes + Trab.</th>
                        <th style="text-align: center; width: 14%;">Comportamento</th>
                        <th style="text-align: center; width: 9%;">Prova</th>
                        <th style="text-align: center; width: 9%;">Bônus</th>
                        <th style="text-align: right; width: 10%;">Média Final</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
            
            <div class="signature-area">
                <div class="signature-box">
                    Assinatura do(a) Professor(a)
                </div>
            </div>
            
            <div class="footer">
                <span>EduSys Pro - Gestão Pedagógica</span>
                <span>Documento Oficial</span>
            </div>
        </body>
        </html>
    `;
}

function formatMarkdown(text) {
    if (!text) return "";
    
    // Escapar caracteres HTML básicos com trim inicial
    let html = String(text).trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Converter cabeçalhos Markdown para HTML com estilo embutido compacto
    html = html.replace(/^### +(.*?)$/gm, '<h3 style="font-size: 10px; font-weight: 800; color: #4f46e5; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; display: block;">$1</h3>');
    html = html.replace(/^## +(.*?)$/gm, '<h2 style="font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 12px; margin-bottom: 4px; display: block;">$1</h2>');
    html = html.replace(/^# +(.*?)$/gm, '<h1 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 14px; margin-bottom: 6px; display: block;">$1</h1>');
    
    // Converter Marcadores de lista PRIMEIRO (essencial para remover os asteriscos de margem antes do itálico)
    html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li style="margin-bottom: 3px; padding-left: 2px; font-size: 10.5px; line-height: 1.45; color: #334155;">$1</li>');
    
    // Agrupar itens de lista adjacentes em tags <ul>
    html = html.replace(/(<li.*?>.*?<\/li>)/g, '<ul style="margin-top: 3px; margin-bottom: 6px; padding-left: 18px; list-style-type: disc;">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul style="[^"]*">/g, '');
    
    // Converter Negrito + Itálico (3 asteriscos)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Converter Negrito (2 asteriscos)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Converter Itálico (1 asterisco)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Limpar quaiquer asteriscos residuais soltos (ex: ***** ou **)
    html = html.replace(/\*{2,}/g, '');

    // Limpar novas linhas redundantes ao redor de tags estruturais
    html = html.replace(/\n*(<\/?(h1|h2|h3|ul|li)[^>]*>)\n*/g, '$1');
    
    // Converter quebras de linha simples restantes para <br/>
    html = html.replace(/\n/g, '<br/>');

    // MÁGICA PARA ECONOMIZAR PAPEL: Limita quebras múltiplas a no máximo duas
    html = html.replace(/(<br\s*\/?>){3,}/gi, '<br/><br/>');

    // Remove quebras de linha excessivas ao redor de elementos estruturais
    html = html.replace(/(?:<br\s*\/?>\s*)+(<(?:h[1-6]|ul)[^>]*>)/gi, '$1');
    html = html.replace(/(<\/(?:h[1-6]|ul)[^>]*>)(?:<br\s*\/?>\s*)+/gi, '$1');
    
    return html;
}

function generateStudentReportHTML(turmaName, unitName, studentName, grades, parecerTexto, settings) {
    const schoolName = settings?.school_name || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Grades values
    const licaoGrade = Number(grades.licao || 0).toFixed(2);
    const licaoCheckCount = grades.licaoCheckCount || 0;
    const maxActivities = grades.maxActivities || 0;
    
    const trabalhoGrade = Number(grades.trabalho || 0).toFixed(2);
    const miniTestesGrade = Number(grades.totalMiniTestes || 0).toFixed(2);
    const comportamentoGrade = Number(grades.behaviorScore || 0).toFixed(2);
    const provaGrade = Number(grades.prova || 0).toFixed(2);
    const bonusGrade = Number(grades.bonus || 0).toFixed(2);
    const mediaFinal = Number(grades.mediaFinal || 0).toFixed(2);

    const mediaClass = Number(mediaFinal) < 5.0 ? 'bg-media-red' : 'bg-media-blue';

    const comportamentoMax = Number(settings?.behavior_start_score || 3).toFixed(2);

    // Sanitiza qualquer marcador residual de data no texto do parecer e remove cabeçalhos redundantes
    let sanitizedParecerTexto = (parecerTexto || "")
        .replace(/\[\s*Data\s*(Atual|de\s*Emissão)?\s*\]/gi, `${dateStr} às ${timeStr}`)
        .replace(/\[\s*Data\s*\]/gi, dateStr);

    // Elimina cabeçalho de identificação redundante gerado pela IA no topo do parecer
    sanitizedParecerTexto = sanitizedParecerTexto
        .replace(/^\s*#*\s*Relat[oó]rio pedag[oó]gico anal[ií]tico[^\n]*\n+/i, '')
        .replace(/^\s*#*\s*IDENTIFICA[ÇC][ÃA]O DO CONTEXTO:?[\s\S]*?(?:---+|\n{2,})\s*/i, '')
        .replace(/^\s*[-*_]{3,}\s*/, '')
        .trim();

    let formattedParecer = formatMarkdown(sanitizedParecerTexto);

    // Destaque obrigatório em negrito nos 4 tópicos estruturais do parecer no PDF final
    const titulosParaDestacar = [
        "1. Panorama Comparativo",
        "2. Análise de Tendência e Dedicação",
        "3. Lacunas Cognitivas ou Oportunidades de Melhoria",
        "4. Plano de Ação Estratégico"
    ];

    titulosParaDestacar.forEach(titulo => {
        const escaped = titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Remove tags de negrito preexistentes para evitar duplicações
        formattedParecer = formattedParecer.replace(new RegExp(`<strong>\\s*(${escaped})\\s*<\\/strong>`, 'gi'), '$1');
        // Aplica o destaque em negrito obrigatório
        formattedParecer = formattedParecer.replace(new RegExp(`(${escaped})`, 'gi'), '<strong style="font-weight: 800; color: #0f172a;">$1</strong>');
    });

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Boletim Individual - ${studentName} - ${turmaName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                body, table, th, td, div, p, h1, h2, h3, span {
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                body {
                    margin: 0;
                    padding: 0;
                    color: #1e293b;
                    background-color: #ffffff;
                    -webkit-print-color-adjust: exact;
                }
                
                /* Prevenir quebra indesejada de parágrafos, listas e blocos */
                h1, h2, h3, h4, h5, h6 {
                    break-after: avoid;
                    page-break-after: avoid;
                }
                 .metric-card, .media-final-container, .student-info-card, .signature-row {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 12px;
                    margin-bottom: 20px;
                }
                .header-left h1 {
                    font-size: 20px;
                    font-weight: 800;
                    color: #4f46e5;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.5px;
                }
                .header-left p {
                    font-size: 11px;
                    color: #64748b;
                    margin: 0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header-right {
                    text-align: right;
                }
                .header-right p {
                    font-size: 10px;
                    color: #94a3b8;
                    margin: 4px 0 0 0;
                    font-weight: 500;
                }
                .badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .badge-turma {
                    background-color: #e0e7ff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                }
                .badge-unidade {
                    background-color: #faf5ff;
                    color: #6b21a8;
                    border: 1px solid #f3e8ff;
                    margin-left: 4px;
                }
                
                .student-info-card {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 18px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 12px;
                }
                .info-item {
                    font-size: 13px;
                    color: #475569;
                }
                .info-item strong {
                    color: #0f172a;
                    font-weight: 700;
                }

                .metrics-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #475569;
                    margin-top: 15px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 18px;
                }
                .metric-card {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px;
                    text-align: center;
                }
                .metric-label {
                    font-size: 9px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .metric-value {
                    font-size: 16px;
                    font-weight: 800;
                    color: #0f172a;
                    font-variant-numeric: tabular-nums;
                }
                .metric-sub {
                    font-size: 9px;
                    color: #94a3b8;
                    margin-top: 2px;
                }

                .media-final-container {
                    background: linear-gradient(135deg, #f5f3ff 0%, #edd8fc 100%);
                    border: 1px solid #d8b4fe;
                    border-radius: 16px;
                    padding: 12px 18px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    gap: 16px;
                }
                .prova-inline-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .prova-label-group h3 {
                    font-size: 13px;
                    font-weight: 800;
                    color: #4338ca;
                    margin: 0 0 2px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .prova-label-group p {
                    font-size: 10px;
                    color: #6366f1;
                    margin: 0;
                    font-weight: 500;
                }
                .prova-badge {
                    font-size: 22px;
                    font-weight: 900;
                    padding: 4px 14px;
                    border-radius: 10px;
                    background-color: #ffffff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                    font-variant-numeric: tabular-nums;
                    box-shadow: 0 2px 6px rgba(67, 56, 202, 0.1);
                }
                .media-final-divider {
                    width: 1px;
                    height: 38px;
                    background-color: #d8b4fe;
                }
                .media-final-label-group {
                    flex: 1;
                }
                .media-final-label-group h3 {
                    font-size: 13px;
                    font-weight: 800;
                    color: #581c87;
                    margin: 0 0 2px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .media-final-label-group p {
                    font-size: 10px;
                    color: #7e22ce;
                    margin: 0;
                    font-weight: 500;
                }
                .media-final-badge {
                    font-size: 24px;
                    font-weight: 900;
                    padding: 6px 16px;
                    border-radius: 10px;
                    font-variant-numeric: tabular-nums;
                    box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15);
                }
                .bg-media-blue {
                    background-color: #4f46e5;
                    color: #ffffff;
                }
                .bg-media-red {
                    background-color: #dc2626;
                    color: #ffffff;
                }

                .parecer-container {
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 18px;
                    margin-bottom: 25px;
                }
                .parecer-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #4f46e5;
                    margin: 0 0 10px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 6px;
                }
                .parecer-text {
                    font-size: 12px;
                    line-height: 1.6;
                    color: #334155;
                }

                .signature-row {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                    gap: 40px;
                    page-break-inside: avoid;
                }
                .signature-col {
                    flex: 1;
                    border-top: 1px dashed #cbd5e1;
                    text-align: center;
                    padding-top: 8px;
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                }

                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 8px;
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 500;
                    background-color: #ffffff;
                    height: 15px;
                }
            </style>
        </head>
        <body>
            <table style="width: 100%; border-collapse: collapse; border: none;">
                <tbody>
                    <tr>
                        <td style="padding: 0; border: none;">
                            <div class="header">
                                <div class="header-left">
                                    <h1>${schoolName}</h1>
                                    <p>Boletim de Acompanhamento Individual</p>
                                </div>
                                <div class="header-right">
                                    <span class="badge badge-turma">${turmaName}</span>
                                    <span class="badge badge-unidade">${unitName}</span>
                                    <p>Emissão: ${dateStr} às ${timeStr}</p>
                                </div>
                            </div>

                            <div class="student-info-card">
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span>Estudante:</span> <strong>${studentName}</strong>
                                    </div>
                                    <div class="info-item" style="text-align: right;">
                                        <span>Data:</span> <strong>${dateStr}</strong>
                                    </div>
                                </div>
                            </div>

                            <div class="metrics-title">Composição do Aproveitamento</div>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <div class="metric-label">Lições de Casa</div>
                                    <div class="metric-value">${licaoGrade}</div>
                                    <div class="metric-sub">${licaoCheckCount}/${maxActivities} entregas</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Trabalhos</div>
                                    <div class="metric-value">${trabalhoGrade}</div>
                                    <div class="metric-sub">Nota total</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Mini Testes</div>
                                    <div class="metric-value">${miniTestesGrade}</div>
                                    <div class="metric-sub">Nota total</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-label">Comportamento</div>
                                    <div class="metric-value">${comportamentoGrade}</div>
                                    <div class="metric-sub">Nota final (máx ${comportamentoMax})</div>
                                </div>
                            </div>

                            <div class="media-final-container">
                                <div class="prova-inline-container">
                                    <div class="prova-label-group">
                                        <h3>Avaliação / Provas</h3>
                                        <p>Nota ponderada oficial</p>
                                    </div>
                                    <div class="prova-badge">
                                        ${provaGrade}
                                    </div>
                                </div>
                                ${Number(grades.bonus || 0) > 0 ? `
                                <div class="media-final-divider"></div>
                                <div class="prova-inline-container">
                                    <div class="prova-label-group">
                                        <h3 style="color: #b45309;">Atividade Bônus</h3>
                                        <p style="color: #d97706;">Pontuação extra somada</p>
                                    </div>
                                    <div class="prova-badge" style="color: #b45309; border-color: #fde68a;">
                                        +${bonusGrade}
                                    </div>
                                </div>
                                ` : ''}
                                <div class="media-final-divider"></div>
                                <div class="media-final-label-group">
                                    <h3>Média Geral Conquistada</h3>
                                    <p>Resultados obtidos em todas as avaliações no período</p>
                                </div>
                                <div class="media-final-badge ${mediaClass}">
                                    ${mediaFinal}
                                </div>
                            </div>

                            <div class="parecer-container">
                                <div class="parecer-title">Parecer e Acompanhamento Pedagógico</div>
                                <div class="parecer-text">${formattedParecer}</div>
                            </div>

                            <div class="signature-row">
                                <div class="signature-col">
                                    Assinatura do(a) Professor(a)
                                </div>
                                <div class="signature-col">
                                    Assinatura do Responsável
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="height: 35px; border: none;"></td>
                    </tr>
                </tfoot>
            </table>

            <div class="footer">
                <span>EduSys Pro - Gestão Pedagógica</span>
                <span>Documento de Acompanhamento Individual do Aluno</span>
            </div>
        </body>
        </html>
    `;
}

function generateLessonPlanHTML(planData, title, settings, unitLabel, professorName) {
    const schoolName = settings?.school_name || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let data = planData || {};
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = { tema: title || 'Plano de Aula' };
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

    const aulas = Array.isArray(data.aulas) ? data.aulas : [];
    const aulaDatesList = aulas.map(a => a.data).filter(d => d && String(d).trim().length > 0);

    const unidade = data.unidade || data.unitLabel || unitLabel || 'UNIDADE VIGENTE';

    // Auto-recuperação do período a partir das datas das aulas se vier 'A definir' ou vazio
    let periodo = data.periodo;
    if (!periodo || periodo.trim() === '' || periodo.trim().toLowerCase() === 'a definir') {
        if (aulaDatesList.length > 0) {
            const firstD = aulaDatesList[0];
            const lastD = aulaDatesList[aulaDatesList.length - 1];
            periodo = (firstD === lastD) ? firstD : `${firstD} a ${lastD}`;
        } else {
            periodo = 'A definir';
        }
    }

    const professor = data.professor || data.professorName || professorName || 'Professor(a)';
    const disciplina = data.disciplina || 'PLANO DE ENSINO';

    // Auto-recuperação da turma para não exibir a palavra literal 'Turma'
    let turma = data.turma;
    if (!turma || turma.trim() === '' || turma.trim().toLowerCase() === 'turma') {
        turma = data.turmaName || data.publico || data.turma_nome || 'Turma Geral';
    }

    // Auto-recuperação das datas agrupadas se vier 'A definir' ou vazio
    let datas = data.datas;
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
            datas = 'A definir';
        }
    }

    let duracao = data.duracao;
    if (!duracao || duracao.trim() === '' || duracao.trim().toLowerCase() === '50 min') {
        if (aulas.length > 0) {
            duracao = `${aulas.length} aula(s) de 50 minutos`;
        } else {
            duracao = '50 min';
        }
    }

    const tema = data.tema || title || 'Plano de Aula';

    const objetivoGeral = data.objetivoGeral || '';
    const objetivosEspecificos = Array.isArray(data.objetivosEspecificos) ? data.objetivosEspecificos : [];
    const conteudos = Array.isArray(data.conteudos) ? data.conteudos : [];
    const habilidadesBNCC = Array.isArray(data.habilidadesBNCC) ? data.habilidadesBNCC : [];

    const renderList = (items) => items.map((item) => '<li>' + formatMarkdown(item) + '</li>').join('');

    let currentAulaCounter = 1;
    const aulasHTML = aulas.map((aula) => {
        let countNum = 1;
        if (aula.qtdAulas) {
            const match = String(aula.qtdAulas).match(/(\d+)/);
            if (match) countNum = parseInt(match[1]);
        }

        let labelAula = '';
        if (countNum > 1) {
            const endAula = currentAulaCounter + countNum - 1;
            labelAula = 'AULAS ' + currentAulaCounter + ' a ' + endAula;
            currentAulaCounter = endAula + 1;
        } else {
            labelAula = 'AULA ' + currentAulaCounter;
            currentAulaCounter += 1;
        }

        // Formata data da aula para (DD/MM) em vez de (DD/MM/YYYY)
        let shortDate = '';
        if (aula.data) {
            const cleanData = String(aula.data).trim();
            const dateMatch = cleanData.match(/^(\d{1,2}\/\d{1,2})(?:\/\d{2,4})?$/);
            if (dateMatch) {
                shortDate = dateMatch[1];
            } else if (cleanData.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const parts = cleanData.split('-');
                shortDate = `${parts[2]}/${parts[1]}`;
            } else {
                shortDate = cleanData;
            }
        }
        const dataStrPart = shortDate ? '(' + shortDate + ')' : '';

        // Elimina redundância do '(1 aula)' no final do título
        const headerCard = '<div class="aula-header-card">' + labelAula + ' ' + dataStrPart + ' – ' + escapeHTML(aula.titulo || 'Aula') + '</div>';


        const formatAtividadesText = (txt) => {
            if (!txt) return '';
            let html = formatMarkdown(txt);
            // Destaca e adiciona espaçamento após o título do texto base/inédito
            html = html.replace(/(<strong>Texto Base In[eé]dito[^<]*<\/strong>|Texto Base In[eé]dito:[^<]*?)(<br\s*\/?>)+/gi, '<div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 10.5px;">$1</div>');
            return html;
        };

        const conceitoSection = aula.conceito ? '<div class="section-container"><span class="section-label label-conceito">💡 Conceito (10 min):</span><div class="section-text">' + formatMarkdown(aula.conceito) + '</div></div>' : '';
        const atividadesSection = aula.atividades ? '<div class="section-container"><span class="section-label label-pratica">📝 Atividades Práticas (20 min):</span><div class="section-text">' + formatAtividadesText(aula.atividades) + '</div></div>' : '';
        const socializacaoSection = aula.socializacao ? '<div class="section-container"><span class="section-label label-correcao">🔍 Socialização / Correção (20 min):</span><div class="section-text">' + formatMarkdown(aula.socializacao) + '</div></div>' : '';
        const gabaritoSection = aula.gabarito ? '<div class="section-container section-gabarito"><span class="section-label label-gabarito">📌 Gabarito:</span><div class="section-text section-text-gabarito">' + formatMarkdown(aula.gabarito) + '</div></div>' : '';

        return '<div class="aula-block">' + headerCard + conceitoSection + atividadesSection + socializacaoSection + gabaritoSection + '</div>';
    }).join('');

    const objGeralHTML = objetivoGeral ? '<div class="general-section"><div class="general-section-title">Objetivo Geral:</div><p class="general-section-content">' + formatMarkdown(objetivoGeral) + '</p></div>' : '';
    const objEspecHTML = objetivosEspecificos.length > 0 ? '<div class="general-section"><div class="general-section-title">Objetivos Específicos:</div><ul>' + renderList(objetivosEspecificos) + '</ul></div>' : '';
    const conteudosHTML = conteudos.length > 0 ? '<div class="general-section"><div class="general-section-title">Conteúdos:</div><ul>' + renderList(conteudos) + '</ul></div>' : '';
    const bnccHTML = habilidadesBNCC.length > 0 ? '<div class="general-section"><div class="general-section-title">Habilidades BNCC:</div><ul>' + renderList(habilidadesBNCC) + '</ul></div>' : '';

    const headerTitle = escapeHTML(disciplina) + ' - ' + escapeHTML(tema) + ' - Plano de Aula';
    const schoolNameEsc = escapeHTML(schoolName);
    const unidadeEsc = escapeHTML(unidade);
    const periodoEsc = escapeHTML(periodo);
    const professorEsc = escapeHTML(professor);
    const disciplinaEsc = escapeHTML(disciplina);
    const turmaEsc = escapeHTML(turma);
    const duracaoEsc = escapeHTML(duracao);
    const datasEsc = escapeHTML(datas);
    const temaEsc = escapeHTML(tema);

    return '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>' + headerTitle + '</title>' +
            '<style>' +
                '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap");' +
                '@page { size: A4 portrait; margin: 10mm 15mm 12mm 15mm; }' +
                'body, p, li, .section-text, .general-section-content { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px !important; line-height: 1.5 !important; font-weight: 500 !important; color: #1e293b !important; }' +
                'h1, h2, h3 { break-after: avoid; page-break-after: avoid; }' +
                'h1 { font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; margin: 10px 0 6px 0; }' +
                'h2 { font-size: 12px !important; font-weight: 800 !important; color: #0f172a !important; margin: 8px 0 4px 0; }' +
                'h3 { font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; color: #4f46e5 !important; margin: 6px 0 2px 0; }' +
                '.plan-header-box, .aula-header-card, .signature-row, .section-label { break-inside: avoid; page-break-inside: avoid; }' +
                '.header-meta { border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }' +
                '.header-meta-left h1 { font-size: 16px !important; font-weight: 800 !important; color: #4f46e5 !important; margin: 0; }' +
                '.header-meta-right { font-size: 9px !important; color: #94a3b8 !important; font-weight: 600 !important; }' +
                '.plan-header-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; }' +
                '.plan-header-top { display: flex; justify-content: space-between; font-weight: 800; font-size: 11px !important; color: #1e1b4b !important; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }' +
                '.plan-title-main { font-size: 13px !important; font-weight: 800 !important; color: #312e81 !important; margin: 2px 0 4px 0; }' +
                '.plan-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 10px !important; color: #475569 !important; }' +
                '.plan-details-grid strong { color: #0f172a !important; }' +
                '.general-section { margin-top: 10px; margin-bottom: 6px; }' +
                '.general-section-title { font-size: 11px !important; font-weight: 800 !important; color: #1e1b4b !important; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase !important; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; break-after: avoid; }' +
                '.general-section-content { font-size: 10.5px !important; color: #334155 !important; margin: 0; text-align: justify; }' +
                '.aula-block { margin-top: 12px; margin-bottom: 10px; border: none; padding: 0; }' +
                '.aula-header-card { background: linear-gradient(135deg, #1e1b4b, #312e81); color: #ffffff !important; padding: 6px 12px; border-radius: 6px; font-weight: 800 !important; font-size: 11px !important; margin-top: 12px; margin-bottom: 8px; break-after: avoid; page-break-after: avoid; }' +
                '.section-container { margin-top: 8px; margin-bottom: 6px; }' +
                '.section-label { display: block; font-weight: 800 !important; font-size: 10px !important; margin-top: 6px; margin-bottom: 2px; text-transform: uppercase !important; letter-spacing: 0.3px !important; break-after: avoid; page-break-after: avoid; }' +
                '.label-conceito { color: #4338ca !important; } .label-pratica { color: #047857 !important; } .label-correcao { color: #b45309 !important; } .label-gabarito { color: #0369a1 !important; }' +
                '.section-text { font-size: 10.5px !important; color: #334155 !important; margin: 0; line-height: 1.45 !important; text-align: justify; }' +
                '.section-gabarito { margin-top: 6px; margin-bottom: 4px; background: #f8fafc; border-left: 3px solid #0284c7; padding: 5px 8px; border-radius: 0 4px 4px 0; break-inside: avoid; page-break-inside: avoid; }' +
                '.section-gabarito .section-label { margin-top: 0 !important; margin-bottom: 2px !important; }' +
                '.section-text-gabarito { font-size: 10px !important; color: #334155 !important; line-height: 1.4 !important; }' +
                '.signature-row { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }' +
                '.signature-col { flex: 1; text-align: center; font-size: 9px !important; color: #64748b !important; font-weight: 600 !important; border-top: 1.5px solid #cbd5e1; padding-top: 4px; }' +
                '.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 8.5px !important; color: #94a3b8 !important; font-weight: 500 !important; background-color: #ffffff; height: 12px; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<table style="width: 100%; border-collapse: collapse; border: none;">' +
                '<tbody>' +
                    '<tr>' +
                        '<td style="padding: 0; border: none;">' +
                            '<div class="header-meta">' +
                                '<div class="header-meta-left"><h1>' + schoolNameEsc + '</h1></div>' +
                                '<div class="header-meta-right">Gerado em ' + dateStr + ' às ' + timeStr + ' • Arquiteto Pedagógico</div>' +
                            '</div>' +
                            '<div class="plan-header-box">' +
                                '<div class="plan-header-top">' +
                                    '<span>' + unidadeEsc + '</span>' +
                                    '<span>PERÍODO: ' + periodoEsc + '</span>' +
                                    '<span>PROF: ' + professorEsc + '</span>' +
                                '</div>' +
                                '<div class="plan-title-main">PLANO DE ENSINO SEMANAL – ' + disciplinaEsc + '</div>' +
                                '<div class="plan-details-grid">' +
                                    '<div><strong>Turma:</strong> ' + turmaEsc + '</div>' +
                                    '<div><strong>Duração:</strong> ' + duracaoEsc + '</div>' +
                                    '<div style="grid-column: span 2;"><strong>Datas:</strong> ' + datasEsc + '</div>' +
                                    '<div style="grid-column: span 2;"><strong>Tema:</strong> ' + temaEsc + '</div>' +
                                '</div>' +
                            '</div>' +
                            objGeralHTML +
                            objEspecHTML +
                            conteudosHTML +
                            bnccHTML +
                            aulasHTML +
                            '<div class="signature-row">' +
                                '<div class="signature-col">Assinatura do(a) Professor(a)<br/>' + professorEsc + '</div>' +
                                '<div class="signature-col">Visto da Coordenação Pedagógica<br/>Data: ____/____/________</div>' +
                            '</div>' +
                        '</td>' +
                    '</tr>' +
                '</tbody>' +
                '<tfoot>' +
                    '<tr>' +
                        '<td style="height: 25px; border: none;"></td>' +
                    '</tr>' +
                '</tfoot>' +
            '</table>' +
            '<div class="footer"><span>' + schoolNameEsc + '</span><span>Plano de Aula Pedagógico • Arquiteto Pedagógico</span></div>' +
        '</body>' +
        '</html>';
}

function generateStudentActivitiesHTML(planData, title, settings, unitLabel, professorName) {
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

    const unidade = data.unidade || data.unitLabel || unitLabel || 'UNIDADE VIGENTE';
    const professor = data.professor || data.professorName || professorName || 'Professor(a)';
    const disciplina = data.disciplina || 'COMPONENTE CURRICULAR';
    let turma = data.turma;
    if (!turma || turma.trim() === '' || turma.trim().toLowerCase() === 'turma') {
        turma = data.turmaName || data.publico || data.turma_nome || 'Turma Geral';
    }
    const tema = data.tema || title || 'Caderno de Atividades';
    const aulas = Array.isArray(data.aulas) ? data.aulas : [];


    // Helper para gerar linhas pautadas de resposta manuscrita
    const renderPautas = (qtd = 4) => {
        let pautasHtml = '<div class="pauta-container">';
        for (let p = 0; p < qtd; p++) {
            pautasHtml += '<div class="pauta-linha"></div>';
        }
        pautasHtml += '</div>';
        return pautasHtml;
    };

    // Formata o bloco de atividades da aula exclusivamente para a visão do aluno
    const formatStudentActivitiesContent = (rawText) => {
        if (!rawText) return '<p style="color: #64748b; font-style: italic;">Nenhuma atividade cadastrada para esta aula.</p>';

        // Normalizar quebras de linha
        let text = String(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        // Se contiver questões numeradas (ex: 1. [Questão] ... 2. [Questão] ...), separa em blocos pautados
        const regexQuestoes = /(?:^|\n)\s*(\d+)[\.\)]\s+([\s\S]*?)(?=(?:\n\s*\d+[\.\)]\s+)|$)/g;
        const matches = [...text.matchAll(regexQuestoes)];

        if (matches.length > 0) {
            // Há questões numeradas identificadas. Vamos isolar a parte que antecede a primeira questão (normalmente Texto Base / Introdução)
            const firstQuestaoIndex = text.indexOf(matches[0][0]);
            const preTexto = text.substring(0, firstQuestaoIndex).trim();

            let resultHTML = '';
            if (preTexto) {
                let formattedPre = formatMarkdown(preTexto);
                // Destaca o título do Texto Base
                formattedPre = formattedPre.replace(/(<strong>Texto Base In[eé]dito[^<]*<\/strong>|Texto Base In[eé]dito:[^<]*?)(<br\s*\/?>)+/gi, '<div class="texto-base-badge">$1</div>');
                resultHTML += '<div class="texto-base-card">' + formattedPre + '</div>';
            }

            resultHTML += '<div class="questoes-wrapper">';
            matches.forEach((m) => {
                const numQuestao = m[1];
                const corpoQuestao = m[2].trim();
                const questaoFormatada = formatMarkdown(corpoQuestao);

                resultHTML += '<div class="questao-item">' +
                    '<div class="questao-enunciado">' +
                        '<span class="questao-num">Questão ' + numQuestao + '</span>' +
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

        // Caso o texto não siga a numeração padrão, renderiza com formatação limpa e pautas gerais ao fim
        return '<div class="texto-base-card">' + formatMarkdown(text) + '</div>' +
            '<div class="questao-resposta-box" style="margin-top: 14px;">' +
                '<span class="resposta-label">Espaço para Resolução / Anotações:</span>' +
                renderPautas(6) +
            '</div>';
    };

    let atividadeIndex = 1;
    const aulasComAtividades = aulas.filter(a => a && a.atividades && a.atividades.trim().length > 0);
    const listaAulas = aulasComAtividades.length > 0 ? aulasComAtividades : aulas;

    const sanitizeStudentActivityTitle = (rawTitle, fallbackIndex) => {
        if (!rawTitle) return 'Atividade Prática ' + fallbackIndex;
        let clean = String(rawTitle).trim();
        // Remove prefixos como "AULA 1", "AULA 2 (21/09/2026)", "AULAS 1 a 2", etc.
        clean = clean.replace(/^(?:aulas?\s+\d+(?:\s*(?:a|e)\s*\d+)?|\d+ª?\s*aula)\s*(?:\([^)]*\))?\s*[-–—:]\s*/i, '');
        // Remove sufixos como "(1 aula)", "(2 aulas)"
        clean = clean.replace(/\s*\(\s*\d+\s*aulas?\s*\)\s*$/i, '');
        // Se ainda contiver data entre parênteses no início, remove
        clean = clean.replace(/^\s*\(\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*\)\s*[-–—:]?\s*/i, '');
        return clean.trim() || ('Atividade Prática ' + fallbackIndex);
    };

    const atividadesHTML = listaAulas.map((aula) => {
        const tituloLimpo = sanitizeStudentActivityTitle(aula.titulo, atividadeIndex);
        const cardHeader = '<div class="atividade-header-card">' +
            '<div class="atividade-header-left">' +
                '<span class="atividade-tag">Atividade ' + atividadeIndex + '</span>' +
                '<span class="atividade-titulo">' + escapeHTML(tituloLimpo) + '</span>' +
            '</div>' +
        '</div>';

        atividadeIndex++;
        const contentHTML = formatStudentActivitiesContent(aula.atividades);

        return '<div class="atividade-bloco">' + cardHeader + contentHTML + '</div>';
    }).join('');

    const schoolNameEsc = escapeHTML(schoolName);
    const unidadeEsc = escapeHTML(unidade);
    const professorEsc = escapeHTML(professor);
    const disciplinaEsc = escapeHTML(disciplina);
    const turmaEsc = escapeHTML(turma);
    const temaEsc = escapeHTML(tema);
    const docTitle = escapeHTML(disciplina) + ' - Atividades - ' + escapeHTML(tema);

    return '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>' + docTitle + '</title>' +
            '<style>' +
                '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");' +
                '@page { size: A4 portrait; margin: 8mm 12mm 10mm 12mm; }' +
                'body, p, li, div { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.55; color: #1e293b; }' +
                'body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; }' +
                '.header-meta { border-bottom: 2px solid #334155; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }' +
                '.header-meta-left h1 { font-size: 18px !important; font-weight: 900 !important; color: #94a3b8 !important; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }' +
                '.header-meta-left .doc-sub { font-size: 12.5px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.3px; }' +
                '.header-meta-right { font-size: 10.5px; color: #64748b; font-weight: 600; text-align: right; }' +
                '.aluno-id-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; background: #ffffff; page-break-inside: avoid; }' +
                '.aluno-id-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 12px; }' +
                '.aluno-id-row:last-child { margin-bottom: 0; }' +
                '.aluno-campo { font-size: 12px; font-weight: 600; color: #334155; }' +
                '.aluno-campo strong { color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.3px; }' +
                '.campo-linha { border-bottom: 1px solid #94a3b8; display: inline-block; flex: 1; height: 16px; margin-left: 6px; }' +
                '.nota-box { border: 1.5px dashed #64748b; border-radius: 6px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #334155; text-align: center; min-width: 95px; }' +
                '.tema-banner { background: #ffffff; border-left: 4px solid #4338ca; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 7px 14px; margin-bottom: 14px; border-radius: 0 8px 8px 0; font-size: 12.5px; color: #1e293b; page-break-inside: avoid; }' +
                '.tema-banner strong { color: #312e81; text-transform: uppercase; font-size: 11px; margin-right: 6px; }' +
                '.atividade-bloco { margin-bottom: 18px; page-break-inside: auto; }' +
                '.atividade-header-card { background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #4338ca; padding: 7px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; page-break-after: avoid; break-after: avoid; }' +
                '.atividade-header-left { display: flex; align-items: center; gap: 8px; }' +
                '.atividade-tag { background: #4338ca; color: #ffffff !important; font-size: 10.5px; font-weight: 800; text-transform: uppercase; padding: 2.5px 9px; border-radius: 4px; shrink-0; }' +
                '.atividade-titulo { font-size: 13px; font-weight: 800; color: #0f172a !important; }' +
                '.texto-base-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; text-align: justify; line-height: 1.6; font-size: 13px; color: #0f172a; page-break-inside: auto; }' +
                '.texto-base-badge { font-weight: 800; font-size: 12.5px; color: #312e81; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }' +
                '.questoes-wrapper { margin-top: 10px; }' +
                '.questao-item { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #ffffff; }' +
                '.questao-enunciado { margin-bottom: 8px; }' +
                '.questao-num { background: #e0e7ff; color: #3730a3; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 4px; }' +
                '.questao-texto { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.55; }' +
                '.questao-resposta-box { margin-top: 8px; }' +
                '.resposta-label { font-size: 10.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; display: block; margin-bottom: 3px; }' +
                '.pauta-container { margin-top: 3px; }' +
                '.pauta-linha { border-bottom: 1px dashed #94a3b8; height: 26px; width: 100%; }' +
                '.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 9.5px; color: #94a3b8; font-weight: 600; background-color: #ffffff; height: 14px; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<table style="width: 100%; border-collapse: collapse; border: none;">' +
                '<tbody>' +
                    '<tr>' +
                        '<td style="padding: 0; border: none;">' +
                            '<div class="header-meta">' +
                                '<div class="header-meta-left">' +
                                    '<h1>' + schoolNameEsc + '</h1>' +
                                    '<div class="doc-sub">Caderno de Atividades Práticas • ' + disciplinaEsc + '</div>' +
                                '</div>' +
                                '<div class="header-meta-right">' +
                                    '<div>Emissão: ' + dateStr + ' às ' + timeStr + '</div>' +
                                    '<div>' + unidadeEsc + '</div>' +
                                '</div>' +
                            '</div>' +

                            '<div class="aluno-id-box">' +
                                '<div class="aluno-id-row">' +
                                    '<div class="aluno-campo" style="flex: 3; display: flex; align-items: center;">' +
                                        '<strong>Estudante:</strong> <span class="campo-linha"></span>' +
                                    '</div>' +
                                    '<div class="aluno-campo" style="width: 120px; display: flex; align-items: center;">' +
                                        '<strong>Nº:</strong> <span class="campo-linha"></span>' +
                                    '</div>' +
                                    '<div class="aluno-campo" style="width: 140px; display: flex; align-items: center;">' +
                                        '<strong>Data:</strong> <span class="campo-linha"></span>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="aluno-id-row">' +
                                    '<div class="aluno-campo" style="flex: 1.5;">' +
                                        '<strong>Turma:</strong> ' + turmaEsc +
                                    '</div>' +
                                    '<div class="aluno-campo" style="flex: 2;">' +
                                        '<strong>Componente:</strong> ' + disciplinaEsc +
                                    '</div>' +
                                    '<div class="aluno-campo" style="flex: 2;">' +
                                        '<strong>Professor(a):</strong> ' + professorEsc +
                                    '</div>' +
                                    '<div class="nota-box">' +
                                        'Visto / Nota' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +

                            '<div class="tema-banner">' +
                                '<strong>Assunto Central:</strong> ' + temaEsc +
                            '</div>' +

                            atividadesHTML +
                        '</td>' +
                    '</tr>' +
                '</tbody>' +
                '<tfoot>' +
                    '<tr>' +
                        '<td style="height: 20px; border: none;"></td>' +
                    '</tr>' +
                '</tfoot>' +
            '</table>' +
            '<div class="footer">' +
                '<span>' + schoolNameEsc + ' • Material Discente</span>' +
                '<span>Caderno de Atividades • ' + disciplinaEsc + '</span>' +
            '</div>' +
        '</body>' +
        '</html>';
}

function generateUnitAgendaHTML(turmaName, unitName, agendaItems, settings) {
    const schoolName = settings?.school_name || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Função robusta de extração de número de semana para comparação numérica
    const getSemanaNum = (item) => {
        if (!item || !item.semana || item.semana === "FECHAMENTO") return 9999;
        
        // Tenta achar o número associado diretamente à palavra "semana" (ex: "8º Ano - 1ª Semana")
        const m = item.semana.match(/(\d+)\s*[ªº°a-z]?\s*semana|semana\s*(\d+)/i);
        const numStr = m ? (m[1] || m[2]) : null;
        if (numStr) return parseInt(numStr);
        
        // Fallback: pega o primeiro número da string
        const fallback = item.semana.match(/(\d+)/);
        return fallback ? parseInt(fallback[1]) : 9999;
    };

    // Calcula o agrupamento (rowSpan) das semanas comparando os números normalizados
    const semanaRowSpans = {};
    for (let i = 0; i < agendaItems.length; i++) {
        if (semanaRowSpans[i] === undefined) {
            let tempSpan = 1;
            const numI = getSemanaNum(agendaItems[i]);
            for (let j = i + 1; j < agendaItems.length; j++) {
                const numJ = getSemanaNum(agendaItems[j]);
                if (numI === numJ) {
                    tempSpan++;
                } else {
                    break;
                }
            }
            semanaRowSpans[i] = tempSpan;
            for (let j = i + 1; j < i + tempSpan; j++) {
                semanaRowSpans[j] = 0;
            }
        }
    }

    let rowsHTML = "";
    agendaItems.forEach((item, idx) => {
        const isSpecial = item.is_special_row;
        const rowSpan = semanaRowSpans[idx];
        
        // Determina se é a última linha da semana para traçar a divisória preta (borda inferior)
        const isLastRow = idx === agendaItems.length - 1;
        
        const currentSemanaNum = getSemanaNum(item);
        const nextSemanaNum = agendaItems[idx + 1] ? getSemanaNum(agendaItems[idx + 1]) : 9999;
        const isLastInWeek = isLastRow || (currentSemanaNum !== nextSemanaNum);
        
        const borderStyle = isLastRow 
            ? 'border-bottom: none;' 
            : (isLastInWeek ? 'border-bottom: 1px solid #000000;' : 'border-bottom: 1px solid #e2e8f0;');
        
        let semanaTD = "";
        if (rowSpan > 0) {
            const isLastBlock = (idx + rowSpan === agendaItems.length);
            const semanaBorderBottom = isLastBlock ? 'border-bottom: none;' : 'border-bottom: 1px solid #000000;';
            const semColor = isSpecial ? '#c2410c' : '#1e293b';
            const semFontSize = isSpecial ? '9.5px' : '11px';
            const semBg = isSpecial ? '#fff7ed' : '#ffffff';
            semanaTD = '<td rowspan="' + rowSpan + '" style="text-align: center; font-weight: 800; color: ' + semColor + '; font-size: ' + semFontSize + '; background-color: ' + semBg + '; background-clip: padding-box; vertical-align: middle; ' + semanaBorderBottom + '">' + (item.semana || '') + '</td>';
        }

        const cellBg = isSpecial 
            ? 'background: linear-gradient(to right, #f5f3ff, #ffffff);' 
            : (idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;');
        const clipStyle = 'background-clip: padding-box;';
        const cellCommonStyle = 'line-height: 1.2;';
        const isSpecFontWeight = isSpecial ? '700' : '500';
        const isSpecColor = isSpecial ? '#5b21b6' : '#1e293b';

        rowsHTML += '<tr style="page-break-inside: avoid;">' +
            semanaTD +
            '<td style="color: #475569; font-weight: 500; vertical-align: middle; ' + cellCommonStyle + ' ' + cellBg + ' ' + clipStyle + ' ' + borderStyle + '">' + (item.referencia || '') + '</td>' +
            '<td style="font-weight: ' + isSpecFontWeight + '; color: ' + isSpecColor + '; vertical-align: middle; ' + cellCommonStyle + ' ' + cellBg + ' ' + clipStyle + ' ' + borderStyle + '">' + (item.atividade || '') + '</td>' +
            '<td style="color: #475569; vertical-align: middle; ' + cellCommonStyle + ' ' + cellBg + ' ' + clipStyle + ' ' + borderStyle + '">' + (item.criterio || '') + '</td>' +
            '<td style="text-align: center; vertical-align: middle; width: 40px; ' + cellBg + ' ' + clipStyle + ' ' + borderStyle + '"><div style="border: 1px solid #475569; width: 12px; height: 12px; border-radius: 3px; margin: 1px auto; background-color: #ffffff;"></div></td>' +
        '</tr>';
    });

    const titleEsc = 'Planejamento de Atividades - ' + (turmaName || '') + ' - ' + (unitName || '');
    const schoolEsc = schoolName;

    return '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>' + titleEsc + '</title>' +
            '<style>' +
                '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap");' +
                '@page { size: A4 portrait; margin: 8mm; }' +
                'body, table, th, td, div, p, h1, h2, span { font-family: "Outfit", sans-serif; }' +
                'body { margin: 0; padding: 0; color: #1e293b; background-color: #ffffff; -webkit-print-color-adjust: exact; }' +
                'h1, h2 { break-after: avoid; page-break-after: avoid; }' +
                'tr { break-inside: avoid; page-break-inside: avoid; }' +
                '.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }' +
                '.header-left h1 { font-size: 20px; font-weight: 800; color: #4f46e5; margin: 0 0 4px 0; letter-spacing: -0.5px; }' +
                '.header-left p { font-size: 11px; color: #64748b; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }' +
                '.header-right { text-align: right; }' +
                '.header-right p { font-size: 10px; color: #94a3b8; margin: 4px 0 0 0; font-weight: 500; }' +
                '.badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }' +
                '.badge-turma { background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }' +
                '.badge-unidade { background-color: #faf5ff; color: #6b21a8; border: 1px solid #f3e8ff; margin-left: 4px; }' +
                'table.agenda-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; table-layout: fixed; }' +
                'table.agenda-table th { background-color: #f1f5f9; color: #334155; font-weight: 800; text-transform: uppercase; font-size: 9.5px; padding: 4px 6px; border-bottom: 1.5px solid #cbd5e1; letter-spacing: 0.5px; height: 18px; }' +
                'table.agenda-table td { padding: 4px 6px; border-right: 1px solid #e2e8f0; }' +
                'table.agenda-table td:last-child { border-right: none; }' +
                '.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 9px; color: #94a3b8; font-weight: 500; background-color: #ffffff; height: 14px; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<table style="width: 100%; border-collapse: collapse; border: none;">' +
                '<tbody>' +
                    '<tr>' +
                        '<td style="padding: 0; border: none;">' +
                            '<div class="header">' +
                                '<div class="header-left"><h1>' + schoolEsc + '</h1><p>Cronograma Semanal de Atividades</p></div>' +
                                '<div class="header-right">' +
                                    '<span class="badge badge-turma">' + (turmaName || '') + '</span>' +
                                    '<span class="badge badge-unidade">' + (unitName || '') + '</span>' +
                                    '<p>Emissão: ' + dateStr + ' às ' + timeStr + '</p>' +
                                '</div>' +
                            '</div>' +
                            '<table class="agenda-table">' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th style="width: 15%; text-align: center;">SEMANA</th>' +
                                        '<th style="width: 25%; text-align: left;">REFERÊNCIA</th>' +
                                        '<th style="width: 35%; text-align: left;">ATIVIDADE / CONTEÚDO</th>' +
                                        '<th style="width: 20%; text-align: left;">CRITÉRIO</th>' +
                                        '<th style="width: 5%; text-align: center;">VISTO</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody>' + rowsHTML + '</tbody>' +
                            '</table>' +
                        '</td>' +
                    '</tr>' +
                '</tbody>' +
            '</table>' +
            '<div class="footer"><span>' + schoolEsc + '</span><span>Agenda da Unidade Pedagógica</span></div>' +
        '</body>' +
        '</html>';
}

function generateStudentPendenciesReportHTML({
    studentName = 'Estudante',
    turmaName = '',
    unidade = '1',
    schoolName = '',
    lessonsHistory = [],
    totalLessons = 0,
    completedLessons = 0,
    pendingLessons = 0,
    completionPct = 0
}) {
    const finalSchoolName = schoolName || "EduSys Pro - Gestão Pedagógica";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let rowsHTML = "";
    if (lessonsHistory.length === 0) {
        rowsHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">
                    Nenhuma lição registrada para este período.
                </td>
            </tr>
        `;
    } else {
        lessonsHistory.forEach((lesson, index) => {
            const isEven = index % 2 === 0;
            const bgClass = !lesson.isCompleted ? '#fff1f2' : (isEven ? '#ffffff' : '#f8fafc');
            const statusBadge = lesson.isCompleted
                ? '<span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; text-transform: uppercase;">Entregue</span>'
                : '<span style="background-color: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; text-transform: uppercase;">Pendente</span>';

            const parts = (lesson.date || '').split('-');
            const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : lesson.date;

            rowsHTML += `
                <tr style="background-color: ${bgClass}; page-break-inside: avoid;">
                    <td style="width: 15%; text-align: center; font-weight: 700; color: #475569; padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">
                        ${formattedDate}
                    </td>
                    <td style="width: 67%; text-align: left; color: #1e293b; padding: 7px 12px; font-size: 11px; line-height: 1.4; border-bottom: 1px solid #e2e8f0;">
                        ${lesson.topic || 'Sem assunto registrado'}
                    </td>
                    <td style="width: 18%; text-align: center; padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        });
    }

    const pctColor = completionPct >= 80 ? '#059669' : (completionPct >= 50 ? '#d97706' : '#e11d48');

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Lições - ${studentName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                body, table, th, td {
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                body {
                    margin: 0;
                    padding: 0;
                    color: #1e293b;
                    background-color: #ffffff;
                    -webkit-print-color-adjust: exact;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .header-left h1 {
                    font-size: 20px;
                    font-weight: 800;
                    color: #4f46e5;
                    margin: 0 0 3px 0;
                    letter-spacing: -0.5px;
                }
                .header-left p {
                    font-size: 11px;
                    color: #64748b;
                    margin: 0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header-right {
                    text-align: right;
                }
                .header-right p {
                    font-size: 10px;
                    color: #94a3b8;
                    margin: 4px 0 0 0;
                    font-weight: 500;
                }
                .badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .badge-turma {
                    background-color: #e0e7ff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                }
                .badge-unidade {
                    background-color: #faf5ff;
                    color: #6b21a8;
                    border: 1px solid #f3e8ff;
                    margin-left: 4px;
                }
                .student-banner {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .student-banner h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .student-banner span {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                }
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 18px;
                }
                .metric-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 10px 12px;
                    text-align: center;
                }
                .metric-title {
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                .metric-value {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }
                table.report-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                    margin-bottom: 25px;
                }
                table.report-table th {
                    background-color: #f1f5f9;
                    color: #334155;
                    font-weight: 800;
                    text-transform: uppercase;
                    font-size: 9.5px;
                    padding: 8px 10px;
                    border-top: 1px solid #cbd5e1;
                    border-bottom: 2px solid #cbd5e1;
                    letter-spacing: 0.5px;
                }
                .signatures {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                    page-break-inside: avoid;
                }
                .signature-box {
                    border-top: 1px solid #94a3b8;
                    width: 44%;
                    text-align: center;
                    padding-top: 6px;
                    font-size: 10.5px;
                    color: #475569;
                    font-weight: 600;
                }
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 6px;
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1>${finalSchoolName}</h1>
                    <p>Relatório Individual de Entregas e Pendências</p>
                </div>
                <div class="header-right">
                    <span class="badge badge-turma">${turmaName || 'Turma'}</span>
                    <span class="badge badge-unidade">${unidade}ª Unidade</span>
                    <p>Emissão: ${dateStr} às ${timeStr}</p>
                </div>
            </div>

            <div class="student-banner">
                <div>
                    <span>Estudante:</span>
                    <h2>${studentName}</h2>
                </div>
                <div>
                    <span style="font-weight: 800; color: ${pctColor}; font-size: 13px;">
                        Taxa de Aproveitamento: ${completionPct.toFixed(0)}%
                    </span>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-title">Total de Lições</div>
                    <div class="metric-value">${totalLessons}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Lições Entregues</div>
                    <div class="metric-value" style="color: #059669;">${completedLessons}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Pendências</div>
                    <div class="metric-value" style="color: #e11d48;">${pendingLessons}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Aproveitamento</div>
                    <div class="metric-value" style="color: ${pctColor};">${completionPct.toFixed(0)}%</div>
                </div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th style="width: 15%; text-align: center;">Data</th>
                        <th style="width: 67%; text-align: left;">Conteúdo / Lição Ministrada</th>
                        <th style="width: 18%; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>

            <div class="signatures">
                <div class="signature-box">
                    Assinatura do(a) Professor(a) / Coordenação
                </div>
                <div class="signature-box">
                    Assinatura do(a) Responsável pelo Aluno
                </div>
            </div>

            <div class="footer">
                <span>${finalSchoolName} • Controle Pedagógico</span>
                <span>Documento Oficial de Acompanhamento</span>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    generateHTML,
    formatMarkdown,
    generateStudentReportHTML,
    generateLessonPlanHTML,
    generateStudentActivitiesHTML,
    generateUnitAgendaHTML,
    generateStudentPendenciesReportHTML
};
