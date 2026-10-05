import { useState } from 'react';
import { useApp } from "../contexts/AppContext";
import { Icons } from '../assets/icons';
import { normalizeWeeklySchedule } from '../utils/scheduleUtils';
import LicenseSettingsCard from '../components/license/LicenseSettingsCard';

export default function Settings() {
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // null = Hub | 'pedagogical' | 'units' | 'turmas' | 'disciplinary' | 'backup' | 'ai' | 'security' | 'license'
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);

  const {
    settings,
    setSettings,
    turmas,
    activeTurmaId,
    configTurmaId,
    setConfigTurmaId,
    configUnitId,
    setConfigUnitId,
    turmaUnitParams,
    occurrenceTypes,
    authName,
    setAuthName,
    isCloudAuthenticated,
    handleLogout,
    handleCloudLogin,
    handleSaveSettings,
    showAlert,
    // Modais Global Triggers
    setIsParamsModalOpen,
    setIsMetricsModalOpen,
    setIsPremiumModalOpen,
    setIsAIModalOpen,
    setIsDisciplinaryModalOpen,
    setTurmaToManage,
    setNewTurmaNameEdit,
    setNewTurmaIconEdit,
    setNewWeeklyScheduleEdit,
    setIsEditTurmaModalOpen,
    setIsDeleteTurmaModalOpen,
    setLogoutConfirmOpen,
    units,
    activeUnitId,
    handleAdvanceUnit,
    handleSwitchToUnit
  } = useApp();

  if (!settings) return null;

  // Derivado reativo: parâmetros da turma e unidade selecionadas nas configurações
  const effectiveTurmaId = configTurmaId || activeTurmaId || turmas[0]?.id;
  const effectiveUnitId = configUnitId || activeUnitId || units[0]?.id || 1;
  const currentTurma = turmas.find(t => t.id === effectiveTurmaId);
  const currentUnit = units.find(u => u.id === effectiveUnitId);
  const currentUnitParams = (turmaUnitParams || []).find(p => p.turma_id === effectiveTurmaId && p.unit_id === effectiveUnitId);

  const tp = {
    max_activities: currentUnitParams?.max_activities ?? currentTurma?.max_activities ?? settings.max_activities ?? 27,
    max_mini_testes: currentUnitParams?.max_mini_testes ?? currentTurma?.max_mini_testes ?? settings.max_mini_testes ?? 14,
    max_mini_teste_score: currentUnitParams?.max_mini_teste_score ?? currentTurma?.max_mini_teste_score ?? settings.max_mini_teste_score ?? 10,
    max_activities_weight: currentUnitParams?.max_activities_weight ?? currentTurma?.max_activities_weight ?? settings.max_activities_weight ?? 1.0,
    max_mini_testes_weight: currentUnitParams?.max_mini_testes_weight ?? currentTurma?.max_mini_testes_weight ?? settings.max_mini_testes_weight ?? 1.0,
    max_provas: currentUnitParams?.max_provas ?? currentTurma?.max_provas ?? settings.max_provas ?? 1,
    max_provas_weight: currentUnitParams?.max_provas_weight ?? currentTurma?.max_provas_weight ?? settings.max_provas_weight ?? 4.0,
    max_prova_score: currentUnitParams?.max_prova_score ?? currentTurma?.max_prova_score ?? settings.max_prova_score ?? 10,
  };

  const handleSaveSettingsSubmit = (e) => {
    e.preventDefault();
    handleSaveSettings();
  };

  // Metadados dos módulos do Hub (padrão Hub-and-Spoke estilo iOS / Android Settings)
  const categories = [
    {
      id: 'pedagogical',
      group: 'Estrutura Pedagógica',
      title: 'Parâmetros & Avaliações',
      description: 'Pesos de lições, provas, mini-testes, comportamento e média final.',
      badge: `${tp.max_activities} Lições • ${tp.max_provas} Prova(s)`,
      icon: Icons.Activity,
      color: 'from-indigo-600 to-violet-600',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'units',
      group: 'Estrutura Pedagógica',
      title: 'Ano Letivo & Unidades',
      description: 'Gestão de períodos letivos, encerramento de notas e avanço de unidade.',
      badge: `${currentUnit?.name || '1ª Unidade'} (Ativa)`,
      icon: Icons.Calendar,
      color: 'from-emerald-600 to-teal-600',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'turmas',
      group: 'Estrutura Pedagógica',
      title: 'Gerenciar Turmas',
      description: 'Cadastro, edição de nomes, grade horária semanal e turmas ativas.',
      badge: `${turmas.length} turmas`,
      icon: Icons.Users,
      color: 'from-blue-600 to-cyan-600',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'disciplinary',
      group: 'Estrutura Pedagógica',
      title: 'Critérios Disciplinares',
      description: 'Tabela de ocorrências, penalidades e pontuação de conduta.',
      badge: `${occurrenceTypes.length} critérios`,
      icon: Icons.Alert,
      color: 'from-rose-600 to-pink-600',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      id: 'backup',
      group: 'Conexões & Nuvem',
      title: 'Sincronização & Backup',
      description: 'Cópia de segurança em nuvem via Google Drive e periodicidade.',
      badge: isCloudAuthenticated ? 'Drive Conectado' : 'Não Conectado',
      icon: Icons.CloudSync,
      color: 'from-sky-600 to-blue-700',
      badgeColor: isCloudAuthenticated ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      id: 'ai',
      group: 'Conexões & Nuvem',
      title: 'Arquiteto Pedagógico IA',
      description: 'Chaves de API, prompt mestre e diretrizes de inteligência artificial.',
      badge: 'Motor IA Ativo',
      icon: Icons.Brain,
      color: 'from-violet-600 to-purple-700',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200'
    },
    {
      id: 'security',
      group: 'Segurança & Conta',
      title: 'Segurança & Acesso',
      description: 'Identificação de educador, tela de bloqueio e desativação de senha.',
      badge: authName || 'Educador',
      icon: Icons.Shield,
      color: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'license',
      group: 'Segurança & Conta',
      title: 'Licença & Atualizações',
      description: 'Identificador de máquina (MID), plano contratado e atualizador oficial.',
      badge: 'v5.5.3',
      icon: Icons.Star,
      color: 'from-teal-600 to-emerald-700',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
    }
  ];

  // Grupos únicos para renderização organizada no Hub
  const groups = ['Estrutura Pedagógica', 'Conexões & Nuvem', 'Segurança & Conta'];
  const activeCategoryMeta = categories.find(c => c.id === activeSection);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto pr-2">
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* VISÃO 1: HUB PRINCIPAL DE CONFIGURAÇÕES (Estilo iOS / Android Settings)   */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeSection === null && (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
          {/* Header do Hub */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
                {Icons.Settings}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Painel de Controle Unificado
                </h2>
                <p className="text-slate-500 font-medium text-xs mt-0.5">
                  Selecione uma seção para personalizar suas preferências.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>v5.5.3</span>
              </span>
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold">
                {currentTurma?.name || 'Turma'} • {currentUnit?.name || '1ª Unidade'}
              </span>
            </div>
          </div>

          {/* Lista de Grupos Categorizados */}
          <div className="space-y-6">
            {groups.map(groupName => {
              const groupItems = categories.filter(c => c.group === groupName);
              return (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                    {groupName}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {groupItems.map(item => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md group flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-11 h-11 bg-gradient-to-tr ${item.color} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                              <div className="w-5 h-5 flex items-center justify-center">
                                {IconComponent}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                                  {item.title}
                                </h4>
                              </div>
                              <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.badgeColor} hidden sm:inline-block`}>
                              {item.badge}
                            </span>
                            <div className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* VISÃO 2: SUBTELAS DEDICADAS (Foco Total por Funcionalidade)                */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeSection !== null && (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
          {/* Barra de Navegação Superior (Voltar) */}
          {activeSection !== 'pedagogical' && (
            <div className="bg-white rounded-2xl p-4 px-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Todas as Configurações</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Configurações</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-bold text-slate-800">{activeCategoryMeta?.title}</span>
              </div>
            </div>
          )}

          {/* 1. SEÇÃO: PARÂMETROS & AVALIAÇÕES */}
          {activeSection === 'pedagogical' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Barra de Controle Contextual Integrada (Linha Única, Fluida e Sem Poluição) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Lado Esquerdo: Voltar + Título Firme */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Voltar às Configurações"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight whitespace-nowrap">
                      Parâmetros & Avaliações
                    </h3>
                    <p className="text-slate-500 font-medium text-xs mt-0.5 truncate">
                      Regras ativas para <strong className="text-indigo-600 font-bold">{currentTurma?.name || 'Turma'}</strong> na <strong className="text-slate-700 font-bold">{currentUnit?.name || '1ª Unidade'}</strong>
                    </p>
                  </div>
                </div>

                {/* Lado Direito: Controles Compactos em Linha Única */}
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Seletor Segmentado de Unidade */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                    {units.map(u => {
                      const isUnitSelected = u.id === effectiveUnitId;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setConfigUnitId(u.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isUnitSelected
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>{u.name}</span>
                          {u.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Seletor de Turma Elegante */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTurmaDropdownOpen(!isTurmaDropdownOpen)}
                      className="px-3.5 py-2 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 text-indigo-900 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <div className="w-4 h-4 text-indigo-600 shrink-0">{Icons.Users}</div>
                      <span className="max-w-[140px] truncate">{currentTurma?.name || 'Selecione Turma'}</span>
                      <svg className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${isTurmaDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isTurmaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsTurmaDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            Selecione a Turma ({turmas.length})
                          </div>
                          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                            {turmas.map(t => {
                              const isSelected = t.id === effectiveTurmaId;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setConfigTurmaId(t.id);
                                    setIsTurmaDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? "bg-indigo-600 text-white shadow-2xs"
                                      : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <span className="w-3.5 h-3.5 shrink-0 opacity-70">{Icons.Users}</span>
                                    <span className="truncate">{t.name}</span>
                                  </div>
                                  {isSelected && <span className="text-white text-xs font-black">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveSettingsSubmit} className="space-y-6">
                {/* Bento Grid Harmônico de Métricas Pedagógicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                  {/* Bloco 1: Base de Conduta & Lições de Casa */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                            {Icons.Activity}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base tracking-tight">
                              Base & Lições de Casa
                            </h4>
                            <p className="text-slate-500 text-xs font-medium">
                              Parâmetros comportamentais e cadernos
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsParamsModalOpen(true)}
                          className="px-3.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          {Icons.Settings} Ajustar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 mt-5">
                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Comportamento Inicial
                          </span>
                          <span className="text-3xl font-black text-indigo-600 block">
                            {settings.behavior_start_score || 10}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                            pontos base (escola)
                          </span>
                        </div>

                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Máx. de Lições
                          </span>
                          <span className="text-3xl font-black text-slate-800 block">
                            {tp.max_activities}
                          </span>
                          <span className="text-[11px] text-indigo-600 font-bold mt-0.5 block">
                            {tp.max_activities > 0 ? (tp.max_activities_weight / tp.max_activities).toFixed(3) : '0'} pt / lição
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/70 flex items-center gap-2.5 text-xs text-indigo-800">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span>Configurações ativas para <strong>{currentTurma?.name}</strong> na <strong>{currentUnit?.name}</strong>.</span>
                    </div>
                  </div>

                  {/* Bloco 2: Estrutura de Provas & Avaliações */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                            {Icons.Star}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base tracking-tight">
                              Mini-Testes & Provas
                            </h4>
                            <p className="text-slate-500 text-xs font-medium">
                              Pesos e quantitativos de avaliação
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsMetricsModalOpen(true)}
                          className="px-3.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          {Icons.Settings} Ajustar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 mt-5">
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Mini-Testes
                          </span>
                          <span className="text-2xl font-black text-indigo-600 block">
                            {tp.max_mini_testes}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                            {tp.max_mini_teste_score} pts máx cada
                          </span>
                        </div>

                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Provas Formais
                          </span>
                          <span className="text-2xl font-black text-indigo-600 block">
                            {tp.max_provas}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                            {tp.max_prova_score} pts máx cada
                          </span>
                        </div>

                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Peso / Mini-Teste
                          </span>
                          <span className="text-lg font-black text-slate-800 block">
                            {(tp.max_mini_testes_weight / (tp.max_mini_testes || 1)).toFixed(3)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">
                            pontos na média
                          </span>
                        </div>

                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Peso / Prova
                          </span>
                          <span className="text-lg font-black text-slate-800 block">
                            {(tp.max_provas_weight / (tp.max_provas || 1)).toFixed(3)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">
                            pontos na média
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                      <span>Total de Provas + Testes:</span>
                      <strong className="text-slate-900 font-black">{tp.max_mini_testes + tp.max_provas} avaliações</strong>
                    </div>
                  </div>
                </div>

                {/* Banner de Pesos Dinâmicos Elite */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500 text-amber-400">
                    {Icons.Activity}
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black">
                          Pesos Dinâmicos
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Cálculo Personalizado</span>
                      </div>
                      <h4 className="text-lg font-bold tracking-tight">
                        Distribuição da Média Final por Categoria
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Defina a proporção exata entre <strong>Lições de Casa</strong>, <strong>Mini-Testes</strong> e <strong>Provas</strong> na composição da nota final com autonomia completa por turma.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPremiumModalOpen(true)}
                      className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>Acessar Painel Elite</span>
                      <div className="opacity-80">{Icons.ChevronRight}</div>
                    </button>
                  </div>
                </div>

                {/* Barra de Ação & Sincronização */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Parâmetros prontos para aplicação. Salve para registrar alterações na turma.</span>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Salvar Alterações</span>
                    <div className="opacity-70">{Icons.ChevronRight}</div>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. SEÇÃO: ANO LETIVO & UNIDADES */}
          {activeSection === 'units' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                  {Icons.Calendar}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Unidades Escolares</h3>
                  <p className="text-slate-500 font-medium text-xs mt-0.5">
                    Gerencie os ciclos do ano letivo. Ao avançar, os registros são organizados em períodos independentes.
                  </p>
                </div>
              </div>
              <div className="p-6">
                {(() => {
                  const viewingUnit = (units || []).find(u => u.id === activeUnitId);
                  if (viewingUnit && viewingUnit.is_closed) {
                    const realActiveUnit = (units || []).find(u => !u.is_closed && u.created_at);
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
                        <p className="text-xs text-amber-800 font-medium">
                          👁️ Você está visualizando a <strong>{viewingUnit.name}</strong> (encerrada). Os dados exibidos no app correspondem a este período histórico.
                        </p>
                        {realActiveUnit && (
                          <button
                            type="button"
                            onClick={() => handleSwitchToUnit(realActiveUnit.id)}
                            className="shrink-0 px-3.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 transition-all cursor-pointer"
                          >
                            Voltar à {realActiveUnit.name}
                          </button>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {(units || []).map(unit => {
                    const isActive = unit.id === activeUnitId;
                    const isClosed = unit.is_closed;
                    const isClickable = unit.created_at && !isActive;
                    return (
                      <div
                        key={unit.id}
                        onClick={() => isClickable && handleSwitchToUnit(unit.id)}
                        title={isClickable ? `Clique para visualizar a ${unit.name}` : undefined}
                        className={`p-5 rounded-2xl border text-center transition-all ${
                          isActive && isClosed
                            ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                            : isActive
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20'
                            : isClickable
                            ? 'border-slate-200 bg-slate-50/70 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30'
                            : 'border-slate-200 bg-slate-50/30 opacity-50'
                        }`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                          isActive && isClosed ? 'text-amber-600' : isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}>
                          {isActive && isClosed ? '📖 Visualizando' : isActive ? '● Ativa' : isClosed ? '✓ Encerrada' : '○ Futura'}
                        </div>
                        <div className={`text-lg font-black ${
                          isActive && isClosed ? 'text-amber-800' : isActive ? 'text-indigo-900' : 'text-slate-700'
                        }`}>
                          {unit.name}
                        </div>
                        {unit.created_at && (
                          <div className="text-[11px] text-slate-400 font-medium mt-1.5">
                            {isClosed ? `Encerrada em ${unit.closed_at || '—'}` : `Iniciada em ${unit.created_at}`}
                          </div>
                        )}
                        {isClickable && (
                          <div className="text-xs text-indigo-600 font-bold mt-2 flex items-center justify-center gap-1">
                            <span>Visualizar período</span>
                            <span>→</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const currentUnit = (units || []).find(u => u.id === activeUnitId);
                  const allUnitsIdx = (units || []).findIndex(u => u.id === activeUnitId);
                  const isLastUnit = allUnitsIdx === (units || []).length - 1;
                  const nextUnit = (units || []).find((u, i) => i > allUnitsIdx && !u.is_closed);
                  if (isLastUnit || !nextUnit) {
                    return (
                      <div className="text-center py-4 text-slate-400 text-xs font-medium border-t border-slate-100">
                        Esta é a última unidade do ano letivo.
                      </div>
                    );
                  }
                  return (
                    <div className="border-t border-slate-100 pt-5">
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-4">
                        <p className="text-xs text-amber-900 font-medium leading-relaxed">
                          ⚠️ Ao avançar, <strong>notas, ocorrências e atividades</strong> da {currentUnit?.name} ficam
                          preservadas no histórico e <strong>não aparecerão</strong> nos cálculos da {nextUnit.name}.
                          O calendário de lições será copiado como modelo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAdvanceUnit}
                        className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-indigo-600 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Avançar para {nextUnit.name}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 3. SEÇÃO: GERENCIAR TURMAS */}
          {activeSection === 'turmas' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                    {Icons.Users}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">
                      Gerenciar Minhas Turmas
                    </h4>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">
                      Edite nomes, horários semanais ou exclua turmas existentes.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 self-start sm:self-auto">
                  {turmas.length} turmas cadastradas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {turmas.map(t => (
                  <div key={t.id} className="group flex items-center justify-between p-4 bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-indigo-200 rounded-2xl transition-all hover:shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-2xs border border-slate-200/80 group-hover:scale-105 transition-transform">
                        {Icons.Users}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 bg-slate-200/60 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                            ID {t.id}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-sm mt-0.5">{t.name}</h5>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTurmaToManage(t);
                          setNewTurmaNameEdit(t.name);
                          setNewTurmaIconEdit(t.icon || "Classe");
                          setNewWeeklyScheduleEdit(normalizeWeeklySchedule(t.weekly_schedule));
                          setIsEditTurmaModalOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all shadow-2xs cursor-pointer"
                        title="Editar Turma"
                      >
                        {Icons.Settings}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTurmaToManage(t);
                          setIsDeleteTurmaModalOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl border border-slate-200 hover:border-rose-400 transition-all shadow-2xs cursor-pointer"
                        title="Excluir Turma"
                      >
                        {Icons.Trash}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SEÇÃO: CRITÉRIOS DISCIPLINARES */}
          {activeSection === 'disciplinary' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 shrink-0">
                    {Icons.Alert}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">
                      Critérios & Pesos Disciplinares
                    </h4>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">
                      Regras de ocorrências e deduções na nota de comportamento.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDisciplinaryModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  {Icons.Settings} Configurar Ocorrências
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {occurrenceTypes.slice(0, showAllOccurrences ? occurrenceTypes.length : 8).map(t => (
                  <div key={t.id} className="bg-slate-50/80 hover:bg-rose-50/30 rounded-xl p-3.5 border border-slate-200/80 hover:border-rose-200 text-center transition-all animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate" title={t.title}>{t.title}</p>
                    <p className="text-2xl font-black text-rose-600">{t.penalty}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">pontos deduzidos</p>
                  </div>
                ))}
              </div>

              {occurrenceTypes.length > 8 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                  {!showAllOccurrences ? (
                    <button 
                      type="button"
                      onClick={() => setShowAllOccurrences(true)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Exibir todos os {occurrenceTypes.length} critérios (+{occurrenceTypes.length - 8})
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setShowAllOccurrences(false)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Recolher para modo compacto
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. SEÇÃO: BACKUP & SINCRONIZAÇÃO */}
          {activeSection === 'backup' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100 shrink-0">
                    {Icons.CloudSync}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">
                      Sincronização & Backup
                    </h4>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">
                      Cópia de segurança segura e sincronização em nuvem via Google Drive.
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border self-start sm:self-auto ${
                  isCloudAuthenticated 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {isCloudAuthenticated ? '● Drive Conectado' : '○ Não Conectado'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Proteção Automática em Nuvem
                    </h5>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Seus dados pedagógicos, notas, lições e configurações são salvos criptografados diretamente na sua pasta pessoal do Google Drive. Em caso de troca de computador, basta conectar para restaurar tudo.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200/70">✓ Criptografia AES-256</span>
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200/70">✓ Snapshot Contínuo</span>
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200/70">✓ Sem Perda de Dados</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  {isCloudAuthenticated ? (
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl flex flex-col gap-3.5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Sincronização em Segundo Plano</p>
                            <p className="text-[10px] text-slate-500 font-medium">Backup silencioso enquanto usa o app.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings.auto_backup_enabled || false}
                              onChange={(e) => setSettings({ ...settings, auto_backup_enabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        
                        {settings.auto_backup_enabled && (
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência:</span>
                            <div className="flex gap-1.5">
                              {[5, 15, 30, 60].map(min => (
                                <button
                                  key={min}
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setSettings({ ...settings, auto_backup_interval: min }); }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    settings.auto_backup_interval === min 
                                      ? 'bg-indigo-600 text-white shadow-xs' 
                                      : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                  }`}
                                >
                                  {min}m
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setLogoutConfirmOpen(true)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-2 w-full cursor-pointer"
                      >
                        {Icons.Refresh} Desconectar Google Drive
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 border border-slate-200/80 p-5 rounded-2xl flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs">
                        {Icons.CloudSync}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm">Nenhum Drive Conectado</h5>
                        <p className="text-slate-500 text-xs mt-1">Conecte sua conta do Google para ativar cópias automáticas.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloudLogin}
                        className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {Icons.CloudSync} Conectar Google Drive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. SEÇÃO: ARQUITETO IA */}
          {activeSection === 'ai' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100 shrink-0">
                    {Icons.Brain}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">
                      Arquiteto Pedagógico IA
                    </h4>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">
                      Inteligência artificial generativa calibrada para a BNCC e planejamento didático.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-xs font-bold self-start sm:self-auto">
                  Motor Gemini Ativo
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-violet-400">
                  {Icons.Brain}
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black">
                      Inteligência Híbrida
                    </span>
                    <h4 className="text-xl font-bold tracking-tight">
                      Configuração da Chave de API & Diretrizes Mestras
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Gerencie as credenciais do Google AI Studio, selecione modelos de contingência (Failover automático) e refine o tom pedagógico do Arquiteto.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAIModalOpen(true)}
                    className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>Configurar Motor IA</span>
                    <div className="opacity-80">{Icons.Settings}</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. SEÇÃO: SEGURANÇA & ACESSO */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                    {Icons.Shield}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">
                      Segurança & Privacidade
                    </h4>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">
                      Controle de acesso local, identificação de educador e tela de bloqueio.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold self-start sm:self-auto">
                  Acesso Protegido
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identificação do Educador */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Identificação do Educador
                    </h5>
                    <p className="text-slate-500 text-xs mt-1">
                      Nome exibido nos relatórios emitidos e nas boas-vindas do sistema.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Seu nome completo..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs transition-all"
                    />
                    <button
                      type="button"
                      onClick={async (e) => { 
                         e.preventDefault(); 
                         if (window.electronAPI) {
                           await window.electronAPI.authSave({ user_name: authName });
                           showAlert("Sucesso!", "Seu nome de educador foi atualizado com sucesso.", "success");
                         }
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                    >
                      Salvar Nome
                    </button>
                  </div>
                </div>

                {/* Tela de Bloqueio & Senha */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Controle de Sessão & Senha
                    </h5>
                    <p className="text-slate-500 text-xs mt-1">
                      Bloqueie o acesso rápido ao se ausentar ou desative a senha mestra.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {Icons.Lock} Bloquear Tela Imediatamente
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                         const pwd = window.prompt("Digite sua senha atual para desativar a tela de bloqueio:");
                         if (pwd && window.electronAPI) {
                            const res = await window.electronAPI.authDisable({ password: pwd });
                            if (res.success) {
                               showAlert("Segurança Desativada", "A senha foi removida. O acesso direto está habilitado.", "info");
                            } else {
                               showAlert("Erro", res.error || "Senha incorreta", "error");
                            }
                         }
                      }}
                      className="w-full py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer"
                    >
                      Desativar Senha Mestra
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. SEÇÃO: LICENÇA & SISTEMA */}
          {activeSection === 'license' && (
            <div className="space-y-4">
              <LicenseSettingsCard />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
