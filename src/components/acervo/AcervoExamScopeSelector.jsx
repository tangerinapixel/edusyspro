import React, { useState, useEffect, useMemo } from 'react';

export default function AcervoExamScopeSelector({
  currentPlan,
  turmaId,
  unitId,
  scopeMode,
  onChangeScopeMode,
  lessonScopeMode = 'todas',
  onChangeLessonScopeMode,
  selectedLessonIndices = [],
  onToggleLessonIndex,
  onSelectAllLessons,
  onDeselectAllLessons,
  selectedLessonIndex = 0,
  onSelectLessonIndex,
  selectedPlanIds = [],
  onTogglePlanId,
  onSelectAllPlans,
  onDeselectAllPlans
}) {
  const [archivePlans, setArchivePlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const aulas = Array.isArray(currentPlan?.aulas) ? currentPlan.aulas : [];

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      if (!window.electronAPI?.planArchiveList) return;
      setIsLoading(true);
      try {
        const res = await window.electronAPI.planArchiveList({
          turmaId,
          unitId
        });
        if (isMounted && res && res.success) {
          setArchivePlans(res.plans || []);
        }
      } catch (err) {
        console.error('[AcervoExamScopeSelector] Erro ao carregar planos:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPlans();
    return () => { isMounted = false; };
  }, [turmaId, unitId]);

  // Total de habilidades e aulas selecionadas
  const selectedStats = useMemo(() => {
    const selected = archivePlans.filter(p => selectedPlanIds.includes(p.id));
    const bnccSet = new Set();
    let aulasCount = 0;

    selected.forEach(p => {
      (p.bnccCodes || []).forEach(code => bnccSet.add(code));
      aulasCount += (p.aulas || []).length;
    });

    return {
      totalWeeks: selected.length,
      totalBncc: bnccSet.size,
      totalAulas: aulasCount
    };
  }, [archivePlans, selectedPlanIds]);

  const activeLessonIndices = Array.isArray(selectedLessonIndices) && selectedLessonIndices.length > 0
    ? selectedLessonIndices
    : [selectedLessonIndex || 0];

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
      {/* Cabeçalho do Seletor de Escopo */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Origem do Conteúdo Curricular
          </span>
          <h4 className="text-xs font-bold text-slate-800">
            Escopo da Avaliação Escolar
          </h4>
        </div>

        {/* Chave Seletora: Plano Atual vs Prova Geral da Unidade */}
        <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60">
          <button
            type="button"
            onClick={() => onChangeScopeMode('plano_atual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              scopeMode === 'plano_atual'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prova Atual
          </button>
          <button
            type="button"
            onClick={() => onChangeScopeMode('multissemanas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              scopeMode === 'multissemanas'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Prova da Unidade</span>
            {archivePlans.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[9px] font-black">
                {archivePlans.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modo Plano Atual: Informações Rápidas e Granularidade */}
      {scopeMode === 'plano_atual' ? (
        <div className="space-y-2.5">
          {aulas.length > 1 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wide">
                  Abrangência desta Avaliação:
                </span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeLessonScopeMode) onChangeLessonScopeMode('todas');
                      if (onSelectAllLessons) onSelectAllLessons();
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      lessonScopeMode === 'todas'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Toda a Semana ({aulas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLessonScopeMode && onChangeLessonScopeMode('aulas_especificas')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      lessonScopeMode !== 'todas'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Aulas Selecionadas</span>
                    {activeLessonIndices.length > 0 && activeLessonIndices.length < aulas.length && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black">
                        {activeLessonIndices.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {lessonScopeMode === 'todas' ? (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Tema Geral da Semana
                    </span>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {currentPlan?.tema || 'Conteúdo da Semana Vigente'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold whitespace-nowrap">
                    Todas as {aulas.length} Aulas
                  </span>
                </div>
              ) : (
                /* Seleção Múltipla de Aulas com Checkboxes */
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10.5px] font-bold text-slate-600 block">
                      Marque as caixas das aulas que entrarão na prova:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectAllLessons && onSelectAllLessons()}
                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Marcar todas
                      </button>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={() => onDeselectAllLessons && onDeselectAllLessons()}
                        className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {aulas.map((aula, idx) => {
                      const isChecked = activeLessonIndices.includes(idx);

                      const handleToggle = () => {
                        if (onToggleLessonIndex) {
                          onToggleLessonIndex(idx);
                        } else if (onSelectLessonIndex) {
                          onSelectLessonIndex(idx);
                        }
                      };

                      return (
                        <div
                          key={idx}
                          onClick={handleToggle}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isChecked
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Tratado no wrapper div
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                            />
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isChecked
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs block truncate">
                                {aula.titulo || `Aula ${idx + 1}`}
                              </span>
                              {aula.objetivo && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {aula.objetivo}
                                </span>
                              )}
                            </div>
                          </div>
                          {isChecked && (
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Na Prova
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Contador de Aulas Selecionadas */}
                  <div className="bg-indigo-50/90 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-indigo-900">
                      <strong>{activeLessonIndices.length}</strong> de {aulas.length} {activeLessonIndices.length === 1 ? 'aula selecionada' : 'aulas selecionadas'}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700">
                      {activeLessonIndices.length === aulas.length ? 'Semana Completa' : 'Prova Focada'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-xl p-3 flex items-center justify-between shadow-2xs">
              <div className="min-w-0 pr-3">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Aula / Semana Aberta
                </span>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {currentPlan?.tema || 'Conteúdo da Semana Vigente'}
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold whitespace-nowrap">
                Foco Pontual
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Modo Multissemanas: Seleção de Planos do Acervo */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-slate-600">
              Selecione as semanas que entrarão na prova:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectAllPlans(archivePlans.map(p => p.id))}
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Marcar todas
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={onDeselectAllPlans}
                className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
              >
                Desmarcar
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-4 text-center text-xs text-slate-400">
              Carregando semanas do acervo...
            </div>
          ) : archivePlans.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500">
                Nenhum plano arquivado ainda para esta turma/unidade.
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                A prova será formulada com base no plano atual.
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {archivePlans.map((plan, pIdx) => {
                const isChecked = selectedPlanIds.includes(plan.id);
                const dateStr = plan.createdAt
                  ? new Date(plan.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '';

                return (
                  <div
                    key={plan.id}
                    onClick={() => onTogglePlanId(plan.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-50/60 border-indigo-300 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // tratado no wrapper div
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold block truncate">
                          Semana {pIdx + 1}: {plan.tema || 'Plano de Aula'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {plan.disciplina} &bull; {(plan.aulas || []).length} aulas
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dossiê de Resumo da Seleção */}
          {selectedStats.totalWeeks > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-900">
                <strong>{selectedStats.totalWeeks}</strong> {selectedStats.totalWeeks === 1 ? 'semana selecionada' : 'semanas selecionadas'}
              </span>
              <span className="text-[11px] font-bold text-indigo-700">
                {selectedStats.totalBncc} habilidades BNCC
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
