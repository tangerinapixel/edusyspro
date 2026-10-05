import React from 'react';

/**
 * BackupRestoreConfirmDialog.jsx
 * 
 * Especialidade: Diálogo de Confirmação Cirúrgica de Restauração
 * 
 * Apresenta comparativo transparente entre o snapshot selecionado no Google Drive
 * e o estado atual do computador, assegurando que o usuário entenda o impacto
 * e confirmando a criação do snapshot local prévio para rollback garantido.
 */

export default function BackupRestoreConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  snapshot,
  isRestoring
}) {
  if (!isOpen || !snapshot) return null;

  const formattedDate = new Date(snapshot.createdTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const sizeKb = (snapshot.sizeBytes / 1024).toFixed(1);

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho de Alerta de Segurança */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Confirmar Restauração de Snapshot</h3>
            <p className="text-xs text-amber-100 font-medium mt-0.5">Operação protegida por ponto de segurança local</p>
          </div>
        </div>

        {/* Corpo do Diálogo */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Você está prestes a restaurar a base de dados para o seguinte ponto do histórico gravado no Google Drive:
          </p>

          {/* Card com Detalhes do Snapshot */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Ponto no Tempo:</span>
              <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {formattedDate}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Versão do App:</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                v{snapshot.version}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Tamanho do Arquivo:</span>
              <span className="text-xs font-semibold text-slate-700">{sizeKb} KB</span>
            </div>

            {/* Métricas do Snapshot */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Estudantes</span>
                <span className="text-sm font-black text-slate-800">{snapshot.studentsCount || '-'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Atividades</span>
                <span className="text-sm font-black text-slate-800">{snapshot.activitiesCount || '-'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Avaliações</span>
                <span className="text-sm font-black text-slate-800">{snapshot.evaluationsCount || '-'}</span>
              </div>
            </div>
          </div>

          {/* Alerta de Garantia de Rollback */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
              ✓
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              <strong>Proteção Ativa:</strong> Um snapshot do estado atual do seu computador será criado automaticamente antes da restauração. Em caso de qualquer inconsistência, o sistema reverterá os dados de forma instantânea.
            </p>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isRestoring ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Restaurando Snapshot...</span>
              </>
            ) : (
              <span>Confirmar Restauração Segura</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
