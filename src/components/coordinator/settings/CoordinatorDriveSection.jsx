/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Seção de Gerenciamento da Nuvem Google Drive
 * Permite visualizar o status da conexão, trocar de conta institucional ou desconectar.
 */
export default function CoordinatorDriveSection({ settings, onUpdateSuccess, onBack }) {
  const [isDriveAuth, setIsDriveAuth] = useState(!!settings?.isDriveAuthenticated);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const handleSwitchAccount = async () => {
    setIsLoading(true);
    setFeedback({ type: '', text: '' });

    try {
      if (!window.electronAPI?.coordinatorSwitchDriveAccount) {
        throw new Error('Canal de alternância de conta indisponível.');
      }

      const res = await window.electronAPI.coordinatorSwitchDriveAccount();
      if (res && res.cancelled) {
        setFeedback({ type: 'info', text: 'Operação de login cancelada pelo usuário.' });
      } else if (res && res.success) {
        setIsDriveAuth(true);
        setFeedback({ type: 'success', text: 'Nova conta do Google Drive vinculada com sucesso!' });
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({ isDriveAuthenticated: true });
        }
      } else {
        setFeedback({ type: 'error', text: res?.error || 'Falha ao autenticar nova conta.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Erro durante a autenticação.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar a conta do Google Drive da coordenação? Os backups automáticos serão suspensos até um novo login.')) {
      return;
    }

    setIsLoading(true);
    setFeedback({ type: '', text: '' });

    try {
      if (!window.electronAPI?.coordinatorDisconnectDrive) {
        throw new Error('Canal de desconexão indisponível.');
      }

      const res = await window.electronAPI.coordinatorDisconnectDrive();
      if (res && res.success) {
        setIsDriveAuth(false);
        setFeedback({ type: 'info', text: 'Conta do Google Drive desconectada com sucesso.' });
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({ isDriveAuthenticated: false });
        }
      } else {
        setFeedback({ type: 'error', text: res?.error || 'Falha ao desconectar conta.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao desconectar.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Barra de Retorno */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Voltar ao Hub de Configurações</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header do Card */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Conexão Nuvem • Google Drive</h2>
              <p className="text-xs text-slate-500 font-medium">Conta institucional utilizada para sincronização e backup do cofre.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
            isDriveAuth
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {isDriveAuth ? '● Conectado' : '○ Desconectado'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Feedback */}
          {feedback.text && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              feedback.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <span>{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Banner de Estado da Conta */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isDriveAuth ? 'Google Drive Institucional Ativo' : 'Nenhuma Conta Conectada'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isDriveAuth
                    ? 'O cofre escolar sincroniza automaticamente as pastas dos professores autorizados.'
                    : 'Conecte a conta do Google Drive da coordenação para habilitar a ingestão federada.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSwitchAccount}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>{isDriveAuth ? 'Trocar Conta Google' : 'Conectar Google Drive'}</span>
              </button>

              {isDriveAuth && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Desconectar conta"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {/* Dicas e Segurança da Nuvem */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Privacidade & Criptografia na Nuvem</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Todos os dados sincronizados são cifrados localmente com chave AES-256 antes de qualquer transmissão. Nem mesmo o Google possui acesso em texto plano aos diários escolares, notas e diagnósticos dos seus estudantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
