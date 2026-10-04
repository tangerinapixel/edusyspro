import React from 'react';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';

/**
 * Micro-badge elegante de indicação de atualização pendente.
 * Pode ser exibido na Sidebar ou no Header sem poluir a interface.
 */
export function UpdateBadge({ variant = 'sidebar', className = '' }) {
  const { hasPendingUpdate, state, newVersion, openFloating } = useAutoUpdater();

  if (!hasPendingUpdate) return null;

  const isReady = state === 'DOWNLOADED';
  const isDownloading = state === 'DOWNLOADING';
  const label = newVersion ? `v${newVersion}` : 'NOVO';

  if (variant === 'sidebar') {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          openFloating();
        }}
        title={isReady 
          ? `Nova versão ${newVersion || ''} pronta para instalação` 
          : isDownloading 
            ? `Baixando nova versão ${newVersion || ''}...`
            : `Nova versão ${newVersion || ''} disponível`}
        className={`ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight border transition-all cursor-pointer select-none ${
          isReady
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
            : isDownloading
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
        } ${className}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isReady ? 'bg-emerald-400' : isDownloading ? 'bg-cyan-400' : 'bg-indigo-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            isReady ? 'bg-emerald-500' : isDownloading ? 'bg-cyan-500' : 'bg-indigo-500'
          }`} />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  // Variant Header / Pill discreta
  return (
    <button
      type="button"
      onClick={openFloating}
      title="Clique para ver a nova versão disponível"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
        isReady
          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          : isDownloading
            ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isReady ? 'bg-emerald-500' : isDownloading ? 'bg-cyan-500' : 'bg-indigo-500'
        }`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isReady ? 'bg-emerald-600' : isDownloading ? 'bg-cyan-600' : 'bg-indigo-600'
        }`} />
      </span>
      <span>{isReady ? `Atualização Pronta (${label})` : isDownloading ? `Baixando (${label})` : `Nova Versão (${label})`}</span>
    </button>
  );
}

export default UpdateBadge;
