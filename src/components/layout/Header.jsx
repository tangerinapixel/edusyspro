import React, { useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { Icons } from "../../assets/icons";
import { normalizeWeeklySchedule } from "../../utils/scheduleUtils";

const Header = () => {
  const {
    activeTab,
    turmas,
    activeTurmaId,
    setActiveTurmaId,
    setTurmaModalOpen,
    turmaMenuOpen,
    setTurmaMenuOpen,
    handleLogout,
    setIsEditTurmaModalOpen,
    setIsDeleteTurmaModalOpen,
    setTurmaToManage,
    setNewTurmaNameEdit,
    setNewTurmaIconEdit,
    setNewWeeklyScheduleEdit,
    units,
    activeUnitId,
    handleSwitchToUnit,
  } = useApp();

  // Estado local — nenhum outro componente precisa fechar este menu externamente
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);

  const navItems = [
    {
      id: "dashboard",
      label: "Estatísticas & Tracking",
      icon: Icons.Dashboard,
    },
    { id: "alunos", label: "Estudantes", icon: Icons.Users },
    { id: "atividades", label: "Lançar Atividades", icon: Icons.Activity },
    { id: "registro", label: "Registro Diário", icon: Icons.Alert },
    { id: "notas", label: "Registro de Notas", icon: Icons.Star },
    { id: "relatorios", label: "Relatórios", icon: Icons.Reports },
    {
      id: "ai_generator",
      label: "Gerador I.A.",
      icon: Icons.Brain,
    },
    { id: "acervo-pedagogico", label: "Acervo Didático & Provas", icon: Icons.Book },
    { id: "restaurar", label: "Restaurar Dados", icon: Icons.CloudSync },
    { id: "settings", label: "Configurações", icon: Icons.Settings },
  ];

  const currentTurma = turmas.find(t => t.id === activeTurmaId);
  const currentUnit = (units || []).find(u => u.id === activeUnitId);

  // Apenas unidades já iniciadas (criadas) — futuras não aparecem
  const switchableUnits = (units || []).filter(u => u.created_at);

  return (
    <header className="px-6 py-3.5 flex justify-between items-center z-50 flex-shrink-0 border-b border-slate-100 bg-white/40">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          {navItems.find((i) => i.id === activeTab)?.label}
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          Ambiente de Inteligência e Lançamentos Escolares
        </p>
      </div>
      <div className="flex items-center gap-3 relative">

        {/* ── Botão Mentor Pedagógico IA (Acesso Rápido) ─────────────── */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-ai-mentor"))}
          className="flex items-center gap-2 px-3 py-1.5 border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 rounded-xl shadow-2xs hover:shadow-xs text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer"
          title="Abrir Mentor Pedagógico IA"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="w-4 h-4 text-indigo-600 shrink-0 flex items-center justify-center">
            {Icons.Brain}
          </span>
          <span className="hidden sm:inline font-bold text-xs text-indigo-900 tracking-tight">Mentor IA</span>
        </button>

        {/* ── Botão de Unidade com Dropdown ─────────────────────────────── */}
        {currentUnit && (
          <div className="relative">
            <button
              onClick={() => {
                setUnitMenuOpen(prev => !prev);
                setTurmaMenuOpen(false); // evita dois dropdowns abertos
              }}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-md active:scale-95 ${
                currentUnit.is_closed
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              } ${switchableUnits.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
              title={switchableUnits.length > 1 ? 'Trocar unidade' : undefined}
              disabled={switchableUnits.length <= 1}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                currentUnit.is_closed
                  ? 'bg-amber-500'
                  : 'bg-emerald-500 animate-pulse'
              }`} />
              <span>{currentUnit.name}{currentUnit.is_closed ? ' (Histórico)' : ''}</span>

              {/* Chevron — só exibe quando há mais de uma unidade para trocar */}
              {switchableUnits.length > 1 && (
                <svg
                  className={`w-3 h-3 shrink-0 transition-transform duration-200 ${unitMenuOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Overlay para fechar ao clicar fora */}
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${unitMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setUnitMenuOpen(false)}
            />

            {/* Dropdown de Unidades */}
            <div className={`absolute right-0 top-[100%] mt-3 w-72 bg-white rounded-2xl border border-slate-200/50 py-3 z-50 origin-top-right shadow-2xl transition-all duration-300 ease-out ${unitMenuOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>

              {/* Cabeçalho do dropdown */}
              <div className="px-4 py-1.5 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trocar Unidade</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-slate-500 mt-1">Unidades do Ano Letivo</h4>
              </div>

              {/* Lista de unidades */}
              <div className="px-2">
                {switchableUnits.map(unit => {
                  const isViewing = unit.id === activeUnitId;
                  const isClosed = unit.is_closed;

                  return (
                    <button
                      key={unit.id}
                      onClick={() => {
                        if (!isViewing) {
                          handleSwitchToUnit(unit.id);
                          setUnitMenuOpen(false);
                        }
                      }}
                      disabled={isViewing}
                      className={`w-full px-4 py-3.5 mb-1 rounded-2xl flex items-center justify-between group border transition-all duration-200 text-left ${
                        isViewing
                          ? isClosed
                            ? 'bg-amber-50 border-amber-100 cursor-default'
                            : 'bg-emerald-50 border-emerald-100 cursor-default'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100 cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Indicador de estado */}
                        <div className={`w-9 h-9 rounded-[0.75rem] flex items-center justify-center shadow-sm transition-all ${
                          isViewing
                            ? isClosed
                              ? 'bg-amber-500 text-white shadow-amber-500/30'
                              : 'bg-emerald-500 text-white shadow-emerald-500/30'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}>
                          {React.cloneElement(
                            isViewing ? (isClosed ? Icons.History : Icons.Sparkles) : Icons.GraduationCap,
                            { className: "w-4 h-4" }
                          )}
                        </div>

                        <div>
                          <span className={`block font-bold text-sm ${
                            isViewing
                              ? isClosed ? 'text-amber-700' : 'text-emerald-700'
                              : 'text-slate-600 group-hover:text-slate-900'
                          }`}>
                            {unit.name}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            isViewing
                              ? isClosed ? 'text-amber-500' : 'text-emerald-500'
                              : 'text-slate-400'
                          }`}>
                            {isViewing
                              ? isClosed ? '👁 Visualizando' : '● Ativa Agora'
                              : isClosed ? '✓ Histórico' : '○ Disponível'}
                          </span>
                        </div>
                      </div>

                      {/* Check na unidade em visualização */}
                      {isViewing && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg ml-2 shrink-0 ${
                          isClosed ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
                        }`}>
                          {React.cloneElement(Icons.Check, { className: "w-2.5 h-2.5 stroke-[4] text-white" })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* ── Divisor Vertical Elegante entre Unidade e Turma Ativa ──────── */}
        {currentUnit && (
          <div className="flex items-center px-5 self-stretch shrink-0" aria-hidden="true">
            <div className="h-6 w-[1.5px] bg-slate-300 rounded-full" />
          </div>
        )}

        <div className="flex flex-col items-end mr-2">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Turma Ativa</span>
          <span className="text-sm font-bold text-slate-700">
            {currentTurma?.name || 'Carregando...'}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setTurmaMenuOpen(!turmaMenuOpen);
              setUnitMenuOpen(false); // evita dois dropdowns abertos
            }}
            className={`h-9 w-9 rounded-xl shadow-sm border flex items-center justify-center cursor-pointer hover:shadow-md hover:scale-105 transition-all active:scale-95 shrink-0 overflow-hidden text-white ${(() => {
              const icon = currentTurma?.icon || 'Classe';
              if (icon === 'Portugues') return 'bg-rose-600 border-rose-500 shadow-rose-500/20';
              if (icon === 'MPV') return 'bg-emerald-600 border-emerald-500 shadow-emerald-500/20';
              if (icon === 'Matematica') return 'bg-indigo-600 border-indigo-500 shadow-indigo-500/20';
              if (icon === 'Ciencias') return 'bg-amber-500 border-amber-400 shadow-amber-500/20';
              if (icon === 'Ingles') return 'bg-cyan-600 border-cyan-500 shadow-cyan-500/20';
              if (icon === 'Religiao') return 'bg-purple-600 border-purple-500 shadow-purple-500/20';
              if (icon === 'EducacaoFisica') return 'bg-orange-600 border-orange-500 shadow-orange-500/20';
              return 'bg-slate-700 border-slate-600 shadow-slate-500/20';
            })()}`}
          >
            {Icons[currentTurma?.icon] || Icons.Classe}
          </button>

          {/* Dropdown Menu Overlay */}
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${turmaMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setTurmaMenuOpen(false)}
          />

          {/* Dropdown Menu Modal */}
          <div className={`absolute right-0 top-[100%] mt-2 w-80 bg-white rounded-2xl premium-shadow border border-slate-200/50 py-4 z-50 origin-top-right overflow-hidden shadow-2xl transition-all duration-300 ease-out ${turmaMenuOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
            <div className="px-6 py-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gerenciar Escola</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-500 mt-1">Minhas Turmas</h4>
                </div>

                <div className="max-h-72 overflow-y-auto no-scrollbar px-2">
                  {turmas.map(turma => {
                    const isActive = activeTurmaId === turma.id;
                    return (
                      <div
                        key={turma.id}
                        className={`w-full px-4 py-3.5 mb-1 rounded-2xl flex items-center justify-between group item-hover-effect border relative ${isActive ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-transparent'}`}
                      >
                        <div
                          onClick={() => {
                            setActiveTurmaId(turma.id);
                            setTurmaMenuOpen(false);
                          }}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className={`w-11 h-11 rounded-[0.9rem] flex items-center justify-center transition-all duration-300 shadow-sm ${(() => {
                            const icon = turma.icon;
                            if (icon === 'Portugues') return isActive ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 group-hover:shadow-rose-500/10';
                            if (icon === 'MPV') return isActive ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:shadow-emerald-500/10';
                            if (icon === 'Matematica') return isActive ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:shadow-indigo-500/10';
                            if (icon === 'Ciencias') return isActive ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 group-hover:shadow-amber-500/10';
                            if (icon === 'Ingles') return isActive ? 'bg-cyan-600 text-white shadow-cyan-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 group-hover:shadow-cyan-500/10';
                            if (icon === 'Religiao') return isActive ? 'bg-purple-600 text-white shadow-purple-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-500 group-hover:shadow-purple-500/10';
                            if (icon === 'EducacaoFisica') return isActive ? 'bg-orange-600 text-white shadow-orange-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 group-hover:shadow-orange-500/10';
                            return isActive ? 'bg-slate-800 text-white shadow-slate-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-200';
                          })()}`}>
                            {React.cloneElement(Icons[turma.icon] || Icons.Classe, { className: "w-5 h-5" })}
                          </div>
                          <div className="text-left">
                            <span className={`block font-bold text-sm ${isActive ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-900'}`}>{turma.name}</span>
                            {isActive && <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Ativa Agora</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setTurmaToManage(turma);
                               setNewTurmaNameEdit(turma.name);
                               setNewTurmaIconEdit(turma.icon || "Classe");
                               setNewWeeklyScheduleEdit(normalizeWeeklySchedule(turma.weekly_schedule));
                               setIsEditTurmaModalOpen(true);
                             }}
                             className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                             title="Editar Turma"
                           >
                             {React.cloneElement(Icons.Settings, { className: "w-4 h-4" })}
                           </button>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setTurmaToManage(turma);
                               setIsDeleteTurmaModalOpen(true);
                             }}
                             className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                             title="Excluir Turma"
                           >
                             {React.cloneElement(Icons.Trash, { className: "w-4 h-4" })}
                           </button>
                        </div>

                        {isActive && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 ml-2">
                            {React.cloneElement(Icons.Check, { className: "w-2.5 h-2.5 stroke-[4]" })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100/60 px-4">
                  <button
                    onClick={() => {
                      setTurmaMenuOpen(false);
                      setTurmaModalOpen(true);
                    }}
                    className="w-full py-3.5 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                  >
                    <span className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center text-lg transition-transform group-hover:rotate-90">+</span>
                    Nova Turma
                  </button>
                </div>
              </div>
        </div>

        <button
          onClick={handleLogout}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all active:scale-95 flex items-center justify-center group cursor-pointer"
          title="Travar Aplicativo (Bloquear)"
        >
          <div className="group-hover:scale-110 transition-transform">
            {Icons.Lock}
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
