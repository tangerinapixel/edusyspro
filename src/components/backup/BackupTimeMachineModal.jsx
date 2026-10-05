import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import BackupRestoreConfirmDialog from './BackupRestoreConfirmDialog';

/**
 * BackupTimeMachineModal.jsx
 * 
 * Especialidade: Interface da Máquina do Tempo de Backups (Cofre Imutável)
 * 
 * Apresenta a timeline de todos os snapshots preservados no Google Drive
 * (/EduSys_Vault/Snapshots/) com métricas completas de cada ponto.
 * Permite restaurar cirurgicamente qualquer versão sem risco de perda.
 */

export default function BackupTimeMachineModal({ isOpen, onClose }) {
  const { refreshData, showAlert } = useApp();

  const [snapshots, setSnapshots] = useState([]);
  const [localMetrics, setLocalMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadSnapshotsAndMetrics = useCallback(async () => {
    if (!window.electronAPI) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Carrega métricas locais
      if (window.electronAPI.vaultGetMetrics) {
        const metricsRes = await window.electronAPI.vaultGetMetrics();
        if (metricsRes?.success) {
          setLocalMetrics(metricsRes.localMetrics);
        }
      }

      // 2. Carrega lista de snapshots do cofre
      if (window.electronAPI.vaultListSnapshots) {
        const res = await window.electronAPI.vaultListSnapshots();
        if (res.success) {
          setSnapshots(res.snapshots || []);
        } else {
          setErrorMessage(res.error || 'Não foi possível carregar a lista de snapshots do Drive.');
        }
      }
    } catch (e) {
      setErrorMessage(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSnapshotsAndMetrics();
    }
  }, [isOpen, loadSnapshotsAndMetrics]);

  const handleSelectToRestore = (snap) => {
    setSelectedSnapshot(snap);
    setIsConfirmOpen(true);
  };

  const handleExecuteRestore = async () => {
    if (!selectedSnapshot || !window.electronAPI?.vaultRestoreSnapshot) return;
    setIsRestoring(true);

    try {
      const res = await window.electronAPI.vaultRestoreSnapshot(selectedSnapshot.id);
      if (res.success) {
        setIsConfirmOpen(false);
        showAlert(
          'Snapshot Restaurado!',
          'A base de dados foi restaurada com sucesso. O sistema recarregou os dados correspondentes.',
          'success'
        );
        if (refreshData) refreshData();
        onClose();
      } else {
        showAlert('Falha na Restauração', res.error || 'Erro desconhecido ao restaurar.', 'warning');
      }
    } catch (err) {
      showAlert('Erro Inesperado', err.message || String(err), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div 
          className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black tracking-tight">Máquina do Tempo de Backups</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Cofre Imutável WORM
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Pontos de restauração protegidos contra falhas de IA ou exclusões acidentais.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSnapshotsAndMetrics}
                disabled={isLoading}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Recarregar lista do Google Drive"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Banner com Métricas do Computador Atual */}
          {localMetrics && (
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-bold text-slate-700">Estado Atual deste Computador:</span>
                <span className="text-slate-500 font-medium">
                  {localMetrics.totalStudents} alunos • {localMetrics.totalActivities} lições • {localMetrics.totalEvaluations} notas
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Versão: v{localMetrics.appVersion}
              </span>
            </div>
          )}

          {/* Lista de Snapshots */}
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {isLoading && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-bold text-slate-700">Consultando Cofre do Google Drive...</p>
                <p className="text-xs text-slate-400">Varrendo histórico de snapshots imutáveis.</p>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-lg font-bold">!</div>
                <h4 className="font-bold text-rose-800 text-sm">Falha ao Consultar Snapshots</h4>
                <p className="text-xs text-rose-600">{errorMessage}</p>
                <button
                  type="button"
                  onClick={loadSnapshotsAndMetrics}
                  className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {!isLoading && !errorMessage && snapshots.length === 0 && (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Nenhum Snapshot Imutável Encontrado</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Os snapshots imutáveis são gerados automaticamente a cada sincronização. Faça um backup manual para gerar seu primeiro ponto de restauração permanente.
                </p>
              </div>
            )}

            {!isLoading && !errorMessage && snapshots.map((snap, index) => {
              const dateObj = new Date(snap.createdTime);
              const formattedDate = dateObj.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const sizeKb = (snap.sizeBytes / 1024).toFixed(1);

              return (
                <div
                  key={snap.id}
                  className="bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                      index === 0 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      #{snapshots.length - index}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-800 text-sm tracking-tight">
                          {formattedDate}
                        </h4>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-md uppercase">
                            Mais Recente
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100">
                          v{snap.version}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
                        <span>Tamanho: <strong className="text-slate-700">{sizeKb} KB</strong></span>
                        <span>•</span>
                        <span>Alunos: <strong className="text-slate-700">{snap.studentsCount || '-'}</strong></span>
                        <span>•</span>
                        <span>Lições: <strong className="text-slate-700">{snap.activitiesCount || '-'}</strong></span>
                        <span>•</span>
                        <span>Notas: <strong className="text-slate-700">{snap.evaluationsCount || '-'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSelectToRestore(snap)}
                      className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Restaurar este Ponto</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé Informativo */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 px-6 flex items-center justify-between text-xs text-slate-500">
            <span>Total de Snapshots: <strong>{snapshots.length}</strong></span>
            <span className="text-[11px] text-slate-400">Cofre Seguro: /EduSys_Vault/Snapshots/</span>
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmação Cirúrgica */}
      <BackupRestoreConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteRestore}
        snapshot={selectedSnapshot}
        isRestoring={isRestoring}
      />
    </>
  );
}
