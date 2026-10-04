/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import Student360UnitSelector from './Student360UnitSelector';
import CoordinatorFilterDropdown from './CoordinatorFilterDropdown';

export default function StudentDossierPage({ canonicalId, studentName, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'grades' | 'occurrences' | 'diagnostics'
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedDiscipline, setSelectedDiscipline] = useState('ALL');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchDossier = useCallback(async (unitId = selectedUnit) => {
    if (!canonicalId) return;
    setLoading(true);
    setError('');
    try {
      let res;
      if (window.electronAPI?.coordinatorGetStudent360ByUnit) {
        res = await window.electronAPI.coordinatorGetStudent360ByUnit({ canonicalId, unitId });
      } else if (window.electronAPI?.coordinatorGetStudent360) {
        res = await window.electronAPI.coordinatorGetStudent360({ canonicalId });
      } else {
        throw new Error('Canal de comunicação da Coordenação indisponível.');
      }

      if (res && res.success) {
        setData(res.dossier || res.student);
      } else {
        setError(res?.error || 'Não foi possível carregar os registros do estudante.');
      }
    } catch (err) {
      setError(err.message || 'Erro inesperado ao consultar cofre institucional.');
    } finally {
      setLoading(false);
    }
  }, [canonicalId, selectedUnit]);

  useEffect(() => {
    fetchDossier(selectedUnit);
  }, [canonicalId, selectedUnit, fetchDossier]);

  // Lista dinâmica de disciplinas deste estudante para o funil
  const availableDisciplines = useMemo(() => {
    const list = (data?.disciplines || []).map(d => ({
      name: d.discipline,
      teacher: d.teacher_name
    }));
    const unique = [];
    const seen = new Set();
    list.forEach(item => {
      if (item.name && !seen.has(item.name)) {
        seen.add(item.name);
        unique.push(item);
      }
    });
    return unique;
  }, [data]);

  // Opções enriquecidas para o seletor premium de matéria
  const disciplineOptions = useMemo(() => {
    return [
      {
        value: 'ALL',
        label: 'Todas as Matérias (Geral)',
        subtitle: `${availableDisciplines.length} componente${availableDisciplines.length === 1 ? '' : 's'} no cofre`
      },
      ...availableDisciplines.map(d => ({
        value: d.name,
        label: d.name,
        subtitle: d.teacher ? `Prof. ${d.teacher}` : 'Docente vinculado'
      }))
    ];
  }, [availableDisciplines]);

  const rawDisciplines = data?.disciplines || data?.multi_disciplinary_summary?.disciplines || [];
  const rawDiagnoses = data?.diagnoses || [];
  const rawEvaluations = data?.evaluations || [];
  const rawOccurrences = data?.occurrences || [];

  // Filtragem bidimensional do Funil (UNIDADE / MATÉRIA)
  const disciplines = useMemo(() => {
    if (selectedDiscipline === 'ALL') return rawDisciplines;
    return rawDisciplines.filter(d => d.discipline === selectedDiscipline);
  }, [rawDisciplines, selectedDiscipline]);

  const evaluations = useMemo(() => {
    if (selectedDiscipline === 'ALL') return rawEvaluations;
    return rawEvaluations.filter(e => e.discipline === selectedDiscipline);
  }, [rawEvaluations, selectedDiscipline]);

  const occurrences = useMemo(() => {
    if (selectedDiscipline === 'ALL') return rawOccurrences;
    return rawOccurrences.filter(o => o.discipline === selectedDiscipline);
  }, [rawOccurrences, selectedDiscipline]);

  const diagnoses = useMemo(() => {
    if (selectedDiscipline === 'ALL') return rawDiagnoses;
    return rawDiagnoses.filter(d => d.discipline === selectedDiscipline);
  }, [rawDiagnoses, selectedDiscipline]);

  // Média efetiva para o escopo selecionado
  const overallAvg = useMemo(() => {
    if (selectedDiscipline !== 'ALL') {
      const match = rawDisciplines.find(d => d.discipline === selectedDiscipline);
      return match ? match.average_score : null;
    }
    return data?.overall_average ?? data?.multi_disciplinary_summary?.overall_average ?? null;
  }, [data, rawDisciplines, selectedDiscipline]);

  const currentUnitName = data?.available_units?.find(u => String(u.id) === String(selectedUnit))?.name
    || (selectedUnit === 'ALL' ? 'Todas as Unidades' : `${selectedUnit}ª Unidade`);

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-500 bg-slate-100 border-slate-200';
    if (score >= 7.0) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 5.0) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const handleCopyDiagnosis = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Exportação Oficial em PDF via Electron (Padrão Ouro)
  const handleExportPDF = async () => {
    if (isExportingPDF || !data) return;
    setIsExportingPDF(true);
    setFeedbackMsg('');

    try {
      if (!window.electronAPI?.coordinatorExportStudentDossierPDF) {
        throw new Error('Canal de exportação de PDF da Coordenação indisponível.');
      }

      const res = await window.electronAPI.coordinatorExportStudentDossierPDF({
        dossier: data,
        selectedUnit,
        selectedUnitName: currentUnitName,
        selectedDiscipline
      });

      if (res.success) {
        setFeedbackMsg('Dossiê Oficial em PDF salvo com sucesso!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else if (res.cancelled) {
        // Usuário apenas cancelou o diálogo de salvar
      } else {
        setError(res.error || 'Falha ao gerar o documento PDF oficial.');
      }
    } catch (err) {
      setError(err.message || 'Erro crítico ao emitir PDF institucional.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-50/60 overflow-hidden animate-in fade-in duration-200">
      {/* 1. Header Institucional Fixo */}
      <div className="px-6 py-4 bg-white border-b border-slate-200/90 shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Voltar à lista de estudantes"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Voltar à Lista</span>
          </button>

          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-2xs shrink-0">
            {(studentName || data?.canonical_name || 'E').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate">
                {studentName || data?.canonical_name || 'Carregando Dossiê...'}
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
                {data?.display_turma || 'Turma Base'}
              </span>
              {selectedDiscipline !== 'ALL' && (
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                  Foco: {selectedDiscipline}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
              <span>Dossiê Escolar 360º</span>
              <span>•</span>
              <span>{rawDisciplines.length} Disciplina{rawDisciplines.length === 1 ? '' : 's'} no Cofre</span>
              <span>•</span>
              <span>ID: <code className="font-mono text-[10px] text-slate-400">{canonicalId || '---'}</code></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {feedbackMsg && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
              ✓ {feedbackMsg}
            </span>
          )}

          <button
            type="button"
            disabled={isExportingPDF || loading || !data}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar Relatório Oficial Completo em PDF Institucional"
          >
            {isExportingPDF ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gerando PDF Oficial...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar Relatório Oficial (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Sub-Header: Funil Hierárquico (UNIDADE / MATÉRIA) & Abas de Navegação */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* Bloco do Funil Hierárquico */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Nível 1: UNIDADE */}
          <Student360UnitSelector
            units={data?.available_units || []}
            selectedUnit={selectedUnit}
            onSelectUnit={(unitId) => setSelectedUnit(unitId)}
            isLoading={loading}
          />

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Nível 2: MATÉRIA */}
          <div className="flex items-center shrink-0">
            <CoordinatorFilterDropdown
              categoryLabel="Matéria"
              color="indigo"
              value={selectedDiscipline}
              onChange={setSelectedDiscipline}
              options={disciplineOptions}
              placeholder="Filtrar por Matéria"
              widthClass="w-72"
            />
          </div>
        </div>

        {/* Abas Executivas */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Visão Geral 360º
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'grades'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Boletim & Instrumentos ({evaluations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('occurrences')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'occurrences'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Conduta ({occurrences.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'diagnostics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Pareceres IA ({diagnoses.length})
          </button>
        </div>
      </div>

      {/* 3. Área de Conteúdo Scrollável */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">
              Processando registros institucionais de {currentUnitName}...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-12">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-rose-800">{error}</p>
            <button
              onClick={() => fetchDossier(selectedUnit)}
              className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* KPI Cards Executivos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Média da Etapa
                  </span>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {overallAvg !== null ? overallAvg.toFixed(1) : '---'}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
                    {selectedUnit === 'ALL' ? 'Média Geral Anual' : currentUnitName}
                  </span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black ${getScoreColor(overallAvg)}`}>
                  {overallAvg !== null ? (overallAvg >= 7.0 ? 'Pleno' : overallAvg >= 5.0 ? 'Atenção' : 'Crítico') : 'N/D'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Disciplinas Ativas
                  </span>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {disciplines.length}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
                    Componentes no cofre
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Avaliações do Período
                  </span>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {evaluations.length}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
                    Provas, testes e trabalhos
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Ocorrências
                  </span>
                  <div className={`text-2xl font-black mt-1 ${occurrences.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {occurrences.length}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
                    {occurrences.length === 0 ? 'Conduta exemplar' : 'Registros disciplinares'}
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${occurrences.length > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ABA 1: VISÃO GERAL 360º */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">
                        Quadro Multidisciplinar ({currentUnitName})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Rendimento acadêmico por disciplina integrada com dados de cada professor.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {disciplines.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold">
                        Nenhuma disciplina vinculada a este estudante.
                      </div>
                    ) : (
                      disciplines.map((d, idx) => {
                        const score = d.average_score ?? d.average ?? null;
                        return (
                          <div
                            key={d.teacher_id || idx}
                            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-sm transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 truncate" title={d.discipline}>
                                  {d.discipline || 'Disciplina'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                  Prof. {d.teacher_name || 'Docente'}
                                </p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 ${getScoreColor(score)}`}>
                                {score !== null ? Number(score).toFixed(1) : '---'}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                              <div className="bg-slate-50 p-2 rounded-xl">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lições</span>
                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                  {d.delivered_activities ?? d.computed?.licaoCheckCount ?? 0}
                                </span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Conduta</span>
                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                  {d.behaviorScore ? Number(d.behaviorScore).toFixed(1) : '3.0'}
                                </span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Testes</span>
                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                  {d.evaluations_count ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: BOLETIM & INSTRUMENTOS */}
            {activeTab === 'grades' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Instrumentos Avaliativos Lançados ({evaluations.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Provas, mini-testes, trabalhos e bônus registrados para {currentUnitName}.
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  {evaluations.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                      Nenhum instrumento avaliativo registrado para este período.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                            <th className="py-3 px-4">Instrumento</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Disciplina</th>
                            <th className="py-3 px-4">Docente</th>
                            <th className="py-3 px-4 text-center">Unidade</th>
                            <th className="py-3 px-4 text-right">Nota / Pontos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {evaluations.map((ev, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {ev.activity_name || ev.name || 'Avaliação'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  ev.type === 'Prova'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : ev.type === 'Mini-Teste'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    : ev.type === 'Bônus'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                                }`}>
                                  {ev.type || 'Avaliação'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium">{ev.discipline}</td>
                              <td className="py-3 px-4 text-slate-500 font-medium">Prof. {ev.teacher_name}</td>
                              <td className="py-3 px-4 text-center text-slate-500 font-bold">
                                {ev.unit_id ? `${ev.unit_id}ª Unidade` : '1ª Unidade'}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-800">
                                {ev.score !== undefined && ev.score !== null ? Number(ev.score).toFixed(1) : '---'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 3: CONDUTA & OCORRÊNCIAS */}
            {activeTab === 'occurrences' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Histórico Comportamental ({occurrences.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Ocorrências disciplinares registradas no período de {currentUnitName}.
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  {occurrences.length === 0 ? (
                    <div className="py-12 text-center text-xs text-emerald-600 font-bold">
                      Nenhuma ocorrência registrada para este estudante nesta etapa. Conduta exemplar!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {occurrences.map((occ, i) => (
                        <div
                          key={occ.id || i}
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {occ.type || 'Ocorrência Disciplinar'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md">
                                {occ.points !== undefined ? `${occ.points} pts` : '-0.15 pts'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {occ.discipline} • Prof. {occ.teacher_name} • {occ.date || 'Data não informada'}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 shrink-0">
                            {occ.unit_id ? `${occ.unit_id}ª Unidade` : '1ª Unidade'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 4: PARECERES PEDAGÓGICOS (IA) */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">
                        Pareceres e Diagnósticos Pedagógicos IA ({diagnoses.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Laudos analíticos gerados e arquivados para o acompanhamento escolar.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {diagnoses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                        Nenhum parecer pedagógico arquivado para este período.
                      </div>
                    ) : (
                      diagnoses.map((diag, i) => (
                        <div
                          key={diag.id || i}
                          className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800">
                                  {diag.discipline || 'Componente Curricular'}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-md">
                                  {diag.unit_id ? `${diag.unit_id}ª Unidade` : '1ª Unidade'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                Emitido por: Prof. {diag.teacher_name || diag.author_name || 'Docente'} • {diag.created_at ? new Date(diag.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyDiagnosis(diag.id || i, diag.diagnosis_text || diag.text)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              {copiedId === (diag.id || i) ? (
                                <>
                                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-emerald-700">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  <span>Copiar Texto</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="prose prose-slate prose-sm max-w-none text-xs leading-relaxed text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                            <ReactMarkdown>{diag.diagnosis_text || diag.text || 'Sem conteúdo disponível.'}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
