/* eslint-disable react/prop-types */
import { useNavigate } from 'react-router-dom';

export default function CoordinatorSidebar({ activeNav = 'overview', onNavChange, onExit }) {
  const navigate = useNavigate();

  const handleReturnToTeacher = async () => {
    try {
      if (typeof onExit === 'function') {
        await onExit();
      } else {
        if (window.electronAPI?.coordinatorLockSession) {
          await window.electronAPI.coordinatorLockSession();
        }
        navigate('/');
      }
    } catch (err) {
      console.error('[CoordinatorSidebar] Erro ao sair para modo professor:', err);
      navigate('/');
    }
  };

  const navItems = [
    {
      id: 'overview',
      label: 'Visão Geral da Escola',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      badge: 'Painel'
    },
    {
      id: 'students360',
      label: 'Dossiê dos Estudantes',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      badge: '360º'
    },
    {
      id: 'teachers',
      label: 'Corpo Docente',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'cloud_sync',
      label: 'Sincronização & Nuvem',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      badge: 'Drive'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: 'Ajustes'
    }
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 bg-[#0B1120]/95 backdrop-blur-xl text-slate-300 flex flex-col relative overflow-hidden border-r border-slate-800/60 shadow-2xl z-20 select-none">
      {/* Glow de cabeçalho dourado para a coordenação */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-transparent pointer-events-none" />

      {/* Brand Header */}
      <div className="px-5 py-6 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <img 
            src="/icon.png" 
            alt="EduSys Gestão Logo" 
            className="w-9 h-9 rounded-xl shadow-lg shadow-amber-500/20 object-contain shrink-0 bg-slate-900/50 p-0.5 border border-slate-800" 
          />
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
            EduSys<span className="text-amber-400">Gestão</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-amber-400/30" />
          <p className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
            Coordenação Pedagógica
          </p>
        </div>
      </div>

      {/* Menu da Coordenação */}
      <nav className="flex-1 px-3 space-y-1.5 mt-2 relative z-10 overflow-y-auto no-scrollbar">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Governança Escolar
        </div>
        {navItems.map((item) => {
          const isCurrent = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => typeof onNavChange === 'function' && onNavChange(item.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                isCurrent
                  ? 'bg-amber-500/20 text-white shadow-[inset_4px_0_0_0_#f59e0b] border-amber-500/30 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className={`${isCurrent ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'} shrink-0`}>
                {item.icon}
              </div>
              <span className={`ml-3 text-xs tracking-wide truncate ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                {item.label}
              </span>
              {item.badge && (
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                  isCurrent
                    ? 'bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé com Informações de Segurança e Botão de Fuga */}
      <div className="p-4 relative z-10 flex-shrink-0 border-t border-slate-800/60 mt-auto bg-slate-950/40 flex flex-col gap-3">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 leading-tight">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Ambiente Institucional Seguro</span>
          </div>
          <span>Sessão administrativa protegida com bloqueio automático após 15 min de inatividade.</span>
        </div>

        <button
          onClick={handleReturnToTeacher}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 cursor-pointer"
        >
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retornar ao Modo Professor</span>
        </button>
      </div>
    </aside>
  );
}
