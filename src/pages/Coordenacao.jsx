import { useState, useEffect, useCallback, useMemo } from 'react';
import CoordinatorAuthModal from '../components/coordinator/CoordinatorAuthModal';
import StudentDossierPage from '../components/coordinator/StudentDossierPage';
import CoordinatorFilterDropdown from '../components/coordinator/CoordinatorFilterDropdown';
import CoordinatorSettingsHub from '../components/coordinator/settings/CoordinatorSettingsHub';
import { useCoordinatorWorkspace } from '../components/layout/CoordinatorLayout';

export default function Coordenacao() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isElevated, setIsElevated] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState('');
  const [loading, setLoading] = useState(true);

  // Dados consolidados
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('ALL');
  const [viewTab, setViewTab] = useState('students'); // 'students' | 'teachers'

  const workspace = useCoordinatorWorkspace();

  useEffect(() => {
    if (workspace?.activeNav === 'teachers') {
      setViewTab('teachers');
    } else if (workspace?.activeNav === 'students360') {
      setViewTab('students');
    }
  }, [workspace?.activeNav]);

  // Seleção de estudante para visualização dedicada em tela cheia (sincronizada com o Workspace)
  const [localSelectedStudent, setLocalSelectedStudent] = useState(null);
  const selectedStudent = workspace?.selectedStudent !== undefined ? workspace.selectedStudent : localSelectedStudent;
  const setSelectedStudent = useCallback((student) => {
    setLocalSelectedStudent(student);
    if (typeof workspace?.setSelectedStudent === 'function') {
      workspace.setSelectedStudent(student);
    }
  }, [workspace]);

  // Estados de Sincronização Drive e Ingestão
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isIngestingLocal, setIsIngestingLocal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Verifica status do Google Drive
  const checkDriveStatus = useCallback(async () => {
    try {
      if (window.electronAPI?.cloudIsAuthenticated) {
        const isAuth = await window.electronAPI.cloudIsAuthenticated();
        setIsDriveAuthenticated(!!isAuth);
      }
    } catch (e) {
      console.warn('[Coordenacao] Falha ao verificar autenticação do Google Drive:', e);
    }
  }, []);

  // Carrega status da sessão
  const loadStatus = useCallback(async () => {
    try {
      await checkDriveStatus();
      if (!window.electronAPI?.coordinatorGetStatus) return;
      const res = await window.electronAPI.coordinatorGetStatus();
      if (res.success) {
        setIsElevated(res.isElevated);
        setCoordinatorName(res.coordinatorName || '');
        if (res.isElevated) {
          await loadOverviewData();
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('[Coordenacao] Erro ao obter status:', err);
      setLoading(false);
    }
  }, [checkDriveStatus]);

  // Carrega dados da visão geral
  const loadOverviewData = async () => {
    setLoading(true);
    try {
      if (!window.electronAPI?.coordinatorGetSchoolOverview) return;
      const res = await window.electronAPI.coordinatorGetSchoolOverview();
      if (res.success) {
        setOverview(res.overview || {});
        setStudents(res.students || []);
        setTeachers(res.teachers || []);
      }
    } catch (err) {
      console.error('[Coordenacao] Erro ao carregar visão geral:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Registra listener reativo de auto-lock (15 min)
    let unsubscribe = null;
    if (window.electronAPI?.onCoordinatorSessionLocked) {
      unsubscribe = window.electronAPI.onCoordinatorSessionLocked(() => {
        setIsElevated(false);
        setOverview(null);
        setStudents([]);
        setTeachers([]);
        setIsStudentModalOpen(false);
        setSyncFeedback({ type: 'warning', message: 'Sessão encerrada por inatividade (Auto-Lock 15 min).' });
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadStatus]);

  // Trancar sessão manualmente
  const handleLockSession = async () => {
    try {
      if (window.electronAPI?.coordinatorLockSession) {
        await window.electronAPI.coordinatorLockSession();
      }
      setIsElevated(false);
      setOverview(null);
      setStudents([]);
      setTeachers([]);
      setIsStudentModalOpen(false);
    } catch (err) {
      console.error('[Coordenacao] Falha ao trancar sessão:', err);
    }
  };

  // Conectar conta Google Drive
  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setSyncFeedback(null);
    try {
      if (!window.electronAPI?.cloudLogin) {
        throw new Error('Canal de autenticação em nuvem não disponível.');
      }
      const res = await window.electronAPI.cloudLogin();
      if (res && res.success) {
        setIsDriveAuthenticated(true);
        setSyncFeedback({
          type: 'success',
          message: 'Google Drive conectado com sucesso! Clique em "Sincronizar Nuvem" para buscar backups.'
        });
      } else if (res && res.cancelled) {
        // Fechado pelo usuário sem aviso de erro
      } else {
        setSyncFeedback({
          type: 'error',
          message: res?.error || 'Falha ao autenticar no Google Drive.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro durante a conexão com o Google Drive.'
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Sincronizar Google Drive Multi-Docente
  const handleSyncDrive = async () => {
    setIsSyncingDrive(true);
    setSyncFeedback(null);
    try {
      if (!window.electronAPI?.coordinatorSyncDriveTeachers) {
        throw new Error('Canal de sincronização do Google Drive indisponível.');
      }

      const res = await window.electronAPI.coordinatorSyncDriveTeachers();
      if (res.success) {
        setIsDriveAuthenticated(true);
        setSyncFeedback({
          type: 'success',
          message: `Sincronização concluída! ${res.syncedCount} novo(s) snapshot(s) atualizados de ${res.totalFound} encontrados no Google Drive.`
        });
        await loadOverviewData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Falha ao sincronizar backups do Google Drive.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro durante a varredura do Google Drive.'
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Importar Docente deste computador (school_data.json local)
  const handleIngestLocalTeacher = async () => {
    setIsIngestingLocal(true);
    setSyncFeedback(null);
    try {
      if (!window.electronAPI?.coordinatorIngestLocalTeacher) {
        throw new Error('Função de importação local indisponível.');
      }
      const res = await window.electronAPI.coordinatorIngestLocalTeacher();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Docente ativo deste computador importado com sucesso para o cofre da coordenação!`
        });
        await loadOverviewData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Não foi possível importar os dados do professor local.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro ao ler dados locais do professor.'
      });
    } finally {
      setIsIngestingLocal(false);
    }
  };

  // Importar Arquivo de Backup JSON (.json)
  const handleImportBackupFile = async () => {
    setSyncFeedback(null);
    try {
      if (!window.electronAPI?.coordinatorImportBackupFile) {
        throw new Error('Função de seleção de arquivo indisponível.');
      }
      const res = await window.electronAPI.coordinatorImportBackupFile();
      if (res.cancelled) return;
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Backup de "${res.teacherName || 'Docente'}" importado com sucesso para o cofre!`
        });
        await loadOverviewData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Falha ao importar o arquivo de backup.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro ao importar arquivo de backup.'
      });
    }
  };

  // Remover professor
  const handleRemoveTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Deseja realmente remover os dados do professor "${teacherName}" do cofre da coordenação?`)) {
      return;
    }

    try {
      const res = await window.electronAPI.coordinatorRemoveTeacher({ teacherId });
      if (res.success) {
        await loadOverviewData();
      } else {
        alert(res.error || 'Erro ao remover dados do professor.');
      }
    } catch (err) {
      alert(err.message || 'Falha na comunicação com o cofre.');
    }
  };

  // Lista de turmas únicas para filtro
  const uniqueTurmas = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.display_turma) set.add(s.display_turma);
      if (Array.isArray(s.turmas)) {
        s.turmas.forEach((t) => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // Opções enriquecidas para o seletor premium de turma
  const turmaOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'Todas as Turmas da Escola', subtitle: `${students.length} estudantes` },
      ...uniqueTurmas.map(t => {
        const count = students.filter(s => 
          s.display_turma === t || (Array.isArray(s.turmas) && s.turmas.includes(t))
        ).length;
        return {
          value: t,
          label: `Turma ${t}`,
          subtitle: `${count} estudante${count === 1 ? '' : 's'}`
        };
      })
    ];
  }, [uniqueTurmas, students]);

  const effectiveSearch = (workspace?.searchQuery !== undefined && workspace?.searchQuery !== '')
    ? workspace.searchQuery
    : searchQuery;

  // Estudantes filtrados
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = !effectiveSearch.trim() || 
        s.canonical_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.canonical_id?.toLowerCase().includes(effectiveSearch.toLowerCase());
      
      const matchesTurma = selectedTurma === 'ALL' || 
        s.display_turma === selectedTurma ||
        (Array.isArray(s.turmas) && s.turmas.includes(selectedTurma));
      return matchesSearch && matchesTurma;
    });
  }, [students, effectiveSearch, selectedTurma]);

  // Se não estiver elevado (bloqueado)
  if (!isElevated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 select-none">
        <div className="relative max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-200/50 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
            Painel da Coordenação Pedagógica
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
            Área institucional de acompanhamento multi-docente de notas, diagnósticos e dossiês 360º de estudantes.
          </p>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>Desbloquear Painel com PIN</span>
          </button>

          <p className="text-[10px] text-slate-400 mt-4 font-medium">
            Ambiente institucional protegido com autenticação criptografada de ponta a ponta.
          </p>
        </div>

        <CoordinatorAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsElevated(true);
            loadOverviewData();
          }}
        />
      </div>
    );
  }

  const currentNav = workspace?.activeNav || 'overview';

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in duration-300 select-none overflow-y-auto no-scrollbar pb-6">
      {/* Alerta de Feedback de Sincronização Global */}
      {syncFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border shadow-2xs ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : syncFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {syncFeedback.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <span className="font-semibold">{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-3 p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Conteúdo Dinâmico por Aba de Navegação */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Carregando inteligência pedagógica da escola...</p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. VISÃO GERAL DA ESCOLA (overview) */}
          {/* ========================================================= */}
          {currentNav === 'overview' && (
            <div className="space-y-4">
              {/* Banner de Boas-vindas e Status */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800 tracking-tight">
                        Centro de Governança Escolar & Visão Panorâmica
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isDriveAuthenticated
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isDriveAuthenticated ? 'Drive Vinculado' : 'Drive Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {coordinatorName ? `Gestor(a): ${coordinatorName} • ` : ''}
                      Consolidação multi-docente de avaliações, diagnósticos e desempenho dos alunos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('cloud_sync');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Central de Sincronização</span>
                  </button>
                </div>
              </div>

              {/* Cards de Métricas Gerais Padronizados */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Card 1: Estudantes */}
                <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        Estudantes Ativos
                      </h3>
                      <p className="text-3xl font-black text-slate-800 tracking-tighter">
                        {overview?.total_canonical_students ?? students.length}
                      </p>
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          Matrículas Unificadas
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-2xs">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card 2: Docentes */}
                <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        Corpo Docente
                      </h3>
                      <p className="text-3xl font-black text-amber-600 tracking-tighter">
                        {overview?.total_teachers ?? teachers.length}
                      </p>
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Professores Ativos
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-2xs">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card 3: Média Geral */}
                <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        Média Geral Escola
                      </h3>
                      <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                        {overview?.school_average !== null && overview?.school_average !== undefined
                          ? Number(overview.school_average).toFixed(1)
                          : '-'}
                      </p>
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          Multi-Disciplinar
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-2xs">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card 4: Diagnósticos IA */}
                <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        Diagnósticos I.A.
                      </h3>
                      <p className="text-3xl font-black text-purple-600 tracking-tighter">
                        {overview?.total_diagnoses_indexed ?? 0}
                      </p>
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          Pareceres Emitidos
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-2xs">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seções de Acesso Rápido para a Coordenação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('students360');
                  }}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      Dossiê dos Estudantes
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Visualize a lista unificada de alunos, histórico comparativo de notas entre disciplinas e pareceres de desenvolvimento.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Acessar Estudantes ({students.length})</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('teachers');
                  }}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                      Corpo Docente
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Gerencie os professores integrados, visualize as datas da última atualização e desvincule docentes se necessário.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>Ver Docentes ({teachers.length})</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('cloud_sync');
                  }}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      Sincronização & Nuvem
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Conecte sua conta do Google Drive escolar, importe dados da máquina atual ou faça upload de arquivos de backup.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Configurar Integração</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. DOSSIÊ DOS ESTUDANTES (students360) */}
          {/* ========================================================= */}
          {currentNav === 'students360' && (
            selectedStudent ? (
              <StudentDossierPage
                canonicalId={selectedStudent.canonical_id}
                studentName={selectedStudent.canonical_name}
                onBack={() => setSelectedStudent(null)}
              />
            ) : (
              <div className="space-y-4">
                {/* Barra de Filtro e Contexto */}
                <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Dossiê dos Estudantes
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {filteredStudents.length} estudante{filteredStudents.length === 1 ? '' : 's'} listado{filteredStudents.length === 1 ? '' : 's'}
                        {effectiveSearch ? ` para a busca "${effectiveSearch}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <CoordinatorFilterDropdown
                      categoryLabel="Turma"
                      color="indigo"
                      value={selectedTurma}
                      onChange={setSelectedTurma}
                      options={turmaOptions}
                      placeholder="Filtrar por Turma"
                      widthClass="w-72"
                      align="right"
                    />
                  </div>
                </div>

                {/* Tabela de Estudantes */}
                {teachers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center text-center">
                    <p className="text-xs text-slate-500 mb-3">Nenhum dado de docente integrado ainda.</p>
                    <button
                      onClick={() => {
                        if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('cloud_sync');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                    >
                      Ir para Sincronização em Nuvem
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Estudante</th>
                          <th className="px-5 py-3">Turma Base</th>
                          <th className="px-5 py-3 text-center">Docentes Vinculados</th>
                          <th className="px-5 py-3 text-right">Dossiê Completo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-slate-500 text-xs">
                              Nenhum estudante corresponde aos critérios de pesquisa selecionados.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st) => (
                            <tr key={st.canonical_id} className="hover:bg-indigo-50/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {st.canonical_name ? st.canonical_name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-800 text-sm">{st.canonical_name}</div>
                                    <div className="text-[10px] text-slate-400">Identificação Escolar Unificada</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold">
                                  {st.display_turma || 'Turma Única'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 text-xs font-semibold">
                                  {st.disciplines_count || 1} Docente{st.disciplines_count === 1 ? '' : 's'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => setSelectedStudent(st)}
                                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 ml-auto active:scale-95 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>Abrir Dossiê 360º</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}

          {/* ========================================================= */}
          {/* 3. CORPO DOCENTE (teachers) */}
          {/* ========================================================= */}
          {currentNav === 'teachers' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Corpo Docente Integrado
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {teachers.length} professor{teachers.length === 1 ? '' : 'es'} integrado{teachers.length === 1 ? '' : 's'} com dados pedagógicos sincronizados no cofre escolar.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (typeof workspace?.setActiveNav === 'function') workspace.setActiveNav('cloud_sync');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 self-start md:self-auto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Sincronizar Novos Docentes</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs">
                    Nenhum professor integrado ao cofre até o momento. Acesse a Central de Sincronização para importar dados de docentes.
                  </div>
                ) : (
                  teachers.map((tch) => {
                    const teacherName = tch.name || tch.teacher_name || 'Professor(a) Integrado(a)';
                    const teacherId = tch.id || tch.teacher_id || 'prof';
                    const lastUpdated = tch.last_backup_at || tch.last_ingested_at || tch.synced_at;
                    const discipline = tch.discipline || 'Componentes Curriculares';
                    const turmasCount = Array.isArray(tch.turmas) ? tch.turmas.length : 0;
                    const studentsCount = tch.records_count?.students || 0;

                    return (
                      <div
                        key={teacherId}
                        className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              Docente Integrado
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ID: {teacherId.substring(0, 12)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">{teacherName}</h4>
                          <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                            {discipline}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Origem:{' '}
                            <span className="font-semibold text-slate-700">
                              {tch.source === 'local_computer' || tch.source === 'local_ingest'
                                ? 'Base Local deste Computador'
                                : tch.source === 'backup_file'
                                ? 'Arquivo de Backup (.json)'
                                : 'Google Drive Institucional'}
                            </span>
                          </p>
                          {(turmasCount > 0 || studentsCount > 0) && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                              {turmasCount > 0 && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-600">
                                  {turmasCount} Turma{turmasCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {studentsCount > 0 && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-600">
                                  {studentsCount} Aluno{studentsCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Atualizado:{' '}
                            {lastUpdated
                              ? new Date(lastUpdated).toLocaleDateString('pt-BR')
                              : 'Recente'}
                          </span>
                          <button
                            onClick={() => handleRemoveTeacher(teacherId, teacherName)}
                            className="text-rose-600 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Desvincular Professor
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. CENTRAL DE SINCRONIZAÇÃO & NUVEM (cloud_sync) */}
          {/* ========================================================= */}
          {currentNav === 'cloud_sync' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Central de Integração & Sincronização
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gerencie as fontes de dados para consolidação do histórico escolar e relatórios de coordenação.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      isDriveAuthenticated
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Google Drive: {isDriveAuthenticated ? 'Conectado' : 'Não Vinculado'}
                  </span>
                </div>
              </div>

              {/* Grid das 3 opções de importação e sincronização */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Opção 1: Google Drive */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">1. Nuvem Google Drive</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Varre a nuvem e importa automaticamente os backups atualizados disponibilizados pelos professores da escola.
                    </p>
                  </div>

                  <div className="mt-6">
                    {!isDriveAuthenticated ? (
                      <button
                        onClick={handleConnectDrive}
                        disabled={isConnectingDrive}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isConnectingDrive ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Conectando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span>Conectar Conta Google</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleSyncDrive}
                        disabled={isSyncingDrive}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isSyncingDrive ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Varrendo Nuvem...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Sincronizar Nuvem Agora</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Opção 2: Docente Local */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">2. Professor deste Computador</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Lê os dados locais do professor em execução nesta mesma máquina e integra diretamente no cofre da coordenação.
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleIngestLocalTeacher}
                      disabled={isIngestingLocal}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isIngestingLocal ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Importar Dados deste PC</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Opção 3: Backup .json */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">3. Arquivo de Backup (.json)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Carregue um arquivo de backup individual gerado pelo professor (enviado via pendrive, e-mail ou rede local).
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleImportBackupFile}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 text-amber-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Selecionar Arquivo .json</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. CONFIGURAÇÕES INSTITUCIONAIS (settings) */}
          {/* ========================================================= */}
          {currentNav === 'settings' && (
            <CoordinatorSettingsHub
              onProfileChange={(newName) => {
                setCoordinatorName(newName);
                if (typeof workspace?.setCoordinatorName === 'function') {
                  workspace.setCoordinatorName(newName);
                }
              }}
            />
          )}
        </>
      )}

      {/* Fechamento do Painel */}
    </div>
  );
}
