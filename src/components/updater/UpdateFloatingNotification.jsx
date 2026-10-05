import React from 'react';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';

/**
 * Toast executivo flutuante de notificação de atualização (Dark Glassmorphic).
 * Exibido no canto inferior direito com ações de aplicação ou adiamento.
 */
export function UpdateFloatingNotification() {
  const {
    hasPendingUpdate,
    isFloatingVisible,
    state,
    newVersion,
    progress,
    isDownloaded,
    isDownloading,
    isAvailableToDownload,
    startDownload,
    installUpdate,
    snoozeForSession,
    dismissFloating,
    openChangelog
  } = useAutoUpdater();

  if (!hasPendingUpdate || !isFloatingVisible) return null;

  const isReady = isDownloaded || state === 'DOWNLOADED';
  const downloading = isDownloading || state === 'DOWNLOADING';
  const availableToDownload = !isReady && !downloading;

  return (
    <aside 
      aria-label="Notificação de Atualização"
      className="fixed bottom-6 left-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-full animate-slide-up-center transition-all duration-300 pointer-events-auto"
    >
      <div className="bg-[#0f172a]/95 border border-slate-700/80 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-950/80 p-4 text-white overflow-hidden relative">
        {/* Glow de fundo decorativo */}
        <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 ${
          isReady ? 'bg-emerald-500' : downloading ? 'bg-cyan-500' : 'bg-indigo-500'
        }`} />

        {/* Topo: Ícone + Título + Fechar */}
        <div className="flex items-start justify-between gap-3 mb-2.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isReady 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20' 
                : downloading
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-500/20'
                  : 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-indigo-500/20'
            }`}>
              {isReady ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {isReady ? 'Atualização Pronta!' : downloading ? 'Baixando Pacotes...' : 'Nova Versão Disponível'}
                </h4>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold">
                  v{newVersion || '5.5.4'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isReady 
                  ? 'Pronta para ser aplicada ao reiniciar.' 
                  : downloading 
                    ? `Baixando em segundo plano: ${progress}%`
                    : 'Novidades prontas. Deseja baixar agora?'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissFloating}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar aviso (permanece no menu)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de progresso se estiver baixando */}
        {downloading && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 relative z-10">
          <button
            type="button"
            onClick={openChangelog}
            className="text-[11px] font-medium text-slate-400 hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Ver o que mudou
          </button>

          <div className="flex items-center gap-2">
            {downloading ? (
              <button
                type="button"
                onClick={dismissFloating}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                title="Continuar download em segundo plano e ocultar janela"
              >
                Ocultar
              </button>
            ) : (
              <button
                type="button"
                onClick={snoozeForSession}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                title="Lembrar ao reabrir o aplicativo"
              >
                Mais Tarde
              </button>
            )}

            {isReady ? (
              <button
                type="button"
                onClick={installUpdate}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <span>Reiniciar</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : availableToDownload ? (
              <button
                type="button"
                onClick={startDownload}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Baixar</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default UpdateFloatingNotification;
