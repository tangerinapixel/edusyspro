import React from "react";
import ReactMarkdown from 'react-markdown';
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";

const DiagnosticoDetalhe = () => {
  const {
    activeTab,
    setActiveTab,
    diagPrevTab,
    selectedDiagStudent,
    studentDiagnosis,
    isGeneratingDiagnosis,
    handleGenerateDiagnosis,
    handleExportDiagnosis,
    isExportingStudentPDF,
    handleExportStudentReportPDF,
    showAlert,
    settings,
    activityColumns,
    turmas,
    activeTurmaId,
    units,
    activeUnitId,
    authName
  } = useApp();

  const [isSavingArchive, setIsSavingArchive] = React.useState(false);

  const appliedCount = (activityColumns || []).filter(d => typeof d === 'string' && d.length >= 7).length;
  const engagementRate = appliedCount > 0
    ? Math.min(100, Math.round(((selectedDiagStudent?.licaoCheckCount || 0) / appliedCount) * 100))
    : 100;

  // Ação explícita de salvamento/atualização no acervo
  const handleSaveToArchive = async () => {
    if (!studentDiagnosis || isSavingArchive || !window.electronAPI?.diagnosisArchiveSave) return;
    setIsSavingArchive(true);
    try {
      const currentTurma = (turmas || []).find(t => t.id === (selectedDiagStudent.turma_id || activeTurmaId));
      const currentUnit = (units || []).find(u => u.id === (selectedDiagStudent.unit_id || activeUnitId));

      const res = await window.electronAPI.diagnosisArchiveSave({
        student_id: Number(selectedDiagStudent.student_id || selectedDiagStudent.id),
        student_name: selectedDiagStudent.name,
        turma_id: currentTurma?.id || activeTurmaId,
        turma_name: currentTurma?.name || 'Turma',
        unit_id: currentUnit?.id || activeUnitId,
        unit_name: currentUnit?.name || '1ª Unidade',
        author_name: authName || '',
        diagnosis_text: studentDiagnosis,
        metrics_snapshot: {
          media_final: selectedDiagStudent.mediaFinal,
          behavior_score: selectedDiagStudent.behaviorScore,
          behavior_start_score: settings?.behavior_start_score ?? 3.0,
          adhesion_rate: engagementRate,
          delivered_activities: selectedDiagStudent.licaoCheckCount || 0,
          applied_activities: appliedCount,
          occurrences_count: selectedDiagStudent.occurrencesCount ?? 0,
          rank_position: selectedDiagStudent.rank || '',
          trend: selectedDiagStudent.trend || 'Estável'
        }
      });
      if (res?.success) {
        showAlert("Acervo Atualizado!", `Parecer de ${selectedDiagStudent.name} salvo com sucesso no Acervo I.A.`, "success");
      } else {
        showAlert("Aviso", res?.error || "Não foi possível arquivar o parecer.", "warning");
      }
    } catch (e) {
      console.warn('[DiagnosticoDetalhe] Erro ao salvar manualmente:', e);
      showAlert("Erro", "Falha de conexão com o banco de dados do acervo.", "error");
    } finally {
      setIsSavingArchive(false);
    }
  };

  if (activeTab !== "diagnostico-detalhe" || !selectedDiagStudent) return null;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in flex flex-col flex-1 min-h-0 h-full">
      
      {/* BARRA DE FERRAMENTAS SUPERIOR (COMPACTA & INTEGRADA) */}
      <div className="px-5 py-2.5 border-b border-slate-100/80 bg-slate-50/50 shrink-0 z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setActiveTab(diagPrevTab || "relatorios")}
            className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Voltar"
          >
            {Icons.ChevronLeft}
          </button>
          <div className="min-w-0 flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 shrink-0">
              Diagnóstico Pedagógico <span className="text-indigo-600">I.A.</span>
            </h3>
            <span className="text-slate-300 font-normal shrink-0">•</span>
            <span className="text-xs font-semibold text-slate-600 truncate" title={selectedDiagStudent.name}>
              {selectedDiagStudent.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleGenerateDiagnosis(selectedDiagStudent)}
            disabled={isGeneratingDiagnosis}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isGeneratingDiagnosis
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {isGeneratingDiagnosis ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>{Icons.Refresh} <span>Reanalisar</span></>
            )}
          </button>

          <button
            onClick={handleSaveToArchive}
            disabled={!studentDiagnosis || isGeneratingDiagnosis || isSavingArchive}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Garantir persistência no Acervo I.A."
          >
            {isSavingArchive ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>{Icons.Save || Icons.Check} <span>Salvar no Acervo</span></>
            )}
          </button>

          <button
            onClick={() => handleExportDiagnosis()}
            disabled={!studentDiagnosis || isGeneratingDiagnosis}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Exportar para Google Docs"
          >
            {Icons.CloudSync} <span>Docs</span>
          </button>

          <button
            onClick={() => handleExportStudentReportPDF(selectedDiagStudent, studentDiagnosis)}
            disabled={!studentDiagnosis || isGeneratingDiagnosis || isExportingStudentPDF}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Baixar em formato PDF"
          >
            {isExportingStudentPDF ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>{Icons.Download} <span>PDF</span></>
            )}
          </button>

          <button
            onClick={() => setActiveTab("historico-diagnosticos")}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Acessar o Acervo com todos os diagnósticos arquivados"
          >
            <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Acervo</span>
          </button>
        </div>
      </div>

      {/* FAIXA TELEMÉTRICA COMPACTA (INLINE METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white shrink-0 text-xs">
        <div className="px-4 py-2 flex items-center justify-between sm:justify-center sm:flex-col text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média Final</span>
          <span className="text-sm font-black text-indigo-600 tabular-nums">
            {Number(selectedDiagStudent.mediaFinal || 0).toFixed(2)}
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between sm:justify-center sm:flex-col text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comportamento</span>
          <span className={`text-sm font-black tabular-nums ${selectedDiagStudent.pointsLost <= -1.0 ? 'text-rose-500' : 'text-emerald-600'}`}>
            {Number(selectedDiagStudent.behaviorScore || 0).toFixed(2)} / {settings?.behavior_start_score ?? 3}
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between sm:justify-center sm:flex-col text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adesão Lições</span>
          <span className="text-sm font-black text-blue-600 tabular-nums">
            {engagementRate}%
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between sm:justify-center sm:flex-col text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ocorrências</span>
          <span className="text-sm font-black text-slate-700 tabular-nums">
            {selectedDiagStudent.occurrencesCount ?? 0}
          </span>
        </div>
      </div>

      {/* ÁREA DE LEITURA FLUIDA DO PARECER (SEM CAIXA DUPLA) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar min-h-0 relative">
        {!studentDiagnosis && !isGeneratingDiagnosis && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-3">
              {Icons.Sparkles}
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">Pronto para Análise Pedagógica</h4>
            <p className="text-slate-500 text-xs max-w-sm font-medium">
              Clique em &quot;Reanalisar&quot; na barra superior para processar os dados pedagógicos e longitudinais deste estudante.
            </p>
            <button
              onClick={() => handleGenerateDiagnosis(selectedDiagStudent)}
              className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              Gerar Diagnóstico Agora
            </button>
          </div>
        )}

        {isGeneratingDiagnosis && (
          <div className="h-full flex flex-col items-center justify-center py-16">
            <div className="relative mb-4">
              <div className="w-14 h-14 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600 animate-pulse">
                {Icons.Sparkles}
              </div>
            </div>
            <p className="text-slate-800 font-bold text-sm">Processando Métricas Pedagógicas...</p>
            <p className="text-slate-400 text-xs mt-1">O Mentor Pedagógico está sintetizando a trajetória e desempenho do estudante.</p>
            <div className="mt-4 w-40 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {studentDiagnosis && (
          <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 no-print">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Parecer Oficial Emitido
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(studentDiagnosis);
                  showAlert("Copiado!", "Relatório copiado para a área de transferência.", "success");
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {Icons.Copy} <span>Copiar Texto</span>
              </button>
            </div>
            
            {/* Texto do parecer fluindo diretamente no layout (sem caixas aninhadas) */}
            <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed">
              <ReactMarkdown>{studentDiagnosis}</ReactMarkdown>
            </div>
            
            {/* Nota discreta de confidencialidade */}
            <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 no-print">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                {Icons.Shield} Documento confidencial — uso exclusivo para coordenação e planejamento pedagógico.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticoDetalhe;
