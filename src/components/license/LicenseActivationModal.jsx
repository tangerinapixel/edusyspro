import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Icons } from '../../assets/icons';

export default function LicenseActivationModal({ isOpen, onClose }) {
  const { licenseInfo, checkLicense, showAlert } = useApp();
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedMid, setCopiedMid] = useState(false);
  const [machineId, setMachineId] = useState(licenseInfo?.machineId || '');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setTokenInput('');
      if (window.electronAPI?.licenseGetMachineId) {
        window.electronAPI.licenseGetMachineId().then(mid => {
          if (mid) setMachineId(mid);
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMid = machineId || licenseInfo?.machineId || 'CARREGANDO...';

  const handleCopyMachineId = () => {
    if (currentMid && currentMid !== 'CARREGANDO...') {
      navigator.clipboard.writeText(currentMid);
      setCopiedMid(true);
      setTimeout(() => setCopiedMid(false), 2000);
    }
  };

  const handleOpenSupport = async () => {
    if (window.electronAPI?.licenseOpenSupport) {
      await window.electronAPI.licenseOpenSupport(currentMid);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Por favor, cole a chave de ativação no campo abaixo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (!window.electronAPI?.licenseActivate) {
        throw new Error('API de licença indisponível no ambiente.');
      }

      const result = await window.electronAPI.licenseActivate(tokenInput.trim());

      if (result.success) {
        await checkLicense();
        if (showAlert) {
          showAlert('Sucesso', 'EduSys Pro ativado e validado com sucesso!', 'success');
        }
        onClose();
      } else {
        setErrorMessage(result.message || 'Chave de ativação inválida.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Falha na comunicação com o sistema de ativação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canDismiss = licenseInfo?.isValid || licenseInfo?.status === 'EXPIRED';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col">
        
        {/* Header com Gradiente */}
        <div className="relative p-6 pb-5 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                {Icons.Lock || Icons.Star}
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Ativação de Licença
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    EduSys Pro
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Informe a chave oficial vinculada ao hardware deste computador.
                </p>
              </div>
            </div>

            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Fechar (Modo Leitura)"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          {/* Card do Machine ID */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                ID da Máquina (Hardware Fingerprint)
              </span>
              <span className="text-base font-mono font-bold text-indigo-400 tracking-wider">
                {currentMid}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMachineId}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  copiedMid
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                }`}
              >
                {copiedMid ? '✓ Copiado!' : 'Copiar ID'}
              </button>

              <button
                type="button"
                onClick={handleOpenSupport}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Abrir suporte técnico para solicitar chave"
              >
                Suporte Técnico
              </button>
            </div>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake">
              <span className="text-base leading-none">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Inserção de Chave */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Chave de Ativação (Token Assinado)
              </label>
              <textarea
                rows={4}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Cole aqui a chave recebida (ex: EDUSYS.eyJhbGciOiJFZDI1NTE5...)"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl p-3.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none resize-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                🔒 Assinatura Ed25519 com verificação offline
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Validando Chave...
                  </>
                ) : (
                  'Ativar EduSys Pro'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé Informativo */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Tangerina Pixel • Gestão Pedagógica</span>
          <span>Versão 5.5.1</span>
        </div>

      </div>
    </div>
  );
}
