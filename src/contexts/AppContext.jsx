import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { normalizeWeeklySchedule } from "../utils/scheduleUtils";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

const getTodayLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const AppProvider = ({ children }) => {
  // --- ESTADOS GLOBAIS ---
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Iniciando EduSys Pro...");

  // Navegação e UI (via React Router)
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);
  const setActiveTab = useCallback((tab) => {
    navigate(`/${tab === 'dashboard' ? '' : tab}`);
  }, [navigate]);
  const [selectedReport, setSelectedReport] = useState("students");
  const [showAllRankings, setShowAllRankings] = useState(false);

  // Dados Principais
  const [students, setStudents] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [activeTurmaId, setActiveTurmaId] = useState(null);
  const [units, setUnits] = useState([]);
  const [activeUnitId, setActiveUnitId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [occurrenceTypes, setOccurrenceTypes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityTopics, setActivityTopics] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDateString);
  const [activityColumns, setActivityColumns] = useState([]);
  const [classOccurrences, setClassOccurrences] = useState([]);
  const [computedGrades, setComputedGrades] = useState([]);

  // Modais e Estados de UI
  // Modais Adicionais (Centralização Global)
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [selectedTopicDate, setSelectedTopicDate] = useState("");
  const [editingTopicDate, setEditingTopicDate] = useState("");
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [currentTopicText, setCurrentTopicText] = useState("");
  const [deleteActivityConfirmOpen, setDeleteActivityConfirmOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isDisciplinaryModalOpen, setIsDisciplinaryModalOpen] = useState(false);
  const [isEditTurmaModalOpen, setIsEditTurmaModalOpen] = useState(false);
  const [isDeleteTurmaModalOpen, setIsDeleteTurmaModalOpen] = useState(false);
  const [turmaModalOpen, setTurmaModalOpen] = useState(false);
  const [newTurmaName, setNewTurmaName] = useState("");
  const [selectedTurmaIcon, setSelectedTurmaIcon] = useState("Home");
  const [turmaMenuOpen, setTurmaMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);

  // Turma Management State
  const [turmaToManage, setTurmaToManage] = useState(null);
  const [newTurmaNameEdit, setNewTurmaNameEdit] = useState("");
  const [newTurmaIconEdit, setNewTurmaIconEdit] = useState("Classe");
  const [configTurmaId, setConfigTurmaId] = useState(null);
  const [configUnitId, setConfigUnitId] = useState(null);
  const [turmaUnitParams, setTurmaUnitParams] = useState([]);

  // Confirmações
  const [isConfirmOccurrenceUncheckOpen, setIsConfirmOccurrenceUncheckOpen] = useState(false);
  const [pendingOccurrenceUncheck, setPendingOccurrenceUncheck] = useState(null);
  const [isConfirmUncheckOpen, setIsConfirmUncheckOpen] = useState(false);
  const [pendingActivityUncheck, setPendingActivityUncheck] = useState(null);

  // Autenticação e Segurança
  const [authStatus, setAuthStatus] = useState("checking");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");

  // Sistema de Licenciamento & Proteção
  const [licenseInfo, setLicenseInfo] = useState({
    status: 'CHECKING',
    isValid: false,
    canOperate: false,
    claims: null,
    machineId: '',
    daysRemaining: 0,
    message: ''
  });
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Cloud Sync
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Avaliação e Alerta
  const [alertConfig, setAlertConfig] = useState({ open: false, title: "", message: "", type: "info" });
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [studentForEval, setStudentForEval] = useState(null);
  const [evalCategory, setEvalCategory] = useState("provas");
  const [newTestName, setNewTestName] = useState("");
  const [newTestScore, setNewTestScore] = useState("");
  const [editingEvalId, setEditingEvalId] = useState(null);

  // IA e Diagnóstico
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [studentDiagnosis, setStudentDiagnosis] = useState("");
  const [selectedDiagStudent, setSelectedDiagStudent] = useState(null);
  const [diagPrevTab, setDiagPrevTab] = useState("dashboard");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingStudentPDF, setIsExportingStudentPDF] = useState(false);

  // Estado de processamento (para evitar concorrência)
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.authGetStatus();
      setAuthStatus(status.status);
      setAuthName(status.user_name || "");
    } catch (err) {
      console.error("Erro ao checar auth:", err);
    }
  }, []);

  const checkLicense = useCallback(async () => {
    try {
      if (window.electronAPI?.licenseGetStatus) {
        const info = await window.electronAPI.licenseGetStatus();
        setLicenseInfo(info);
        if (info.status === 'UNLICENSED' || info.status === 'EXPIRED') {
          setIsLicenseModalOpen(true);
        }
        return info;
      }
    } catch (err) {
      console.error("[AppContext] Erro ao checar licença:", err);
    }
    return null;
  }, []);

  // --- INICIALIZAÇÃO & REATIVIDADE CONTÍNUA ---
  useEffect(() => {
    checkAuthStatus();
    checkLicense();

    // 1. Escuta eventos IPC Push do processo principal (Electron)
    let unsubscribeLicense = null;
    if (window.electronAPI?.onLicenseStatus) {
      unsubscribeLicense = window.electronAPI.onLicenseStatus((info) => {
        if (info) {
          setLicenseInfo(info);
          if (info.status === 'UNLICENSED' || info.status === 'EXPIRED') {
            setIsLicenseModalOpen(true);
          }
        }
      });
    }

    // 2. Reavaliação automática ao retornar o foco ou restaurar janela
    const handleFocus = () => {
      checkLicense();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLicense();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Heartbeat periódico (a cada 15 minutos) para atualizar contagem de dias mesmo sem interação
    const licenseHeartbeat = setInterval(() => {
      checkLicense();
    }, 15 * 60 * 1000);

    // 4. Ciclo de mensagens premium
    setTimeout(() => setLoadingMessage("Preparando ambiente Elite..."), 800);
    setTimeout(() => setLoadingMessage("EduSys Pro v5.5.2"), 1500);

    // 5. CRÍTICO: Libera a tela de carregamento após 2.2s
    setTimeout(() => setIsAppLoading(false), 2200);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(licenseHeartbeat);
      if (typeof unsubscribeLicense === 'function') {
        unsubscribeLicense();
      }
    };
  }, [checkAuthStatus, checkLicense]);

  // --- LÓGICA DE NEGÓCIO (COMPUTED) ---


  const dashboardStats = useMemo(() => {
    if (!computedGrades.length) {
      return { 
        avgMedia: 0, 
        alertsCount: 0, 
        alertPct: 0, 
        topStudent: null, 
        totalStudents: 0, 
        totalOccurrences: 0, 
        avgOccs: 0, 
        avgEngagement: 0 
      };
    }

    const totalStudents = students.length;
    const sumMedia = computedGrades.reduce((acc, curr) => acc + curr.mediaFinal, 0);
    const alertsCount = computedGrades.filter(g => g.isAlert).length;
    const topStudent = [...computedGrades].sort((a, b) => b.mediaFinal - a.mediaFinal)[0];
    const totalOccurrences = computedGrades.reduce((acc, g) => acc + (g.occurrencesCount || 0), 0);
    const avgOccs = totalStudents > 0 ? (totalOccurrences / totalStudents).toFixed(1) : 0;
    const alertPct = totalStudents > 0 ? (alertsCount / totalStudents) * 100 : 0;

    // Engajamento Real: percentual de lições concluídas sobre o total possível da turma
    const totalCompletedActivities = computedGrades.reduce((acc, g) => acc + (g.licaoCheckCount || 0), 0);
    const totalPossibleActivities = computedGrades.reduce((acc, g) => acc + (g.maxActivities || 0), 0);
    const avgEngagement = totalPossibleActivities > 0
      ? (totalCompletedActivities / totalPossibleActivities) * 100
      : 0;

    return {
      avgMedia: totalStudents > 0 ? (sumMedia / totalStudents).toFixed(2) : "0.00",
      alertsCount,
      alertPct,
      topStudent,
      totalStudents,
      totalOccurrences,
      avgOccs,
      avgEngagement
    };
  }, [students, computedGrades]);

  // --- FUNÇÕES GLOBAIS ---

  const alertTimerRef = useRef(null);

  const showAlert = useCallback((title, message, type = "info") => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    setAlertConfig({ open: true, title, message, type });
    alertTimerRef.current = setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, open: false }));
    }, 3800);
  }, []);

  const openProfileModal = useCallback((studentId) => {
    if (!studentId) return;
    const sId = Number(studentId);
    const profile = computedGrades.find((g) => Number(g.student_id) === sId);
    if (profile) {
      setStudentProfile(profile);
      setProfileModalOpen(true);
    }
  }, [computedGrades]);

  const navigateToDiagnosis = useCallback((gradeOrStudent) => {
    if (!gradeOrStudent) return;
    const targetId = Number(gradeOrStudent.student_id || gradeOrStudent.id);
    const fullData = (gradeOrStudent.student_id && gradeOrStudent.mediaFinal !== undefined)
      ? gradeOrStudent
      : computedGrades.find(g => Number(g.student_id) === targetId);

    if (!fullData) {
      showAlert("Aviso", "Ainda não há dados suficientes para este aluno.", "warning");
      return;
    }

    setSelectedDiagStudent(fullData);
    setDiagPrevTab(activeTab);
    setActiveTab("diagnostico-detalhe");
    setStudentDiagnosis("");
  }, [activeTab, computedGrades, showAlert]);

  const handleGenerateDiagnosis = async (specificStudent = null) => {
    const targetStudent = specificStudent || selectedDiagStudent || studentProfile;
    if (!targetStudent || !window.electronAPI) return;

    setIsGeneratingDiagnosis(true);
    setStudentDiagnosis("");

    try {
      // 1. Coleta de Dados Comparativos e de Contexto
      const allOccurrences = classOccurrences.filter(o => Number(o.student_id) === Number(targetStudent.student_id || targetStudent.id));

      // Cálculo de Médias da Turma
      const classAvg = computedGrades.length > 0
        ? computedGrades.reduce((acc, curr) => acc + curr.mediaFinal, 0) / computedGrades.length
        : 0;

      // Cálculo de Rank (Quem tem a maior média final)
      const sortedGrades = [...computedGrades].sort((a, b) => b.mediaFinal - a.mediaFinal);
      const studentRank = sortedGrades.findIndex(s => Number(s.student_id) === Number(targetStudent.student_id || targetStudent.id)) + 1;

      // Mapeamento de Tópicos Avaliados (Nomes das avaliações)
      const evalTopics = [
        ...(targetStudent.testesLista || []).map(t => `${t.name} (Mini-Teste)`),
        ...(targetStudent.provasLista || []).map(p => `${p.name} (Prova)`),
        ...(targetStudent.trabalhosLista || []).map(t => `${t.name} (Trabalho)`)
      ];

      // Tendência Comportamental (Ocorrências últimos 30 dias vs 60 dias)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

      const occurrencesThisMonth = allOccurrences.filter(o => new Date(o.date) >= thirtyDaysAgo).length;
      const occurrencesLastMonth = allOccurrences.filter(o => new Date(o.date) >= sixtyDaysAgo && new Date(o.date) < thirtyDaysAgo).length;
      const behaviorTrend = occurrencesThisMonth < occurrencesLastMonth ? "Melhorando" : occurrencesThisMonth > occurrencesLastMonth ? "Piorando" : "Estável";

      // Metadados e Parâmetros da Turma e Unidade
      const effectiveTurmaId = targetStudent.turma_id || activeTurmaId;
      const effectiveUnitId = targetStudent.unit_id || activeUnitId || 1;
      const targetTurma = (turmas || []).find(t => t.id === effectiveTurmaId);
      const targetUnit = (units || []).find(u => u.id === effectiveUnitId);
      const targetUnitParams = (turmaUnitParams || []).find(p => p.turma_id === effectiveTurmaId && p.unit_id === effectiveUnitId);

      const totalPlannedActivities = targetUnitParams?.max_activities ?? targetTurma?.max_activities ?? settings?.max_activities ?? 21;
      const activitiesWeight = targetUnitParams?.max_activities_weight ?? targetTurma?.max_activities_weight ?? settings?.max_activities_weight ?? 1.0;
      const appliedActivitiesCount = (activityColumns || []).filter(d => typeof d === 'string' && d.length >= 7).length;
      const deliveredActivitiesCount = targetStudent.licaoCheckCount || 0;
      const futureActivitiesCount = Math.max(0, totalPlannedActivities - appliedActivitiesCount);
      const realAdhesionRate = appliedActivitiesCount > 0
        ? Math.min(100, Math.round((deliveredActivitiesCount / appliedActivitiesCount) * 100))
        : 100;

      const maxMiniScore = targetUnitParams?.max_mini_teste_score ?? targetTurma?.max_mini_teste_score ?? targetStudent.maxMiniTesteScore ?? 10;
      const maxProvaScore = targetUnitParams?.max_prova_score ?? targetTurma?.max_prova_score ?? targetStudent.maxProvaScore ?? 10;
      const maxProvaWeight = targetUnitParams?.max_provas_weight ?? targetTurma?.max_provas_weight ?? targetStudent.maxProvasWeight ?? 4.0;
      const maxTrabalhoWeight = 1.0;

      const detailedEvals = {
        miniTestes: (targetStudent.testesLista || []).map(t => {
          const score = Number(t.score || 0);
          const pct = maxMiniScore > 0 ? Math.round((score / maxMiniScore) * 100) : 0;
          return `${t.name}: ${score.toFixed(1)} de ${maxMiniScore} pts máximos (${pct}% de aproveitamento)`;
        }),
        provas: (targetStudent.provasLista || []).map(p => {
          const score = Number(p.score || 0);
          const pct = maxProvaScore > 0 ? Math.round((score / maxProvaScore) * 100) : 0;
          return `${p.name}: ${score.toFixed(1)} de ${maxProvaScore} pts na prova (${pct}% de aproveitamento | peso na média: até ${maxProvaWeight.toFixed(1)} pts)`;
        }),
        trabalhos: (targetStudent.trabalhosLista || []).map(t => {
          const score = Number(t.score || 0);
          const pct = Math.round((score / maxTrabalhoWeight) * 100);
          const qualificacao = pct >= 80 ? 'Desempenho Muito Bom/Excelente' : pct >= 60 ? 'Desempenho Satisfatório' : 'Necessita de Atenção';
          return `${t.name}: ${score.toFixed(2)} de ${maxTrabalhoWeight.toFixed(2)} ponto máximo da cota trimestral (${pct}% de aproveitamento - ${qualificacao})`;
        }),
        bonus: (targetStudent.bonusLista || []).map(b => {
          const score = Number(b.score || 0);
          return `${b.name}: +${score.toFixed(2)} ponto(s) bônus adicionado(s) na unidade`;
        })
      };

      // 2. Chamada para a I.A.
      const res = await window.electronAPI.generateStudentReport({
        studentId: targetStudent.student_id || targetStudent.id,
        name: targetStudent.name,
        turmaName: targetTurma?.name || 'Turma',
        unitName: targetUnit?.name || 'Unidade Vigente',
        turmaId: effectiveTurmaId,
        unitId: effectiveUnitId,
        stats: {
          mediaFinal: targetStudent.mediaFinal.toFixed(2),
          bonus: Number(targetStudent.bonus || 0).toFixed(2),
          behaviorScore: targetStudent.behaviorScore.toFixed(2),
          behaviorStartScore: String(settings?.behavior_start_score ?? 3.0),
          licao: targetStudent.licao.toFixed(2),
          deliveredActivitiesCount,
          appliedActivitiesCount,
          totalPlannedActivities,
          activitiesWeight,
          futureActivitiesCount,
          realAdhesionRate,
          testCount: evalTopics.length,
          classAverage: classAvg.toFixed(2),
          rank: `${studentRank}/${computedGrades.length}`,
          topics: evalTopics.join(", "),
          trend: behaviorTrend
        },
        occurrences: allOccurrences,
        detailedEvals
      });

      if (res.success) {
        setStudentDiagnosis(res.text);

        // 3. Auto-arquivamento imediato e atômico no Acervo de Diagnósticos I.A.
        try {
          if (window.electronAPI?.diagnosisArchiveSave) {
            await window.electronAPI.diagnosisArchiveSave({
              student_id: Number(targetStudent.student_id || targetStudent.id),
              student_name: targetStudent.name,
              turma_id: effectiveTurmaId ? Number(effectiveTurmaId) : null,
              turma_name: targetTurma?.name || 'Turma',
              unit_id: effectiveUnitId ? Number(effectiveUnitId) : null,
              unit_name: targetUnit?.name || '1ª Unidade',
              author_name: authName || '',
              diagnosis_text: res.text,
              metrics_snapshot: {
                media_final: targetStudent.mediaFinal,
                behavior_score: targetStudent.behaviorScore,
                behavior_start_score: settings?.behavior_start_score ?? 3.0,
                adhesion_rate: realAdhesionRate,
                delivered_activities: deliveredActivitiesCount,
                applied_activities: appliedActivitiesCount,
                occurrences_count: (allOccurrences || []).length,
                class_average: classAvg,
                rank_position: `${studentRank}/${computedGrades.length}`,
                trend: behaviorTrend
              },
              evaluation_topics: evalTopics
            });

            showAlert("Diagnóstico Arquivado!", `Parecer pedagógico de ${targetStudent.name} gerado e salvo com sucesso no Acervo I.A.`, "success");
          }
        } catch (archiveErr) {
          console.warn("[AppContext] Falha ao auto-arquivar diagnóstico:", archiveErr);
        }
      } else {
        showAlert("Erro na I.A.", res.error, "error");
      }
    } catch (error) {
      showAlert("Falha Crítica", "Ocorreu um erro ao tentar acessar o motor de IA.", "error");
    } finally {
      setIsGeneratingDiagnosis(false);
    }
  };

  const handleExportDiagnosis = async () => {
    if (!studentDiagnosis || isExporting) return;
    const targetName = selectedDiagStudent?.name || studentProfile?.name || "Estudante";
    setIsExporting(true);
    try {
      const title = `DIAGNÓSTICO: ${targetName}`;
      const res = await window.electronAPI.exportToDoc(studentDiagnosis, title);

      if (res.success) {
        if (res.link) {
          window.open(res.link, '_blank');
        } else {
          showAlert("Sucesso!", `Relatório de ${targetName} exportado para o Google Docs.`, "success");
        }
      } else {
        showAlert("Erro na Exportação", res.error, "error");
      }
    } catch (e) {
      showAlert("Erro", "Falha ao conectar com o Google Drive.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStudentReportPDF = async (student, diagnosisText) => {
    if (!student || isExportingStudentPDF || !window.electronAPI) return;
    setIsExportingStudentPDF(true);
    try {
      const currentTurma = turmas.find(t => t.id === activeTurmaId);
      const currentUnit = units.find(u => u.id === activeUnitId);

      const turmaName = currentTurma ? currentTurma.name : "Turma";
      const unitName = currentUnit ? currentUnit.name : "Unidade";

      const studentGrades = {
        name: student.name,
        licao: student.licao,
        licaoCheckCount: student.licaoCheckCount,
        maxActivities: student.maxActivities,
        trabalho: student.trabalho,
        totalMiniTestes: student.totalMiniTestes,
        behaviorScore: student.behaviorScore,
        prova: student.prova,
        mediaFinal: student.mediaFinal
      };

      const res = await window.electronAPI.exportStudentReportPDF({
        turmaName,
        unitName,
        studentName: student.name,
        grades: studentGrades,
        parecerTexto: diagnosisText
      });

      if (res.success) {
        showAlert("Sucesso!", `Boletim de ${student.name} exportado em PDF.`, "success");
      } else if (!res.cancelled) {
        showAlert("Erro na Exportação", res.error || "Erro ao gerar PDF.", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Erro Crítico", "Falha ao exportar o boletim em PDF.", "error");
    } finally {
      setIsExportingStudentPDF(false);
    }
  };

  const loadData = useCallback(async () => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(setSettings);
      const loadedTurmas = await window.electronAPI.getTurmas();
      setTurmas(loadedTurmas);
      
      if (!activeTurmaId && loadedTurmas && loadedTurmas.length > 0) {
        setActiveTurmaId(loadedTurmas[0].id);
        return; // Retorna pois a alteração do estado vai disparar o useEffect e chamar loadData novamente
      }

      const currentStudents = await window.electronAPI.getStudents(activeTurmaId);
      setStudents(currentStudents);

      window.electronAPI.getOccurrences(selectedDate).then(setOccurrences);

      // Carregar unidades e definir a ativa
      const loadedUnits = await window.electronAPI.getUnits();
      setUnits(loadedUnits || []);
      const currentActiveUnit = (loadedUnits || []).find(u => u.is_active);
      const resolvedUnitId = currentActiveUnit?.id ?? 1;
      setActiveUnitId(resolvedUnitId);

      window.electronAPI.getStudentComputedGrades(activeTurmaId, resolvedUnitId).then(setComputedGrades);

      const [acts, topics] = await Promise.all([
        window.electronAPI.getActivities(),
        window.electronAPI.getActivityTopics(activeTurmaId, resolvedUnitId)
      ]);

      setActivities(acts || []);
      setActivityTopics(topics || []);

      const studentIds = (currentStudents || []).map(s => s.id);
      const uniqueDates = new Set([
        ...(acts || []).filter(a => studentIds.includes(a.student_id)).map(a => a.date),
        ...(topics || []).map(t => t.date)
      ]);
      setActivityColumns([...uniqueDates].filter(Boolean).sort());

      window.electronAPI.getOccurrences().then(setClassOccurrences);
      window.electronAPI.getOccurrenceTypes().then(setOccurrenceTypes);
      window.electronAPI.cloudIsAuthenticated().then(setIsCloudAuthenticated);
      if (window.electronAPI.getAllTurmaUnitParams) {
        window.electronAPI.getAllTurmaUnitParams().then(setTurmaUnitParams);
      }
    }
  }, [activeTurmaId, selectedDate]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleAdvanceUnit = useCallback(async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.advanceUnit();
    if (res.success) {
      showAlert(
        `${res.activeUnit.name} Iniciada!`,
        `Os dados foram separados com sucesso. Tópicos do calendário foram copiados como modelo.`,
        'success'
      );
      loadData();
    } else {
      showAlert('Atenção', res.error, 'warning');
    }
  }, [showAlert, loadData]);

  const handleSwitchToUnit = useCallback(async (unitId) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.switchToUnit(unitId);
    if (res.success) {
      loadData();
    } else {
      showAlert('Erro', res.error, 'error');
    }
  }, [showAlert, loadData]);

  const handleLogin = async (password) => {
    setAuthError("");
    const res = await window.electronAPI.authLogin({ password });
    if (res.success) {
      setAuthStatus("authenticated");
      loadData(); 
    } else {
      setAuthError(res.error);
    }
  };

  const handleSetup = async (password, userName) => {
    const res = await window.electronAPI.authSetup({ password, user_name: userName });
    if (res.success) {
      setRecoveryKey(res.recoveryKey);
      setAuthStatus("setup_complete");
    } else {
      setAuthError(res.error);
      setTimeout(() => setAuthError(""), 3000);
    }
  };

  const handleReset = async (recoveryKey, password) => {
    const res = await window.electronAPI.authResetPassword({ 
      recoveryKey, 
      newPassword: password 
    });
    if (res.success) {
      setAuthStatus("unauthenticated");
      showAlert("Sucesso!", "Sua senha foi redefinida. Faça login agora.", "success");
    } else {
      setAuthError(res.error);
      setTimeout(() => setAuthError(""), 3000);
    }
  };

  const handleCloudSync = useCallback(async (manual = false) => {
    if (!isCloudAuthenticated) return;
    setIsSyncing(true);
    try {
      const res = await window.electronAPI.cloudSync();
      if (res.success) {
        setLastSyncTime(new Date());
        if (manual) showAlert("Sincronização Concluída", "Seus dados foram salvos com segurança no Google Drive.", "success");
      } else {
        setIsCloudAuthenticated(false); // Força checagem novamente na interface caso o token tenha caído
        if (manual) showAlert("Erro na Nuvem", res.error || res.message || "Falha ao sincronizar. O token pode estar expirado.", "error");
      }
    } catch (err) {
      if (manual) showAlert("Erro Crítico", "Erro ao conectar com o serviço de nuvem.", "error");
    } finally {
      setIsSyncing(false);
    }
  }, [isCloudAuthenticated, showAlert]);

  const handleCloudLogin = async () => {
    setIsSyncing(true);
    try {
      const res = await window.electronAPI.cloudLogin();
      if (res && res.success) {
        setIsCloudAuthenticated(true);
        showAlert("Conectado!", "Sua conta Google foi vinculada com sucesso.", "success");
      } else if (res && res.cancelled) {
        // Usuário fechou a janela OAuth — sem alerta, é intencional
      } else {
        showAlert("Erro de Login", res?.error || "Falha ao autenticar no Google.", "error");
      }
    } catch (err) {
      showAlert("Erro de Login", "Falha ao comunicar com o serviço de autenticação.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const performRestore = async () => {
    setIsSyncing(true);
    setRestoreConfirmOpen(false);
    try {
      const res = await window.electronAPI.cloudRestore();
      if (res.success) {
        showAlert("Dados Restaurados", "Seu sistema foi atualizado com os dados da nuvem.", "success");
        loadData();
      } else {
        showAlert("Erro na Restauração", res.error || "Não foi possível restaurar os dados.", "error");
      }
    } catch (err) {
      showAlert("Erro Crítico", "Falha na conexão com a nuvem.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmOccurrenceUncheck = useCallback(async () => {
    if (!pendingOccurrenceUncheck || !window.electronAPI) return;
    const occId = pendingOccurrenceUncheck.id;
    setIsConfirmOccurrenceUncheckOpen(false);
    setTimeout(() => setPendingOccurrenceUncheck(null), 250);
    await window.electronAPI.removeOccurrence(occId);
    loadData();
  }, [pendingOccurrenceUncheck, loadData]);

  const handleConfirmUncheck = useCallback(async () => {
    if (!pendingActivityUncheck || !window.electronAPI) return;
    const { studentId, date } = pendingActivityUncheck;
    setIsConfirmUncheckOpen(false);
    setTimeout(() => setPendingActivityUncheck(null), 250);
    await window.electronAPI.toggleActivity(studentId, date);
    loadData();
  }, [pendingActivityUncheck, loadData]);

  // Handlers de Avaliação
  const openEvalModal = useCallback((student, category) => {
    setStudentForEval(student);
    setEvalCategory(category);
    setEvalModalOpen(true);
  }, []);

  const handleAddEvalItem = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!newTestName.trim() || !newTestScore || !window.electronAPI || !studentForEval) return;

    const scoreVal = parseFloat(newTestScore.toString().replace(",", "."));
    if (isNaN(scoreVal) || scoreVal < 0) {
      showAlert("Valor Inválido", "Por favor, digite uma nota numérica válida e maior ou igual a zero.", "warning");
      return;
    }

    // Validação de Turma, Teto e Cota Máxima (Contextualizada pela Unidade Ativa)
    const targetTurmaId = studentForEval.turma_id || activeTurmaId;
    const currentTurma = turmas.find(t => t.id === targetTurmaId);
    const currentUnitParams = (turmaUnitParams || []).find(p => p.turma_id === targetTurmaId && p.unit_id === activeUnitId);

    if (evalCategory === 'provas') {
      const maxProvas = currentUnitParams?.max_provas ?? currentTurma?.max_provas ?? studentForEval.maxProvas ?? settings.max_provas ?? 1;
      const currentProvasCount = studentForEval.provasLista?.length || 0;
      if (!editingEvalId && currentProvasCount >= maxProvas) {
        showAlert("Limite Atingido", `Esta turma (${currentTurma?.name || 'Atual'}) tem limite configurado de ${maxProvas} prova(s) para esta unidade. Não é possível adicionar além da cota.`, "warning");
        return;
      }
      const maxScore = currentUnitParams?.max_prova_score ?? currentTurma?.max_prova_score ?? settings.max_prova_score ?? 10;
      if (scoreVal > maxScore) {
        showAlert("Aviso de Teto", `A nota informada (${scoreVal}) excede a nota máxima permitida para provas nesta turma (${maxScore}).`, "warning");
        return;
      }
    } else if (evalCategory === 'mini_testes') {
      const maxMiniTestes = currentUnitParams?.max_mini_testes ?? currentTurma?.max_mini_testes ?? studentForEval.maxMiniTestes ?? settings.max_mini_testes ?? 14;
      const currentTestesCount = studentForEval.testesLista?.length || 0;
      if (!editingEvalId && currentTestesCount >= maxMiniTestes) {
        showAlert("Limite Atingido", `Esta turma (${currentTurma?.name || 'Atual'}) tem limite configurado de ${maxMiniTestes} mini-testes para esta unidade. Não é possível adicionar além da cota.`, "warning");
        return;
      }
      const maxScore = currentUnitParams?.max_mini_teste_score ?? currentTurma?.max_mini_teste_score ?? settings.max_mini_teste_score ?? 10;
      if (scoreVal > maxScore) {
        showAlert("Aviso de Teto", `A nota informada (${scoreVal}) excede a nota máxima permitida para mini-testes nesta turma (${maxScore}).`, "warning");
        return;
      }
    } else if (evalCategory === 'trabalhos') {
      if (scoreVal > 1.0) {
        showAlert("Aviso de Teto", `A nota de trabalho é somada diretamente na média da unidade (cota máxima de 1.00 ponto). Se desejava lançar a nota de 0 a 10, converta para a cota (ex: 8.0 vira 0.80). O valor digitado (${scoreVal}) excede 1.00 ponto.`, "warning");
        return;
      }
    } else if (evalCategory === 'bonus') {
      if (scoreVal > 2.0) {
        showAlert("Aviso de Limite Bônus", `A nota bônus é somada diretamente na média da unidade. Para preservar o equilíbrio pedagógico, cada atividade bônus aceita até 2.00 pontos. O valor digitado (${scoreVal}) excede esse limite.`, "warning");
        return;
      }
    }

    if (editingEvalId) {
      await window.electronAPI.updateEvaluationItem(
        evalCategory,
        editingEvalId,
        newTestName,
        scoreVal,
      );
      setEditingEvalId(null);
    } else {
      await window.electronAPI.addEvaluationItem(
        evalCategory,
        studentForEval.student_id,
        newTestName,
        scoreVal,
      );
    }

    setNewTestName("");
    setNewTestScore("");
    await loadData();
    
    const refreshedGrades = await window.electronAPI.getStudentComputedGrades(activeTurmaId, activeUnitId);
    setStudentForEval(
      refreshedGrades.find((g) => Number(g.student_id) === Number(studentForEval.student_id)),
    );
  }, [newTestName, newTestScore, editingEvalId, evalCategory, studentForEval, activeTurmaId, activeUnitId, loadData, turmas, settings, turmaUnitParams, showAlert]);

  const handleEditEvalItem = useCallback((item) => {
    setEditingEvalId(item.id);
    setNewTestName(item.name);
    setNewTestScore(item.score.toString());
  }, []);

  const handleReorderEvalItems = useCallback(async (startIndex, endIndex) => {
    if (!window.electronAPI || startIndex === endIndex || !studentForEval) return;
    await window.electronAPI.reorderEvaluationItems(
      evalCategory,
      studentForEval.student_id,
      startIndex,
      endIndex
    );
    await loadData();
    const refreshedGrades = await window.electronAPI.getStudentComputedGrades(activeTurmaId, activeUnitId);
    setStudentForEval(
      refreshedGrades.find((g) => Number(g.student_id) === Number(studentForEval.student_id)),
    );
  }, [evalCategory, studentForEval, activeTurmaId, activeUnitId, loadData]);

  const handleDeleteEvalItem = useCallback(async (itemId) => {
    if (!window.electronAPI || !studentForEval) return;
    await window.electronAPI.removeEvaluationItem(evalCategory, itemId);
    await loadData();
    const refreshedGrades = await window.electronAPI.getStudentComputedGrades(activeTurmaId, activeUnitId);
    setStudentForEval(
      refreshedGrades.find((g) => Number(g.student_id) === Number(studentForEval.student_id)),
    );
  }, [evalCategory, studentForEval, activeTurmaId, activeUnitId, loadData]);

  const [newWeeklySchedule, setNewWeeklySchedule] = useState(() => normalizeWeeklySchedule(null));
  const [newWeeklyScheduleEdit, setNewWeeklyScheduleEdit] = useState(() => normalizeWeeklySchedule(null));

  const handleCreateTurma = async (e) => {
    if (e) e.preventDefault();
    if (!newTurmaName.trim() || !window.electronAPI) return;
    const res = await window.electronAPI.addTurma(newTurmaName, selectedTurmaIcon, newWeeklySchedule);
    if (res.success) {
      setNewTurmaName("");
      setSelectedTurmaIcon("Home");
      setNewWeeklySchedule(normalizeWeeklySchedule(null));
      setTurmaModalOpen(false);
      refreshData();
      showAlert("Turma Inicializada!", `A turma ${newTurmaName} foi criada com sucesso.`, "success");
    }
  };

  const handleEditTurma = async (e) => {
    if (e) e.preventDefault();
    if (!newTurmaNameEdit.trim() || !turmaToManage || !window.electronAPI) return;
    const res = await window.electronAPI.updateTurma(turmaToManage.id, newTurmaNameEdit, newTurmaIconEdit, newWeeklyScheduleEdit);
    if (res.success) {
      setIsEditTurmaModalOpen(false);
      setTurmaToManage(null);
      refreshData();
      showAlert("Turma Atualizada!", "As alterações foram salvas com sucesso.", "success");
    }
  };

  const handleDeleteTurma = async () => {
    if (!turmaToManage || !window.electronAPI || isProcessingAction) return;
    setIsProcessingAction(true);
    const res = await window.electronAPI.deleteTurma(turmaToManage.id);
    if (res.success) {
      if (activeTurmaId === turmaToManage.id) setActiveTurmaId(null);
      setIsDeleteTurmaModalOpen(false);
      setTurmaToManage(null);
      refreshData();
      showAlert("Turma Removida", "A turma e todos os seus registros foram deletados.", "info");
    }
    setIsProcessingAction(false);
  };

  const handleSaveSettings = async () => {
    if (!window.electronAPI || !settings) return;
    await window.electronAPI.saveSettings(settings);
    loadData();
    showAlert("Sucesso!", "Configurações salvas com sucesso.", "success");
  };

  const handleLogout = useCallback(() => {
    setAuthStatus("unauthenticated");
  }, []);

  // --- EFFECTS ---

  useEffect(() => {
    checkAuthStatus();
    
    const checkCloud = async () => {
      const isAuth = await window.electronAPI.cloudIsAuthenticated();
      setIsCloudAuthenticated(isAuth);
    };
    checkCloud();

    const handleOnline = () => {
      window.electronAPI.cloudIsAuthenticated().then(setIsCloudAuthenticated);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkAuthStatus]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadData();
    }
  }, [authStatus, activeTurmaId, loadData]);

  // Timer de Sync Automático
  useEffect(() => {
    if (isCloudAuthenticated && authStatus === "authenticated") {
      const timer = setInterval(() => handleCloudSync(false), 5 * 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [isCloudAuthenticated, authStatus, handleCloudSync]);

  const value = {
    // Estados Principais e Navegação
    isAppLoading, setIsAppLoading,
    loadingMessage, setLoadingMessage,
    activeTab, setActiveTab,
    showAllRankings, setShowAllRankings,
    selectedReport, setSelectedReport,
    students, setStudents,
    turmas, setTurmas,
    activeTurmaId, setActiveTurmaId,
    configTurmaId, setConfigTurmaId,
    configUnitId, setConfigUnitId,
    turmaUnitParams, setTurmaUnitParams,
    units, activeUnitId,
    settings, setSettings,
    occurrenceTypes, setOccurrenceTypes,
    activities, setActivities,
    activityTopics, setActivityTopics,
    occurrences, setOccurrences,
    selectedDate, setSelectedDate,
    activityColumns, setActivityColumns,
    classOccurrences, setClassOccurrences,
    computedGrades, setComputedGrades,
    dashboardStats,
    
    // UI e Modais
    turmaModalOpen, setTurmaModalOpen,
    newTurmaName, setNewTurmaName,
    selectedTurmaIcon, setSelectedTurmaIcon,
    newWeeklySchedule, setNewWeeklySchedule,
    newWeeklyScheduleEdit, setNewWeeklyScheduleEdit,
    turmaMenuOpen, setTurmaMenuOpen,
    profileModalOpen, setProfileModalOpen,
    studentProfile, setStudentProfile,
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
    
    // Confirmações e Alertas
    isConfirmOccurrenceUncheckOpen, setIsConfirmOccurrenceUncheckOpen,
    pendingOccurrenceUncheck, setPendingOccurrenceUncheck,
    isConfirmUncheckOpen, setIsConfirmUncheckOpen,
    pendingActivityUncheck, setPendingActivityUncheck,
    logoutConfirmOpen, setLogoutConfirmOpen,
    restoreConfirmOpen, setRestoreConfirmOpen,
    alertConfig, setAlertConfig,

    // Autenticação e Segurança
    authStatus, setAuthStatus,
    authName, setAuthName,
    authError, setAuthError,
    recoveryKey, setRecoveryKey,
    isCloudAuthenticated, setIsCloudAuthenticated,
    isSyncing, setIsSyncing,
    lastSyncTime, setLastSyncTime,

    // Sistema de Licenciamento & Proteção
    licenseInfo, setLicenseInfo,
    isLicenseModalOpen, setIsLicenseModalOpen,
    checkLicense,
    
    // IA e Diagnóstico
    isGeneratingDiagnosis, studentDiagnosis, selectedDiagStudent, diagPrevTab,
    isExportingStudentPDF,
    evalModalOpen, setEvalModalOpen,
    studentForEval, setStudentForEval,
    evalCategory, setEvalCategory,
    newTestName, setNewTestName,
    newTestScore, setNewTestScore,
    editingEvalId, setEditingEvalId,
    isProcessingAction, setIsProcessingAction,
    
    // Funções de Ação
    showAlert,
    handleExportStudentReportPDF,
    openProfileModal,
    navigateToDiagnosis,
    checkAuthStatus,
    loadData,
    refreshData,
    handleLogin,
    handleLogout,
    handleSetup,
    handleReset,
    handleConfirmUncheck,
    handleConfirmOccurrenceUncheck,
    handleAdvanceUnit,
    handleSwitchToUnit,
    openEvalModal,
    handleAddEvalItem,
    handleEditEvalItem,
    handleReorderEvalItems,
    handleDeleteEvalItem,
    handleCloudSync,
    handleCloudLogin,
    performRestore,
    handleSaveSettings,
    handleCreateTurma,
    handleEditTurma,
    handleDeleteTurma,
    handleGenerateDiagnosis,
    handleExportDiagnosis,
    turmaToManage, setTurmaToManage,
    newTurmaNameEdit, setNewTurmaNameEdit,
    newTurmaIconEdit, setNewTurmaIconEdit
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
