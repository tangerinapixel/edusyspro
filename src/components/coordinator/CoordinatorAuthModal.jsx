/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';

export default function CoordinatorAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('loading'); // 'loading' | 'auth' | 'setup'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setConfirmPin('');
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const checkStatus = async () => {
      try {
        if (!window.electronAPI?.coordinatorGetStatus) {
          setError('Comunicação com o barramento do sistema indisponível.');
          setStep('auth');
          return;
        }

        const res = await window.electronAPI.coordinatorGetStatus();
        if (!isMounted) return;

        if (res.success) {
          if (!res.isSetup) {
            setStep('setup');
          } else if (res.isElevated) {
            if (typeof onSuccess === 'function') onSuccess();
            if (typeof onClose === 'function') onClose();
          } else {
            setStep('auth');
            setCoordinatorName(res.coordinatorName || '');
          }
        } else {
          setError(res.error || 'Falha ao verificar status da coordenação.');
          setStep('auth');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Erro ao inicializar módulo de segurança.');
          setStep('auth');
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, onClose, onSuccess]);

  useEffect(() => {
    if (isOpen && (step === 'auth' || step === 'setup')) {
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleAuthenticate = async (e) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError('Por favor, informe o PIN de 4 a 8 dígitos.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await window.electronAPI.coordinatorAuthenticate({ pin: pin.trim() });
      if (res.success) {
        setPin('');
        if (typeof onSuccess === 'function') onSuccess(res);
        if (typeof onClose === 'function') onClose();
      } else {
        setError(res.error || 'PIN incorreto. Acesso não autorizado.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao comunicar com o servidor de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setError('O PIN deve conter no mínimo 4 dígitos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('A confirmação do PIN não confere.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const setupRes = await window.electronAPI.coordinatorSetupPin({
        pin: pin.trim(),
        coordinatorName: coordinatorName.trim() || 'Coordenador Pedagógico'
      });

      if (!setupRes.success) {
        throw new Error(setupRes.error || 'Falha ao registrar PIN inicial.');
      }

      const authRes = await window.electronAPI.coordinatorAuthenticate({ pin: pin.trim() });
      if (authRes.success) {
        setPin('');
        setConfirmPin('');
        if (typeof onSuccess === 'function') onSuccess(authRes);
        if (typeof onClose === 'function') onClose();
      } else {
        setStep('auth');
        setError('PIN configurado com sucesso! Digite-o para desbloquear.');
      }
    } catch (err) {
      setError(err.message || 'Erro durante a configuração inicial.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Painel da Coordenação
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                  Segurança
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {step === 'setup' ? 'Configuração do PIN do Gestor' : 'Acesso Seguro da Coordenação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div>
          {step === 'loading' ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Verificando status do cofre...</p>
            </div>
          ) : step === 'setup' ? (
            <form onSubmit={handleSetup} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
                <strong>Primeiro Acesso:</strong> Cadastre seu nome e um PIN numérico para proteger o cofre institucional.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Coordenador / Gestor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Coord. Helena Rocha"
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Novo PIN (Mínimo 4 dígitos)
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  maxLength={8}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 tracking-widest text-center text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirme o PIN
                </label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 tracking-widest text-center text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-black"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Salvar PIN e Desbloquear'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthenticate} className="space-y-3.5">
              <div className="text-center py-1">
                <p className="text-xs text-slate-500 font-medium">
                  {coordinatorName ? `Bem-vindo(a), ${coordinatorName}.` : 'Informe o PIN da coordenação para acessar.'}
                </p>
              </div>

              <div>
                <input
                  ref={inputRef}
                  type="password"
                  maxLength={8}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 tracking-[0.4em] text-center text-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-black shadow-inner"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !pin}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>Desbloquear Painel do Gestor</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('setup');
                    setPin('');
                    setConfirmPin('');
                    setError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors cursor-pointer"
                >
                  Esqueceu ou deseja redefinir o PIN?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
