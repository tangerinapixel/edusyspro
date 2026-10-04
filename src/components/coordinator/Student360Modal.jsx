/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Student360UnitSelector from './Student360UnitSelector';

export default function Student360Modal({ isOpen, onClose, canonicalId, studentName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'grades' | 'diagnostics'
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const fetchDossier = useCallback(async (unitId = selectedUnit) => {
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
        setError(res?.error || 'Não foi possível carregar o dossiê do estudante.');
      }
    } catch (err) {
      setError(err.message || 'Erro inesperado ao consultar dados.');
    } finally {
      setLoading(false);
    }
  }, [canonicalId, selectedUnit]);

  useEffect(() => {
    if (!isOpen || !canonicalId) {
      setData(null);
      setError('');
      setSelectedUnit('ALL');
      setLoading(false);
      return;
    }

    fetchDossier(selectedUnit);
  }, [isOpen, canonicalId, selectedUnit, fetchDossier]);

  if (!isOpen) return null;

  const disciplines = data?.disciplines || data?.multi_disciplinary_summary?.disciplines || [];
  const diagnoses = data?.diagnoses || [];
  const evaluations = data?.evaluations || [];
  const overallAvg = data?.overall_average ?? data?.multi_disciplinary_summary?.overall_average ?? null;
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Padronizado */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-2xs shrink-0">
              {(studentName || data?.canonical_name || 'E').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  {studentName || data?.canonical_name || 'Carregando Dossiê...'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                  {data?.display_turma || 'Turma Base'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                <span>Dossiê 360º Unificado</span>
                <span>•</span>
                <span>{disciplines.length} Disciplina{disciplines.length === 1 ? '' : 's'} Integrada{disciplines.length === 1 ? '' : 's'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {overallAvg !== null && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  {selectedUnit === 'ALL' ? 'Média Geral Escola' : `Média ${currentUnitName || 'Unidade'}`}
                </p>
                <p className={`text-xl font-black ${overallAvg >= 7.0 ? 'text-emerald-600' : overallAvg >= 5.0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {overallAvg.toFixed(1)}
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Barra de Seleção de Período / Unidade Letiva */}
        <div className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <Student360UnitSelector
            units={data?.available_units || []}
            selectedUnit={selectedUnit}
            onSelectUnit={(unitId) => setSelectedUnit(unitId)}
            isLoading={loading}
          />
          <div className="text-[11px] text-slate-500 font-medium">
            {selectedUnit === 'ALL'
              ? 'Exibindo consolidado de todas as unidades letivas'
              : `Filtrado por: ${currentUnitName || 'Unidade selecionada'}`}
          </div>
        </div>

        {/* Barra de Abas de Navegação */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Visão Geral Multi-Docente
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Detalhamento de Notas ({evaluations.length})
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Linha do Tempo I.A. ({diagnoses.length})
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">Cruzando dados entre professores e cofre local...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* ABA 1: VISÃO GERAL */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Desempenho por Disciplina */}
                  <div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                      Comparativo de Médias por Componente Curricular
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {disciplines.length === 0 ? (
                        <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                          Nenhum registro de nota encontrado nos snapshots de professores.
                        </div>
                      ) : (
                        disciplines.map((d, idx) => {
                          const avg = d.average_score ?? d.average ?? 0;
                          const pct = Math.min(100, Math.max(0, (avg / 10) * 100));
                          return (
                            <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800">{d.discipline}</h4>
                                  <p className="text-xs text-slate-500">Docente: {d.teacher_name} {d.turma_name ? `(${d.turma_name})` : ''}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${getScoreColor(avg)}`}>
                                  {avg !== null ? Number(avg).toFixed(1) : 'S/ Nota'}
                                </span>
                              </div>

                              {/* Barra de Progresso */}
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${avg >= 7.0 ? 'bg-emerald-500' : avg >= 5.0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-semibold">
                                <span>{d.evaluations_count || 0} avaliação(ões) • {d.delivered_activities || 0} lições</span>
                                <span>Conduta: {d.behaviorScore !== undefined ? Number(d.behaviorScore).toFixed(1) : '3.0'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Resumo Rápido de Diagnósticos Recentes */}
                  <div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                      Últimos Diagnósticos Pedagógicos Emitidos
                    </h3>
                    {diagnoses.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center text-xs text-slate-400">
                        Nenhum diagnóstico pedagógico com inteligência artificial emitido até o momento.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {diagnoses.slice(0, 3).map((diag, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800">{diag.discipline || 'Diagnóstico Geral'}</span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {diag.created_at ? new Date(diag.created_at).toLocaleDateString('pt-BR') : 'Data recente'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                                {diag.diagnosis_text ? diag.diagnosis_text.replace(/[#*`_]/g, '').slice(0, 140) + '...' : (diag.summary || diag.observation || 'Sem resumo descritivo.')}
                              </p>
                              <p className="text-[10px] text-indigo-600 mt-1 font-semibold">Emitido por: {diag.teacher_name || diag.author_name || 'Docente'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: NOTAS DETALHADAS */}
              {activeTab === 'grades' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3">Componente Curricular</th>
                          <th className="px-4 py-3">Docente</th>
                          <th className="px-4 py-3">Instrumento Avaliativo</th>
                          <th className="px-4 py-3 text-center">Tipo</th>
                          <th className="px-4 py-3 text-center">Peso</th>
                          <th className="px-4 py-3 text-right">Nota Obtida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {evaluations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Nenhuma avaliação individual detalhada localizada nos lançamentos.
                            </td>
                          </tr>
                        ) : (
                          evaluations.map((ev, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-800">{ev.discipline}</td>
                              <td className="px-4 py-3 text-slate-500">{ev.teacher_name}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{ev.activity_name || 'Avaliação'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  ev.type === 'Prova' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                  ev.type === 'Mini-Teste' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  ev.type === 'Trabalho' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {ev.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-500">{ev.weight ? Number(ev.weight).toFixed(1) : '-'}</td>
                              <td className="px-4 py-3 text-right font-bold">
                                <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${getScoreColor(ev.score)}`}>
                                  {ev.score !== null && ev.score !== undefined ? Number(ev.score).toFixed(1) : '-'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 3: HISTÓRICO DE DIAGNÓSTICOS COM MARKDOWN & TELEMETRIA */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-4">
                  {diagnoses.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs">
                      Nenhum histórico de diagnóstico arquivado para este estudante.
                    </div>
                  ) : (
                    diagnoses.map((diag, idx) => {
                      const dId = diag.id || idx;
                      const metrics = diag.metrics_snapshot || {};
                      const hasMetrics = Object.keys(metrics).length > 0;
                      return (
                        <div key={dId} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                {diag.discipline || diag.turma_name || 'Diagnóstico Pedagógico'}
                              </h4>
                              <span className="text-[11px] text-slate-500">• Docente: {diag.teacher_name || diag.author_name || 'Docente'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-medium">
                                {diag.created_at ? new Date(diag.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data recente'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyDiagnosis(dId, diag.diagnosis_text || diag.summary || '')}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Copiar Parecer Completo"
                              >
                                {copiedId === dId ? (
                                  <>
                                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-emerald-600">Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Telemetria Compacta (Se snapshot existir) */}
                          {hasMetrics && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                              {metrics.media_final !== undefined && (
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Média Final</span>
                                  <span className={`text-xs font-black ${metrics.media_final >= 7.0 ? 'text-emerald-600' : metrics.media_final >= 5.0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {Number(metrics.media_final).toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {metrics.behavior_score !== undefined && (
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Conduta</span>
                                  <span className="text-xs font-black text-slate-700">
                                    {Number(metrics.behavior_score).toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {metrics.adhesion_rate !== undefined && (
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Adesão Lições</span>
                                  <span className="text-xs font-black text-indigo-600">
                                    {Number(metrics.adhesion_rate).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {metrics.occurrences_count !== undefined && (
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ocorrências</span>
                                  <span className="text-xs font-black text-slate-700">
                                    {metrics.occurrences_count}
                                  </span>
                                </div>
                              )}
                              {metrics.trend && (
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tendência</span>
                                  <span className={`text-xs font-black ${
                                    metrics.trend === 'Melhorando' ? 'text-emerald-600' :
                                    metrics.trend === 'Piorando' ? 'text-rose-600' : 'text-slate-600'
                                  }`}>
                                    {metrics.trend}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Corpo Formatado em Markdown */}
                          <div className="prose prose-slate max-w-none text-slate-700 text-xs sm:text-sm leading-relaxed p-1">
                            <ReactMarkdown>
                              {diag.diagnosis_text || diag.summary || diag.observation || 'Sem conteúdo de diagnóstico.'}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Dossiê consolidado com dados de {disciplines.length} professor(es).
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            Fechar Dossiê
          </button>
        </div>
      </div>
    </div>
  );
}
