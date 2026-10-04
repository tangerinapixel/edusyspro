import React, { useRef, useEffect, useState } from "react";
import AnimatedModal from '../shared/AnimatedModal';
import { useApp } from "../../contexts/AppContext";
import { Icons } from "../../assets/icons";
import { normalizeWeeklySchedule } from "../../utils/scheduleUtils";

const SCHEDULE_DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' }
];

const WeeklySchedulePicker = ({ value, onChange }) => {
  const normValue = normalizeWeeklySchedule(value);
  const useTwoWeeks = normValue.use_two_weeks;

  const handleToggleMode = (enableTwoWeeks) => {
    onChange({
      ...normValue,
      use_two_weeks: enableTwoWeeks
    });
  };

  const handleToggleDay = (weekKey, dayKey) => {
    const currentWeekObj = normValue[weekKey] || {};
    const currentCount = currentWeekObj[dayKey] || 0;
    const nextCount = currentCount >= 4 ? 0 : currentCount + 1;
    const updatedWeekObj = { ...currentWeekObj, [dayKey]: nextCount };

    onChange({
      ...normValue,
      [weekKey]: updatedWeekObj
    });
  };

  const countTotalClasses = (weekObj) =>
    Object.values(weekObj || {}).reduce((acc, curr) => acc + (typeof curr === 'number' ? curr : 0), 0);

  const renderWeekRow = (weekTitle, weekKey, weekObj) => (
    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-2 shadow-xs">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
          {weekTitle}
        </span>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
          {countTotalClasses(weekObj)} aula(s)/sem
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {SCHEDULE_DAYS.map((day) => {
          const count = weekObj[day.key] || 0;
          const isActive = count > 0;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => handleToggleDay(weekKey, day.key)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-white border-slate-200/90 text-slate-400 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <span className="text-[9px] font-black uppercase tracking-wider">{day.label}</span>
              <span className={`text-[10px] font-extrabold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {count > 0 ? `${count}a` : '-'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between bg-slate-100/80 p-2 rounded-2xl border border-slate-200/70">
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">
          Rotina de Aulas:
        </span>
        <div className="flex gap-1 bg-slate-200/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              !useTwoWeeks
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            1 Semana
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              useTwoWeeks
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            2 Semanas (Alternadas)
          </button>
        </div>
      </div>

      {renderWeekRow(useTwoWeeks ? "📌 Semana 1" : "📌 Grade Semanal", "week1", normValue.week1)}

      {useTwoWeeks && renderWeekRow("📌 Semana 2", "week2", normValue.week2)}

      <p className="text-[9px] font-semibold text-slate-400 text-center">
        Clique nos dias para alternar de 1 a 4 aulas ou desativar (-).
      </p>
    </div>
  );
};

const GlobalModals = () => {
  const {
    // UI Modais Visibilidade
    isParamsModalOpen, setIsParamsModalOpen,
    isMetricsModalOpen, setIsMetricsModalOpen,
    isPremiumModalOpen, setIsPremiumModalOpen,
    isModalOpen, setIsModalOpen,
    bulkModalOpen, setBulkModalOpen,
    deleteModalOpen, setDeleteModalOpen,
    studentToDelete, setStudentToDelete,
    topicModalOpen, setTopicModalOpen,
    selectedTopicDate, setSelectedTopicDate,
    editingTopicDate, setEditingTopicDate,
    isChangingDate, setIsChangingDate,
    currentTopicText, setCurrentTopicText,
    deleteActivityConfirmOpen, setDeleteActivityConfirmOpen,
    isAIModalOpen, setIsAIModalOpen,
    isDisciplinaryModalOpen, setIsDisciplinaryModalOpen,
    isEditTurmaModalOpen, setIsEditTurmaModalOpen,
    isDeleteTurmaModalOpen, setIsDeleteTurmaModalOpen,
    turmaModalOpen, setTurmaModalOpen,
    profileModalOpen, setProfileModalOpen,
    studentProfile, setStudentProfile,
    evalModalOpen, setEvalModalOpen,
    studentForEval, setStudentForEval,
    evalCategory,
    newTestName, setNewTestName,
    newTestScore, setNewTestScore,
    editingEvalId, setEditingEvalId,
    logoutConfirmOpen, setLogoutConfirmOpen,
    restoreConfirmOpen, setRestoreConfirmOpen,
    alertConfig, setAlertConfig,
    isConfirmUncheckOpen, setIsConfirmUncheckOpen,
    pendingActivityUncheck, setPendingActivityUncheck,
    isConfirmOccurrenceUncheckOpen, setIsConfirmOccurrenceUncheckOpen,
    pendingOccurrenceUncheck, setPendingOccurrenceUncheck,

    // Configurações e Dados
    settings, setSettings,
    turmas, setTurmas,
    activeTurmaId, setActiveTurmaId,
    configTurmaId,
    configUnitId,
    turmaUnitParams,
    units,
    activeUnitId,
    newTurmaName, setNewTurmaName,
    newWeeklySchedule, setNewWeeklySchedule,
    newWeeklyScheduleEdit, setNewWeeklyScheduleEdit,
    occurrenceTypes,
    loadData,
    refreshData,
    showAlert,
    handleLogout,
    performRestore,
    handleConfirmUncheck,
    handleConfirmOccurrenceUncheck,
    handleAddEvalItem,
    handleEditEvalItem,
    handleReorderEvalItems,
    handleDeleteEvalItem,
    handleSaveSettings,
    handleCreateTurma,
    handleEditTurma,
    handleDeleteTurma,
    turmaToManage, setTurmaToManage,
    newTurmaNameEdit, setNewTurmaNameEdit,
    newTurmaIconEdit, setNewTurmaIconEdit,
    selectedTurmaIcon, setSelectedTurmaIcon,
    setIsCloudAuthenticated
  } = useApp();

  const [newStudentName, setNewStudentName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  
  const [editingType, setEditingType] = useState(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePenalty, setNewTypePenalty] = useState(-0.10);
  const [newTypeColor, setNewTypeColor] = useState("rose");

  const evalListRef = useRef(null);

  const targetTurmaId = configTurmaId || activeTurmaId || turmas[0]?.id;
  const targetUnitId = configUnitId || activeUnitId || units[0]?.id || 1;
  const targetTurma = turmas.find(t => t.id === targetTurmaId);
  const targetUnit = (units || []).find(u => u.id === targetUnitId);
  const targetUnitParams = (turmaUnitParams || []).find(p => p.turma_id === targetTurmaId && p.unit_id === targetUnitId);

  // Buffers locais para isolamento estrito de parâmetros por turma e unidade
  const [paramsBuffer, setParamsBuffer] = useState({ behavior_start_score: 10, max_activities: 27 });
  const [metricsBuffer, setMetricsBuffer] = useState({ max_mini_testes: 14, max_mini_teste_score: 10, max_provas: 1, max_prova_score: 10 });
  const [premiumBuffer, setPremiumBuffer] = useState({ max_activities_weight: 1.0, max_mini_testes_weight: 1.0, max_provas_weight: 4.0 });

  useEffect(() => {
    if (isParamsModalOpen) {
      setParamsBuffer({
        behavior_start_score: settings?.behavior_start_score ?? 10,
        max_activities: targetUnitParams?.max_activities ?? targetTurma?.max_activities ?? 27
      });
    }
  }, [isParamsModalOpen, targetTurmaId, targetUnitId, targetUnitParams, settings, targetTurma]);

  useEffect(() => {
    if (isMetricsModalOpen) {
      setMetricsBuffer({
        max_mini_testes: targetUnitParams?.max_mini_testes ?? targetTurma?.max_mini_testes ?? 14,
        max_mini_teste_score: targetUnitParams?.max_mini_teste_score ?? targetTurma?.max_mini_teste_score ?? 10,
        max_provas: targetUnitParams?.max_provas ?? targetTurma?.max_provas ?? 1,
        max_prova_score: targetUnitParams?.max_prova_score ?? targetTurma?.max_prova_score ?? 10
      });
    }
  }, [isMetricsModalOpen, targetTurmaId, targetUnitId, targetUnitParams, targetTurma]);

  useEffect(() => {
    if (isPremiumModalOpen) {
      setPremiumBuffer({
        max_activities_weight: targetUnitParams?.max_activities_weight ?? targetTurma?.max_activities_weight ?? 1.0,
        max_mini_testes_weight: targetUnitParams?.max_mini_testes_weight ?? targetTurma?.max_mini_testes_weight ?? 1.0,
        max_provas_weight: targetUnitParams?.max_provas_weight ?? targetTurma?.max_provas_weight ?? 4.0
      });
    }
  }, [isPremiumModalOpen, targetTurmaId, targetUnitId, targetUnitParams, targetTurma]);

  // Computa o tamanho da lista atual para o autoscroll
  const currentEvalListLength = studentForEval ? (
    evalCategory === 'provas' ? (studentForEval.provasLista?.length || 0) :
    evalCategory === 'trabalhos' ? (studentForEval.trabalhosLista?.length || 0) :
    evalCategory === 'bonus' ? (studentForEval.bonusLista?.length || 0) :
    (studentForEval.testesLista?.length || 0)
  ) : 0;

  useEffect(() => {
    if (evalModalOpen) {
      // Delay de 250ms garante que a animação de entrada do modal terminou e o elemento foi montado
      setTimeout(() => {
        if (evalListRef.current) {
          evalListRef.current.scrollTo({
            top: evalListRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 250);
    }
  }, [evalModalOpen, currentEvalListLength]);

  // Funções Utilitárias para Atividades
  const handleUpdateActivityDate = async () => {
    if (!window.electronAPI || !selectedTopicDate || !editingTopicDate) return;
    if (selectedTopicDate === editingTopicDate) {
      setIsChangingDate(false);
      return;
    }
    const res = await window.electronAPI.updateActivityDate(selectedTopicDate, editingTopicDate, activeTurmaId);
    if (res.success) {
      showAlert("Sucesso!", "Data da atividade atualizada com sucesso.", "success");
      setSelectedTopicDate(editingTopicDate);
      setIsChangingDate(false);
      loadData();
    }
  };

  const handleDeleteActivity = async () => {
    if (!window.electronAPI || !selectedTopicDate) return;
    await window.electronAPI.deleteActivityDate(selectedTopicDate, activeTurmaId);
    setDeleteActivityConfirmOpen(false);
    setTopicModalOpen(false);
    loadData();
  };

  const handleSaveTopic = async (e) => {
    if (e) e.preventDefault();
    if (!window.electronAPI) return;
    await window.electronAPI.saveActivityTopic(selectedTopicDate, currentTopicText, activeTurmaId);
    setTopicModalOpen(false);
    loadData();
  };

  // Funções Utilitárias para Alunos
  const handleAddStudent = async (e) => {
    if (e) e.preventDefault();
    if (!newStudentName.trim() || !window.electronAPI) return;
    await window.electronAPI.addStudent(newStudentName.trim(), activeTurmaId);
    setNewStudentName("");
    setIsModalOpen(false);
    loadData();
  };

  const handleBulkSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!bulkNames.trim() || !window.electronAPI) return;
    const namesArray = bulkNames.split('\n').map(n => n.trim()).filter(n => n);
    if (namesArray.length > 0) {
      await window.electronAPI.addStudentsBulk(namesArray, activeTurmaId);
    }
    setBulkNames("");
    setBulkModalOpen(false);
    loadData();
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBulkNames(evt.target.result);
    };
    reader.readAsText(file);
  };

  const handleRemoveStudent = async () => {
    if (!studentToDelete || !window.electronAPI) return;
    const sId = studentToDelete.id;
    setDeleteModalOpen(false);
    setTimeout(() => setStudentToDelete(null), 250);
    await window.electronAPI.removeStudent(sId);
    loadData();
  };

  // Handlers para Ocorrências
  const handleAddOccurrenceType = async (title, penalty, color) => {
    if (!window.electronAPI) return;
    await window.electronAPI.addOccurrenceType(title, penalty, color);
    loadData();
    showAlert("Sucesso", "Novo critério adicionado.", "success");
  };

  const handleUpdateOccurrenceType = async (id, data) => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateOccurrenceType(id, data);
    loadData();
    showAlert("Sucesso", "Critério atualizado.", "success");
  };

  const handleDeleteOccurrenceType = async (id) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.deleteOccurrenceType(id);
    if (res.success) {
      loadData();
      showAlert("Removido", "Critério excluído.", "info");
    } else {
      showAlert("Erro", res.error || "Não foi possível excluir.", "error");
    }
  };

  const handleCloudLogout = async () => {
    if (!window.electronAPI) return;
    const success = await window.electronAPI.cloudLogout();
    if (success) {
      setIsCloudAuthenticated(false);
      setLogoutConfirmOpen(false);
      showAlert("Desconectado", "Conta Google desvinculada.", "info");
    }
  };

  const iconOptions = [
    { id: 'Portugues', name: 'Português / Linguagens', color: 'rose' },
    { id: 'MPV', name: 'Metodologia / MPV', color: 'emerald' },
    { id: 'Matematica', name: 'Matemática', color: 'indigo' },
    { id: 'Ciencias', name: 'Ciências / Natureza', color: 'amber' },
    { id: 'Ingles', name: 'Inglês / Idiomas', color: 'cyan' },
    { id: 'Religiao', name: 'Ensino Religioso', color: 'purple' },
    { id: 'EducacaoFisica', name: 'Educação Física', color: 'orange' },
    { id: 'Classe', name: 'Outra / Geral', color: 'slate' },
  ];

  return (
    <>
      {/* MODAL: Parâmetros de Base */}
      {isParamsModalOpen && settings && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsParamsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-5 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    {Icons.Activity}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Parâmetros de Base</h3>
                    <p className="text-slate-400 text-xs font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400">{Icons.Users}</span>
                        Turma: <span className="text-white font-bold">{targetTurma?.name || 'Turma'}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-indigo-400">{Icons.Calendar}</span>
                        <span className="text-indigo-300 font-bold">{targetUnit?.name || '1ª Unidade'}</span>
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsParamsModalOpen(false)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white text-xl transition-all"
                >×</button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                  Pontuação Inicial de Comportamento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={paramsBuffer.behavior_start_score}
                    onChange={(e) => setParamsBuffer(prev => ({ ...prev, behavior_start_score: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-slate-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-slate-700 bg-slate-50 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold uppercase tracking-wider">pts</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Nota para toda a escola (Global)</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                  Limite de Atividades ({targetTurma?.name || 'Turma Selecionada'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={paramsBuffer.max_activities}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setParamsBuffer(prev => ({ ...prev, max_activities: val }));
                    }}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-slate-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-slate-700 bg-slate-50 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold uppercase tracking-wider">lições</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Cada lição valerá {(((targetUnitParams?.max_activities_weight ?? targetTurma?.max_activities_weight ?? 1.0)) / (paramsBuffer.max_activities || 1)).toFixed(3)} pt nesta turma</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setIsParamsModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (window.electronAPI) {
                    await window.electronAPI.saveSettings({ ...settings, behavior_start_score: paramsBuffer.behavior_start_score });
                    if (targetTurma) {
                      await window.electronAPI.updateTurmaParams(targetTurma.id, { max_activities: paramsBuffer.max_activities }, targetUnitId);
                    }
                    setIsParamsModalOpen(false);
                    refreshData();
                    showAlert("Sucesso!", `Parâmetros da turma ${targetTurma?.name || ''} (${targetUnit?.name || '1ª Unidade'}) salvos com sucesso.`, "success");
                  }
                }}
                className="flex-1 py-4 bg-gradient-to-r from-slate-900 to-indigo-800 hover:from-indigo-700 hover:to-indigo-600 text-white font-black rounded-2xl transition-all text-sm shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95"
              >
                {Icons.Check} Salvar Parâmetros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Métricas de Avaliação */}
      {isMetricsModalOpen && settings && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsMetricsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-5 bg-gradient-to-br from-indigo-700 to-indigo-600 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white shadow-md border border-white/20">
                    {Icons.Star}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Métricas de Avaliação</h3>
                    <p className="text-indigo-200 text-xs font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-indigo-200">{Icons.Users}</span>
                        Turma: <span className="text-white font-bold">{targetTurma?.name || 'Turma'}</span>
                      </span>
                      <span className="text-indigo-300/60">•</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-indigo-200">{Icons.Calendar}</span>
                        <span className="text-white font-bold">{targetUnit?.name || '1ª Unidade'}</span>
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMetricsModalOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-xl transition-all"
                >×</button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                  Quantidade Máxima de Mini-Testes
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={metricsBuffer.max_mini_testes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setMetricsBuffer(prev => ({ ...prev, max_mini_testes: val }));
                    }}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-indigo-700 bg-indigo-50/40 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-300 font-bold uppercase tracking-wider">testes</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Quantidade esperada nesta turma</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                   Nota Máxima por Teste (Teto)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={metricsBuffer.max_mini_teste_score}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setMetricsBuffer(prev => ({ ...prev, max_mini_teste_score: val }));
                    }}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-indigo-700 bg-indigo-50/40 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-300 font-bold uppercase tracking-wider">pts</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Score máximo de cada avaliação</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                   Quantidade Máxima de Provas
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={metricsBuffer.max_provas}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setMetricsBuffer(prev => ({ ...prev, max_provas: val }));
                    }}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-indigo-700 bg-indigo-50/40 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-300 font-bold uppercase tracking-wider">provas</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Quantidade esperada nesta turma</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                    Nota Máxima por Prova (Teto)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={metricsBuffer.max_prova_score}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setMetricsBuffer(prev => ({ ...prev, max_prova_score: val }));
                    }}
                    className="w-full px-5 py-4 rounded-2xl outline-none border-2 border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold text-2xl text-indigo-700 bg-indigo-50/40 transition-all text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-300 font-bold uppercase tracking-wider">pts</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2 text-center">Score máximo de cada avaliação</p>
              </div>

              {/* Prévia do impacto */}
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Impacto no Motor de Cálculo</p>
                <p className="text-sm text-indigo-700 font-semibold leading-relaxed">
                  Cada mini-teste valerá <span className="text-indigo-900 font-black">{(((targetUnitParams?.max_mini_testes_weight ?? targetTurma?.max_mini_testes_weight ?? 1.0)) / (metricsBuffer.max_mini_testes || 1)).toFixed(3)}</span> pontos — somando <span className="text-indigo-900 font-black">{(targetUnitParams?.max_mini_testes_weight ?? targetTurma?.max_mini_testes_weight ?? 1.0).toFixed(1)} ponto(s) total</span> ao final de {metricsBuffer.max_mini_testes || 0} testes.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 flex gap-3 shrink-0">
              <button
                onClick={() => setIsMetricsModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (window.electronAPI && targetTurma) {
                    await window.electronAPI.updateTurmaParams(targetTurma.id, {
                      max_mini_testes: metricsBuffer.max_mini_testes,
                      max_mini_teste_score: metricsBuffer.max_mini_teste_score,
                      max_provas: metricsBuffer.max_provas,
                      max_prova_score: metricsBuffer.max_prova_score
                    }, targetUnitId);
                    setIsMetricsModalOpen(false);
                    refreshData();
                    showAlert("Sucesso!", `Métricas da turma ${targetTurma.name} (${targetUnit?.name || '1ª Unidade'}) atualizadas com sucesso.`, "success");
                  }
                }}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-700 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400 text-white font-black rounded-2xl transition-all text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                {Icons.Check} Salvar Métricas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Autonomia Premium (Pesos por Turma) */}
      {isPremiumModalOpen && settings && (
        <div
          className="fixed inset-0 bg-[#020617]/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500"
        >
          <div
            className="bg-[#0B1120] rounded-2xl w-full max-w-lg shadow-[0_0_100px_rgba(245,158,11,0.1)] border border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-500"
          >
            {/* Efeito de Gradiente de Fundo no Modal */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Header Elite */}
            <div className="p-6 pb-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                    {Icons.Star}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Painel de Autonomia</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Configuração Elite por Turma</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all outline-none"
                >×</button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="text-amber-500">{Icons.Users}</div>
                <div>
                  <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Editando Turma e Unidade:</p>
                  <p className="text-white font-bold text-sm">{targetTurma?.name || 'Turma'} • {targetUnit?.name || '1ª Unidade'}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Peso Lições */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Peso Lições
                    </label>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter opacity-80">
                      Teto na Média
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={premiumBuffer.max_activities_weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPremiumBuffer(prev => ({ ...prev, max_activities_weight: val }));
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-2xl font-black text-white text-center transition-all shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none group-focus-within:text-amber-500/20 transition-colors">
                      {Icons.Book}
                    </div>
                  </div>
                </div>

                {/* Peso Mini-Testes */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Peso Testes
                    </label>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter opacity-80">
                      Teto na Média
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={premiumBuffer.max_mini_testes_weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPremiumBuffer(prev => ({ ...prev, max_mini_testes_weight: val }));
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/10 outline-none text-2xl font-black text-white text-center transition-all shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none group-focus-within:text-indigo-500/20 transition-colors">
                      {Icons.Activity}
                    </div>
                  </div>
                </div>

                {/* Peso Provas */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Peso Provas
                    </label>
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter opacity-80">
                      Teto na Média
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={premiumBuffer.max_provas_weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPremiumBuffer(prev => ({ ...prev, max_provas_weight: val }));
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none text-2xl font-black text-white text-center transition-all shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none group-focus-within:text-rose-500/20 transition-colors">
                      {Icons.Alert || "?"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulação de Impacto */}
              <div className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800/50 flex items-center justify-between gap-6">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impacto Previsto</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                     Nesta turma, se o aluno cumprir 100% das obrigações, ele somará <span className="text-white font-bold">{(parseFloat(premiumBuffer.max_activities_weight || 0) + parseFloat(premiumBuffer.max_mini_testes_weight || 0) + parseFloat(premiumBuffer.max_provas_weight || 0)).toFixed(1)} pontos</span> apenas com estas categorias.
                  </p>
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-amber-500 border border-white/5">
                  {Icons.Calculator || "?"}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="flex-1 py-5 bg-slate-900 text-slate-500 font-black rounded-3xl hover:bg-slate-800 transition-all text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (window.electronAPI && targetTurma) {
                      await window.electronAPI.updateTurmaParams(targetTurma.id, {
                        max_activities_weight: premiumBuffer.max_activities_weight,
                        max_mini_testes_weight: premiumBuffer.max_mini_testes_weight,
                        max_provas_weight: premiumBuffer.max_provas_weight
                      }, targetUnitId);
                      setIsPremiumModalOpen(false);
                      refreshData();
                      showAlert("Pesos Atualizados!", `Regras de pontuação da turma ${targetTurma.name} (${targetUnit?.name || '1ª Unidade'}) aplicadas com sucesso.`, "success");
                    }
                  }}
                  className="flex-[2] py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-3xl transition-all shadow-xl shadow-orange-600/20 active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {Icons.Check} Aplicar Autonomia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* PERFIL MODAL SUPERIOR */}

      {studentProfile && (
      <AnimatedModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} maxWidth="max-w-4xl" zIndex="z-50">

            {/* Header Extensivo */}
            <div className={`p-8 pb-12 flex justify-between items-start text-white relative ${studentProfile.isAlert ? 'bg-gradient-to-br from-red-500 to-rose-700' : 'bg-gradient-to-br from-indigo-600 to-blue-700'}`}>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex items-center">
                <div className="w-20 h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-4xl font-black border border-white/30 mr-6 shadow-xl backdrop-blur-md">{studentProfile.name.charAt(0)}</div>
                <div>
                  <h2 className="text-4xl font-bold tracking-tight">{studentProfile.name}</h2>
                  <div className="text-indigo-100 font-semibold mt-1 text-lg flex items-center gap-2 flex-wrap">
                    {studentProfile.isAlert ? (
                      <span className="bg-white/20 px-3 py-1 rounded-full border border-white/20 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></span>
                        {studentProfile.alertReasons && studentProfile.alertReasons.length > 0
                          ? `Atenção: ${studentProfile.alertReasons.map(r => r === 'disciplinar' ? 'Conduta' : r === 'licoes' ? 'Lições' : r === 'avaliativo' ? 'Avaliação' : 'Média').join(', ')}`
                          : 'Atenção Pedagógica Necessária'}
                      </span>
                    ) : (
                      <span className="bg-white/20 px-3 py-1 rounded-full border border-white/50 tracking-wider">
                        Perfil Acadêmico Íntegro
                      </span>
                    )}

                    {Number(studentProfile.bonus || 0) > 0 && (
                      <span 
                        className="bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full border border-amber-300/35 tracking-wide flex items-center gap-1.5 backdrop-blur-md shadow-sm text-sm font-bold"
                        title={`Bonificação Concedida: +${Number(studentProfile.bonus).toFixed(2)} pts somados à média final`}
                      >
                        <span className="text-amber-300 font-bold">★</span>
                        <span>+{Number(studentProfile.bonus).toFixed(2)} Bônus</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-20">
                <button onClick={() => setProfileModalOpen(false)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-colors outline-none z-10 backdrop-blur-sm">&times;</button>
              </div>
            </div>

            {/* Corpo de Estatísticas (Reformulado 3x2) */}
            <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6 -mt-10 relative z-20">
              {/* Card 1: Comportamento */}
              <div className="bg-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Comportamento</p>
                <p className={`text-4xl font-bold ${studentProfile.pointsLost < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{studentProfile.behaviorScore.toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-400 mt-2">{studentProfile.occurrencesCount} penalidades</p>
              </div>

              {/* Card 2: Check de Lições */}
              <div className="bg-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Check de Lições</p>
                <p className="text-4xl font-bold text-blue-500">{studentProfile.licao.toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-400 mt-2">{studentProfile.licaoCheckCount || 0} de {studentProfile.maxActivities ?? (turmas.find(t => t.id === (studentProfile.turma_id || activeTurmaId))?.max_activities) ?? settings.max_activities ?? 27} feitas</p>
              </div>

              {/* Card 3: Trabalho Manual */}
              <div className="bg-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trabalho</p>
                <p className="text-4xl font-bold text-amber-500">{studentProfile.trabalho.toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-400 mt-2">Atividade Geral</p>
              </div>

              {/* Card 4: Mini Testes */}
              <div className="bg-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mini Testes</p>
                <p className="text-4xl font-bold text-purple-500">{studentProfile.totalMiniTestes.toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-400 mt-2">{(studentProfile.testesLista || []).length} de {studentProfile.maxMiniTestes ?? (turmas.find(t => t.id === (studentProfile.turma_id || activeTurmaId))?.max_mini_testes) ?? settings.max_mini_testes ?? 14} lançados</p>
              </div>

              {/* Card 5: Prova Geral Manual */}
              <div className="bg-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prova Geral</p>
                <p className="text-4xl font-bold text-rose-500">{studentProfile.prova.toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-400 mt-2">{(studentProfile.provasLista || []).length} de {studentProfile.maxProvas ?? (turmas.find(t => t.id === (studentProfile.turma_id || activeTurmaId))?.max_provas) ?? settings.max_provas ?? 1} lançadas</p>
              </div>

              {/* Card 6: Média Geral Destaque */}
              <div className="bg-slate-900 p-6 rounded-[1.5rem] shadow-xl shadow-slate-900/30 border border-slate-800 text-center relative overflow-hidden group hover:-translate-y-1 transition-transform flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-80">MÉDIA GERAL</p>
                <p className="text-5xl font-bold text-white">{studentProfile.mediaFinal.toFixed(2)}</p>
                {Number(studentProfile.bonus || 0) > 0 && (
                  <p className="text-[11px] font-bold text-amber-400/90 mt-1.5 tracking-tight flex items-center justify-center gap-1">
                    <span>★</span> inclui +{Number(studentProfile.bonus).toFixed(2)} bônus
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar">

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mt-5 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-900/40 transition-all duration-700">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
                <h4 className="font-bold text-white mb-4 flex items-center text-lg gap-2">
                  <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                  Diagnóstico do Aplicativo (Matriz de Dados)
                </h4>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">
                  Esta visão é baseada no processamento de <span className="text-white font-bold">Lançamentos Reais</span>.
                  O estudante alcançou uma média processada de <span className="font-bold text-indigo-400">{studentProfile.mediaFinal.toFixed(2)} pontos</span>
                  {Number(studentProfile.bonus || 0) > 0 ? (
                    <span> (inclui <span className="font-bold text-amber-400">+{Number(studentProfile.bonus).toFixed(2)} pts</span> de bonificação pedagógica)</span>
                  ) : null} e
                  apresenta um escore comportamental de <span className="font-bold text-indigo-400">{studentProfile.behaviorScore.toFixed(2)}</span>.
                </p>
              </div>
            </div>
     
      </AnimatedModal>
      )}

      {/* MODAL: NOVO ALUNO */}
      <AnimatedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="max-w-sm" zIndex="z-50">

            {/* Header Premium */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10"
              >
                &times;
              </button>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-3xl">
                {Icons.Users}
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-1">
                Novo Estudante
              </h3>
              <p className="text-indigo-200 font-medium text-sm">
                Inicie um novo registro pedagógico.
              </p>
            </div>

            <form onSubmit={handleAddStudent} className="p-8 pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">
                    Nome Completo do Aluno:
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                    placeholder="Digite o nome..."
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                >
                  Salvar Estudante
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none"
                >
                  Cancelar
                </button>
              </div>
            </form>
     
      </AnimatedModal>

      {/* MODAL: IMPORTAR LISTA (BULK) */}
      <AnimatedModal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} maxWidth="max-w-lg" zIndex="z-50">

            {/* Header Premium Unificado */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative flex-shrink-0">
              <button onClick={() => setBulkModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10">&times;</button>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-3xl">{Icons.Users}</div>
              <h3 className="text-2xl font-black tracking-tight mb-1">Importação em Massa</h3>
              <p className="text-indigo-200 font-medium text-sm">Cole a lista de nomes ou escolha um arquivo TXT.</p>
            </div>
            <div className="p-8 flex flex-col flex-1 min-h-0">

            <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 min-h-0">
              <textarea
                required
                autoFocus
                placeholder="Exemplo:&#10;João da Silva&#10;Maria Conceição&#10;Pedro Alves"
                value={bulkNames}
                onChange={e => setBulkNames(e.target.value)}
                className="w-full h-48 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-medium text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all resize-none shadow-inner"
              />
              <div className="mt-5 flex items-center justify-between">
                <div className="relative">
                  <input type="file" accept=".txt,.csv" onChange={handleBulkFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button type="button" className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold pointer-events-none flex items-center gap-2">
                    {Icons.Activity} Arquivo .txt
                  </button>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setBulkModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors outline-none cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30 outline-none cursor-pointer">Salvar Lista</button>
                </div>
              </div>
            </form>
          </div>
   
      </AnimatedModal>

      {/* MODAL: GERENCIAR AVALIAÇÕES (MINI-TESTES, TRABALHOS, PROVAS) */}
      {studentForEval && (
      <AnimatedModal isOpen={evalModalOpen} onClose={() => setEvalModalOpen(false)} maxWidth="max-w-lg" zIndex="z-50">

            {/* Header Premium Unificado */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative flex-shrink-0">
              <button
                onClick={() => setEvalModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10"
              >
                &times;
              </button>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-3xl">
                {evalCategory === 'provas' ? Icons.Alert : evalCategory === 'trabalhos' ? Icons.Book : evalCategory === 'bonus' ? Icons.Star || Icons.Sparkles : Icons.Activity}
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-1">
                {evalCategory === 'provas' ? 'Gerenciar Provas' : evalCategory === 'trabalhos' ? 'Gerenciar Trabalhos' : evalCategory === 'bonus' ? 'Gerenciar Atividades Bônus' : 'Gerenciar Mini-Testes'}
              </h3>
              <div className="flex items-center gap-2 mt-2 font-bold flex-wrap">
                <span className="text-indigo-200 uppercase text-[10px] font-black tracking-[0.2em] opacity-80">
                  {studentForEval.name}
                </span>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span className="text-white text-[11px] font-black">
                  {Number((evalCategory === 'provas' ? studentForEval.prova :
                    evalCategory === 'trabalhos' ? studentForEval.trabalho :
                    evalCategory === 'bonus' ? studentForEval.bonus :
                      studentForEval.totalMiniTestes) || 0).toFixed(2)} pts acumulados
                </span>
                {(evalCategory === 'mini_testes' || evalCategory === 'provas') && (
                  <>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span className="text-indigo-300 text-[11px] font-bold">
                      {evalCategory === 'mini_testes'
                        ? `${studentForEval.testesLista?.length || 0} de ${studentForEval.maxMiniTestes ?? (turmas.find(t => t.id === (studentForEval.turma_id || activeTurmaId))?.max_mini_testes) ?? settings.max_mini_testes ?? 14} lançados`
                        : `${studentForEval.provasLista?.length || 0} de ${studentForEval.maxProvas ?? (turmas.find(t => t.id === (studentForEval.turma_id || activeTurmaId))?.max_provas) ?? settings.max_provas ?? 1} lançadas`
                      }
                    </span>
                  </>
                )}
                {evalCategory === 'trabalhos' && (
                  <>
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span className="text-purple-200 text-[11px] font-bold bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-400/30">
                      Cota da unidade: até 1.00 pt na média
                    </span>
                  </>
                )}
                {evalCategory === 'bonus' && (
                  <>
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                    <span className="text-amber-200 text-[11px] font-bold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-400/30">
                      Pontos extras somados à média da unidade
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-8 pb-0 flex flex-col flex-1 min-h-0">

            <div
              ref={evalListRef}
              className="flex-1 overflow-y-auto mb-6 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 no-scrollbar max-h-[320px] min-h-[150px]"
            >
              {(evalCategory === 'provas' ? studentForEval.provasLista :
                evalCategory === 'trabalhos' ? studentForEval.trabalhosLista :
                evalCategory === 'bonus' ? studentForEval.bonusLista :
                  studentForEval.testesLista)?.map((item, index) => (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", index.toString());
                        e.currentTarget.style.opacity = "0.4";
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const startIndex = parseInt(e.dataTransfer.getData("text/plain"));
                        if (!isNaN(startIndex)) {
                          handleReorderEvalItems(startIndex, index);
                        }
                      }}
                      className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3 group transition-all hover:shadow-md cursor-grab active:cursor-grabbing hover:border-indigo-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {Icons.Activity}
                        </div>
                        <span className="font-semibold text-slate-700">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold px-3 py-1 rounded-lg ${evalCategory === 'provas' ? 'bg-rose-50 text-rose-500' : evalCategory === 'trabalhos' ? 'bg-purple-50 text-purple-500' : evalCategory === 'bonus' ? 'bg-amber-50 text-amber-700 font-black' : 'bg-emerald-50 text-emerald-500'}`}>
                          +{Number(item.score || 0).toFixed(2)}
                        </span>

                        <button
                          onClick={() => handleEditEvalItem(item)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 outline-none"
                          title="Editar lançamento"
                        >
                          {Icons.Edit}
                        </button>

                        <button
                          onClick={() => handleDeleteEvalItem(item.id)}
                          className="text-red-300 hover:text-red-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 outline-none"
                          title="Excluir lançamento"
                        >
                          {Icons.Trash || 'X'}
                        </button>
                      </div>
                    </div>
                  ))}

              {(!(evalCategory === 'provas' ? studentForEval.provasLista :
                evalCategory === 'trabalhos' ? studentForEval.trabalhosLista :
                evalCategory === 'bonus' ? studentForEval.bonusLista :
                  studentForEval.testesLista)?.length) && (
                  <div className="text-center text-slate-400 font-medium py-8 italic">
                    Nenhum registro lançado nesta categoria.
                  </div>
                )}
            </div>

            <form
              onSubmit={handleAddEvalItem}
              className={`relative p-5 rounded-2xl border transition-all ${editingEvalId ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-500/10' : (evalCategory === 'provas' ? 'bg-rose-50 border-rose-100' : evalCategory === 'trabalhos' ? 'bg-purple-50 border-purple-100' : evalCategory === 'bonus' ? 'bg-amber-50/80 border-amber-200/80' : 'bg-indigo-50 border-indigo-100')}`}
            >
              {editingEvalId && (
                <div className="absolute -top-3 left-6 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border border-amber-200 animate-in slide-in-from-bottom-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Editando
                </div>
              )}
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Nome do Lançamento"
                  required
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none font-medium text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all placeholder:text-slate-400"
                />
                <input
                  type="text"
                  placeholder={evalCategory === 'trabalhos' ? "Nota (máx 1.00)" : evalCategory === 'bonus' ? "Nota (ex: 0.50)" : "Nota"}
                  required
                  value={newTestScore}
                  onChange={(e) => setNewTestScore(e.target.value)}
                  className="w-36 px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none font-bold text-slate-800 text-center focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all placeholder:text-slate-400 text-sm"
                />
              </div>
              <div className="flex gap-3 mt-4">
                {editingEvalId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvalId(null);
                      setNewTestName("");
                      setNewTestScore("");
                    }}
                    className="w-1/3 py-3 text-amber-700 bg-amber-100 hover:bg-amber-200 font-bold rounded-xl transition-all outline-none flex items-center justify-center text-xs uppercase tracking-widest active:scale-95"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className={`${editingEvalId ? 'w-2/3' : 'w-full'} py-3 text-white font-bold rounded-xl shadow-lg transition-all outline-none flex items-center justify-center gap-2 active:scale-95 ${editingEvalId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : (evalCategory === 'provas' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : evalCategory === 'trabalhos' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : evalCategory === 'bonus' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20')}`}
                >
                   {editingEvalId ? Icons.Check : '+'} {editingEvalId ? 'Salvar' : 'Registrar Pontuação'}
                </button>
              </div>
            </form>
          </div>
   
      </AnimatedModal>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE ALUNO */}
      <AnimatedModal 
        isOpen={deleteModalOpen} 
        onClose={() => {
          setDeleteModalOpen(false);
          setTimeout(() => setStudentToDelete(null), 250);
        }} 
        maxWidth="max-w-sm" 
        zIndex="z-50"
      >
        <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex-shrink-0"></div>
        <div className="p-8">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 scale-125 shadow-sm">
            {Icons.Alert}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Aluno?</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Você está prestes a remover <strong>{studentToDelete?.name || 'este estudante'}</strong> e todo o seu histórico. Essa ação não pode ser desfeita. Tem certeza?
          </p>
          <div className="flex space-x-3 w-full">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setTimeout(() => setStudentToDelete(null), 250);
              }}
              className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors outline-none"
            >
              Cancelar
            </button>
            <button
              onClick={handleRemoveStudent}
              className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-600/30 outline-none"
            >
              Sim, Remover
            </button>
          </div>
        </div>
      </AnimatedModal>



      {/* MODAL: CONFIRMAR REMOÇÃO DE OCORRÊNCIA (PREMIUM) */}
      <AnimatedModal 
        isOpen={isConfirmOccurrenceUncheckOpen} 
        onClose={() => { 
          setIsConfirmOccurrenceUncheckOpen(false); 
          setTimeout(() => setPendingOccurrenceUncheck(null), 250); 
        }} 
        maxWidth="max-w-sm" 
        zIndex="z-[110]"
      >
        <div className="p-8">
          {/* Efeito Glow Sutil (Rose para Ocorrências) */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl"></div>

          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100 scale-125 shadow-sm">
            {Icons.Alert}
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2">Aviso Disciplinar</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Você deseja remover o registro de <span className="text-slate-900 font-bold">{pendingOccurrenceUncheck?.typeName || 'Ocorrência'}</span> para o aluno <span className="text-slate-900 font-bold">{pendingOccurrenceUncheck?.studentName || 'Estudante'}</span>?
            <br /><br />
            A pontuação negativa será removida e a média do aluno será recalculada.
          </p>

          <div className="flex flex-col space-y-3 w-full">
            <button
              onClick={handleConfirmOccurrenceUncheck}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Sim, Remover Registro
            </button>
            <button
              onClick={() => {
                setIsConfirmOccurrenceUncheckOpen(false);
                setTimeout(() => setPendingOccurrenceUncheck(null), 250);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none text-xs uppercase tracking-widest"
            >
              Manter Penalidade
            </button>
          </div>
        </div>
      </AnimatedModal>



      {/* MODAL: NOVA TURMA (PREMIUM) */}
      <AnimatedModal isOpen={turmaModalOpen} onClose={() => setTurmaModalOpen(false)} maxWidth="max-w-md" zIndex="z-[100]">

            {/* Header Premium Unificado */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative flex-shrink-0">
              <button
                onClick={() => setTurmaModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10"
              >
                &times;
              </button>
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-3xl">
                {Icons.Users}
              </div>
              <h3 className="text-xl font-black tracking-tight mb-0.5">
                Nova Turma
              </h3>
              <p className="text-indigo-200 font-medium text-xs">
                Expanda sua rede de ensino.
              </p>
            </div>

            <form onSubmit={handleCreateTurma} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                    Nome da Série/Turma:
                  </label>
                  <input
                    autoFocus
                    required
                    type="text"
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner text-sm"
                    placeholder="Ex: 8º Ano B, EJA..."
                    value={newTurmaName}
                    onChange={(e) => setNewTurmaName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest leading-none text-center">
                    Cores de Matéria:
                  </label>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                    {iconOptions.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedTurmaIcon(opt.id)}
                        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl transition-all duration-300 relative group/icon ${selectedTurmaIcon === opt.id
                          ? (() => {
                            if (opt.id === 'Portugues') return 'bg-rose-600 text-white shadow-md shadow-rose-500/40 scale-105';
                            if (opt.id === 'MPV') return 'bg-emerald-600 text-white shadow-md shadow-emerald-500/40 scale-105';
                            if (opt.id === 'Matematica') return 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 scale-105';
                            if (opt.id === 'Ciencias') return 'bg-amber-500 text-white shadow-md shadow-amber-500/40 scale-105';
                            if (opt.id === 'Ingles') return 'bg-cyan-600 text-white shadow-md shadow-cyan-500/40 scale-105';
                            if (opt.id === 'Religiao') return 'bg-purple-600 text-white shadow-md shadow-purple-500/40 scale-105';
                            if (opt.id === 'EducacaoFisica') return 'bg-orange-600 text-white shadow-md shadow-orange-500/40 scale-105';
                            return 'bg-slate-700 text-white shadow-md shadow-slate-500/40 scale-105';
                          })()
                          : 'bg-slate-50 border border-slate-100 text-slate-400 hover:border-slate-300 hover:scale-105'}`}
                        title={opt.name}
                      >
                        {React.cloneElement(Icons[opt.id] || Icons.Classe, { className: "w-5 h-5" })}
                        {selectedTurmaIcon === opt.id && (
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow border scale-90 ${(() => {
                            if (opt.id === 'Portugues') return 'text-rose-600 border-rose-600';
                            if (opt.id === 'MPV') return 'text-emerald-600 border-emerald-600';
                            if (opt.id === 'Matematica') return 'text-indigo-600 border-indigo-600';
                            if (opt.id === 'Ciencias') return 'text-amber-500 border-amber-500';
                            if (opt.id === 'Ingles') return 'text-cyan-600 border-cyan-600';
                            if (opt.id === 'Religiao') return 'text-purple-600 border-purple-600';
                            if (opt.id === 'EducacaoFisica') return 'text-orange-600 border-orange-600';
                            return 'text-slate-700 border-slate-700';
                          })()}`}>
                            {Icons.Check}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${(() => {
                      if (selectedTurmaIcon === 'Portugues') return 'text-rose-600';
                      if (selectedTurmaIcon === 'MPV') return 'text-emerald-600';
                      if (selectedTurmaIcon === 'Matematica') return 'text-indigo-600';
                      if (selectedTurmaIcon === 'Ciencias') return 'text-amber-500';
                      if (selectedTurmaIcon === 'Ingles') return 'text-cyan-600';
                      if (selectedTurmaIcon === 'Religiao') return 'text-purple-600';
                      if (selectedTurmaIcon === 'EducacaoFisica') return 'text-orange-600';
                      return 'text-slate-700';
                    })()}`}>
                      {iconOptions.find(o => o.id === selectedTurmaIcon)?.name}
                    </p>
                  </div>
                </div>

                <WeeklySchedulePicker value={newWeeklySchedule} onChange={setNewWeeklySchedule} />
              </div>

              <div className="mt-8 flex flex-col space-y-3">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all outline-none"
                >
                  Criar Turma Agora
                </button>
                <button
                  type="button"
                  onClick={() => setTurmaModalOpen(false)}
                  className="w-full py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none"
                >
                  Talvez Depois
                </button>
              </div>
            </form>
     
      </AnimatedModal>
      {/* MODAL: CONFIRMAR LOGOUT CLOUD (PREMIUM) */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl scale-in-95 duration-200 text-center border border-slate-100 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex-shrink-0"></div>
            <div className="p-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 scale-125 shadow-sm">
                 {Icons.CloudSync || Icons.Logout}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Trocar de Conta?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Deseja desconectar a conta atual do Google Drive? <br /><strong>Seus dados locais continuarão salvos e seguros</strong>, mas o backup automático será pausado até você conectar uma nova conta.
              </p>
              <div className="flex flex-col space-y-3 w-full">
                <button
                  onClick={handleCloudLogout}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30 outline-none"
                >
                  Sim, Desconectar
                </button>
                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none"
                >
                  Manter Conectado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: RESTAURAR DADOS (ESTILO PREMIUM) */}
      <AnimatedModal isOpen={restoreConfirmOpen} onClose={() => setRestoreConfirmOpen(false)} maxWidth="max-w-sm" zIndex="z-[60]">

            <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex-shrink-0"></div>
            <div className="p-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 scale-125 shadow-sm">
                {Icons.Alert}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Restaurar Nuvem?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Isso irá substituir **todos os dados locais** (alunos, notas, turmas) pelos dados guardados no Google Drive. Esta ação não pode ser desfeita.
              </p>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => setRestoreConfirmOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors outline-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={performRestore}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30 outline-none"
                >
                  Sim, Restaurar
                </button>
              </div>
            </div>
     
      </AnimatedModal>
      {/* NOTIFICAÇÃO TOAST FLUTUANTE (CANTO INFERIOR ESQUERDO) */}
      <div 
        className={`fixed bottom-8 left-8 z-[1200] max-w-sm w-full transition-all duration-300 ease-out transform ${
          alertConfig.open 
            ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' 
            : '-translate-x-12 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div 
          className={`relative bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border flex items-start gap-3.5 overflow-hidden transition-all ${
            alertConfig.type === 'success' 
              ? 'border-emerald-200/80 shadow-emerald-500/10' 
              : alertConfig.type === 'error' 
                ? 'border-rose-200/80 shadow-rose-500/10' 
                : alertConfig.type === 'warning'
                  ? 'border-amber-200/80 shadow-amber-500/10'
                  : 'border-indigo-200/80 shadow-indigo-500/10'
          }`}
        >
          {/* Barra de destaque lateral */}
          <div 
            className={`absolute top-0 left-0 bottom-0 w-1.5 ${
              alertConfig.type === 'success' 
                ? 'bg-emerald-500' 
                : alertConfig.type === 'error' 
                  ? 'bg-rose-500' 
                  : alertConfig.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
            }`}
          />

          {/* Ícone */}
          <div 
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
              alertConfig.type === 'success' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' 
                : alertConfig.type === 'error' 
                  ? 'bg-rose-50 text-rose-600 border-rose-200/60' 
                  : alertConfig.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border-amber-200/60'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-200/60'
            }`}
          >
            {alertConfig.type === 'success' ? Icons.Check : alertConfig.type === 'error' ? Icons.Alert : alertConfig.type === 'warning' ? Icons.Alert : Icons.Sparkles || Icons.Alert}
          </div>

          {/* Conteúdo do Texto */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
              {alertConfig.title}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 break-words line-clamp-3">
              {alertConfig.message}
            </p>
          </div>

          {/* Botão Fechar Rápido */}
          <button
            onClick={() => setAlertConfig(prev => ({ ...prev, open: false }))}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0 text-sm leading-none outline-none"
            title="Fechar"
          >
            &times;
          </button>
        </div>
      </div>
      {/* MODAL: CONFIGURAÇÕES IA (MENTE DO ARQUITETO) */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" onClick={() => setIsAIModalOpen(false)}></div>

          <div className="bg-[#0B1120] w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
            {/* Header Premium Unificado */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative flex-shrink-0 border-b border-white/5">
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="absolute top-5 right-6 text-white/50 hover:text-white transition-colors text-2xl font-bold p-1 outline-none z-10"
              >
                &times;
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
                  {Icons.Brain}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Mente do Arquiteto</h3>
                  <p className="text-indigo-200 text-xs font-medium opacity-80">Configure a essência da Inteligência Artificial</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              {/* API Key */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    Chave de API do Gemini (Google AI Studio)
                  </label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase tracking-widest">Obter Chave Grátis</a>
                </div>
                <input
                  type="password"
                  placeholder="Cole sua API Key aqui..."
                  value={settings?.gemini_api_key || ""}
                  onChange={(e) => setSettings({ ... (settings || {}), gemini_api_key: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-sm shadow-inner"
                />
              </div>

              {/* Prompt Template */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    Prompt Mestre (DNA do Arquiteto)
                  </label>
                  <button
                    onClick={() => {
                      if (confirm("Deseja restaurar o prompt padrão?")) {
                        setSettings({
                          ...(settings || {}),
                          ai_prompt_template: `[DIRETRIZES DO ARQUITETO PEDAGÓGICO]
Atue como Professor Mentor e Especialista em Didática com PhD, especialista na BNCC e nas Coleções Didáticas Oficiais (Superação para Língua Portuguesa e Transformar para MPV).

[ESTRUTURA CURRICULAR BNCC]
1. Objetivo Geral: Focado na autonomia, emancipação crítica e domínio prático do estudante.
2. Objetivos Específicos: Três metas claras, mensuráveis e aplicáveis ao componente curricular.
3. Habilidades da BNCC: Descrição sintética com código oficial e síntese direta de no máximo 2 linhas.

[ESTRUTURA OBRIGATÓRIA DE CADA AULA]
• Conceito (10 min): Mínimo de 1 parágrafo denso e didático contextualizando o tema, iniciando obrigatoriamente por "Professor, inicie a aula...".
• Atividades Práticas (20 min):
  - Texto Base Inédito contextualizado, rico em detalhes e exemplos cotidianos.
  - Desafio Investigativo numerado:
    1. Questão de Análise Conceitual e Reflexiva.
    2. Questão de Aplicação Prática e Socioemocional.
    3. Questão de Produção Textual / Aplicação Prática mão na massa.
• Socialização / Correção (20 min): Dinâmica de debate, correção coletiva e mediação pedagógica.
• Gabarito Comentado: Estritamente sucinto e objetivo (máximo 1 a 2 linhas por questão), contendo apenas a resposta/ideia-núcleo esperada e critério direto de correção.

[REGRAS DE ESTILO E LINGUAGEM]
Texto elegante, claro, formatado sem asteriscos soltos. Tom estimulante, rigorosamente alinhado à faixa etária e ao nível da turma.`
                        });
                      }
                    }}
                    className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase tracking-widest outline-none"
                  >
                    Restaurar Padrão
                  </button>
                </div>
                <textarea
                  value={settings?.ai_prompt_template || ""}
                  onChange={(e) => setSettings({ ... (settings || {}), ai_prompt_template: e.target.value })}
                  className="w-full h-80 px-8 py-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm leading-relaxed font-normal resize-none shadow-inner"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-10 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => {
                  if (confirm("Deseja limpar todas as configurações de IA?")) {
                    setSettings({ ... (settings || {}), gemini_api_key: "", ai_prompt_template: "" });
                  }
                }}
                className="text-xs font-black text-rose-500 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                Limpar Tudo
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className="px-8 py-4 text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleSaveSettings();
                    setIsAIModalOpen(false);
                  }}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                >
                  Salvar Mente do Arquiteto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EDITAR NOME DA TURMA */}
      {isEditTurmaModalOpen && turmaToManage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in transition-all">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditTurmaModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-[120] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-indigo-800 to-slate-900 p-6 text-white relative">
              <button
                onClick={() => setIsEditTurmaModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10"
              >
                &times;
              </button>
              <h3 className="text-xl font-black tracking-tight mb-0.5">Editar Turma</h3>
              <p className="text-slate-300 font-medium text-xs">Atualize a identidade da série.</p>
            </div>

            <div className="p-6">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest leading-none text-center">Identidade da Matéria:</label>
              <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto mb-4">
                {iconOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewTurmaIconEdit(opt.id)}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl transition-all duration-300 relative group/icon ${newTurmaIconEdit === opt.id
                      ? (() => {
                        if (opt.id === 'Portugues') return 'bg-rose-600 text-white shadow-md shadow-rose-500/40 scale-105';
                        if (opt.id === 'MPV') return 'bg-emerald-600 text-white shadow-md shadow-emerald-500/40 scale-105';
                        if (opt.id === 'Matematica') return 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 scale-105';
                        if (opt.id === 'Ciencias') return 'bg-amber-500 text-white shadow-md shadow-amber-500/40 scale-105';
                        if (opt.id === 'Ingles') return 'bg-cyan-600 text-white shadow-md shadow-cyan-500/40 scale-105';
                        if (opt.id === 'Religiao') return 'bg-purple-600 text-white shadow-md shadow-purple-500/40 scale-105';
                        if (opt.id === 'EducacaoFisica') return 'bg-orange-600 text-white shadow-md shadow-orange-500/40 scale-105';
                        return 'bg-slate-700 text-white shadow-md shadow-slate-500/40 scale-105';
                      })()
                      : 'bg-slate-50 border border-slate-100 text-slate-400 hover:border-slate-300 hover:scale-105'}`}
                    title={opt.name}
                  >
                    {React.cloneElement(Icons[opt.id] || Icons.Classe, { className: "w-5 h-5" })}
                    {newTurmaIconEdit === opt.id && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow border scale-90 ${(() => {
                        if (opt.id === 'Portugues') return 'text-rose-600 border-rose-600';
                        if (opt.id === 'MPV') return 'text-emerald-600 border-emerald-600';
                        if (opt.id === 'Matematica') return 'text-indigo-600 border-indigo-600';
                        if (opt.id === 'Ciencias') return 'text-amber-500 border-amber-500';
                        if (opt.id === 'Ingles') return 'text-cyan-600 border-cyan-600';
                        if (opt.id === 'Religiao') return 'text-purple-600 border-purple-600';
                        if (opt.id === 'EducacaoFisica') return 'text-orange-600 border-orange-600';
                        return 'text-slate-700 border-slate-700';
                      })()}`}>
                        {Icons.Check}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest leading-none">Nome da Série:</label>
              <input
                type="text"
                autoFocus
                value={newTurmaNameEdit}
                onChange={(e) => setNewTurmaNameEdit(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-bold text-slate-700 transition-all mb-4 shadow-inner text-sm"
              />

              <WeeklySchedulePicker value={newWeeklyScheduleEdit} onChange={setNewWeeklyScheduleEdit} />

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setIsEditTurmaModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!newTurmaNameEdit.trim()) return;
                    const res = await window.electronAPI.updateTurma(turmaToManage.id, newTurmaNameEdit.trim(), newTurmaIconEdit, newWeeklyScheduleEdit);
                    if (res.success) {
                      loadData();
                      showAlert("Sucesso", "Turma atualizada!", "success");
                      setIsEditTurmaModalOpen(false);
                    }
                  }}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR TURMA (AVISO CRÍTICO) */}
      {turmaToManage && (
      <AnimatedModal isOpen={isDeleteTurmaModalOpen} onClose={() => setIsDeleteTurmaModalOpen(false)} maxWidth="max-w-md" zIndex="z-[110]">

            <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex-shrink-0"></div>
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 scale-125 shadow-sm border border-rose-100">
                {Icons.Alert}
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Excluir &quot;{turmaToManage.name}&quot;?</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                Esta ação é <span className="text-rose-600 font-black">IRREVERSÍVEL</span>. Todos os alunos, notas, frequências e ocorrências desta turma serão apagados permanentemente do banco de dados local.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    const res = await window.electronAPI.deleteTurma(turmaToManage.id);
                    if (res.success) {
                      const remainingTurmas = turmas.filter(t => t.id !== turmaToManage.id);
                      if (activeTurmaId === turmaToManage.id) {
                        setActiveTurmaId(remainingTurmas.length > 0 ? remainingTurmas[0].id : null);
                      }
                      loadData();
                      showAlert("Turma Excluída", `A turma ${turmaToManage.name} e seus dados foram removidos.`, "success");
                      setIsDeleteTurmaModalOpen(false);
                    }
                  }}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {Icons.Trash} Sim, Excluir Definitivamente
                </button>
                <button onClick={() => setIsDeleteTurmaModalOpen(false)} className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold transition-all">Cancelar e Manter Dados</button>
              </div>
            </div>
     
      </AnimatedModal>
      )}


      {/* MODAL: Gerenciar Critérios Disciplinares */}
      {isDisciplinaryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsDisciplinaryModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-white/20 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Header Premium Unificado */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative flex-shrink-0">
              <button
                onClick={() => setIsDisciplinaryModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10"
              >
                &times;
              </button>
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-3xl text-rose-500">
                {Icons.Alert}
              </div>
              <h3 className="text-xl font-black tracking-tight mb-1">
                Gestão Disciplinar
              </h3>
              <p className="text-indigo-200 font-medium text-xs">
                Personalize as categorias e pesos das penalidades
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Lista Atual */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Critérios Ativos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {occurrenceTypes.map(t => (
                    <div key={t.id} className="group relative bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:border-rose-200 hover:bg-white transition-all shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${t.color}-500 shadow-sm shadow-${t.color}-500/50`}></div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-none">{t.title}</p>
                          <p className="text-[10px] font-black text-rose-500 mt-1 uppercase tracking-tighter">{t.penalty} pts</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingType(t);
                            setNewTypeName(t.title);
                            setNewTypePenalty(t.penalty);
                            setNewTypeColor(t.color || "rose");
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                          <p className="text-[10px] font-bold">✎</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOccurrenceType(t.id)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                        >
                          {Icons.Trash}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário Novo/Edição */}
              <div className="bg-rose-50/50 rounded-2xl border border-rose-100 p-5">
                <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                  {editingType ? 'Editar Critério' : 'Novo Critério'}
                </h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-rose-400 mb-2 uppercase tracking-widest ml-1">Nome do Critério</label>
                      <input
                        type="text"
                        value={newTypeName}
                        onChange={e => setNewTypeName(e.target.value)}
                        placeholder="Ex: Atraso, Celular..."
                        className="w-full px-5 py-3.5 rounded-2xl outline-none border border-rose-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 font-bold text-slate-700 shadow-sm bg-white transition-all uppercase placeholder:normal-case"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-rose-400 mb-2 uppercase tracking-widest ml-1">Penalidade (Ponto Negativo)</label>
                      <input
                        type="number"
                        step="0.01"
                        max="0"
                        value={newTypePenalty}
                        onChange={e => setNewTypePenalty(parseFloat(e.target.value))}
                        className="w-full px-5 py-3.5 rounded-2xl outline-none border border-rose-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 font-bold text-rose-600 shadow-sm bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-rose-400 mb-2 uppercase tracking-widest ml-1">Identidade Visual (Cor)</label>
                    <div className="flex flex-wrap gap-3">
                      {['rose', 'red', 'orange', 'amber', 'emerald', 'blue', 'indigo', 'purple'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTypeColor(color)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newTypeColor === color ? `bg-rose-600 text-white shadow-lg ring-4 ring-rose-100` : `bg-white border border-slate-100 text-slate-400 hover:scale-110`}`}
                        >
                          {newTypeColor === color ? Icons.Check : <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    {editingType && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(null);
                          setNewTypeName("");
                          setNewTypePenalty(-0.10);
                          setNewTypeColor("rose");
                        }}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Cancelar Edição
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newTypeName) return alert("Insira um nome");
                        if (editingType) {
                          await handleUpdateOccurrenceType(editingType.id, { title: newTypeName, penalty: newTypePenalty, color: newTypeColor });
                          setEditingType(null);
                        } else {
                          await handleAddOccurrenceType(newTypeName, newTypePenalty, newTypeColor);
                        }
                        setNewTypeName("");
                        setNewTypePenalty(-0.10);
                        setNewTypeColor("rose");
                      }}
                      className="flex-[2] py-4 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {editingType ? Icons.Check : '+'} {editingType ? 'Salvar Alterações' : 'Adicionar Critério'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Utilitário para formatar mês no display (FORA DO COMPONENTE)
const getDisplayMonth = (yyyy_mm) => {
  if (!yyyy_mm || typeof yyyy_mm !== "string") return "";
  const parts = yyyy_mm.split("-");
  if (parts.length < 2) return yyyy_mm;
  const [y, m] = parts;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date
    .toLocaleString("pt-BR", { month: "long", year: "numeric" })
    .toUpperCase();
};

export default GlobalModals;
