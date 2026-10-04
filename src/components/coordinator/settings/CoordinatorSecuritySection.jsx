/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Seção de Segurança da Coordenação Pedagógica
 * Permite alteração do PIN mestre e ajuste do tempo de auto-lock por inatividade.
 */
export default function CoordinatorSecuritySection({ settings, onUpdateSuccess, onBack }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState(settings?.sessionTimeoutMinutes || 15);

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const [pinFeedback, setPinFeedback] = useState({ type: '', text: '' });
  const [timeoutFeedback, setTimeoutFeedback] = useState({ type: '', text: '' });

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinFeedback({ type: '', text: '' });

    if (!currentPin) {
      setPinFeedback({ type: 'error', text: 'Informe o PIN atual de acesso.' });
      return;
    }
    if (newPin.length < 4) {
      setPinFeedback({ type: 'error', text: 'O novo PIN deve conter no mínimo 4 dígitos.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinFeedback({ type: 'error', text: 'A confirmação do novo PIN não confere.' });
      return;
    }

    setIsChangingPin(true);
    try {
      if (!window.electronAPI?.coordinatorChangePin) {
        throw new Error('Canal de segurança da coordenação indisponível.');
      }

      const res = await window.electronAPI.coordinatorChangePin({
        currentPin,
        newPin
      });

      if (res && res.success) {
        setPinFeedback({ type: 'success', text: 'PIN mestre institucional alterado com sucesso!' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({ lastPinChange: new Date().toISOString() });
        }
      } else {
        setPinFeedback({ type: 'error', text: res?.error || 'PIN atual incorreto ou inválido.' });
      }
    } catch (err) {
      setPinFeedback({ type: 'error', text: err.message || 'Erro inesperado ao alterar PIN.' });
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleSaveTimeout = async (e) => {
    e.preventDefault();
    setIsSavingTimeout(true);
    setTimeoutFeedback({ type: '', text: '' });

    try {
      if (!window.electronAPI?.coordinatorUpdatePreferences) {
        throw new Error('Canal de preferências indisponível.');
      }

      const res = await window.electronAPI.coordinatorUpdatePreferences({
        sessionTimeoutMinutes: Number(sessionTimeout)
      });

      if (res && res.success) {
        setTimeoutFeedback({ type: 'success', text: 'Tempo de bloqueio automático salvo com sucesso!' });
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({ sessionTimeoutMinutes: Number(sessionTimeout) });
        }
      } else {
        setTimeoutFeedback({ type: 'error', text: res?.error || 'Falha ao salvar preferência.' });
      }
    } catch (err) {
      setTimeoutFeedback({ type: 'error', text: err.message || 'Erro inesperado.' });
    } finally {
      setIsSavingTimeout(false);
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

      {/* CARD 1: TROCA DE PIN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Troca de PIN Institucional</h2>
              <p className="text-xs text-slate-500 font-medium">Atualize o código mestre que protege o cofre e relatórios da escola.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
            Criptografia PBKDF2
          </span>
        </div>

        <form onSubmit={handleChangePin} className="p-6 space-y-4">
          {pinFeedback.text && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in ${
              pinFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <span>{pinFeedback.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{pinFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">PIN Atual</label>
              <input
                type="password"
                maxLength={12}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 tracking-widest placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-center"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Novo PIN</label>
              <input
                type="password"
                maxLength={12}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 tracking-widest placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-center"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Confirmar Novo PIN</label>
              <input
                type="password"
                maxLength={12}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 tracking-widest placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-center"
                required
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Recomendamos um código de no mínimo 6 dígitos numéricos.
            </span>
            <button
              type="submit"
              disabled={isChangingPin || !currentPin || !newPin || !confirmPin}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChangingPin ? 'Atualizando PIN...' : 'Atualizar PIN'}
            </button>
          </div>
        </form>
      </div>

      {/* CARD 2: AUTO-LOCK POR INATIVIDADE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bloqueio Automático por Inatividade</h2>
              <p className="text-xs text-slate-500 font-medium">Tempo de ausência para fechamento seguro da sessão administrativa.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveTimeout} className="p-6 space-y-4">
          {timeoutFeedback.text && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in ${
              timeoutFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <span>{timeoutFeedback.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{timeoutFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[5, 15, 30, 60].map((mins) => {
              const isSelected = Number(sessionTimeout) === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSessionTimeout(mins)}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <div className="text-sm font-black">{mins} minutos</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {mins === 15 ? 'Padrão Sugerido' : mins === 5 ? 'Mais Rigoroso' : 'Sessão Estendida'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Conformidade de segurança com a LGPD e sigilo de dados educacionais.
            </span>
            <button
              type="submit"
              disabled={isSavingTimeout}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSavingTimeout ? 'Salvando...' : 'Salvar Política de Tempo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
