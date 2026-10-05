import React from 'react';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';

/**
 * Modal executivo com notas da nova versão e botão de instalação com 1 clique.
 */
export function UpdateChangelogModal() {
  const {
    isChangelogModalOpen,
    closeChangelog,
    state,
    newVersion,
    releaseName,
    releaseNotes,
    releaseDate,
    progress,
    isDownloaded,
    isDownloading,
    isAvailableToDownload,
    startDownload,
    installUpdate,
    snoozeForSession
  } = useAutoUpdater();

  if (!isChangelogModalOpen) return null;

  const isReady = isDownloaded || state === 'DOWNLOADED';
  const downloading = isDownloading || state === 'DOWNLOADING';
  const availableToDownload = !isReady && !downloading;
  const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : 'Hoje';

  // Parser simples para bullet points se notas existirem
  const notesList = releaseNotes
    ? releaseNotes
        .split('\n')
        .map(line => line.trim())
        .filter(line => Boolean(line) && !line.startsWith('##') && !line.startsWith('#'))
    : [
        'Melhorias de desempenho no motor de inteligência pedagógica.',
        'Atualização do canal oficial de suporte técnico via WhatsApp.',
        'Aprimoramentos de segurança e verificação contínua de licenças.',
        'Refinamentos de consistência na interface e relatórios.'
      ];

  const handleSnooze = () => {
    snoozeForSession();
    closeChangelog();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col animate-scaleUp">
        
        {/* Header com Gradiente */}
        <div className="relative p-6 pb-5 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  {releaseName || `EduSys Pro v${newVersion || '5.5.0'}`}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Atualização
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Lançamento oficial • Disponível desde {formattedDate}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeChangelog}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com Destaques da Versão */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>✨ O que há de novo nesta versão:</span>
            </h4>
            <ul className="space-y-2">
              {notesList.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                  <span className="text-emerald-400 text-sm leading-none mt-0.5">•</span>
                  <span>{item.replace(/^-\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/30 rounded-2xl text-[11px] text-indigo-300 flex items-center gap-2">
            <span>🛡️</span>
            <span>Seus alunos, notas, planos e licença permanecem 100% seguros e intactos.</span>
          </div>

          {availableToDownload && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-[11px] text-slate-400 flex items-center gap-2">
              <span>📶</span>
              <span>Download transparente sob demanda (~98 MB). O download só é feito quando você autorizar.</span>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSnooze}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Lembrar Mais Tarde
          </button>

          {isReady ? (
            <button
              type="button"
              onClick={installUpdate}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <span>Reiniciar e Instalar Agora</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : downloading ? (
            <div className="flex items-center gap-3">
              <div className="w-28 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-indigo-300 font-bold">
                {progress}%
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={startDownload}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Baixar Atualização</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default UpdateChangelogModal;
