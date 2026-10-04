import React, { useState, useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";
import DossiePendenciasAluno from "../components/reports/DossiePendenciasAluno";
import MapaComportamentoView from "../components/reports/MapaComportamentoView";

export default function Relatorios() {
  const {
    setActiveTab,
    students,
    occurrenceTypes,
    computedGrades,
    settings,
    openProfileModal,
    openEvalModal,
    occurrences,
    classOccurrences,
    activities,
    activityTopics,
    turmas,
    activeTurmaId,
    units,
    activeUnitId,
  } = useApp();

  // Estado local para navegar entre as telas do relatório
  const [selectedReport, setSelectedReport] = useState(null);
  const [interventionFilter, setInterventionFilter] = useState('todos');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState(null);
  const [engagementFilter, setEngagementFilter] = useState('pendencias'); // 'pendencias' | 'em_dia' | 'todos'
  const [engagementSearch, setEngagementSearch] = useState('');

  const currentTurma = useMemo(() => (turmas || []).find(t => t.id === activeTurmaId), [turmas, activeTurmaId]);
  const currentUnit = useMemo(() => (units || []).find(u => u.id === activeUnitId), [units, activeUnitId]);

  // Mapeamento e métricas de entregas de todos os estudantes da turma
  const studentEngagementList = useMemo(() => {
    return computedGrades.map((aluno) => {
      const studentIdStr = String(aluno.student_id);
      const missingDates = (activityTopics || [])
        .filter(topic => !activities.some(a => String(a.student_id) === studentIdStr && a.date === topic.date && Boolean(a.is_completed)))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const entregues = (activityTopics || []).filter(topic =>
        activities.some(a => String(a.student_id) === studentIdStr && a.date === topic.date && Boolean(a.is_completed))
      ).length;
      const totalActivities = (activityTopics || []).length;
      const entregasPct = totalActivities > 0 ? entregues / totalActivities : 0;
      const isUpToDate = missingDates.length === 0;

      return {
        ...aluno,
        missingDates,
        entregues,
        totalActivities,
        entregasPct,
        isUpToDate
      };
    });
  }, [computedGrades, activityTopics, activities]);

  const countPendencias = useMemo(() => studentEngagementList.filter(s => !s.isUpToDate).length, [studentEngagementList]);
  const countEmDia = useMemo(() => studentEngagementList.filter(s => s.isUpToDate).length, [studentEngagementList]);
  const countTotal = studentEngagementList.length;

  const filteredEngagementStudents = useMemo(() => {
    return studentEngagementList
      .filter(aluno => {
        if (engagementFilter === 'pendencias' && aluno.isUpToDate) return false;
        if (engagementFilter === 'em_dia' && !aluno.isUpToDate) return false;

        if (engagementSearch.trim()) {
          const term = engagementSearch.toLowerCase();
          return (aluno.name || '').toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => {
        if (engagementFilter === 'em_dia') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (engagementFilter === 'pendencias') {
          return b.missingDates.length - a.missingDates.length;
        }
        return a.licao - b.licao;
      });
  }, [studentEngagementList, engagementFilter, engagementSearch]);

  const handlePrintDossierPDF = async (dossierData) => {
    const api = window.electronAPI || window.api;
    if (api && typeof api.exportStudentPendenciesPDF === 'function') {
      try {
        const result = await api.exportStudentPendenciesPDF(dossierData);
        if (result && result.cancelled) {
          return;
        }
        if (result && !result.success && result.error) {
          console.error('Falha na geração do PDF:', result.error);
          alert('Não foi possível gerar o arquivo PDF: ' + result.error);
        }
      } catch (err) {
        console.error('Erro ao exportar PDF via Electron:', err);
        alert('Erro ao exportar PDF: ' + err.message);
      }
    } else {
      alert('O recurso de exportação direta para PDF requer a execução no aplicativo desktop EduSys Pro.');
    }
  };

  // Otimiza o filtro de ocorrências usando um Set
  const studentIdsSet = useMemo(() => new Set(students.map(s => s.id)), [students]);
  
  const turmaOccurrences = useMemo(() => {
    return classOccurrences.filter(o => studentIdsSet.has(o.student_id));
  }, [classOccurrences, studentIdsSet]);

  const alertStudents = useMemo(() => {
    return computedGrades.filter(g => g.isAlert);
  }, [computedGrades]);

  const filteredAlertStudents = useMemo(() => {
    if (interventionFilter === 'todos') return alertStudents;
    return alertStudents.filter(g => (g.alertReasons || []).includes(interventionFilter));
  }, [alertStudents, interventionFilter]);

  const topPerformers = useMemo(() => {
    return [...computedGrades].sort((a, b) => b.mediaFinal - a.mediaFinal).slice(0, 10);
  }, [computedGrades]);

  // Calcula o tipo de ocorrência mais frequente de forma memoizada
  const mostFrequentOccurrenceTitle = useMemo(() => {
    const occurrenceCountMap = turmaOccurrences.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentTypeId = Object.keys(occurrenceCountMap).sort(
      (a, b) => occurrenceCountMap[b] - occurrenceCountMap[a]
    )[0] ?? null;
    return occurrenceTypes.find(t => t.id === mostFrequentTypeId)?.title || 'Nenhuma';
  }, [turmaOccurrences, occurrenceTypes]);

  if (!settings) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col min-h-0">
      {/* HEADER DA ABA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3.5 border-b border-slate-100/80 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            {selectedReport && (
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 cursor-pointer shrink-0"
                title="Voltar aos relatórios"
              >
                {Icons.ChevronLeft}
              </button>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                {selectedReport === 'minitestes' ? 'Análise de Mini-Testes' :
                  selectedReport === 'intervencao' ? 'Relatório de Intervenção' :
                    selectedReport === 'ranking' ? 'Ranking de Excelência' :
                      selectedReport === 'comportamento' ? 'Mapa de Comportamento' :
                        selectedReport === 'engajamento' ? 'Engajamento de Lições' :
                          'Central de Inteligência Pedagógica'}
              </h3>
              <p className="text-slate-500 font-medium text-xs mt-0.5">
                {selectedReport === 'comportamento' ? 'Mapa de calor e frequência das ocorrências disciplinares.' :
                  selectedReport === 'engajamento' ? 'Análise Detalhada de entregas e esquecimento de materiais.' :
                  selectedReport === 'ranking' ? 'Os 10 melhores desempenhos acadêmicos e comportamentais.' :
                  selectedReport === 'intervencao' ? 'Alunos em zona de alerta que necessitam atenção especial.' :
                  selectedReport ? 'Detalhamento técnico dos dados coletados.' :
                  'Visões analíticas para uma gestão escolar eficiente e baseada em dados.'}
              </p>
            </div>
          </div>
          {!selectedReport && (
            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm">
              Live Insights
            </div>
          )}
          {selectedReport === 'engajamento' && (() => {
            const studentsCount = computedGrades.length || 1;
            const totalDone = computedGrades.reduce((acc, g) => acc + (g.licaoCheckCount || 0), 0);
            const classMaxActivities = computedGrades[0]?.maxActivities || 23;
            const totalPossible = studentsCount * classMaxActivities;
            const pct = totalPossible > 0 ? Math.min(100, Math.round((totalDone / totalPossible) * 100)) : 0;
            const avgPerStudent = (totalDone / studentsCount).toFixed(1).replace('.', ',');
            const isTargetMet = pct >= 70;
            
            // SVG circular progress calculation (r = 18, C = 2 * PI * 18 ≈ 113.1)
            const radius = 18;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (pct / 100) * circumference;

            return (
              <div className="flex items-center gap-3.5 shrink-0 bg-slate-50/80 hover:bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-2xl shadow-2xs transition-all">
                {/* Micro-Gauge Circular Donut Ring */}
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r={radius}
                      className="stroke-slate-200/80"
                      strokeWidth="5"
                      fill="none"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r={radius}
                      className={`${isTargetMet ? 'stroke-emerald-500' : 'stroke-amber-500'} transition-all duration-700 ease-out`}
                      strokeWidth="5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-black text-slate-800 tracking-tight">
                    {pct}%
                  </span>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Média da Turma
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isTargetMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {isTargetMet ? 'Meta Atingida' : 'Abaixo da Meta'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 leading-tight mt-0.5">
                    {avgPerStudent} de {classMaxActivities} lições <span className="text-slate-400 font-normal">/ aluno</span>
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* DASHBOARD DE CARDS (SE NADA SELECIONADO) */}
          {!selectedReport && (
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card: Ficha 360 do Aluno */}
              <button
                type="button"
                onClick={() => students.length > 0 && openProfileModal(students[0]?.id)}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Users}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                      Ficha 360º do Aluno
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Dossiê completo com notas, comportamento e histórico individualizado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50/50 hidden sm:inline-block">
                    Perfil Individual
                  </span>
                  <div className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Análise de Mini-Testes */}
              <button
                type="button"
                onClick={() => setSelectedReport('minitestes')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-purple-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Star}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-purple-600 transition-colors">
                      Análise de Mini-Testes
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Controle de participação: quem fez, avaliações realizadas e médias.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-purple-200 text-purple-700 bg-purple-50/50 hidden sm:inline-block">
                    Tempo Real
                  </span>
                  <div className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Mapa de Comportamento */}
              <button
                type="button"
                onClick={() => setSelectedReport('comportamento')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-rose-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Alert}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-rose-600 transition-colors">
                      Mapa de Comportamento
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Frequência de ocorrências por tipo e tendências disciplinares da turma.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-200 text-rose-700 bg-rose-50/50 hidden sm:inline-block">
                    Ocorrências
                  </span>
                  <div className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Engajamento de Lições */}
              <button
                type="button"
                onClick={() => setSelectedReport('engajamento')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-emerald-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Activity}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-emerald-600 transition-colors">
                      Engajamento de Lições
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Taxas de conclusão e alunos com pendência de material didático.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50/50 hidden sm:inline-block">
                    Entregas
                  </span>
                  <div className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Ranking de Excelência */}
              <button
                type="button"
                onClick={() => setSelectedReport('ranking')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-amber-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Sparkles || Icons.Star}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-amber-600 transition-colors">
                      Ranking de Excelência
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Top performers que equilibram notas altas e conduta exemplar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-amber-200 text-amber-700 bg-amber-50/50 hidden sm:inline-block">
                    Quadro Geral
                  </span>
                  <div className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Relatório de Intervenção */}
              <button
                type="button"
                onClick={() => setSelectedReport('intervencao')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-rose-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-rose-600 to-red-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Alert}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-rose-600 transition-colors">
                      Relatório de Intervenção
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Lista consolidada para conselho com alunos em zona de alerta crítico.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-200 text-rose-700 bg-rose-50/50 hidden sm:inline-block">
                    Conselho
                  </span>
                  <div className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>

              {/* Card: Acervo de Diagnósticos I.A. */}
              <button
                type="button"
                onClick={() => setActiveTab('historico-diagnosticos')}
                className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer md:col-span-2"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {Icons.Brain}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                      Acervo de Diagnósticos I.A.
                    </h4>
                    <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                      Histórico consolidado de pareceres emitidos por aluno com consulta e geração de relatórios em PDF.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50/50 hidden sm:inline-block">
                    Memória Pedagógica
                  </span>
                  <div className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                    {Icons.ChevronRight}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* RELATÓRIO: MINI-TESTES */}
          {selectedReport === 'minitestes' && (
            <div className="p-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase">
                      <th className="p-4">Estudante</th>
                      <th className="p-4 text-center">Realizados</th>
                      <th className="p-4 text-center">Média Notas</th>
                      <th className="p-4 text-center">Frequência</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {computedGrades.map((aluno) => {
                      const realizados = aluno.testesLista?.length || 0;
                      const totalSugerido = aluno.maxMiniTestes || 1;
                      const freq = (realizados / totalSugerido) * 100;

                      return (
                        <tr key={aluno.student_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-700">{aluno.name}</td>
                          <td className="p-4 text-center">
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg font-bold text-sm">
                              {realizados} de {totalSugerido}
                            </span>
                          </td>
                          <td className="p-4 text-center font-black text-slate-800">
                            {typeof aluno.totalMiniTestes === 'number' ? aluno.totalMiniTestes.toFixed(2) : '0.00'}
                          </td>
                          <td className="p-4 text-center min-w-[140px]">
                            <div className="w-full max-w-[100px] bg-slate-100 h-2 rounded-full mx-auto overflow-hidden text-center mb-1">
                              <div
                                className={`h-full transition-all duration-1000 ${freq > 80 ? 'bg-emerald-500' : freq > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(freq, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{freq.toFixed(0)}%</span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => openEvalModal(aluno, 'mini_testes')} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors">
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RELATÓRIO: COMPORTAMENTO */}
          {selectedReport === 'comportamento' && (
            <div className="p-4 sm:p-5">
              <MapaComportamentoView
                computedGrades={computedGrades}
                turmaOccurrences={turmaOccurrences}
                occurrenceTypes={occurrenceTypes}
                settings={settings}
                turmaName={currentTurma?.name}
                unitName={currentUnit?.name}
                unidade={activeUnitId}
              />
            </div>
          )}

          {/* RELATÓRIO: ENGAJAMENTO */}
          {selectedReport === 'engajamento' && (
            <div className="pt-3 pb-2 space-y-3.5 animate-in fade-in zoom-in-95 duration-300">
              {/* Alerta de Esquecimento de Material (Mat.) - exibido apenas se houver registros */}
              {(() => {
                const materialStudents = [...computedGrades]
                  .map(g => ({
                    ...g,
                    materialOccs: turmaOccurrences.filter(o => o.student_id === g.student_id && o.type === 'falta_material').length
                  }))
                  .filter(g => g.materialOccs > 0)
                  .sort((a, b) => b.materialOccs - a.materialOccs)
                  .slice(0, 5);

                if (materialStudents.length === 0) return null;

                return (
                  <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      <span className="text-[11px] font-black text-rose-700 uppercase tracking-wider">
                        Alerta de Esquecimento de Material (&quot;Mat.&quot;)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {materialStudents.map(aluno => (
                        <div
                          key={aluno.student_id}
                          className="bg-white border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs text-xs font-semibold text-slate-700"
                        >
                          <span className="truncate max-w-[120px]" title={aluno.name}>
                            {aluno.name}
                          </span>
                          <span className="bg-rose-100 text-rose-700 font-black text-[10px] px-1.5 py-0.5 rounded">
                            {aluno.materialOccs}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Ranking de Entregas e Pendências Detalhadas */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                 <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                       <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Status de Entregas por Estudante</h4>
                       <p className="text-[11px] text-slate-400 font-medium mt-0.5">Dossiê e acompanhamento individual de lições</p>
                    </div>

                    {/* BARRA DE FILTROS + BUSCA */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                       <div className="flex items-center bg-slate-200/60 p-1 rounded-xl">
                          <button
                             onClick={() => setEngagementFilter('pendencias')}
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                engagementFilter === 'pendencias' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                             }`}
                          >
                             Com Pendências ({countPendencias})
                          </button>
                          <button
                             onClick={() => setEngagementFilter('em_dia')}
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                engagementFilter === 'em_dia' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                             }`}
                          >
                             100% em Dia ({countEmDia})
                          </button>
                          <button
                             onClick={() => setEngagementFilter('todos')}
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                engagementFilter === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                             }`}
                          >
                             Todos ({countTotal})
                          </button>
                       </div>

                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                             {Icons.Search}
                          </span>
                          <input
                             type="text"
                             placeholder="Buscar aluno..."
                             value={engagementSearch}
                             onChange={e => setEngagementSearch(e.target.value)}
                             className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="divide-y divide-slate-50">
                    {filteredEngagementStudents.length === 0 ? (
                       <div className="py-16 text-center text-slate-400 font-medium text-xs">
                          Nenhum estudante encontrado para os critérios selecionados.
                       </div>
                    ) : (
                       filteredEngagementStudents.map((aluno) => {
                          const { missingDates, entregues, totalActivities, entregasPct, isUpToDate } = aluno;

                          return (
                           <div key={aluno.student_id} className="p-3.5 px-4 hover:bg-slate-50/80 transition-colors group">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                 <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5 min-w-[140px]">
                                       <h5 className="font-bold text-slate-800 text-sm">{aluno.name}</h5>
                                       {isUpToDate && (
                                          <span className="text-[9px] font-black bg-emerald-100/80 text-emerald-700 px-1.5 py-0.5 rounded">
                                             100%
                                          </span>
                                       )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <div className="w-24 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                             className={`h-full rounded-full transition-all duration-500 ${entregasPct >= 0.8 ? 'bg-emerald-500' : entregasPct >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                             style={{ width: `${Math.min(entregasPct * 100, 100)}%` }}
                                          ></div>
                                       </div>
                                       <span className="text-[10px] font-extrabold text-slate-500">
                                          {(entregasPct * 100).toFixed(0)}%
                                       </span>
                                       <span className="text-[10px] text-slate-400 font-medium">
                                          ({entregues}/{totalActivities})
                                       </span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${missingDates.length > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                       {missingDates.length > 0 ? `${missingDates.length} PENDÊNCIA${missingDates.length !== 1 ? 'S' : ''}` : 'EM DIA'}
                                    </span>
                                    <button
                                       onClick={() => setSelectedStudentForDossier({
                                          student: aluno,
                                          missingDates,
                                          entregues,
                                          totalActivities,
                                          entregasPct
                                       })}
                                       className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg text-xs font-bold transition-all border border-indigo-100 shadow-2xs cursor-pointer"
                                       title="Abrir dossiê completo de atividades e gerar PDF"
                                    >
                                       <span>Dossiê</span>
                                       <span className="w-3.5 h-3.5 flex items-center">{Icons.ChevronRight}</span>
                                    </button>
                                 </div>
                              </div>

                              {/* Linha Compacta de Lições Pendentes (apenas se houver pendências) */}
                              {missingDates.length > 0 && (
                                 <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-100/80">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
                                       Pendentes:
                                    </span>
                                    {missingDates.slice(0, 3).map(item => {
                                       const originalTopic = item.topic || "Sem assunto registrado";
                                       const displayTopic = originalTopic.length > 24 
                                          ? `${originalTopic.slice(0, 22)}...` 
                                          : originalTopic;
                                       return (
                                          <div 
                                             key={item.date} 
                                             title={`${item.date.split("-")[2]}/${item.date.split("-")[1]}: ${originalTopic}`}
                                             className="bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md flex items-center gap-1.5 max-w-[220px]"
                                          >
                                             <span className="text-[10px] font-black text-rose-500 shrink-0">
                                                {item.date.split("-")[2]}/{item.date.split("-")[1]}
                                             </span>
                                             <span className="text-[11px] font-semibold text-slate-600 truncate">
                                                {displayTopic}
                                             </span>
                                          </div>
                                       );
                                    })}
                                    {missingDates.length > 3 && (
                                       <button
                                          onClick={() => setSelectedStudentForDossier({
                                             student: aluno,
                                             missingDates,
                                             entregues,
                                             totalActivities,
                                             entregasPct
                                          })}
                                          className="text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 transition-colors cursor-pointer"
                                          title="Clique para ver a lista completa de lições pendentes no dossiê"
                                       >
                                          +{missingDates.length - 3} mais
                                       </button>
                                    )}
                                 </div>
                              )}
                           </div>
                          );
                       })
                    )}
                 </div>
              </div>

              {/* Insight Analítico do Engajamento */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-emerald-600/20">
                 <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                 </div>
                 <div className="relative z-10">
                    <h4 className="text-base font-black mb-1.5 italic underline decoration-emerald-400">Análise de Engajamento</h4>
                    <p className="max-w-2xl text-emerald-50 text-xs font-medium leading-relaxed opacity-90">
                       {(() => {
                          const studentIds = new Set(students.map(s => s.id));
                          const totalDone = activities.filter(a => a.is_completed && studentIds.has(a.student_id)).length;
                          const totalPossible = computedGrades.reduce((acc, g) => acc + (g.maxActivities || 0), 0);
                          const globalPct = totalPossible > 0 ? (totalDone / totalPossible) : 0;
                          
                          if (globalPct < 0.3) return "O engajamento atual está extremamente crítico. Recomenda-se uma reunião urgente com a turma para identificar se o volume de atividades está adequado ou se há dificuldades técnicas com o conteúdo.";
                          if (turmaOccurrences.filter(o => o.type === 'falta_material').length > (students.length * 0.5)) return "Há uma correlação alta entre o esquecimento de material e as pendências de lições nesta turma. Reforce a importância da organização individual para melhorar os índices de entrega.";
                          return "O engajamento da turma está saudável. Continue monitorando as pendências individuais listadas acima para manter a consistência nas entregas e o alto índice de participação.";
                       })()}
                    </p>
                 </div>
              </div>
            </div>
          )}

          {/* RELATÓRIO: RANKING */}
          {selectedReport === 'ranking' && (
            <div className="p-5 animate-in fade-in zoom-in-95 duration-300">
               <div className="space-y-3">
                  {topPerformers.map((g, index) => (
                     <div key={g.student_id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${index === 0 ? 'bg-slate-900 border-slate-800 text-white scale-[1.01] shadow-lg' : index < 3 ? 'bg-white border-indigo-100 shadow-sm' : 'bg-white border-slate-100 opacity-90'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${index === 0 ? 'bg-indigo-500 text-white' : index === 1 ? 'bg-slate-100 text-slate-800' : index === 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                              #{index + 1}
                           </div>
                           <div>
                              <h5 className="font-bold text-base">{g.name}</h5>
                              <div className="flex gap-2.5 mt-0.5">
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${index === 0 ? 'text-indigo-300' : 'text-slate-400'}`}>
                                    Comportamento: {g.behaviorScore.toFixed(1)}
                                 </span>
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${index === 0 ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    Atividades: {g.licaoCheckCount || 0}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className={`text-xl font-black ${index === 0 ? 'text-indigo-400' : 'text-slate-800'}`}>
                              {typeof g.mediaFinal === 'number' ? g.mediaFinal.toFixed(2) : '0.00'}
                           </div>
                           <div className={`text-[9px] font-bold uppercase ${index === 0 ? 'text-slate-500' : 'text-slate-400'}`}>Média Final</div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* RELATÓRIO: INTERVENÇÃO */}
          {selectedReport === 'intervencao' && (
            <div className="p-5 animate-in fade-in zoom-in-95 duration-300">
               {/* BARRA DE FERRAMENTAS: FILTROS E IMPRESSÃO */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar por:</span>
                     <button
                        onClick={() => setInterventionFilter('todos')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${interventionFilter === 'todos' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200/60'}`}
                     >
                        Todos ({alertStudents.length})
                     </button>
                     <button
                        onClick={() => setInterventionFilter('disciplinar')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${interventionFilter === 'disciplinar' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200/60'}`}
                     >
                        Disciplinar ({alertStudents.filter(g => (g.alertReasons || []).includes('disciplinar')).length})
                     </button>
                     <button
                        onClick={() => setInterventionFilter('licoes')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${interventionFilter === 'licoes' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200/60'}`}
                     >
                        Pendência Lições ({alertStudents.filter(g => (g.alertReasons || []).includes('licoes')).length})
                     </button>
                     <button
                        onClick={() => setInterventionFilter('avaliativo')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${interventionFilter === 'avaliativo' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200/60'}`}
                     >
                        Avaliações ({alertStudents.filter(g => (g.alertReasons || []).includes('avaliativo') || (g.alertReasons || []).includes('media_final')).length})
                     </button>
                  </div>
                  <button
                     onClick={() => window.print()}
                     className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                     {Icons.Reports} Imprimir Relatório
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAlertStudents.map(g => (
                     <div key={g.student_id} className="bg-white p-5 rounded-2xl border-2 border-rose-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform"></div>
                        <div className="relative z-10">
                           <div className="flex items-start justify-between mb-4 gap-3">
                              <div className="w-11 h-11 bg-rose-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-rose-600/20 shrink-0">
                                 {typeof g.mediaFinal === 'number' ? g.mediaFinal.toFixed(1) : '0.0'}
                              </div>
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                 {g.alertReasons && g.alertReasons.length > 0 ? (
                                    g.alertReasons.map(reason => {
                                       if (reason === 'disciplinar') {
                                          return (
                                             <span key={reason} className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Conduta
                                             </span>
                                          );
                                       }
                                       if (reason === 'licoes') {
                                          return (
                                             <span key={reason} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Lições
                                             </span>
                                          );
                                       }
                                       if (reason === 'avaliativo') {
                                          return (
                                             <span key={reason} className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Avaliações
                                             </span>
                                          );
                                       }
                                       if (reason === 'media_final') {
                                          return (
                                             <span key={reason} className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                Média &lt; 5.0
                                             </span>
                                          );
                                       }
                                       return null;
                                    })
                                 ) : (
                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                       Alerta Crítico
                                    </span>
                                 )}
                              </div>
                           </div>
                           <h4 className="text-xl font-bold text-slate-800 mb-4">{g.name}</h4>
                           <div className="space-y-3 mb-8">
                              <div className="flex justify-between text-sm">
                                 <span className="text-slate-400 font-medium">Perda Comp.</span>
                                 <span className={`font-bold ${g.pointsLost < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                    {typeof g.pointsLost === 'number' ? `${g.pointsLost.toFixed(1)} pts` : '0.0 pts'}
                                 </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 font-medium">Lições do Período</span>
                                  <span className="text-slate-700 font-bold">{g.licaoCheckCount || 0} / {g.maxActivities || 27}</span>
                              </div>
                           </div>
                           <button 
                             onClick={() => openProfileModal(g.student_id)}
                             className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                           >
                              {Icons.Reports} Abrir Dossiê Completo
                           </button>
                        </div>
                     </div>
                  ))}
                  {filteredAlertStudents.length === 0 && (
                     <div className="col-span-full py-28 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                           {Icons.Check}
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 mb-2">
                           {alertStudents.length === 0 ? 'Turma em Zona de Segurança' : 'Nenhum Aluno no Filtro Selecionado'}
                        </h4>
                        <p className="text-slate-500 font-medium max-w-sm">
                           {alertStudents.length === 0
                              ? 'Nenhum aluno apresenta indicadores de risco crítico neste momento baseado em notas e comportamento.'
                              : 'Todos os alunos da turma atendem aos critérios desta categoria específica.'}
                        </p>
                     </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Dossiê Individual de Lições e Pendências (Arquivo Único) */}
      <DossiePendenciasAluno
        isOpen={Boolean(selectedStudentForDossier)}
        onClose={() => setSelectedStudentForDossier(null)}
        studentData={selectedStudentForDossier}
        activities={activities}
        activityTopics={activityTopics}
        turmaName={currentTurma?.name || 'Turma'}
        unidade={currentUnit?.name || activeUnitId || '1'}
        schoolName={settings?.school_name || ''}
        onPrintPDF={handlePrintDossierPDF}
      />
    </div>
  );
}
