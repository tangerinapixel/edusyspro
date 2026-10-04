/**
 * Modelo de Impressão Oficial: Dossiê Comportamental para Conselho de Classe
 * Otimizado para papel A4, nitidez tipográfica e economia de toner.
 */

function generateStudentBehaviorReportHTML(data) {
    const {
        studentName = 'Estudante',
        turmaName = 'Turma',
        unidade = '1',
        schoolName = 'EduSys Pro - Gestão Pedagógica',
        behaviorStartScore = 3.0,
        totalPenalties = 0,
        behaviorScore = 3.0,
        occurrencesList = [],
        occurrenceBreakdown = {}
    } = data;

    const finalSchoolName = schoolName || 'EduSys Pro - Gestão Pedagógica';
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const totalOccurrences = occurrencesList.length;
    const scoreVal = Number(behaviorScore || 0);
    const startVal = Number(behaviorStartScore || 3.0);
    const penaltiesVal = Number(totalPenalties || 0);

    const isAlert = penaltiesVal <= -1.0 || scoreVal < 2.0;
    const scoreColor = isAlert ? '#b91c1c' : scoreVal < startVal ? '#b45309' : '#047857';

    // Linhas da tabela de ocorrências
    let rowsHTML = '';
    if (occurrencesList.length === 0) {
        rowsHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 24px; color: #047857; font-weight: 600; font-style: italic;">
                    Nenhuma ocorrência disciplinar registrada para este estudante nesta unidade letiva. Conduta exemplar.
                </td>
            </tr>
        `;
    } else {
        occurrencesList.forEach((occ, idx) => {
            const formattedDate = occ.date ? occ.date.split('-').reverse().join('/') : '-';
            const typeTitle = occ.typeTitle || occ.type || 'Ocorrência';
            const pointsVal = occ.points !== undefined ? Number(occ.points).toFixed(2) : '-0.00';
            const noteText = occ.note || occ.description || 'Registro em diário de classe';

            rowsHTML += `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="text-align: center; font-weight: 700; color: #334155;">${formattedDate}</td>
                    <td style="font-weight: 700; color: #1e293b;">${typeTitle}</td>
                    <td style="text-align: center; font-weight: 800; color: #b91c1c;">${pointsVal} pts</td>
                    <td style="color: #475569; font-size: 11px;">${noteText}</td>
                </tr>
            `;
        });
    }

    // Resumo de tipos
    const breakdownItems = Object.entries(occurrenceBreakdown);
    let breakdownHTML = '';
    if (breakdownItems.length > 0) {
        breakdownHTML = breakdownItems.map(([type, count]) => `
            <span style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #334155; margin-right: 6px; margin-bottom: 4px;">
                ${type}: ${count}x
            </span>
        `).join('');
    } else {
        breakdownHTML = '<span style="font-size: 11px; color: #047857; font-weight: 600;">Sem incidências registradas</span>';
    }

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Dossiê Comportamental - ${studentName} - ${turmaName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm 15mm 15mm;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    padding-bottom: 28px;
                    color: #0f172a;
                    background-color: #ffffff;
                    -webkit-print-color-adjust: exact;
                    font-size: 12px;
                    line-height: 1.4;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 10px;
                    margin-bottom: 12px;
                }
                .school-title {
                    font-size: 15px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: -0.01em;
                    color: #0f172a;
                    margin: 0 0 2px 0;
                }
                .doc-subtitle {
                    font-size: 10px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0;
                }
                .meta-badge {
                    text-align: right;
                    font-size: 10px;
                    font-weight: 600;
                    color: #64748b;
                }
                .doc-title-bar {
                    background-color: #f1f5f9;
                    border-left: 4px solid #4338ca;
                    padding: 8px 12px;
                    margin-bottom: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .doc-title-bar h1 {
                    margin: 0;
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #1e1b4b;
                }
                .student-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr;
                    gap: 8px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px 12px;
                    margin-bottom: 12px;
                }
                .field-label {
                    font-size: 9px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    margin-bottom: 2px;
                }
                .field-value {
                    font-size: 13px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .metrics-row {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin-bottom: 14px;
                }
                .metric-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px 10px;
                    background: #f8fafc;
                    text-align: center;
                }
                .metric-card.highlight {
                    border-color: #cbd5e1;
                    background: #ffffff;
                }
                .metric-number {
                    font-size: 16px;
                    font-weight: 900;
                    margin-top: 2px;
                }
                .section-title {
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #334155;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .section-title::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #e2e8f0;
                }
                table.report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 14px;
                    font-size: 10.5px;
                }
                table.report-table th {
                    background-color: #0f172a;
                    color: #ffffff;
                    text-align: left;
                    font-size: 9.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 6px 8px;
                    border: 1px solid #0f172a;
                }
                table.report-table td {
                    padding: 6px 8px;
                    border: 1px solid #e2e8f0;
                }
                .deliberation-box {
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 8px 12px;
                    margin-bottom: 24px;
                    background: #ffffff;
                    min-height: 70px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .deliberation-title {
                    font-size: 9.5px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #475569;
                    margin-bottom: 6px;
                }
                .deliberation-lines {
                    border-bottom: 1px dashed #cbd5e1;
                    height: 18px;
                    margin-bottom: 6px;
                }
                .signatures {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-top: 55px;
                    margin-bottom: 16px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .signature-box {
                    border-top: 1.5px solid #334155;
                    padding-top: 6px;
                    text-align: center;
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #334155;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
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
                    font-size: 8.5px;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    background-color: #ffffff;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h2 class="school-title">${finalSchoolName}</h2>
                    <p class="doc-subtitle">SISTEMA INTEGRADO DE GESTÃO PEDAGÓGICA E ACOMPANHAMENTO DISCENTE</p>
                </div>
                <div class="meta-badge">
                    <div>Emissão: <strong>${dateStr} às ${timeStr}</strong></div>
                    <div>Documento Oficial de Conselho de Classe</div>
                </div>
            </div>

            <div class="doc-title-bar">
                <h1>Ficha Comportamental Individual e Dossiê Disciplinar</h1>
                <span style="font-size: 10px; font-weight: 700; color: #4338ca;">Uso Oficial / Conselho Pedagógico</span>
            </div>

            <div class="student-grid">
                <div>
                    <div class="field-label">Estudante</div>
                    <div class="field-value">${studentName}</div>
                </div>
                <div>
                    <div class="field-label">Turma / Agrupamento</div>
                    <div class="field-value">${turmaName}</div>
                </div>
                <div>
                    <div class="field-label">Unidade / Ciclo</div>
                    <div class="field-value">${unidade}ª Unidade Letiva</div>
                </div>
            </div>

            <div class="metrics-row">
                <div class="metric-card">
                    <div class="field-label">Nota Base</div>
                    <div class="metric-number" style="color: #475569;">${startVal.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <div class="field-label">Deduções Totais</div>
                    <div class="metric-number" style="color: #b91c1c;">${penaltiesVal.toFixed(2)} pts</div>
                </div>
                <div class="metric-card highlight">
                    <div class="field-label">Nota Final de Conduta</div>
                    <div class="metric-number" style="color: ${scoreColor};">${scoreVal.toFixed(2)} / ${startVal.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <div class="field-label">Total de Ocorrências</div>
                    <div class="metric-number" style="color: #0f172a;">${totalOccurrences}</div>
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <div class="field-label">Distribuição por Categoria de Incidência:</div>
                <div style="margin-top: 4px;">${breakdownHTML}</div>
            </div>

            <div class="section-title">Registro Detalhado das Infrações Disciplinares</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th style="width: 14%; text-align: center;">Data</th>
                        <th style="width: 28%;">Tipo de Infração</th>
                        <th style="width: 16%; text-align: center;">Penalidade</th>
                        <th style="width: 42%;">Histórico / Observações</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>

            <div class="deliberation-box">
                <div class="deliberation-title">Parecer e Deliberação do Conselho de Classe:</div>
                <div class="deliberation-lines"></div>
                <div class="deliberation-lines"></div>
                <div class="deliberation-lines" style="margin-bottom: 0;"></div>
            </div>

            <div class="signatures">
                <div class="signature-box">
                    Professor(a) Regente
                </div>
                <div class="signature-box">
                    Coordenação / Direção Pedagógica
                </div>
                <div class="signature-box">
                    Responsável Legal pelo Estudante
                </div>
            </div>

            <div class="footer">
                <span>${finalSchoolName} • Conselho de Classe Oficial</span>
                <span>Ficha Individual de Conduta Discente</span>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    generateStudentBehaviorReportHTML
};
