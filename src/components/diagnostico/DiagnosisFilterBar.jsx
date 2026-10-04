/* eslint-disable react/prop-types */
import { useState } from 'react';

export default function DiagnosisFilterBar({
  totalCount = 0,
  searchTerm = '',
  onSearchChange,
  selectedTurma = 'todas',
  onTurmaChange,
  turmas = [],
  selectedUnit = 'todas',
  onUnitChange,
  units = []
}) {
  const [isTurmaOpen, setIsTurmaOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);

  const selectedTurmaObj = turmas.find(t => String(t.id) === String(selectedTurma));
  const turmaLabel = selectedTurma === 'todas' ? 'Todas as Turmas' : (selectedTurmaObj?.name || 'Turma');

  const selectedUnitObj = units.find(u => String(u.id) === String(selectedUnit));
  const unitLabel = selectedUnit === 'todas' ? 'Todas as Unidades' : (selectedUnitObj?.name || 'Unidade');

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Lado Esquerdo: Campo de Busca e Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
        {/* Campo de Busca por Nome do Estudante */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar busca"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown Customizado Premium: Turma */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsTurmaOpen(prev => !prev);
              setIsUnitOpen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            title="Filtrar por Turma"
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Turma</span>
            <span className={`w-2 h-2 rounded-full ${selectedTurma === 'todas' ? 'bg-indigo-500' : 'bg-indigo-600'}`} />
            <span className="text-slate-800 font-extrabold max-w-[130px] truncate">
              {turmaLabel}
            </span>
            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTurmaOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isTurmaOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTurmaOpen(false)} />
              <div className="absolute left-0 sm:left-auto top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 p-1.5 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Filtrar por Turma</span>
                  <span className="text-slate-300 font-bold">{turmas.length} turmas</span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onTurmaChange('todas');
                      setIsTurmaOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedTurma === 'todas'
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedTurma === 'todas' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>Todas as Turmas</span>
                    </div>
                    {selectedTurma === 'todas' && (
                      <span className="text-indigo-600 font-black text-xs">✓</span>
                    )}
                  </button>

                  {turmas.map(t => {
                    const isSelected = String(selectedTurma) === String(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onTurmaChange(t.id);
                          setIsTurmaOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                          <span className="truncate">{t.name}</span>
                        </div>
                        {isSelected && (
                          <span className="text-indigo-600 font-black text-xs shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dropdown Customizado Premium: Unidade */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsUnitOpen(prev => !prev);
              setIsTurmaOpen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            title="Filtrar por Unidade"
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Unidade</span>
            <span className={`w-2 h-2 rounded-full ${selectedUnit === 'todas' ? 'bg-emerald-500' : 'bg-emerald-600'}`} />
            <span className="text-slate-800 font-extrabold max-w-[130px] truncate">
              {unitLabel}
            </span>
            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUnitOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isUnitOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUnitOpen(false)} />
              <div className="absolute left-0 sm:left-auto top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200/90 p-1.5 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Filtrar por Unidade
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onUnitChange('todas');
                      setIsUnitOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedUnit === 'todas'
                        ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedUnit === 'todas' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>Todas as Unidades</span>
                    </div>
                    {selectedUnit === 'todas' && (
                      <span className="text-emerald-600 font-black text-xs">✓</span>
                    )}
                  </button>

                  {units.map(u => {
                    const isSelected = String(selectedUnit) === String(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onUnitChange(u.id);
                          setIsUnitOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="truncate">{u.name}</span>
                        </div>
                        {isSelected && (
                          <span className="text-emerald-600 font-black text-xs shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lado Direito: Contador e Indicador */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>
            <strong className="text-indigo-600 font-extrabold">{totalCount}</strong> {totalCount === 1 ? 'diagnóstico arquivado' : 'diagnósticos arquivados'}
          </span>
        </span>
      </div>
    </div>
  );
}
