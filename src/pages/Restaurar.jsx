import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";
import BackupTimeMachineModal from "../components/backup/BackupTimeMachineModal";

const Restaurar = () => {
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const {
    isCloudAuthenticated,
    handleCloudLogin,
    handleCloudSync,
    setRestoreConfirmOpen,
    isSyncing,
    lastSyncTime
  } = useApp();

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden animate-in fade-in duration-500 flex flex-col flex-1 min-h-0">
      <div className="p-6 text-center flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Decorative Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-slate-50 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-indigo-50/50 rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-xl mx-auto">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-all duration-700 ${isCloudAuthenticated ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
            <div className={isSyncing ? 'animate-spin' : ''}>
              {Icons.CloudSync}
            </div>
          </div>

          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
            {isCloudAuthenticated ? 'Nuvem Conectada' : 'Proteção em Nuvem'}
          </h3>
          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
            {isCloudAuthenticated 
              ? 'Seus dados pedagógicos estão sendo sincronizados automaticamente com sua conta do Google Drive.' 
              : 'Sincronize sua base de dados com o Google Drive para garantir que você nunca perca seus registros, mesmo se trocar de computador.'}
          </p>

          {!isCloudAuthenticated ? (
            <button
              onClick={handleCloudLogin}
              disabled={isSyncing}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? 'Conectando...' : 'Conectar com Google Drive'}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => handleCloudSync(true)}
                disabled={isSyncing}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
              <button
                onClick={() => setRestoreConfirmOpen(true)}
                disabled={isSyncing}
                className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:border-slate-800 hover:text-slate-800 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Baixar Último Backup
              </button>
              <button
                onClick={() => setTimeMachineOpen(true)}
                disabled={isSyncing}
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Máquina do Tempo
              </button>
            </div>
          )}

          {lastSyncTime && isCloudAuthenticated && (
            <div className="mt-6 flex flex-col items-center gap-1.5">
               <div className="px-3.5 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                 Último backup: {lastSyncTime.toLocaleString()}
               </div>
               <p className="text-[10px] text-slate-400 font-bold max-w-xs mx-auto">
                 * O sistema sincroniza automaticamente a cada 5 minutos de atividade.
               </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">
          A EduSys Pro utiliza a infraestrutura segura do Google para armazenar seus dados criptografados. <br/>
          Nenhum dado é compartilhado com terceiros.
        </p>
      </div>

      {/* Modal da Máquina do Tempo de Backups */}
      <BackupTimeMachineModal
        isOpen={timeMachineOpen}
        onClose={() => setTimeMachineOpen(false)}
      />
    </div>
  );
};

export default Restaurar;
