import { useApp } from "../../contexts/AppContext";
import { Icons } from "../../assets/icons";
import { UpdateBadge } from "../updater";

const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    authName,
    isCloudAuthenticated,
    isSyncing,
    handleCloudLogin,
    handleCloudSync,
    setLogoutConfirmOpen,
  } = useApp();

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
    { id: "agenda_unidade", label: "Agenda da Unidade", icon: Icons.Book },
    { id: "corretor", label: "Corretor OMR", icon: Icons.Clipboard },
    {
      id: "ai_generator",
      label: "Gerador I.A.",
      icon: Icons.Brain,
    },
    { id: "restaurar", label: "Restaurar Dados", icon: Icons.CloudSync },
    { id: "settings", label: "Configurações", icon: Icons.Settings },
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 bg-[#0B1120]/95 backdrop-blur-xl text-slate-300 flex flex-col relative overflow-hidden border-r border-slate-800/50 shadow-2xl z-20">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-600/20 to-transparent pointer-events-none"></div>

      <div className="px-5 py-6 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center text-white text-lg font-bold">
            T
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
            EduSys<span className="text-orange-400">Pro</span>
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[8px] font-bold uppercase tracking-tighter">
              5.5.5
            </span>
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30"></span>
          <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
            Servidor Ativo
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-1 relative z-10 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl transition-all duration-200 group outline-none focus:ring-0 select-none border ${isActive ? "bg-indigo-600/20 text-white shadow-[inset_4px_0_0_0_#6366f1] border-white/5" : "border-transparent hover:bg-white/5 hover:text-white"}`}
            >
              <div
                className={`${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} transition-colors shrink-0`}
              >
                {item.icon}
              </div>
              <span
                className={`ml-3 text-xs font-semibold tracking-wide truncate ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}
              >
                {item.label}
              </span>
              {item.id === "settings" && <UpdateBadge variant="sidebar" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3.5 relative z-10 flex-shrink-0 border-t border-slate-800/40 mt-auto bg-slate-950/20 flex flex-col gap-2.5">
        <div className="w-full">
          {!isCloudAuthenticated ? (
            <button
              onClick={handleCloudLogin}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {Icons.CloudSync} Ativar Nuvem
            </button>
          ) : (
            <button
              onClick={() => handleCloudSync(true)}
              disabled={isSyncing}
              className={`w-full py-3 px-4 border rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSyncing ? "bg-slate-800 border-slate-700 text-slate-600" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10"}`}
            >
              <span className={isSyncing ? "animate-spin" : ""}>{Icons.CloudSync}</span>
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            onClick={() => setActiveTab("settings")}
            className="flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/40 hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/20 transition-all duration-300 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs">
              {Icons.Teacher}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-300 truncate group-hover:text-white transition-colors">
                Prof. {authName || "Educador"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Premium</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-11 h-11 flex-shrink-0 bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-xl transition-all flex items-center justify-center"
            title="Sair do Aplicativo"
          >
            {Icons.Logout}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
