import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import ScannerOMR from '../components/omr/ScannerOMR';
import QRCode from 'qrcode';

const Corretor = () => {
  const { turmas, activeTurmaId, setActiveTurmaId, students, loadData, refreshData, showAlert } = useApp();
  
  // OMR Scan Parameters
  const [category, setCategory] = useState('provas');
  const [evalName, setEvalName] = useState('');
  const [maxScore, setMaxScore] = useState('10.0');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const prevTurmaIdRef = useRef(activeTurmaId);

  // Popover menus state
  const [isTurmaMenuOpen, setIsTurmaMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Answer Key (Gabarito Oficial) - 20 questions mapping to A, B, C, D, or E
  const [gabarito, setGabarito] = useState(
    Array.from({ length: 20 }, (_, i) => ({ number: i + 1, answer: '' }))
  );

  // Scanned results list for current session
  const [scannedItems, setScannedItems] = useState([]);
  const [selectedAuditItem, setSelectedAuditItem] = useState(null);

  // Manual Matching State (when QR is unreadable/missing)
  const [pendingScanResult, setPendingScanResult] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Printing state
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync Turma parameters e auto-reset da câmera apenas na troca real de turma
  useEffect(() => {
    if (prevTurmaIdRef.current !== activeTurmaId) {
      prevTurmaIdRef.current = activeTurmaId;
      setIsCameraActive(false); // Só desativa a câmera se o professor selecionou outra turma no dropdown
    }
    if (activeTurmaId) {
      const activeTurma = turmas.find(t => t.id === activeTurmaId);
      if (activeTurma) {
        const score = category === 'provas' 
          ? (activeTurma.max_prova_score ?? 10) 
          : (activeTurma.max_mini_teste_score ?? 10);
        setMaxScore(score.toString());
      }
    }
  }, [activeTurmaId, category, turmas]);

  // Set selected answer key
  const handleKeySelect = (qNum, option) => {
    setGabarito(prev =>
      prev.map(item => (item.number === qNum ? { ...item, answer: option } : item))
    );
  };

  // Pre-fill answer key for testing
  const handleQuickFill = (option) => {
    setGabarito(prev => prev.map(item => ({ ...item, answer: option })));
  };

  // Generate printable PDF page
  const generateEnrollmentHtml = () => {
    let html = '';
    for (let col = 0; col < 4; col++) {
      html += `
        <div class="enrollment-col">
          <div class="enrollment-header-box"></div>
          ${Array.from({ length: 10 }, (_, i) => `<div class="enrollment-bubble">${i}</div>`).join('')}
        </div>
      `;
    }
    return html;
  };

  const generateQuestionsColumnHtml = (start, end) => {
    let html = '';
    for (let q = start; q <= end; q++) {
      const qStr = q < 10 ? `0${q}` : `${q}`;
      html += `
        <div class="question-row">
            <div class="question-num">${qStr}</div>
            <div class="bubbles-row">
                <div class="bubble-item">A</div>
                <div class="bubble-item">B</div>
                <div class="bubble-item">C</div>
                <div class="bubble-item">D</div>
                <div class="bubble-item">E</div>
            </div>
        </div>
      `;
    }
    return html;
  };

  const handlePrintSheets = async (isPersonalized = false) => {
    if (isPersonalized && students.length === 0) {
      showAlert('Aviso', 'Nenhum aluno cadastrado na turma selecionada para gerar folhas personalizadas.', 'warning');
      return;
    }

    setIsPrinting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showAlert('Erro', 'Bloqueador de pop-ups detectado. Permita pop-ups para imprimir as folhas.', 'error');
        setIsPrinting(false);
        return;
      }

      // Generate sheets content
      let sheetsHtml = '';
      const list = isPersonalized ? students : [{ id: 0, name: '__________________________________' }];
      const dbName = evalName.trim() || `Scanner OMR - ${category === 'provas' ? 'Prova' : 'M.Teste'}`;
      const todayStr = new Date().toLocaleDateString('pt-BR');

      for (const student of list) {
        // Generate QR Code image base64
        const qrContent = `EDUSYSPRO:student_id:${student.id}`;
        const qrUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 200 });
        const formattedName = isPersonalized ? student.name : '__________________________________';

        sheetsHtml += `
          <div class="sheet">
            <!-- ⚓ ANCORAS FIDUCIAIS EM VETORES SVG (Não somem ao imprimir em PDF sem gráficos de plano de fundo) -->
            <svg class="anchor anchor-tl" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#000000" />
            </svg>
            <svg class="anchor anchor-tr" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#000000" />
            </svg>
            <svg class="anchor anchor-bl" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#000000" />
            </svg>
            <svg class="anchor anchor-br" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#000000" />
            </svg>

            <!-- CABEÇALHO (Garantido entre os 28mm livres de margem lateral) -->
            <div class="header">
                <div class="header-title-section">
                    <h1>EduSys Pro</h1>
                    <p>Folha de Respostas OMR • Correção Óptica Offline</p>
                    
                    <div class="header-info-inputs">
                        <div class="input-group">
                            <label>Nome do Aluno</label>
                            <div class="field" style="font-size: 11px; font-weight: bold; padding-top: 3px;">${formattedName}</div>
                        </div>
                        <div class="input-group">
                            <label>Data</label>
                            <div class="field" style="font-size: 11px; font-weight: bold; padding-top: 3px;">${todayStr}</div>
                        </div>
                        <div class="input-group" style="grid-column: span 2;">
                            <label>Prova / Missão</label>
                            <div class="field" style="font-size: 11px; font-weight: bold; padding-top: 3px;">${dbName}</div>
                        </div>
                    </div>
                </div>
                
                <!-- QR CODE (Recuado para não conflitar com a âncora do canto direito) -->
                <div class="qrcode-container">
                    <div class="qrcode-box" style="background-image: url('${qrUrl}');"></div>
                    <div class="qrcode-label">Scan ID Missão</div>
                </div>
            </div>

            <!-- CONTEÚDO CENTRAL -->
            <div class="content">
                <!-- MATRÍCULA -->
                <div class="enrollment-section">
                    <div class="enrollment-title">Matrícula</div>
                    <div class="enrollment-grid">
                        ${generateEnrollmentHtml()}
                    </div>
                </div>

                <!-- QUESTÕES 1-20 -->
                <div class="questions-section">
                    <div class="questions-title">Respostas (Múltipla Escolha)</div>
                    
                    <div class="questions-container">
                        <!-- Coluna 1 (Q01-Q10) -->
                        <div>
                            ${generateQuestionsColumnHtml(1, 10)}
                        </div>

                        <!-- Coluna 2 (Q11-Q20) -->
                        <div>
                            ${generateQuestionsColumnHtml(11, 20)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- RODAPÉ -->
            <div class="footer">
                <div class="instructions">
                    <h3>Instruções de Preenchimento</h3>
                    <p>Use apenas caneta azul ou preta para preencher as bolhas. Não faça marcas fora das áreas de respostas para evitar falhas na leitura.</p>
                </div>
                
                <div class="visual-examples">
                    <div class="example-item">
                        <div class="example-bubble correct">A</div>
                        <span>Correto</span>
                    </div>
                    <div class="example-item">
                        <div class="example-bubble incorrect-x">A</div>
                        <span>Incorreto</span>
                    </div>
                    <div class="example-item">
                        <div class="example-bubble incorrect-check">A</div>
                        <span>Incorreto</span>
                    </div>
                </div>
            </div>
          </div>
        `;
      }

      // Populate print window
      printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>EduSys Pro - Gabarito de Respostas Oficial</title>
    <style>
        /* RESET E CONFIGURAÇÕES GERAIS */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background-color: #f3f4f6;
            font-family: 'Inter', Arial, sans-serif;
            color: #000000;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* CONFIGURAÇÃO DA PÁGINA DE IMPRESSÃO (REMOÇÃO DE CABEÇALHOS DO NAVEGADOR) */
        @page {
            size: A4 portrait;
            margin: 0; /* Remove cabeçalhos, rodapés e margens padrão do navegador */
        }

        /* CONTAINER A4 RIGIDO (210mm x 297mm) */
        .sheet {
            width: 210mm;
            height: 297mm;
            background-color: #ffffff;
            position: relative;
            /* 
               Aumentamos as margens internas (padding) para 28mm em todos os lados.
               Como as âncoras têm 18mm e estão posicionadas a 8mm das bordas, elas terminam em 26mm (8mm + 18mm).
               Com padding de 28mm, garantimos uma "Quiet Zone" (zona de silêncio) de 2mm livre de qualquer texto ou linha,
               impedindo fisicamente qualquer sobreposição (overlapping) com o cabeçalho, QR Code ou rodapé.
            */
            padding: 28mm 28mm 26mm 28mm; 
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-after: always;
        }

        /* ⚓ ANCORAS FIDUCIAIS DE EXTREMIDADE (18mm x 18mm) */
        .anchor {
            position: absolute;
            width: 18mm;
            height: 18mm;
            z-index: 10;
        }
        .anchor-tl { top: 8mm; left: 8mm; }
        .anchor-tr { top: 8mm; right: 8mm; }
        .anchor-bl { bottom: 8mm; left: 8mm; }
        .anchor-br { bottom: 8mm; right: 8mm; }

        /* CABEÇALHO (Altura milimetricamente calibrada) */
        .header {
            height: 36mm;
            max-height: 36mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000000;
            padding-bottom: 4px;
            box-sizing: border-box;
        }

        .header-title-section h1 {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #000000;
            text-transform: uppercase;
        }

        .header-title-section p {
            font-size: 9.5px;
            color: #334155;
            margin-top: 1px;
            font-weight: 500;
        }

        .header-info-inputs {
            margin-top: 6px;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 8px;
            width: 95mm; /* Ajustado para não colidir com o QR Code na horizontal */
        }

        .input-group {
            display: flex;
            flex-direction: column;
        }

        .input-group label {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            color: #000000;
            margin-bottom: 1px;
        }

        .input-group .field {
            border-bottom: 1px dashed #000000;
            height: 18px;
        }

        /* CONTAINER DO QR CODE */
        .qrcode-container {
            width: 28mm;
            height: 28mm;
            border: 1.5px solid #000000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #ffffff;
            padding: 3px;
            box-sizing: border-box;
        }

        .qrcode-box {
            width: 22mm;
            height: 22mm;
            background-size: cover;
        }

        .qrcode-label {
            font-size: 6px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 1px;
            color: #000000;
        }

        /* ESTRUTURA DE COLUNAS (Rígida em milímetros) */
        .content {
            display: grid;
            grid-template-columns: 38mm 1fr;
            gap: 8mm;
            margin-top: 5mm;
            box-sizing: border-box;
        }

        /* SEÇÃO MATRÍCULA */
        .enrollment-section {
            border-right: 1px dashed #000000;
            padding-right: 4mm;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .enrollment-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            height: 7mm;
            line-height: 7mm;
            margin-bottom: 3mm;
            text-align: center;
            border: 1.5px solid #000000;
            width: 100%;
            background-color: #f8fafc;
            box-sizing: border-box;
        }

        .enrollment-grid {
            display: flex;
            gap: 3px;
        }

        .enrollment-col {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .enrollment-header-box {
            width: 6.5mm;
            height: 6.5mm;
            border: 1.5px solid #000000;
            margin-bottom: 4px;
            background-color: #ffffff;
        }

        .enrollment-bubble {
            width: 6mm;
            height: 6mm;
            border: 1px solid #000000;
            border-radius: 50%;
            margin-bottom: 2.5px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 8.5px;
            font-weight: 700;
            color: #000000;
        }

        /* SEÇÃO QUESTÕES */
        .questions-section {
            display: flex;
            flex-direction: column;
        }

        .questions-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            height: 7mm;
            line-height: 7mm;
            margin-bottom: 3mm;
            border: 1.5px solid #000000;
            background-color: #f8fafc;
            text-align: center;
            box-sizing: border-box;
        }

        .questions-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 8mm;
        }

        .question-row {
            height: 14mm;
            min-height: 14mm;
            max-height: 14mm;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .question-num {
            font-size: 11px;
            font-weight: 800;
            width: 18px;
            color: #000000;
        }

        .bubbles-row {
            display: flex;
            gap: 2mm;
            width: 38mm;
            justify-content: space-between;
        }

        .bubble-item {
            width: 6mm;
            height: 6mm;
            min-width: 6mm;
            min-height: 6mm;
            box-sizing: border-box;
            border: 1.2px solid #000000;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 8.5px;
            font-weight: 800;
            color: #000000;
        }

        /* INSTRUÇÕES E RODAPÉ */
        .footer {
            border-top: 2px solid #000000;
            padding-top: 8px;
            margin-bottom: 1mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .instructions {
            width: 65%;
        }

        .instructions h3 {
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .instructions p {
            font-size: 7.5px;
            color: #334155;
            line-height: 1.3;
        }

        .visual-examples {
            display: flex;
            gap: 8px;
        }

        .example-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 7px;
            font-weight: 700;
        }

        .example-bubble {
            width: 6mm;
            height: 6mm;
            border: 1.2px solid #000000;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 8px;
            font-weight: 800;
            margin-bottom: 2px;
        }

        .example-bubble.correct {
            background-color: #000000;
            color: #ffffff;
        }

        .example-bubble.incorrect-x::after {
            content: "X";
            color: #000000;
            font-size: 8.5px;
        }

        .example-bubble.incorrect-check::after {
            content: "✓";
            color: #000000;
            font-size: 8.5px;
        }

        /* LAYOUT ESPECÍFICO PARA IMPRESSÃO DE FATO */
        @media print {
            body {
                background-color: #ffffff;
                padding: 0;
            }
            .sheet {
                box-shadow: none;
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 28mm 28mm 26mm 28mm;
            }
        }
    </style>
</head>
<body>
    ${sheetsHtml}
    
    <script>
        function triggerPrint() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
        if (document.readyState === 'complete') {
            triggerPrint();
        } else {
            window.addEventListener('load', triggerPrint);
        }
        window.addEventListener('afterprint', function() {
            window.close();
        });
    </script>
</body>
</html>
      `);
      
      printWindow.document.close();

    } catch (e) {
      console.error(e);
      showAlert('Erro', 'Falha ao processar renderização do PDF.', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  // OMR Frame Success Callback com proteção de turma e idempotência
  const handleScanSuccess = async (res) => {
    // 1. Se o QR Code identificou um ID de estudante válido
    if (res.studentId && res.studentId > 0) {
      const inCurrentTurma = students.find(s => s.id === res.studentId);
      if (inCurrentTurma) {
        processAndSaveGrade(res.studentId, res.answers);
        return;
      }

      // 2. Validação de Turma Cruzada: verifica se o aluno pertence a outra turma
      try {
        if (window.electronAPI && window.electronAPI.getStudents) {
          // Sem filtro de turma: busca em todos os alunos do sistema para detectar turma cruzada
          const allStudents = await window.electronAPI.getStudents();
          const otherStudent = (allStudents || []).find(s => s.id === res.studentId);
          if (otherStudent) {
            const otherTurma = turmas.find(t => t.id === otherStudent.turma_id);
            const otherTurmaName = otherTurma ? otherTurma.name : `Turma #${otherStudent.turma_id}`;
            showAlert(
              'Turma Divergente',
              `Esta prova pertence a "${otherStudent.name}", da turma "${otherTurmaName}". Alterne para a turma correta no seletor para lançar a nota.`,
              'warning'
            );
            return;
          }
        }
      } catch (err) {
        console.warn('Falha ao checar turma cruzada:', err);
      }
    }

    // 3. QR Code ausente, ilegível ou folha em branco -> abre modal de seleção manual
    setPendingScanResult(res);
    setIsManualModalOpen(true);
  };

  // Manual Matching Selection
  const handleManualMatchSelect = (studentId) => {
    if (!pendingScanResult) return;
    setIsManualModalOpen(false);
    processAndSaveGrade(studentId, pendingScanResult.answers);
    setPendingScanResult(null);
  };

  // Grade calculation and DB insertion (Idempotente)
  const processAndSaveGrade = async (studentId, studentAnswers) => {
    // 1. Calculate count of correct answers
    let correctCount = 0;
    const details = [];

    gabarito.forEach(item => {
      const studentAns = studentAnswers[item.number] || 'BLANK';
      const isCorrect = item.answer && studentAns === item.answer;
      if (isCorrect) correctCount++;
      details.push({
        qNum: item.number,
        gabarito: item.answer || '-',
        student: studentAns,
        isCorrect
      });
    });

    // 2. Score mapping — divisor é o número real de questões com gabarito preenchido
    const totalAnswered = gabarito.filter(item => item.answer !== '').length || 20;
    const scoreLimit = parseFloat(maxScore) || 10;
    const finalScore = parseFloat(((correctCount / totalAnswered) * scoreLimit).toFixed(2));
    const targetStudent = students.find(s => s.id === studentId);
    const studentName = targetStudent ? targetStudent.name : `Aluno ID: ${studentId}`;

    // 3. Save to database via Electron IPC
    if (window.electronAPI) {
      try {
        const dbName = evalName.trim() || `Scanner OMR - ${category === 'provas' ? 'Prova' : 'M.Teste'}`;
        const saveRes = await window.electronAPI.addEvaluationItem(category, studentId, dbName, finalScore);
        const isUpdate = saveRes && saveRes.updated;
        
        const evalId = saveRes?.item?.id || null;
        
        // Success record for visual session tracker
        const newRecord = {
          id: Date.now() + Math.random(),
          evalId,
          category,
          dbName,
          studentId,
          studentName,
          correctCount,
          score: finalScore,
          answers: details
        };

        // Atualiza a lista da sessão sem criar linhas duplicadas para o mesmo aluno
        setScannedItems(prev => {
          const existingIdx = prev.findIndex(item => item.studentId === studentId);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = newRecord;
            return updated;
          }
          return [newRecord, ...prev];
        });

        if (isUpdate) {
          showAlert('Nota Atualizada!', `Aluno: ${studentName} teve sua nota atualizada para ${finalScore.toFixed(2)} (${correctCount}/${totalAnswered} acertos).`, 'info');
        } else {
          showAlert('Nota Salva!', `Aluno: ${studentName} recebeu nota ${finalScore.toFixed(2)} (${correctCount}/${totalAnswered} acertos).`, 'success');
        }
        
        // Atualiza somente as notas calculadas para a turma ativa sem recarregar todo o contexto
        if (window.electronAPI && window.electronAPI.getStudentComputedGrades) {
          // Refresh cirúrgico: evita reload global de todos os dados a cada scan
          refreshData();
        }
      } catch (err) {
        console.error('Failed to save OMR score:', err);
        showAlert('Erro', 'Não foi possível registrar a nota no banco de dados.', 'error');
      }
    }
  };

  // Exclusão / Estorno de correção realizada na sessão
  const handleDeleteSessionItem = async (item) => {
    try {
      if (item.evalId && window.electronAPI && window.electronAPI.removeEvaluationItem) {
        await window.electronAPI.removeEvaluationItem(item.category || category, item.evalId);
      }
      setScannedItems(prev => prev.filter(i => i.id !== item.id));
      if (selectedAuditItem?.id === item.id) {
        setSelectedAuditItem(null);
      }
      refreshData();
      showAlert('Registro Excluído', `A nota do aluno ${item.studentName} foi removida da unidade.`, 'info');
    } catch (err) {
      console.error('Falha ao excluir item da sessão:', err);
      showAlert('Erro', 'Não foi possível remover a nota.', 'error');
    }
  };

  // Confirm if all answers on key are configured
  const isGabaritoComplete = gabarito.every(item => item.answer !== '');

  return (
    <div className="flex-1 h-full overflow-y-auto no-scrollbar pb-6 pt-1 relative animate-in fade-in duration-500">
      <div className="w-full space-y-4 pb-4">
        
        {/* Banner Header Slim Executivo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden flex-shrink-0">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-base tracking-tight">Corretor de Gabaritos OMR</h2>
              <p className="text-slate-500 text-xs font-medium">Correção automática offline via webcam e lançamento de notas</p>
            </div>
          </div>

          {/* Printable templates buttons */}
          <div className="flex items-center gap-2 relative z-10 flex-wrap">
            <button
              onClick={() => handlePrintSheets(false)}
              disabled={isPrinting}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-[0.98] flex items-center gap-2 font-semibold text-xs cursor-pointer disabled:opacity-50"
              title="Imprimir folha de resposta padrão em branco"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              <span>Folha em Branco</span>
            </button>
            <button
              onClick={() => handlePrintSheets(true)}
              disabled={isPrinting}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-2xs active:scale-[0.98] flex items-center gap-2 font-semibold text-xs cursor-pointer disabled:opacity-50"
              title="Gerar folhas de resposta nominais com QR Code por turma"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              <span>Folhas em Lote (Turma)</span>
            </button>
          </div>
        </div>

        {/* Dashboard Grid split: Left (Gabarito Oficial) | Right (Webcam + History) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT: Answer Key Setup */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col h-[640px]">
            <div className="mb-3.5 flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-slate-800 font-bold text-base">Gabarito Oficial</h3>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Defina as respostas corretas</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleQuickFill('A')}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200/90 transition-colors shadow-2xs cursor-pointer"
                  title="Marcar alternativa A para todas as questões"
                >
                  Tudo A
                </button>
                <button
                  onClick={() => handleQuickFill('')}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-200/80 transition-colors shadow-2xs cursor-pointer"
                  title="Limpar todas as respostas do gabarito"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Answer Grid Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {gabarito.map(item => (
                <div key={item.number} className="flex items-center justify-between p-2 bg-slate-50/60 border border-slate-200/70 rounded-xl hover:bg-slate-100/60 hover:border-slate-300 transition-colors">
                  <span className="text-slate-700 font-black text-xs w-8 text-center">{item.number.toString().padStart(2, '0')}</span>
                  <div className="flex gap-1.5 flex-1 justify-end">
                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                      const isSelected = item.answer === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleKeySelect(item.number, opt)}
                          className={`w-7 h-7 rounded-lg font-black text-xs transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Scanner View & Capture Parameter Control */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* PARAMETERS SELECTION PANEL */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Seletor Customizado de Turma */}
              <div className="relative">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Turma</label>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsTurmaMenuOpen(prev => !prev);
                    setIsCategoryMenuOpen(false);
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 hover:border-indigo-400 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold flex items-center justify-between shadow-2xs transition-all cursor-pointer select-none"
                  title="Selecionar Turma"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    <span className="truncate text-slate-800">
                      {turmas.find(t => t.id === Number(activeTurmaId))?.name || 'Selecione a Turma'}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isTurmaMenuOpen ? 'rotate-180 text-indigo-600' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Overlay com transição de opacidade */}
                <div
                  className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                    isTurmaMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={() => setIsTurmaMenuOpen(false)}
                />

                {/* Menu Popover Flutuante com transição suave */}
                <div
                  className={`absolute left-0 top-[100%] mt-2 w-full min-w-[210px] bg-white border border-slate-200/90 rounded-2xl p-2 z-50 shadow-xl origin-top transition-all duration-200 ease-out ${
                    isTurmaMenuOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Turmas do Docente</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                      {turmas.length} turmas
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
                    {turmas.map(t => {
                      const isSelected = Number(activeTurmaId) === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTurmaId(t.id);
                            setIsTurmaMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600 shadow-2xs' : 'bg-slate-300'}`} />
                            <span className="truncate">{t.name}</span>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Seletor Customizado de Categoria */}
              <div className="relative">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Categoria</label>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryMenuOpen(prev => !prev);
                    setIsTurmaMenuOpen(false);
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 hover:border-indigo-400 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold flex items-center justify-between shadow-2xs transition-all cursor-pointer select-none"
                  title="Selecionar Categoria"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${category === 'provas' ? 'bg-blue-600' : 'bg-emerald-600'}`} />
                    <span className="truncate text-slate-800">
                      {category === 'provas' ? 'Prova / Avaliação' : 'Mini-Teste'}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isCategoryMenuOpen ? 'rotate-180 text-indigo-600' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Overlay com transição de opacidade */}
                <div
                  className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                    isCategoryMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={() => setIsCategoryMenuOpen(false)}
                />

                {/* Menu Popover Flutuante com transição suave */}
                <div
                  className={`absolute left-0 top-[100%] mt-2 w-full min-w-[200px] bg-white border border-slate-200/90 rounded-2xl p-2 z-50 shadow-xl origin-top transition-all duration-200 ease-out ${
                    isCategoryMenuOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Instrumento</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      2 tipos
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { id: 'provas', label: 'Prova / Avaliação', color: 'bg-blue-600' },
                      { id: 'mini_testes', label: 'Mini-Teste', color: 'bg-emerald-600' }
                    ].map(opt => {
                      const isSelected = category === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setCategory(opt.id);
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? opt.color : 'bg-slate-300'}`} />
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Identificador</label>
                <input
                  type="text"
                  placeholder="Ex: Simulado I"
                  value={evalName}
                  onChange={(e) => setEvalName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Nota Máxima</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition-all"
                />
              </div>
            </div>

            {/* SCANNER CAMERA COMPONENT */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex-shrink-0 flex flex-col gap-3.5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-slate-800 font-bold text-base">Câmera de Leitura</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Mantenha a folha estável no centro</p>
                </div>

                <button
                  onClick={() => {
                    if (!isGabaritoComplete) {
                      showAlert('Aviso', 'Preencha o Gabarito Oficial por completo antes de ligar a câmera.', 'warning');
                      return;
                    }
                    if (!activeTurmaId) {
                      showAlert('Aviso', 'Selecione uma turma para realizar a leitura.', 'warning');
                      return;
                    }
                    setIsCameraActive(!isCameraActive);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer ${
                    isCameraActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-white animate-ping' : 'bg-indigo-200'}`}></span>
                  {isCameraActive ? 'Desativar Câmera' : 'Ativar Câmera'}
                </button>
              </div>

              {/* Render the Scanner View */}
              <div className="w-full">
                <ScannerOMR
                  active={isCameraActive && !isManualModalOpen}
                  onScanSuccess={handleScanSuccess}
                  onScanError={(err) => showAlert('Erro na câmera', err, 'error')}
                />
              </div>
            </div>

            {/* SCANNING SESSION HISTORY */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col h-[280px]">
              <h3 className="text-slate-800 font-bold text-base mb-2.5 flex-shrink-0">Alunos Corrigidos nesta Sessão</h3>
              
              <div className="flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/80 sticky top-0">
                      <th className="p-3">Estudante</th>
                      <th className="p-3 text-center">Acertos</th>
                      <th className="p-3 text-right">Nota Final</th>
                      <th className="p-3 text-center w-16">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs">
                    {scannedItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedAuditItem(item)}
                        className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        title="Clique para ver o gabarito detalhado deste aluno"
                      >
                        <td className="p-3 font-semibold group-hover:text-indigo-600 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-800">{item.studentName}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">Ver</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-500">{item.correctCount}/20</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600">{item.score.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSessionItem(item);
                            }}
                            title="Remover nota deste aluno"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scannedItems.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 font-medium text-xs">
                          Nenhuma correção realizada nesta sessão.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FALLBACK MANUAL SELECT MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-slate-800 font-bold text-lg mb-1 text-center">QR Code Ilegível</h3>
            <p className="text-slate-500 text-xs text-center mb-5 leading-relaxed">
              O QR Code de identificação está danificado ou ilegível. Selecione manualmente o aluno correspondente a este gabarito para concluir o lançamento.
            </p>

            {/* List of active class students */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {students
                .filter(s => !scannedItems.some(item => item.studentId === s.id)) // Filter out already corrected in session
                .map(student => (
                  <button
                    key={student.id}
                    onClick={() => handleManualMatchSelect(student.id)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200/80 rounded-xl transition-all font-semibold text-xs text-slate-700 hover:text-indigo-700 cursor-pointer"
                  >
                    {student.name}
                  </button>
                ))}
              {students.length === 0 && (
                <div className="text-center p-6 text-slate-400 text-xs font-semibold">Nenhum aluno disponível.</div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  setIsManualModalOpen(false);
                  setPendingScanResult(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Ignorar Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT DETAILS MODAL */}
      {selectedAuditItem && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-slate-800 font-bold text-lg">{selectedAuditItem.studentName}</h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Conferência de Gabarito • {selectedAuditItem.correctCount}/20 acertos • Nota: {selectedAuditItem.score.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditItem(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Questions Answer Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-4 gap-2 custom-scrollbar my-2">
              {selectedAuditItem.answers.map(ans => {
                const isCorrect = ans.isCorrect;
                const isBlank = ans.student === 'BLANK';
                const isMultiple = ans.student === 'MULTIPLE';
                return (
                  <div
                    key={ans.qNum}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                        : isBlank
                        ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                        : isMultiple
                        ? 'bg-purple-50/80 border-purple-200 text-purple-800'
                        : 'bg-rose-50/80 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="text-slate-500">Q{ans.qNum.toString().padStart(2, '0')}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : isBlank
                          ? 'bg-amber-100 text-amber-700'
                          : isMultiple
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isCorrect ? 'CERTO' : isBlank ? 'BRANCO' : isMultiple ? 'DUPLA' : 'ERRO'}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-bold">
                      <span className="text-slate-500 text-[10px]">Gab: <strong className="text-slate-800">{ans.gabarito}</strong></span>
                      <span className="text-[10px]">Aluno: <strong className={isCorrect ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>{ans.student}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAuditItem(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Corretor;
