import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import AcervoCardGrid from '../components/acervo/AcervoCardGrid';
import AcervoDetailView from '../components/acervo/AcervoDetailView';
import CadernoAtividadesModal from '../components/modals/CadernoAtividadesModal';

export default function AcervoPedagogico() {
  const navigate = useNavigate();
  const { turmas, activeTurmaId, setActiveTurmaId, units, activeUnitId, setActiveUnitId, showAlert, authName } = useApp();

  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Modal de Caderno/Prova para planos históricos
  const [isCadernoModalOpen, setIsCadernoModalOpen] = useState(false);
  const [activeModalPlan, setActiveModalPlan] = useState(null);
  const [modalInitialLessonIndex, setModalInitialLessonIndex] = useState(null);
  const [modalInitialFormat, setModalInitialFormat] = useState('caderno_padrao');

  // Inicializa os filtros preferencialmente com a turma e unidade ativas do contexto global
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState(activeTurmaId || 'todas');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState(activeUnitId || 'todas');
  const [isTurmaFilterOpen, setIsTurmaFilterOpen] = useState(false);
  const [isUnitFilterOpen, setIsUnitFilterOpen] = useState(false);

  // Rastreia a última turma e unidade recebidas para permitir alternância reativa com o Header global
  const lastActiveTurmaRef = useRef(activeTurmaId);
  const lastActiveUnitRef = useRef(activeUnitId);

  useEffect(() => {
    if (activeTurmaId && activeTurmaId !== lastActiveTurmaRef.current) {
      lastActiveTurmaRef.current = activeTurmaId;
      setSelectedTurmaFilter(activeTurmaId);
    }
  }, [activeTurmaId]);

  useEffect(() => {
    if (activeUnitId && activeUnitId !== lastActiveUnitRef.current) {
      lastActiveUnitRef.current = activeUnitId;
      setSelectedUnitFilter(activeUnitId);
    }
  }, [activeUnitId]);

  const currentTurma = useMemo(() => (turmas || []).find(t => String(t.id) === String(activeTurmaId)), [turmas, activeTurmaId]);
  const currentUnit = useMemo(() => (units || []).find(u => String(u.id) === String(activeUnitId)), [units, activeUnitId]);

  // Carrega planos do acervo com suporte a Todas as Turmas e Todas as Unidades
  const loadArchivePlans = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.planArchiveList) {
        const filters = {};
        if (selectedTurmaFilter !== 'todas') {
          filters.turmaId = Number(selectedTurmaFilter);
          const matchedTurma = (turmas || []).find(t => String(t.id) === String(selectedTurmaFilter));
          if (matchedTurma) {
            filters.turmaName = matchedTurma.name;
          }
        }
        if (selectedUnitFilter !== 'todas') {
          filters.unitId = Number(selectedUnitFilter);
          const matchedUnit = (units || []).find(u => String(u.id) === String(selectedUnitFilter));
          if (matchedUnit) {
            filters.unitLabel = matchedUnit.name;
          }
        }
        const res = await window.electronAPI.planArchiveList(filters);
        if (res && res.success) {
          setPlans(res.plans || []);
        } else {
          setPlans([]);
        }
      }
    } catch (err) {
      console.error('[AcervoPedagogico] Erro ao carregar planos:', err);
      showAlert('Aviso', 'Não foi possível carregar a lista de planos arquivados.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTurmaFilter, selectedUnitFilter, turmas, units, showAlert]);

  useEffect(() => {
    loadArchivePlans();
  }, [loadArchivePlans]);

  // Exclusão com confirmação
  const handleDeletePlan = async (planId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm('Deseja realmente remover este plano do acervo histórico?')) return;

    try {
      if (window.electronAPI && window.electronAPI.planArchiveDelete) {
        const res = await window.electronAPI.planArchiveDelete(planId);
        if (res && res.success) {
          showAlert('Sucesso', 'Plano removido do acervo.', 'success');
          if (selectedPlan && selectedPlan.id === planId) {
            setSelectedPlan(null);
          }
          loadArchivePlans();
        } else {
          showAlert('Erro', res.error || 'Falha ao remover plano.', 'error');
        }
      }
    } catch (err) {
      showAlert('Erro', 'Ocorreu uma falha ao excluir o plano.', 'error');
    }
  };

  // Disparo de Caderno de Atividades para um plano arquivado
  const handleOpenCaderno = (plan, lessonIndex = null) => {
    const rawData = plan.fullData || plan;
    setActiveModalPlan(rawData);
    setModalInitialLessonIndex(typeof lessonIndex === 'number' ? lessonIndex : null);
    setModalInitialFormat('caderno_padrao');
    setIsCadernoModalOpen(true);
  };

  // Disparo de Avaliação/Mini-teste
  const handleGenerateMiniTest = (plan, lessonIndex = null) => {
    const rawData = plan.fullData || plan;
    setActiveModalPlan(rawData);
    setModalInitialLessonIndex(typeof lessonIndex === 'number' ? lessonIndex : null);
    setModalInitialFormat('avaliacao_formal');
    setIsCadernoModalOpen(true);
  };

  // Disparo de Exportação do Plano Docente em PDF diretamente do acervo
  const handleExportLessonPlanPDF = async (plan) => {
    if (!plan) return;
    setIsExportingPDF(true);
    const rawData = plan.fullData || plan;
    try {
      const discTitle = rawData.disciplina || plan.disciplina || 'Plano';
      const title = `Plano de Aula - ${discTitle} - ${rawData.tema || plan.tema || 'Sem Título'}`;
      const unitLabel = plan.unitLabel || currentUnit?.name || 'Unidade';
      const professorName = plan.professorName || authName || 'Professor(a)';

      if (window.electronAPI && window.electronAPI.exportLessonPlanPDF) {
        const res = await window.electronAPI.exportLessonPlanPDF(rawData, title, unitLabel, professorName);
        if (res && res.success) {
          showAlert('Sucesso', 'Plano de Aula exportado para PDF com sucesso.', 'success');
        } else if (res && !res.cancelled) {
          throw new Error(res.error || 'Falha na exportação do PDF');
        }
      }
    } catch (err) {
      console.error('[AcervoPedagogico] Erro ao exportar plano docente PDF:', err);
      showAlert('Erro', 'Não foi possível exportar o Plano de Aula para PDF: ' + err.message, 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none">
      {/* Sub-header Compacto com Botão Voltar e Breadcrumb */}
      <div className="bg-white border-b border-slate-200/90 px-6 py-3 flex items-center justify-between gap-4 shadow-2xs flex-shrink-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => {
              if (selectedPlan) {
                setSelectedPlan(null);
              } else {
                navigate('/ai_generator');
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold active:scale-[0.98] shrink-0"
            title="Voltar"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>
              {selectedPlan ? 'Voltar à Lista de Aulas' : 'Voltar ao Gerador de IA'}
            </span>
          </button>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-xs font-bold text-slate-700 truncate max-w-[240px] sm:max-w-[340px] md:max-w-[440px] lg:max-w-[540px] xl:max-w-[680px] cursor-help hover:text-indigo-600 transition-colors"
              title={selectedPlan ? selectedPlan.tema : 'Banco Histórico de Planos e Atividades'}
            >
              {selectedPlan ? (selectedPlan.tema || 'Dossiê da Aula') : 'Banco Histórico de Planos e Atividades'}
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100/80 shrink-0 whitespace-nowrap">
              {selectedTurmaFilter === 'todas' ? 'Todas as Turmas' : ((turmas || []).find(t => String(t.id) === String(selectedTurmaFilter))?.name || 'Turma')} &bull; {selectedUnitFilter === 'todas' ? 'Todas as Unidades' : ((units || []).find(u => String(u.id) === String(selectedUnitFilter))?.name || 'Unidade')}
            </span>
          </div>
        </div>

        {/* Seletores Flutuantes Premium de Turma e Unidade */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Seletor Customizado de Turma */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTurmaFilterOpen(prev => !prev);
                setIsUnitFilterOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 rounded-xl shadow-2xs hover:shadow-xs transition-all text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
              title="Filtrar planos por turma"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Turma</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-slate-800 font-extrabold max-w-[120px] md:max-w-[150px] truncate">
                {selectedTurmaFilter === 'todas' ? 'Todas as Turmas' : ((turmas || []).find(t => String(t.id) === String(selectedTurmaFilter))?.name || 'Turma')}
              </span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTurmaFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Overlay com transição de opacidade */}
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                isTurmaFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsTurmaFilterOpen(false)}
            />

            {/* Menu com animação suave de entrada e saída */}
            <div
              className={`absolute right-0 top-[100%] mt-2 w-64 bg-white rounded-2xl border border-slate-200/80 p-2 z-50 shadow-2xl origin-top-right transition-all duration-200 ease-out ${
                isTurmaFilterOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtrar por Turma</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {selectedTurmaFilter === 'todas' ? `${plans.length} no acervo` : 'Filtrado'}
                </span>
              </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                  <button
                    onClick={() => {
                      setSelectedTurmaFilter('todas');
                      setIsTurmaFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedTurmaFilter === 'todas'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedTurmaFilter === 'todas' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>Todas as Turmas</span>
                    </div>
                    {selectedTurmaFilter === 'todas' && (
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                  {(turmas || []).map(t => {
                    const isSelected = String(selectedTurmaFilter) === String(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTurmaFilter(t.id);
                          lastActiveTurmaRef.current = t.id;
                          if (setActiveTurmaId) setActiveTurmaId(t.id);
                          setIsTurmaFilterOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                          <span className="truncate">{t.name}</span>
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
          </div>

          {/* Seletor Customizado de Unidade */}
          <div className="relative">
            <button
              onClick={() => {
                setIsUnitFilterOpen(prev => !prev);
                setIsTurmaFilterOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-300 rounded-xl shadow-2xs hover:shadow-xs transition-all text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
              title="Filtrar planos por unidade"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">Unidade</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-800 font-extrabold max-w-[120px] md:max-w-[150px] truncate">
                {selectedUnitFilter === 'todas' ? 'Todas as Unidades' : ((units || []).find(u => String(u.id) === String(selectedUnitFilter))?.name || 'Unidade')}
              </span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUnitFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Overlay com transição de opacidade */}
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                isUnitFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsUnitFilterOpen(false)}
            />

            {/* Menu com animação suave de entrada e saída */}
            <div
              className={`absolute right-0 top-[100%] mt-2 w-56 bg-white rounded-2xl border border-slate-200/80 p-2 z-50 shadow-2xl origin-top-right transition-all duration-200 ease-out ${
                isUnitFilterOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtrar por Unidade</span>
              </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedUnitFilter('todas');
                      setIsUnitFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedUnitFilter === 'todas'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedUnitFilter === 'todas' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>Todas as Unidades</span>
                    </div>
                    {selectedUnitFilter === 'todas' && (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                  {(units || []).map(u => {
                    const isSelected = String(selectedUnitFilter) === String(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUnitFilter(u.id);
                          lastActiveUnitRef.current = u.id;
                          if (setActiveUnitId) setActiveUnitId(u.id);
                          setIsUnitFilterOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span>{u.name}</span>
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Central: Alterna entre Grade e Detalhes */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Carregando acervo didático...</p>
          </div>
        ) : selectedPlan ? (
          <AcervoDetailView
            plan={selectedPlan}
            onBack={() => setSelectedPlan(null)}
            onExportLessonPlanPDF={handleExportLessonPlanPDF}
            isExportingPDF={isExportingPDF}
            onGenerateMiniTest={handleGenerateMiniTest}
            onExportActivityBook={handleOpenCaderno}
            onDeletePlan={(id) => handleDeletePlan(id)}
          />
        ) : (
          <AcervoCardGrid
            plans={plans}
            onSelectPlan={(plan) => setSelectedPlan(plan)}
            onDeletePlan={handleDeletePlan}
            onNewPlanClick={() => navigate('/ai_generator')}
            onResetFilters={() => {
              setSelectedTurmaFilter('todas');
              setSelectedUnitFilter('todas');
            }}
            activeTurmaName={selectedTurmaFilter === 'todas' ? 'Geral' : ((turmas || []).find(t => String(t.id) === String(selectedTurmaFilter))?.name || 'Turma')}
            activeUnitName={selectedUnitFilter === 'todas' ? 'Geral' : ((units || []).find(u => String(u.id) === String(selectedUnitFilter))?.name || 'Unidade')}
          />
        )}
      </div>

      {/* Modal de Caderno e Avaliações conectado a planos históricos */}
      {isCadernoModalOpen && activeModalPlan && (
        <CadernoAtividadesModal
          isOpen={isCadernoModalOpen}
          onClose={() => {
            setIsCadernoModalOpen(false);
            setActiveModalPlan(null);
            setModalInitialLessonIndex(null);
            setModalInitialFormat('caderno_padrao');
          }}
          planData={activeModalPlan}
          initialLessonIndex={modalInitialLessonIndex}
          initialFormat={modalInitialFormat}
          title={`Atividades - ${activeModalPlan.disciplina || 'Componente'} - ${activeModalPlan.tema || 'Plano de Aula'}`}
          unitLabel={currentUnit?.name || 'Unidade'}
          professorName={authName || 'Professor(a)'}
          onExportSuccess={() => showAlert('Sucesso', 'Documento gerado com sucesso.', 'success')}
        />
      )}
    </div>
  );
}
