import React, { useState, useMemo } from 'react';
import { Icons } from '../../assets/icons';

export default function AcervoCardGrid({
  plans = [],
  onSelectPlan,
  onDeletePlan,
  onNewPlanClick,
  onResetFilters,
  activeTurmaName = 'Todas as Turmas',
  activeUnitName = 'Todas as Unidades'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('todas');

  // Disciplinas únicas presentes nos planos
  const availableDisciplinas = useMemo(() => {
    const set = new Set();
    plans.forEach(p => {
      if (p.disciplina) set.add(p.disciplina);
    });
    return Array.from(set);
  }, [plans]);

  // Filtragem combinada
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      if (selectedDisciplina !== 'todas' && plan.disciplina !== selectedDisciplina) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const temaMatch = String(plan.tema || '').toLowerCase().includes(q);
        const discMatch = String(plan.disciplina || '').toLowerCase().includes(q);
        const bnccMatch = (plan.bnccCodes || []).some(b => String(b).toLowerCase().includes(q));
        const aulasMatch = (plan.aulas || []).some(a => String(a.titulo || '').toLowerCase().includes(q));
        return temaMatch || discMatch || bnccMatch || aulasMatch;
      }
      return true;
    });
  }, [plans, selectedDisciplina, searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por tema, BNCC ou conteúdo de aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Componente Curricular */}
          {availableDisciplinas.length > 1 && (
            <select
              value={selectedDisciplina}
              onChange={(e) => setSelectedDisciplina(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="todas">Todos os Componentes</option>
              {availableDisciplinas.map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          )}
        </div>

        {/* Contador e Ação Rápida */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs font-semibold text-slate-500">
            <strong className="text-indigo-600 font-bold">{filteredPlans.length}</strong> {filteredPlans.length === 1 ? 'plano arquivado' : 'planos arquivados'}
          </span>
          <button
            onClick={onNewPlanClick}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>+</span> Novo Plano de Aula
          </button>
        </div>
      </div>

      {/* Grade de Cartões */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredPlans.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">Nenhum plano arquivado encontrado</h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {searchTerm || selectedDisciplina !== 'todas'
                ? 'Nenhum plano corresponde aos filtros aplicados. Tente ajustar os termos de busca.'
                : 'Nenhum plano localizado para a combinação de filtros selecionada. Alterne para "Todas as Turmas" ou gere um novo plano.'}
            </p>
            <div className="flex items-center gap-2">
              {onResetFilters && (
                <button
                  onClick={onResetFilters}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ver Todas as Turmas / Unidades
                </button>
              )}
              <button
                onClick={onNewPlanClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Criar Primeiro Plano com IA
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {filteredPlans.map((plan, index) => {
              const formattedDate = plan.createdAt
                ? new Date(plan.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : 'Data recente';
              const totalAulas = (plan.aulas || []).length;

              return (
                <div
                  key={plan.id}
                  onClick={() => onSelectPlan(plan)}
                  className="bg-white border border-slate-200/90 hover:border-indigo-300 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Borda decorativa superior */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Linha de Metadados: Turma, Unidade e Data */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                          {plan.turmaName || plan.turma || plan.publico || (activeTurmaName !== 'Geral' ? activeTurmaName : 'Turma')}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {plan.unitLabel || plan.unidade || (activeUnitName !== 'Geral' ? activeUnitName : 'Unidade')}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Título e Componente */}
                    <h4
                      className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1.5 leading-snug cursor-help"
                      title={plan.tema || 'Plano de Aula'}
                    >
                      {plan.tema || 'Plano de Aula'}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mb-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      {plan.disciplina || 'Componente Curricular'}
                    </p>

                    {/* Habilidades BNCC */}
                    {plan.bnccCodes && plan.bnccCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {plan.bnccCodes.slice(0, 3).map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/80 rounded text-[9px] font-black"
                          >
                            {code}
                          </span>
                        ))}
                        {plan.bnccCodes.length > 3 && (
                          <span className="px-1 py-0.5 text-slate-400 text-[9px] font-bold">
                            +{plan.bnccCodes.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <span className="text-[11px] font-medium text-slate-500">
                      <strong>{totalAulas}</strong> {totalAulas === 1 ? 'aula' : 'aulas'} estruturadas
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        title="Excluir do acervo"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlan(plan.id, e);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ml-1">
                        Abrir <span aria-hidden="true">&rarr;</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
