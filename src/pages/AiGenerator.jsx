import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from "../contexts/AppContext";
import { Icons } from '../assets/icons';
import { normalizeWeeklySchedule, getWeekDetailsForDate } from '../utils/scheduleUtils';
import { searchHabilidades, getHabilidadeByCodigo, sanitizeBnccCode } from '../utils/bnccData';

import CadernoAtividadesModal from '../components/modals/CadernoAtividadesModal';
import CustomDatePicker from '../components/shared/CustomDatePicker';

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function AiGenerator() {
  const navigate = useNavigate();
  const { showAlert, turmas, activeTurmaId, setActiveTurmaId, units, activeUnitId, authName } = useApp();

  // Estados Locais
  const [selectedTurmaId, setSelectedTurmaId] = useState(activeTurmaId || (turmas[0]?.id || 1));
  const currentTurma = turmas.find(t => t.id === Number(selectedTurmaId)) || turmas[0];

  // Sincroniza com a turma ativa global caso o Header mude
  useEffect(() => {
    if (activeTurmaId) {
      setSelectedTurmaId(activeTurmaId);
    }
  }, [activeTurmaId]);

  const [aiPublico, setAiPublico] = useState(currentTurma ? currentTurma.name : "");
  const [aiDisciplina, setAiDisciplina] = useState("Língua Portuguesa");
  const [customDisciplina, setCustomDisciplina] = useState("");
  const [aiTema, setAiTema] = useState("");
  const [totalAulas, setTotalAulas] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSchedule, setCustomSchedule] = useState([]);
  
  const [aiDuracao, setAiDuracao] = useState("4 aulas de 50 minutos");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados da Diretriz Curricular BNCC
  const [selectedBnccCodes, setSelectedBnccCodes] = useState([]);
  const [bnccSearch, setBnccSearch] = useState("");
  const [isBnccExpanded, setIsBnccExpanded] = useState(false);
  const [customBnccInput, setCustomBnccInput] = useState("");
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [isTurmaMenuOpen, setIsTurmaMenuOpen] = useState(false);
  const [isDisciplinaMenuOpen, setIsDisciplinaMenuOpen] = useState(false);

  // Sempre que a turma selecionada mudar, sincronizar o público-alvo
  useEffect(() => {
    const t = turmas.find(t => t.id === Number(selectedTurmaId));
    if (t) {
      setAiPublico(t.name);
    }
  }, [selectedTurmaId, turmas]);

  // Recalcula automaticamente as datas de aula sugeridas com base na grade da turma
  useEffect(() => {
    const t = turmas.find(t => t.id === Number(selectedTurmaId));
    const normSchedule = normalizeWeeklySchedule(t?.weekly_schedule);
    const startObj = new Date(startDate + 'T00:00:00');
    
    let target = Number(totalAulas) || 4;
    let items = [];
    let curr = new Date(startDate + 'T00:00:00');
    
    let daysChecked = 0;
    while (target > 0 && daysChecked < 60) {
      const dayIdx = curr.getDay();
      const key = DAY_KEYS[dayIdx];
      const { weekObj, weekLabel } = getWeekDetailsForDate(curr, startObj, normSchedule);
      const countForDay = weekObj[key] || 0;
      
      if (countForDay > 0) {
        const countToUse = Math.min(countForDay, target);
        const dayStr = String(curr.getDate()).padStart(2, '0') + '/' + String(curr.getMonth() + 1).padStart(2, '0') + '/' + curr.getFullYear();
        items.push({
          id: Date.now() + daysChecked,
          dateStr: dayStr,
          dayName: DAY_NAMES[dayIdx],
          count: countToUse,
          weekLabel: normSchedule.use_two_weeks ? weekLabel : null
        });
        target -= countToUse;
      }
      curr.setDate(curr.getDate() + 1);
      daysChecked++;
    }

    if (items.length === 0 && target > 0) {
      let fallbackDate = new Date(startDate + 'T00:00:00');
      for (let i = 0; i < target; i++) {
        const dayIdx = fallbackDate.getDay();
        const dayStr = String(fallbackDate.getDate()).padStart(2, '0') + '/' + String(fallbackDate.getMonth() + 1).padStart(2, '0') + '/' + fallbackDate.getFullYear();
        items.push({
          id: Date.now() + i,
          dateStr: dayStr,
          dayName: DAY_NAMES[dayIdx],
          count: 1
        });
        fallbackDate.setDate(fallbackDate.getDate() + 1);
      }
    }

    setCustomSchedule(items);
    setAiDuracao(`${totalAulas} aula(s) de 50 minutos`);
  }, [selectedTurmaId, startDate, totalAulas, turmas]);

  const handleUpdateScheduleCount = (index, delta) => {
    setCustomSchedule(prev => {
      const updated = [...prev];
      const newCount = Math.max(1, updated[index].count + delta);
      updated[index] = { ...updated[index], count: newCount };
      return updated;
    });
  };

  const handleRemoveScheduleItem = (index) => {
    setCustomSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (!aiPublico.trim() || !aiTema.trim() || !aiDuracao.trim()) {
      showAlert("Campos Vazios", "Preencha todos os campos para gerar o plano.", "warning");
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);

    try {
      let scheduleToUse = customSchedule;
      if (!scheduleToUse || scheduleToUse.length === 0) {
        let fallbackDate = new Date(startDate + 'T00:00:00');
        const countNeeded = Number(totalAulas) || 4;
        scheduleToUse = [];
        for (let i = 0; i < countNeeded; i++) {
          const dayIdx = fallbackDate.getDay();
          const dayStr = String(fallbackDate.getDate()).padStart(2, '0') + '/' + String(fallbackDate.getMonth() + 1).padStart(2, '0') + '/' + fallbackDate.getFullYear();
          scheduleToUse.push({
            id: Date.now() + i,
            dateStr: dayStr,
            dayName: DAY_NAMES[dayIdx],
            count: 1
          });
          fallbackDate.setDate(fallbackDate.getDate() + 1);
        }
      }

      const cronogramaDetallado = scheduleToUse.map(s => ({
        date: s.dateStr,
        dayName: s.dayName,
        count: s.count
      }));

      const activeUnit = units?.find(u => u.id === activeUnitId);
      const unitLabel = activeUnit ? (activeUnit.name || `UNIDADE ${activeUnit.number || ''}`) : 'UNIDADE VIGENTE';
      const professorName = authName || 'Professor(a)';
      const effectiveDisciplina = aiDisciplina === 'Outra' ? (customDisciplina.trim() || 'Componente Curricular') : aiDisciplina;

      // Enriquecimento das habilidades selecionadas com a descrição oficial da BNCC
      const enrichedBnccItems = selectedBnccCodes.map(code => {
        const clean = sanitizeBnccCode(code);
        const match = getHabilidadeByCodigo(clean);
        return {
          codigo: match ? match.codigo : clean,
          descricao: match ? match.descricao : "",
          disciplina: match ? match.disciplina : ""
        };
      });

      const res = await window.electronAPI.generateLessonPlan({
        publico: aiPublico,
        disciplina: effectiveDisciplina,
        tema: aiTema,
        duracao: aiDuracao,
        cronogramaDetallado,
        unitLabel,
        professorName,
        bnccCodes: selectedBnccCodes,
        bnccDetails: enrichedBnccItems
      });

      if (res.success && res.data) {
        const effectiveTurma = currentTurma?.name || aiPublico;
        const effectiveTurmaId = selectedTurmaId ? Number(selectedTurmaId) : (currentTurma?.id ? Number(currentTurma.id) : 1);
        const effectiveUnitId = activeUnitId ? Number(activeUnitId) : (units?.[0]?.id ? Number(units[0].id) : 1);
        const enrichedPlan = {
          ...res.data,
          turma: res.data.turma || effectiveTurma,
          turmaId: effectiveTurmaId,
          turmaName: effectiveTurma,
          unitId: effectiveUnitId,
          unidade: unitLabel,
          unitLabel,
          professor: professorName,
          professorName,
          disciplina: effectiveDisciplina,
          tema: aiTema,
          bnccCodes: selectedBnccCodes
        };

        let savedRecord = enrichedPlan;
        try {
          if (window.electronAPI?.planArchiveSave) {
            const saveRes = await window.electronAPI.planArchiveSave(enrichedPlan);
            if (saveRes?.success && saveRes?.plan) {
              savedRecord = { ...enrichedPlan, ...saveRes.plan };
            }
          }
        } catch (e) {
          console.warn("[Auto-Archive] Erro não impeditivo:", e);
        }

        setGeneratedPlan(savedRecord);
        showAlert("Sucesso!", "Plano de aula gerado com sucesso e arquivado no Acervo Didático.", "success");
      } else {
        const formatAIError = (rawError) => {
          if (!rawError) return "Ocorreu um erro ao gerar o plano de aula.";
          const errStr = String(rawError);
          if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("Too Many Requests")) {
            return "O limite temporário de requisições gratuitas do Google Gemini foi atingido. Aguarde cerca de 30 segundos para tentar novamente ou cadastre sua chave de API nas Configurações.";
          }
          if (errStr.includes("fetch failed") || errStr.includes("ENOTFOUND")) {
            return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
          }
          return errStr.length > 150 ? errStr.substring(0, 150) + "..." : errStr;
        };
        showAlert("Atenção na Geração", formatAIError(res.error), "warning");
      }
    } catch (error) {
      showAlert("Falha Crítica", "Ocorreu um erro ao comunicar com a I.A.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!generatedPlan) return;
    setIsExportingPDF(true);
    try {
      const discTitle = generatedPlan.disciplina || (aiDisciplina === 'Outra' ? customDisciplina : aiDisciplina) || 'Plano';
      const title = `Plano de Aula - ${discTitle} - ${generatedPlan.tema || aiTema || 'Sem Título'}`;
      const activeUnit = units?.find(u => u.id === activeUnitId);
      const unitLabel = activeUnit ? (activeUnit.name || `Unidade ${activeUnit.number || ''}`) : 'Unidade';
      const professorName = authName || 'Professor(a)';

      const effectiveTurma = generatedPlan.turma || generatedPlan.turmaName || currentTurma?.name || aiPublico;
      const effectiveTurmaId = Number(generatedPlan.turmaId || selectedTurmaId || currentTurma?.id || 1);
      const effectiveUnitId = Number(generatedPlan.unitId || activeUnitId || units?.[0]?.id || 1);
      const planToExport = {
        ...generatedPlan,
        turma: effectiveTurma,
        turmaId: effectiveTurmaId,
        turmaName: effectiveTurma,
        unitId: effectiveUnitId,
        unidade: generatedPlan.unidade || generatedPlan.unitLabel || unitLabel,
        unitLabel: generatedPlan.unitLabel || generatedPlan.unidade || unitLabel,
        professor: generatedPlan.professor || generatedPlan.professorName || professorName,
        professorName: generatedPlan.professorName || generatedPlan.professor || professorName
      };

      // Garantia de persistência no acervo antes da exportação
      if (window.electronAPI?.planArchiveSave) {
        try {
          const saveRes = await window.electronAPI.planArchiveSave(planToExport);
          if (saveRes?.success && saveRes?.plan) {
            setGeneratedPlan({ ...planToExport, ...saveRes.plan });
          }
        } catch (e) {
          console.warn("[Export-Archive] Aviso ao sincronizar com acervo:", e);
        }
      }

      const res = await window.electronAPI.exportLessonPlanPDF(planToExport, title, unitLabel, professorName);
      if (res.success) {
        showAlert("Sucesso!", "Plano de Aula exportado para PDF e confirmado no Acervo Didático.", "success");
      } else if (!res.cancelled) {
        throw new Error(res.error);
      }
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showAlert("Falha na Exportação", "Ocorreu um erro ao gerar o PDF: " + error.message, "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportActivitiesPDF = () => {
    if (!generatedPlan) return;
    setIsActivitiesModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col min-h-0 bg-white overflow-hidden">
      {/* Header Compacto do Gerador (Barra de Ferramentas) */}
      <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800/80 flex-shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            {Icons.Brain}
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black tracking-tight">
              Arquiteto <span className="text-orange-400">Pedagógico</span>
            </h3>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Alinhado à BNCC
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/acervo-pedagogico')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-200 hover:text-white border border-indigo-400/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] group"
            title="Acessar o Acervo Didático com planos de aula e avaliações anteriores"
          >
            <svg className="w-4 h-4 text-indigo-300 group-hover:text-indigo-100 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Acervo Didático & Provas</span>
          </button>
          {generatedPlan ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {generatedPlan.tema || aiTema || 'Plano Gerado'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Arquivado no Acervo
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              Distribuição automatizada no diário com suporte curricular
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Painel de Inputs (Esquerda) */}
        <div className="w-full lg:w-[380px] p-4 border-r border-slate-100 overflow-y-auto bg-slate-50/30 flex-shrink-0 space-y-4">
            <form onSubmit={handleGeneratePlan} className="space-y-4">
              {/* Seleção de Turma Customizada */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                  Turma / Série
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTurmaMenuOpen(prev => !prev);
                    setIsDisciplinaMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs text-slate-700 flex items-center justify-between shadow-2xs hover:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span className="truncate">{currentTurma?.name || 'Selecione uma turma'}</span>
                  </div>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isTurmaMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Menu com transição suave de entrada e saída */}
                <div
                  className={`absolute left-0 top-[100%] mt-2 w-full bg-white rounded-2xl border border-slate-200/90 p-2 z-50 shadow-2xl origin-top transition-all duration-200 ease-out ${
                    isTurmaMenuOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turmas do Professor</span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {turmas.length} turmas
                    </span>
                  </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                      {turmas.map(t => {
                        const isSelected = Number(selectedTurmaId) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTurmaId(t.id);
                              if (setActiveTurmaId) setActiveTurmaId(t.id);
                              setIsTurmaMenuOpen(false);
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

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                  Público-Alvo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 6º Ano Fund. II"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
                  value={aiPublico}
                  onChange={(e) => setAiPublico(e.target.value)}
                />
              </div>

              {/* Componente Curricular / Disciplina Customizado */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Disciplina / Componente</span>
                  <span className="text-[9px] text-indigo-500 font-bold lowercase tracking-normal">BNCC obrigatória</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsDisciplinaMenuOpen(prev => !prev);
                    setIsTurmaMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs text-slate-700 flex items-center justify-between shadow-2xs hover:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="truncate">{aiDisciplina === "Outra" ? (customDisciplina ? `Outra (${customDisciplina})` : "Outra Disciplina...") : aiDisciplina}</span>
                  </div>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isDisciplinaMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Overlay com transição de opacidade */}
                <div
                  className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                    isDisciplinaMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={() => setIsDisciplinaMenuOpen(false)}
                />

                {/* Menu com transição suave de entrada e saída */}
                <div
                  className={`absolute left-0 top-[100%] mt-2 w-full bg-white rounded-2xl border border-slate-200/90 p-2 z-50 shadow-2xl origin-top transition-all duration-200 ease-out ${
                    isDisciplinaMenuOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Componente Curricular</span>
                  </div>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                      {[
                        { label: 'Língua Portuguesa', val: 'Língua Portuguesa' },
                        { label: 'Matemática', val: 'Matemática' },
                        { label: 'História', val: 'História' },
                        { label: 'Geografia', val: 'Geografia' },
                        { label: 'Ciências', val: 'Ciências' },
                        { label: 'Língua Inglesa', val: 'Língua Inglesa' },
                        { label: 'Arte', val: 'Arte' },
                        { label: 'Educação Física', val: 'Educação Física' },
                        { label: 'MPV (Mundo do Trabalho / Vida)', val: 'MPV' },
                        { label: 'Outra Disciplina...', val: 'Outra' }
                      ].map(item => {
                        const isSelected = aiDisciplina === item.val;
                        return (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => {
                              setAiDisciplina(item.val);
                              setIsDisciplinaMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-purple-600' : 'bg-slate-300'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isSelected && (
                              <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                {aiDisciplina === "Outra" && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da disciplina (ex: Matemática, História)..."
                    value={customDisciplina}
                    onChange={(e) => setCustomDisciplina(e.target.value)}
                    className="w-full mt-2 px-4 py-2 rounded-xl bg-white border border-indigo-200 outline-none font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs animate-in fade-in duration-200 text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tema/Assunto Central
                </label>
                <textarea
                  required
                  placeholder="Ex: Escrita do Conto, Frações Equivalentes..."
                  className="w-full h-20 px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs resize-none"
                  value={aiTema}
                  onChange={(e) => setAiTema(e.target.value)}
                />
              </div>

              {/* SELETOR DE HABILIDADES BNCC (DIRETRIZ CURRICULAR) */}
              <div className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">
                      HABILIDADES BNCC
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      Opcional
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBnccExpanded(!isBnccExpanded)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/90 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    {selectedBnccCodes.length > 0 && (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        {selectedBnccCodes.length} selecionada(s)
                      </span>
                    )}
                    <span>
                      {isBnccExpanded 
                        ? 'Fechar' 
                        : selectedBnccCodes.length > 0 
                          ? 'Alterar Códigos' 
                          : 'Selecionar BNCC'}
                    </span>
                  </button>
                </div>

                {/* Habilidades Selecionadas Ativas (Chips) */}
                {selectedBnccCodes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {selectedBnccCodes.map(code => {
                      const skillInfo = getHabilidadeByCodigo(code);
                      return (
                        <span
                          key={code}
                          title={skillInfo ? `${skillInfo.disciplina}: ${skillInfo.descricao}` : code}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] shadow-sm animate-in fade-in zoom-in-95 duration-150"
                        >
                          <span>{code}</span>
                          {skillInfo && (
                            <span className="text-[9px] font-normal text-indigo-200 hidden sm:inline">
                              • {skillInfo.disciplina}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedBnccCodes(prev => prev.filter(c => c !== code))}
                            className="w-4 h-4 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/40 text-white text-[11px] font-black transition-colors cursor-pointer"
                            title={`Remover habilidade ${code}`}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedBnccCodes([])}
                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 cursor-pointer underline ml-1.5 transition-colors"
                    >
                      Limpar todas
                    </button>
                  </div>
                )}

                {/* Painel Expansível de Busca e Catálogo */}
                {isBnccExpanded && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                    {/* Campo de Busca Rápida com Ícone e Limpeza */}
                    <div className="relative flex items-center">
                      <svg
                        className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Filtrar por código (ex: EF67LP28) ou palavra-chave..."
                        value={bnccSearch}
                        onChange={(e) => setBnccSearch(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                      />
                      {bnccSearch && (
                        <button
                          type="button"
                          onClick={() => setBnccSearch("")}
                          className="absolute right-3 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                          title="Limpar busca"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Lista com Rolagem das Habilidades Sugeridas */}
                    {(() => {
                      const searchResults = searchHabilidades(
                        bnccSearch,
                        currentTurma?.name,
                        aiDisciplina === 'Outra' ? customDisciplina : aiDisciplina
                      );

                      if (searchResults.length === 0) {
                        return (
                          <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                            <p className="text-xs font-semibold text-slate-500">
                              Nenhuma habilidade encontrada para &quot;{bnccSearch}&quot;.
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Você pode adicionar o código diretamente no campo abaixo.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 select-none">
                          {searchResults.map(item => {
                            const isSelected = selectedBnccCodes.includes(item.codigo);
                            return (
                              <div
                                key={item.codigo}
                                onClick={() => {
                                  setSelectedBnccCodes(prev =>
                                    isSelected ? prev.filter(c => c !== item.codigo) : [...prev, item.codigo]
                                  );
                                }}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50/90 border-indigo-300 ring-1 ring-indigo-400 shadow-2xs'
                                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {item.codigo}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400">
                                      {item.disciplina}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                      Ativa
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-medium text-slate-600 line-clamp-2 leading-relaxed">
                                  {item.descricao}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Inserção Livre de Código Manual com Validação e Feedback em Tempo Real */}
                    {(() => {
                      const detectedSkill = customBnccInput.trim() ? getHabilidadeByCodigo(customBnccInput.trim()) : null;
                      const handleAdd = () => {
                        const clean = sanitizeBnccCode(customBnccInput);
                        if (clean && !selectedBnccCodes.includes(clean)) {
                          setSelectedBnccCodes(prev => [...prev, clean]);
                          setCustomBnccInput("");
                        }
                      };

                      return (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Adicionar outro código (ex: EF07GE01, EF06MA01)..."
                              value={customBnccInput}
                              onChange={(e) => setCustomBnccInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAdd();
                                }
                              }}
                              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 uppercase placeholder:normal-case placeholder:text-slate-400 transition-all"
                            />
                            <button
                              type="button"
                              disabled={!customBnccInput.trim()}
                              onClick={handleAdd}
                              className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              + Adicionar
                            </button>
                          </div>

                          {/* Feedback Visual Instantâneo de Reconhecimento da Habilidade */}
                          {detectedSkill && (
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-2 animate-in fade-in duration-150">
                              <span className="shrink-0 text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                                {detectedSkill.codigo}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-emerald-800 block">
                                  {detectedSkill.disciplina} • BNCC Oficial
                                </span>
                                <p className="text-[10px] font-medium text-emerald-900 line-clamp-2 leading-tight">
                                  {detectedSkill.descricao}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                    Qtd. de Aulas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 outline-none font-bold text-xs text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
                    value={totalAulas}
                    onChange={(e) => setTotalAulas(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                    Data Inicial
                  </label>
                  <CustomDatePicker
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    align="right"
                    required
                  />
                </div>
              </div>

              {/* CRONOGRAMA DINÂMICO DE AULAS */}
              <div className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-indigo-600">{Icons.Calendar}</span>
                    <span>Cronograma de Aulas</span>
                  </span>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {customSchedule.reduce((acc, c) => acc + c.count, 0)} aula(s) em {customSchedule.length} data(s)
                  </span>
                </div>

                {customSchedule.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium text-center py-2">
                    Nenhum dia de aula cadastrado na grade desta turma.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                    {customSchedule.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-indigo-950 text-xs">{item.dateStr}</span>
                            {item.weekLabel && (
                              <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-md ${
                                item.weekLabel === 'Semana 2'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}>
                                {item.weekLabel}
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] font-medium text-slate-400">{item.dayName}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateScheduleCount(index, -1)}
                              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-black text-indigo-600 text-xs">{item.count}a</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateScheduleCount(index, 1)}
                              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleItem(index)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            title="Remover data"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className={`w-full py-3 rounded-xl font-black text-xs shadow-md transition-all outline-none flex items-center justify-center gap-2 cursor-pointer ${isGenerating ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20 active:scale-98'}`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Gerando Plano...</span>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center">{Icons.Brain}</span>
                    <span>Gerar Plano de Aula</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60">
              <div className="flex gap-2.5 items-start">
                <span className="text-amber-500 mt-0.5 shrink-0">{Icons.Info}</span>
                <div>
                  <h5 className="font-black text-amber-900 text-[10px] uppercase tracking-wider">Dica Pedagógica</h5>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-snug font-medium">
                    A grade semanal é sincronizada das Configurações. Ajuste livremente datas e quantidades acima!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados (Direita) */}
          <div className="flex-1 bg-white overflow-y-auto flex flex-col min-h-0">
            {!generatedPlan && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300 scale-150">
                  {Icons.Brain}
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-2">Aguardando Brainstorming</h4>
                <p className="max-w-xs text-slate-500 font-medium p-8">
                  Preencha os dados à esquerda para que o Arquiteto Pedagógico comece a planejar suas próximas aulas.
                </p>
              </div>
            ) : isGenerating ? (
              <div className="flex-1 flex flex-col justify-center items-center p-12">
                <div className="w-16 h-16 relative mb-6">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                    {Icons.Brain}
                  </div>
                </div>
                <h4 className="text-lg font-black text-slate-800 animate-pulse">Tecendo ideias pedagógicas...</h4>
                <p className="text-slate-400 text-sm mt-2 font-medium">Estruturando plano e cronograma de aulas em JSON...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-8 animate-in fade-in zoom-in-95 duration-500 text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-200/80 shadow-md shadow-emerald-500/10">
                  <div className="w-7 h-7 flex items-center justify-center">
                    {Icons.CheckCircle || Icons.Check}
                  </div>
                </div>
                
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1.5">
                  Plano de Aula executado com sucesso!
                </h3>
                
                <p className="text-slate-500 font-medium max-w-lg text-xs mb-5 leading-relaxed">
                  O plano de ensino para <strong className="text-slate-700">&quot;{generatedPlan.tema || aiTema}&quot;</strong> foi gerado e validado com sucesso.
                </p>

                {/* Resumo do Plano */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 w-full max-w-lg text-left mb-5 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Unidade:</span>
                    <span className="font-bold text-slate-800">{generatedPlan.unidade || 'UNIDADE VIGENTE'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Disciplina:</span>
                    <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/60">
                      {generatedPlan.disciplina || (aiDisciplina === 'Outra' ? customDisciplina : aiDisciplina) || 'Língua Portuguesa'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Público-Alvo:</span>
                    <span className="font-bold text-slate-800">{generatedPlan.turma || generatedPlan.turmaName || currentTurma?.name || aiPublico}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Período:</span>
                    <span className="font-bold text-slate-800">
                      {generatedPlan.periodo && generatedPlan.periodo !== 'A definir'
                        ? generatedPlan.periodo
                        : (generatedPlan.aulas?.length > 0 && generatedPlan.aulas[0].data
                            ? (generatedPlan.aulas[0].data === generatedPlan.aulas[generatedPlan.aulas.length - 1].data
                                ? generatedPlan.aulas[0].data
                                : `${generatedPlan.aulas[0].data} a ${generatedPlan.aulas[generatedPlan.aulas.length - 1].data}`)
                            : 'A definir')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Cronograma / Aulas:</span>
                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      {generatedPlan.duracao || aiDuracao} ({generatedPlan.aulas?.length || 0} {generatedPlan.aulas?.length === 1 ? 'aula' : 'aulas'})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">Atividades do Aluno:</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {generatedPlan.aulas?.filter(a => a.atividades)?.length || 0} propostas geradas
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">Vinculado ao Acervo:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {generatedPlan.turmaName || currentTurma?.name} &bull; {generatedPlan.unitLabel || 'Unidade'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full max-w-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                        isExportingPDF
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 active:scale-95"
                      }`}
                    >
                      {isExportingPDF ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Baixando...
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 flex items-center justify-center">{Icons.FileText}</span>
                          <span>Plano Docente</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleExportActivitiesPDF}
                      disabled={isExportingPDF}
                      className="w-full py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">{Icons.Edit}</span>
                      <span>Atividades do Aluno</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setGeneratedPlan(null)}
                    disabled={isExportingPDF}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Novo Plano
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Modal Editorial de Personalização do Caderno de Atividades */}
      {isActivitiesModalOpen && generatedPlan && (
        <CadernoAtividadesModal
          isOpen={isActivitiesModalOpen}
          onClose={() => setIsActivitiesModalOpen(false)}
          planData={{
            ...generatedPlan,
            turmaId: Number(generatedPlan.turmaId || selectedTurmaId),
            unitId: Number(generatedPlan.unitId || activeUnitId),
            turmaName: generatedPlan.turmaName || currentTurma?.name || aiPublico
          }}
          title={`Atividades - ${generatedPlan.disciplina || (aiDisciplina === 'Outra' ? customDisciplina : aiDisciplina) || 'Atividades'} - ${generatedPlan.tema || aiTema || 'Caderno de Exercícios'}`}
          unitLabel={units?.find(u => u.id === activeUnitId)?.name || 'Unidade'}
          professorName={authName || 'Professor(a)'}
          onExportSuccess={() => showAlert("Sucesso!", "Caderno de Atividades exportado para PDF com sucesso.", "success")}
        />
      )}
    </div>
  );
}
