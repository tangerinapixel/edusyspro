import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";
import AnimatedModal from "../components/shared/AnimatedModal";
import CustomDatePicker from "../components/shared/CustomDatePicker";

const Atividades = () => {
  const {
    students,
    activities,
    activityTopics,
    computedGrades,
    activeTurmaId,
    loadData,
    activityColumns,
    setActivityColumns,
    showAlert,
    handleConfirmUncheck,
    turmas,
    settings,
    units,
    activeUnitId,
    turmaUnitParams,
    // Triggers Globais
    topicModalOpen, setTopicModalOpen,
    selectedTopicDate, setSelectedTopicDate,
    editingTopicDate, setEditingTopicDate,
    isChangingDate, setIsChangingDate,
    currentTopicText, setCurrentTopicText,
    isConfirmUncheckOpen, setIsConfirmUncheckOpen,
    pendingActivityUncheck, setPendingActivityUncheck,
    deleteActivityConfirmOpen, setDeleteActivityConfirmOpen
  } = useApp();


  // Helper para obter a data local no fuso do usuário (yyyy-mm-dd e yyyy-mm) sem bug de UTC
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalMonthString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Obter dados da unidade letiva ativa dinamicamente
  const currentUnitData = useMemo(() => {
    return units?.find((u) => u.id === activeUnitId) || units?.find((u) => u.is_active);
  }, [units, activeUnitId]);

  // Regra de limite semanal (máximo 2 lições/semana): ativada a partir da 2ª Unidade ou se a data da aula for após a criação da unidade
  const isWeeklyLimitEnforced = useCallback((targetDate) => {
    if (!currentUnitData) return false;
    if (currentUnitData.id >= 2) return true;
    if (currentUnitData.created_at) {
      const unitStartDate = String(currentUnitData.created_at).slice(0, 10);
      if (targetDate >= unitStartDate) return true;
    }
    return false;
  }, [currentUnitData]);

  // Controle do Calendário de Colunas (Mês a Mês)
  const currentMonthString = getLocalMonthString();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthString);
  const [newColumnDate, setNewColumnDate] = useState(getLocalDateString());

  // --- LÓGICA DE EXIBIÇÃO DO CALENDÁRIO (PAGINAÇÃO DE COLUNAS) ---

  // Filtra apenas colunas válidas da unidade ativa
  const safeColumns = useMemo(() => {
    return (activityColumns || []).filter((d) => typeof d === "string" && d.length >= 7);
  }, [activityColumns]);

  // Escopo estrito: exibe exclusivamente os meses que contêm lições na unidade ativa
  const availableMonths = useMemo(() => {
    const monthsFromColumns = [...new Set(safeColumns.map((d) => d.slice(0, 7)))].filter(Boolean).sort();
    if (monthsFromColumns.length > 0) {
      return monthsFromColumns;
    }
    // Fallback seguro apenas quando a unidade não possui lições registradas
    const fallbackMonth = currentUnitData?.created_at
      ? String(currentUnitData.created_at).slice(0, 7)
      : currentMonthString;
    return [fallbackMonth];
  }, [safeColumns, currentUnitData, currentMonthString]);

  // Rastreia a unidade anterior para disparar a sincronização quando o usuário alternar a unidade no cabeçalho
  const prevUnitIdRef = useRef(activeUnitId);

  // Sincronização reativa: reposiciona automaticamente o mês selecionado ao alternar de unidade ou quando o mês estiver fora do escopo
  useEffect(() => {
    if (!availableMonths || availableMonths.length === 0) return;

    const unitChanged = prevUnitIdRef.current !== activeUnitId;
    prevUnitIdRef.current = activeUnitId;

    if (unitChanged || !availableMonths.includes(selectedMonth)) {
      if (availableMonths.includes(currentMonthString)) {
        setSelectedMonth(currentMonthString);
      } else {
        // Seleciona o mês mais recente cadastrado na unidade ativa
        setSelectedMonth(availableMonths[availableMonths.length - 1]);
      }
    }
  }, [activeUnitId, availableMonths, selectedMonth, currentMonthString]);

  // Contadores para o feedback de Lições (Registradas no calendário vs Configuradas nos parâmetros da unidade)
  const currentTurma = turmas?.find((t) => t.id === activeTurmaId);
  const currentUnitParams = (turmaUnitParams || []).find(
    (p) => p.turma_id === activeTurmaId && p.unit_id === activeUnitId
  );
  const totalLessons = currentUnitParams?.max_activities ?? currentTurma?.max_activities ?? settings?.max_activities ?? 12;
  const registeredLessons = safeColumns.length;

  // Helper para identificar a semana do mês (1 a 5) alinhada por semanas reais (Segunda a Domingo)
  const getWeekOfMonth = (dateStr) => {
    if (typeof dateStr !== "string" || dateStr.length < 10) return 1;
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const firstDay = new Date(year, month - 1, 1, 12, 0, 0);
      const firstDayOfWeek = firstDay.getDay(); // 0 = Dom, 1 = Seg...
      const firstMondayDay = firstDayOfWeek === 1 ? 1 : (firstDayOfWeek === 0 ? 2 : 9 - firstDayOfWeek);

      if (day < firstMondayDay) return 1;
      return Math.min(5, Math.floor((day - firstMondayDay) / 7) + (firstMondayDay === 1 ? 1 : 2));
    } catch (e) {
      return 1;
    }
  };

  const todayStr = getLocalDateString();
  const currentWeekNum = getWeekOfMonth(todayStr);

  // Padrão: Seleciona a semana atual se for o mês corrente (a partir de 20/07/2026)
  const [selectedWeek, setSelectedWeek] = useState(() => {
    return selectedMonth === currentMonthString ? currentWeekNum : "all";
  });

  // Atualizar semana selecionada ao alternar de mês: Mantém a semana atual se válida ou seleciona a última semana ativa cadastrada no mês
  useEffect(() => {
    const colsInMonth = safeColumns.filter((d) => typeof d === "string" && d.startsWith(selectedMonth));
    const activeWeeksInMonth = [...new Set(colsInMonth.map(getWeekOfMonth))].sort((a, b) => a - b);

    if (activeWeeksInMonth.length > 0) {
      if (selectedWeek !== "all" && activeWeeksInMonth.includes(selectedWeek)) {
        // Mantém a semana selecionada pelo usuário se ela existir no mês
        return;
      }
      setSelectedWeek(activeWeeksInMonth[activeWeeksInMonth.length - 1]);
    } else if (selectedMonth === currentMonthString) {
      setSelectedWeek(currentWeekNum);
    } else {
      setSelectedWeek("all");
    }
  }, [selectedMonth]);

  // Filtra todas as colunas do mês selecionado
  const monthColumns = useMemo(() => {
    return safeColumns.filter((d) => d.startsWith(selectedMonth));
  }, [safeColumns, selectedMonth]);

  // Filtra de acordo com a semana selecionada (ou todas)
  const visibleColumns = useMemo(() => {
    return monthColumns.filter((d) => {
      if (selectedWeek === "all") return true;
      return getWeekOfMonth(d) === selectedWeek;
    });
  }, [monthColumns, selectedWeek]);

  // Set otimizado O(1) para verificação rápida de lições concluídas
  const completedActivitiesSet = useMemo(() => {
    const set = new Set();
    if (activities && activities.length > 0) {
      activities.forEach((a) => {
        if (a.is_completed) {
          set.add(`${a.student_id}_${a.date}`);
        }
      });
    }
    return set;
  }, [activities]);

  // Helper para obter o índice da lição dentro da sua semana (0 -> Lição 1 Teoria, 1 -> Lição 2 Prática)
  const getLessonIndexInWeek = (dateStr) => {
    const weekKey = getWeekKey(dateStr);
    const weekCols = safeColumns
      .filter((d) => getWeekKey(d) === weekKey)
      .sort();
    return weekCols.indexOf(dateStr);
  };

  // Calcula as cores para separar visualmente as semanas (Alterna entre Verde/Azul) - baseado nas colunas do mês para estabilidade de cores
  const columnWeekColors = useMemo(() => {
    const map = {};
    if (monthColumns.length === 0) return map;

    const firstDate = new Date(monthColumns[0] + 'T12:00:00');
    const refMonday = new Date(firstDate);
    refMonday.setDate(firstDate.getDate() - (firstDate.getDay() || 7) + 1);

    monthColumns.forEach((dateStr) => {
      try {
        const d = new Date(dateStr + 'T12:00:00');
        const diffWeeks = Math.floor((d - refMonday) / (1000 * 60 * 60 * 24 * 7));
        map[dateStr] = diffWeeks % 2 !== 0; // True = Verde, False = Azul
      } catch (e) {
        map[dateStr] = false;
      }
    });
    return map;
  }, [monthColumns]);

  // Funções de navegação do calendário
  const getDisplayMonth = (yyyy_mm) => {
    if (!yyyy_mm || typeof yyyy_mm !== "string") return "";
    const parts = yyyy_mm.split("-");
    if (parts.length < 2) return yyyy_mm;
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return date.toLocaleString("pt-BR", { month: "long", year: "numeric" }).toUpperCase();
  };

  // Índice seguro do mês selecionado dentro da lista de meses disponíveis
  const currentMonthIdx = availableMonths.indexOf(selectedMonth);
  const canGoPrev = currentMonthIdx > 0 || (currentMonthIdx === -1 && availableMonths.length > 1);
  const canGoNext = currentMonthIdx !== -1 && currentMonthIdx < availableMonths.length - 1;

  const goPrevMonth = () => {
    if (availableMonths.length === 0) return;
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    } else if (idx === -1) {
      setSelectedMonth(availableMonths[0]);
    }
  };

  const goNextMonth = () => {
    if (availableMonths.length === 0) return;
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx !== -1 && idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    } else if (idx === -1) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  };

  // Helper para agrupar datas pelo Monday da semana
  const getWeekKey = (dateStr) => {
    if (typeof dateStr !== "string" || dateStr.length < 10) return "";
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      return getLocalDateString(monday);
    } catch (e) {
      return dateStr;
    }
  };

  // Helper para obter o nome do dia da semana (ex: Terça, Segunda)
  const getDayOfWeekName = (dateStr) => {
    if (typeof dateStr !== "string" || dateStr.length < 10) return "";
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      const days = ["Dom", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sáb"];
      return days[d.getDay()];
    } catch (e) {
      return "";
    }
  };

  // Helper para calcular % de conclusão de uma lição/coluna na turma
  const getColumnCompletion = (colDate) => {
    if (!students || students.length === 0) return { count: 0, total: 0, pct: 0 };
    const doneCount = students.filter(aluno =>
      completedActivitiesSet.has(`${aluno.id}_${colDate}`)
    ).length;
    const pct = Math.round((doneCount / students.length) * 100);
    return { count: doneCount, total: students.length, pct };
  };

  // --- LÓGICA DE REGISTRO E DADOS ---

  // Adiciona uma nova coluna de data na tabela com restrição dinâmica de 2 lições por semana
  const handleAddDateColumn = async () => {
    if (!newColumnDate || !window.electronAPI) return;

    // Regra: Bloquear mais de 2 lições por semana de forma dinâmica de acordo com a unidade ativa
    const targetWeekKey = getWeekKey(newColumnDate);
    const existingInWeek = safeColumns.filter((colDate) => getWeekKey(colDate) === targetWeekKey);
    const shouldLimit = isWeeklyLimitEnforced(newColumnDate);

    if (shouldLimit && existingInWeek.length >= 2) {
      showAlert(
        "Limite Semanal Atingido",
        `Na ${currentUnitData?.name || "unidade atual"}, é permitido o lançamento de no máximo 2 lições por semana (Lição 1 - Teoria / Lição 2 - Prática) para manter a organização e a previsibilidade pedagógica.`,
        "warning"
      );
      return;
    }

    // Persistência imediata para evitar que a coluna suma ao recarregar
    await window.electronAPI.saveActivityTopic(newColumnDate, "", activeTurmaId);

    if (!activityColumns.includes(newColumnDate)) {
      setActivityColumns([...activityColumns, newColumnDate].sort());
    }
    setSelectedMonth(newColumnDate.slice(0, 7)); // Navega para o mês da coluna nova
    setSelectedWeek(getWeekOfMonth(newColumnDate)); // Navega cirurgicamente para a semana da data inserida
    loadData();
  };

  // Alterna o status de entrega (com proteção de segurança se for para desmarcar)
  const toggleActivity = async (aluno, dateString, isDone) => {
    if (!window.electronAPI) return;
    if (isDone) {
      setPendingActivityUncheck({ studentId: aluno.id, date: dateString, studentName: aluno.name });
      setIsConfirmUncheckOpen(true);
      return;
    }
    await window.electronAPI.toggleActivity(aluno.id, dateString);
    loadData();
  };

  // --- LÓGICA DO ASSUNTO (TOPICS) ---

  const openTopicModal = (dateString) => {
    setSelectedTopicDate(dateString);
    setEditingTopicDate(dateString);
    setIsChangingDate(false);
    const existing = activityTopics.find(t => t.date === dateString);
    setCurrentTopicText(existing ? existing.topic : "");
    setTopicModalOpen(true);
  };

  const handleUpdateActivityDate = async () => {
    if (!window.electronAPI || !selectedTopicDate || !editingTopicDate) return;
    if (selectedTopicDate === editingTopicDate) {
      setIsChangingDate(false);
      return;
    }

    // Regra: Bloquear alteração de data se a semana de destino exceder 2 lições
    const targetWeekKey = getWeekKey(editingTopicDate);
    const existingInTargetWeek = safeColumns.filter(
      (colDate) => colDate !== selectedTopicDate && getWeekKey(colDate) === targetWeekKey
    );
    const shouldLimit = isWeeklyLimitEnforced(editingTopicDate);

    if (shouldLimit && existingInTargetWeek.length >= 2) {
      showAlert(
        "Limite Semanal Atingido",
        `A semana de destino na ${currentUnitData?.name || "unidade atual"} já possui 2 lições cadastradas. Não é possível mover esta atividade para lá.`,
        "warning"
      );
      return;
    }

    const res = await window.electronAPI.updateActivityDate(selectedTopicDate, editingTopicDate, activeTurmaId);
    if (res.success) {
      showAlert("Sucesso!", "Data da atividade atualizada com sucesso.", "success");
      setSelectedTopicDate(editingTopicDate);
      setIsChangingDate(false);
      loadData();
    } else {
      showAlert("Erro", res.error, "error");
    }
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    let targetDate = selectedTopicDate;

    // Se o usuário alterou a data no campo mas clicou direto no botão Salvar principal do modal
    if (editingTopicDate && editingTopicDate !== selectedTopicDate) {
      const targetWeekKey = getWeekKey(editingTopicDate);
      const existingInTargetWeek = safeColumns.filter(
        (colDate) => colDate !== selectedTopicDate && getWeekKey(colDate) === targetWeekKey
      );
      const shouldLimit = isWeeklyLimitEnforced(editingTopicDate);

      if (shouldLimit && existingInTargetWeek.length >= 2) {
        showAlert(
          "Limite Semanal Atingido",
          `A semana de destino na ${currentUnitData?.name || "unidade atual"} já possui 2 lições cadastradas. Não é possível mover esta atividade para lá.`,
          "warning"
        );
        return;
      }

      const res = await window.electronAPI.updateActivityDate(selectedTopicDate, editingTopicDate, activeTurmaId);
      if (res.success) {
        targetDate = editingTopicDate;
        setSelectedTopicDate(editingTopicDate);
        setIsChangingDate(false);
      } else {
        showAlert("Erro ao Alterar Data", res.error, "error");
        return;
      }
    }

    await window.electronAPI.saveActivityTopic(targetDate, currentTopicText, activeTurmaId);
    if (targetDate) {
      setSelectedMonth(targetDate.substring(0, 7));
      setSelectedWeek(getWeekOfMonth(targetDate));
    }
    setTopicModalOpen(false);
    loadData();
  };

  const handleDeleteActivity = async () => {
    if (!window.electronAPI || !selectedTopicDate) return;
    await window.electronAPI.deleteActivityDate(selectedTopicDate, activeTurmaId);
    setSelectedMonth(getLocalMonthString()); // Resetar visual para evitar telas brancas
    setDeleteActivityConfirmOpen(false);
    setTopicModalOpen(false);
    loadData();
  }; 

  return (
    <>
      {/* VISUAL DA TELA DE ATIVIDADES */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300 relative flex flex-col flex-1 min-h-0">
        {/* Header Slim - Barra Superior */}
        <div className="px-5 py-2.5 border-b border-slate-100/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 shrink-0 relative z-30">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Registro de Entregas</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 shadow-2xs tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="font-medium text-slate-500">Lições:</span>
              <span className="font-extrabold text-indigo-900">{registeredLessons} de {totalLessons}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor Compacto de Data */}
            <div className="flex items-center shrink-0 gap-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">AULA:</span>
              <CustomDatePicker
                compact
                value={newColumnDate}
                onChange={(e) => setNewColumnDate(e.target.value)}
              />
            </div>

            <button 
              onClick={handleAddDateColumn} 
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-2xs outline-none transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Registrar Coluna</span>
            </button>

            <button 
              onClick={() => openTopicModal(newColumnDate)} 
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-xl font-semibold text-xs outline-none transition-all shrink-0 flex items-center gap-1.5 cursor-pointer" 
              title="Registrar Assunto da Atividade"
            >
              {Icons.Book} <span>Assunto</span>
            </button>
          </div>
        </div>

        {/* Sub-Barra Slim de Navegação Temporal (Mês + Semanas) */}
        <div className="px-5 py-1.5 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 z-20 shrink-0">
          {/* Navegador de Mês */}
          <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={goPrevMonth}
              disabled={!canGoPrev}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all outline-none cursor-pointer disabled:cursor-not-allowed"
              title="Mês Anterior"
            >
              {Icons.ChevronLeft}
            </button>
            <span className="text-xs font-bold text-slate-700 tracking-wider text-center px-3 min-w-[130px]">
              {getDisplayMonth(selectedMonth)}
            </span>
            <button
              onClick={goNextMonth}
              disabled={!canGoNext}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all outline-none cursor-pointer disabled:cursor-not-allowed"
              title="Próximo Mês"
            >
              {Icons.ChevronRight}
            </button>
          </div>

          {/* Abas de Semanas (Páginas) Compactas */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 shrink-0 flex-wrap">
            {["all", 1, 2, 3, 4, 5].map((wk) => {
              const hasData = wk === "all" || safeColumns.some(d => d.startsWith(selectedMonth) && getWeekOfMonth(d) === wk);
              if (!hasData) return null;
              
              const isCurrent = wk === currentWeekNum && selectedMonth === currentMonthString;
              const label = wk === "all" ? "Todas" : isCurrent ? `Semana ${wk} (Atual)` : `Semana ${wk}`;
              const isSelected = selectedWeek === wk;
              
              return (
                <button
                  key={wk}
                  onClick={() => setSelectedWeek(wk)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all outline-none cursor-pointer ${
                    isSelected
                      ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corpo da tabela - scroll interno, header fixo */}
        <div className="flex-1 overflow-y-auto overflow-x-auto relative bg-white no-scrollbar pb-10">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#f8fafc] sticky top-0 z-10">
              <tr className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-3 py-2 bg-[#f8fafc] border-b border-slate-200/80 w-[220px] align-middle">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Estudante</span>
                    <span>Pontos</span>
                  </div>
                </th>
                {visibleColumns.map((colDate, colIdx) => {
                  const comp = getColumnCompletion(colDate);
                  const currentWeek = getWeekKey(colDate);
                  const nextCol = visibleColumns[colIdx + 1];
                  const isWeekBoundary = nextCol && getWeekKey(nextCol) !== currentWeek;
                  const lessonIdx = getLessonIndexInWeek(colDate);
                  const lessonTitle = lessonIdx === 0 ? "Lição 1 (Teoria)" : lessonIdx === 1 ? "Lição 2 (Prática)" : `Lição ${lessonIdx + 1}`;

                  return (
                    <th
                      key={colDate}
                      className={`p-1.5 border-b text-center group/header relative ${
                        columnWeekColors[colDate]
                          ? 'bg-emerald-100/90 border-b-emerald-200'
                          : 'bg-indigo-100/90 border-b-indigo-200'
                      } ${
                        isWeekBoundary
                          ? 'border-r-2 border-r-slate-300/80 shadow-[1px_0_0_rgba(0,0,0,0.04)]'
                          : 'border-r border-r-slate-200/60'
                      }`}
                    >
                      {/* Rótulo da Lição (Teoria / Prática) */}
                      <div className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${
                        columnWeekColors[colDate] ? 'text-emerald-800' : 'text-indigo-800'
                      }`}>
                        {lessonTitle}
                      </div>

                      <div className="font-bold text-slate-800 text-[9px] tracking-tight whitespace-nowrap">
                        {getDayOfWeekName(colDate)} {colDate.split("-")[2]}/{colDate.split("-")[1]}
                      </div>
                      <div className="opacity-60 text-[7px] text-slate-600">{colDate.split("-")[0]}</div>
                      
                      {/* Badge de % de Conclusão da Turma (Mastery 70%) */}
                      {students.length > 0 && (
                        <div className="mt-0.5">
                          <span
                            className={`inline-block px-1 py-0.5 rounded text-[7px] font-extrabold shadow-2xs ${
                              comp.pct >= 70
                                ? "bg-emerald-200 text-emerald-800 border border-emerald-400/80"
                                : "bg-amber-100 text-amber-800 border border-amber-300/80"
                            }`}
                            title={`${comp.count} de ${comp.total} alunos entregaram (${comp.pct}% - Meta: 70%)`}
                          >
                            {comp.pct}% {comp.pct >= 70 ? "✓" : ""}
                          </span>
                        </div>
                      )}

                      <div className="mt-1 flex justify-center">
                        <button onClick={() => openTopicModal(colDate)} className={`p-1 rounded-lg transition-all ${activityTopics.find(t => t.date === colDate) ? 'text-indigo-700 bg-white border border-indigo-200 scale-110 shadow-sm' : 'text-slate-400 hover:text-indigo-600 opacity-60 group-hover/header:opacity-100'}`} title={activityTopics.find(t => t.date === colDate) ? "Ver/Editar Assunto" : "Registrar Assunto"}>
                          {Icons.Info}
                        </button>
                      </div>
                    </th>
                  );
                })}
                {visibleColumns.length === 0 && (
                  <th className="p-4 border-b border-slate-100 font-medium text-slate-400 normal-case tracking-normal">Nenhuma atividade registrada neste mês. Use o seletor acima.</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {students.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-indigo-50/20 group">
                  <td className="px-3 py-2 border-r border-slate-200/60 align-middle w-[220px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate flex-1" title={aluno.name}>
                        {aluno.name}
                      </span>
                      {(() => {
                        const gradeInfo = computedGrades.find(g => g.student_id === aluno.id);
                        if (!gradeInfo) return <span className="text-[10px] text-slate-300 font-mono">—</span>;
                        return (
                          <span 
                            className="inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold border border-indigo-200/80 shadow-2xs shrink-0"
                            title={`Nota acumulada de lições: ${Number(gradeInfo.licao || 0).toFixed(2)} pts`}
                          >
                            {Number(gradeInfo.licao || 0).toFixed(2)} pts
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  {visibleColumns.map((colDate, colIdx) => {
                    const isDone = completedActivitiesSet.has(`${aluno.id}_${colDate}`);
                    const currentWeek = getWeekKey(colDate);
                    const nextCol = visibleColumns[colIdx + 1];
                    const isWeekBoundary = nextCol && getWeekKey(nextCol) !== currentWeek;

                    return (
                      <td
                        key={colDate}
                        className={`p-1.5 align-middle text-center ${
                          columnWeekColors[colDate] ? 'bg-emerald-50/40' : 'bg-indigo-50/30'
                        } ${
                          isWeekBoundary
                            ? 'border-r-2 border-r-slate-300/80 shadow-[1px_0_0_rgba(0,0,0,0.03)]'
                            : 'border-r border-r-slate-100'
                        }`}
                      >
                        <button
                          onClick={() => toggleActivity(aluno, colDate, isDone)}
                          aria-label={`Marcar atividade para ${aluno.name} na data ${colDate}`}
                          className={`w-7 h-7 sm:w-8 sm:h-8 inline-flex rounded-xl items-center justify-center transition-all outline-none touch-manipulation active:scale-90 cursor-pointer ${
                            isDone 
                              ? (columnWeekColors[colDate] ? "bg-emerald-600 text-white shadow-[0_3px_10px_rgba(16,185,129,0.3)] scale-105" : "bg-indigo-600 text-white shadow-[0_3px_10px_rgba(79,70,229,0.3)] scale-105")
                              : (columnWeekColors[colDate] ? "bg-emerald-50/80 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/50" : "bg-indigo-50/80 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/50")
                          }`}
                        >
                          {isDone && Icons.Check}
                        </button>
                      </td>
                    );
                  })}
                  {visibleColumns.length === 0 && <td></td>}
                </tr>
              ))}
              <tr><td colSpan={visibleColumns.length + 1} className="h-32"></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR ASSUNTO DA ATIVIDADE */}
      <AnimatedModal isOpen={topicModalOpen} onClose={() => setTopicModalOpen(false)} maxWidth="max-w-lg">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative flex-shrink-0">
          <button onClick={() => setTopicModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl font-bold p-2 outline-none z-10">&times;</button>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-3xl">{Icons.Book}</div>
          <h3 className="text-2xl font-black tracking-tight mb-1">Assunto da Atividade</h3>
          <p className="text-indigo-200 font-medium text-sm">Gerencie o tópico e a data desta entrega</p>
        </div>

        <div className="p-8">
          <div className="mb-8 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Data da Entrega:</label>
            <div className="flex items-center gap-4">
              {isChangingDate ? (
                <>
                  <div className="flex-1">
                    <CustomDatePicker
                      value={editingTopicDate}
                      onChange={(e) => setEditingTopicDate(e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={handleUpdateActivityDate} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer">Salvar</button>
                  <button type="button" onClick={() => setIsChangingDate(false)} className="px-6 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95 cursor-pointer">X</button>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">{Icons.Calendar}</div>
                    <span className="font-black text-slate-700 text-xl tracking-tight">{selectedTopicDate?.split("-")?.[2] || "--"}/{selectedTopicDate?.split("-")?.[1] || "--"}/{selectedTopicDate?.split("-")?.[0] || "--"}</span>
                  </div>
                  <button type="button" onClick={() => setIsChangingDate(true)} className="px-5 py-2.5 bg-white border border-indigo-100 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm flex items-center gap-2">{Icons.Activity} Alterar Data</button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveTopic}>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Descrição do que foi avaliado:</label>
            <textarea autoFocus required className="w-full h-40 px-6 py-5 rounded-3xl bg-slate-50 border border-slate-100 outline-none font-medium text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all resize-none shadow-inner" placeholder="Exemplo: Correção da lição de casa pág 45..." value={currentTopicText} onChange={(e) => setCurrentTopicText(e.target.value)} />
            <div className="flex justify-between items-center mt-8">
              <button type="button" onClick={() => setDeleteActivityConfirmOpen(true)} className="px-6 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-600 hover:text-white transition-all outline-none flex items-center gap-2">{Icons.Trash} Excluir</button>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setTopicModalOpen(false)} className="px-8 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all outline-none">Cancelar</button>
                <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all outline-none">Salvar</button>
              </div>
            </div>
          </form>
        </div>
      </AnimatedModal>

      {/* MODAL 2: CONFIRMAR EXCLUSÃO DE ATIVIDADE */}
      <AnimatedModal isOpen={deleteActivityConfirmOpen} onClose={() => setDeleteActivityConfirmOpen(false)} maxWidth="max-w-sm" zIndex="z-[60]">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 scale-125 shadow-sm">{Icons.Alert}</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Limpar Registros?</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">Você está prestes a apagar <strong>integralmente</strong> o assunto e todos os check-ins do dia {selectedTopicDate?.split("-")?.[2] || "--"}/{selectedTopicDate?.split("-")?.[1] || "--"}. Esta ação é irreversível.</p>
          <div className="flex space-x-3 w-full">
            <button onClick={() => setDeleteActivityConfirmOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors outline-none">Cancelar</button>
            <button onClick={handleDeleteActivity} className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-600/30 outline-none">Sim, Limpar</button>
          </div>
        </div>
      </AnimatedModal>

      {/* MODAL 3: CONFIRMAR DESMARCAÇÃO DE ATIVIDADE DE UM ALUNO */}
      <AnimatedModal isOpen={isConfirmUncheckOpen} onClose={() => { setIsConfirmUncheckOpen(false); setTimeout(() => setPendingActivityUncheck(null), 250); }} maxWidth="max-w-sm" zIndex="z-[110]">
        <div className="p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100 scale-125 shadow-sm relative z-10">{Icons.Shield}</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Segurança de Registro</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed relative z-10">
            Você deseja desmarcar a atividade de <span className="text-slate-900 font-bold">{pendingActivityUncheck?.studentName || 'Estudante'}</span> no dia <span className="text-slate-900 font-bold">{pendingActivityUncheck?.date?.split("-")?.[2] || "--"}/{pendingActivityUncheck?.date?.split("-")?.[1] || "--"}</span>?<br /><br />Isso removerá o ponto conquistado pelo aluno nesta data.
          </p>
          <div className="flex flex-col space-y-3 w-full relative z-10">
            <button onClick={handleConfirmUncheck} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/30 hover:bg-rose-600 transition-all active:scale-95 uppercase tracking-widest text-xs">Sim, Desmarcar Registro</button>
            <button onClick={() => { setIsConfirmUncheckOpen(false); setTimeout(() => setPendingActivityUncheck(null), 250); }} className="w-full py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none text-xs uppercase tracking-widest">Manter Concluído</button>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
};

export default Atividades;
