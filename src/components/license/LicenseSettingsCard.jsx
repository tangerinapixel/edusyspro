import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Icons } from '../../assets/icons';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';

export default function LicenseSettingsCard() {
  const { licenseInfo, setIsLicenseModalOpen, checkLicense } = useApp();
  const [copiedMid, setCopiedMid] = useState(false);

  useEffect(() => {
    if (typeof checkLicense === 'function') {
      checkLicense();
    }
  }, [checkLicense]);

  const mid = licenseInfo?.machineId || '---';
  const claims = licenseInfo?.claims;
  const status = licenseInfo?.status;

  const handleCopyMid = () => {
    if (mid && mid !== '---') {
      navigator.clipboard.writeText(mid);
      setCopiedMid(true);
      setTimeout(() => setCopiedMid(false), 2000);
    }
  };

  const handleOpenSupport = async () => {
    if (window.electronAPI?.licenseOpenSupport) {
      await window.electronAPI.licenseOpenSupport(mid);
    }
  };

  // Formatação do plano
  const getPlanLabel = (planType) => {
    if (!planType) return 'Nenhum';
    switch (planType) {
      case 'TRIAL_7D': return 'Degustação (7 Dias)';
      case 'TRIAL_15D': return 'Avaliação (15 Dias)';
      case '3_MONTHS': return 'Trimestral (3 Meses)';
      case '6_MONTHS': return 'Semestral (6 Meses)';
      case '1_YEAR': return 'Anual (Ano Letivo Completo)';
      case 'LIFETIME': return 'Vitalícia (Sem Expiração)';
      case 'CUSTOM_TERM': return 'Período Personalizado';
      default: return planType;
    }
  };

  // Formatação do status
  let statusBadge = {
    label: 'Ativa & Regular',
    bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  };

  if (status === 'WARNING_EXPIRING') {
    statusBadge = {
      label: `Expira em breve (${licenseInfo?.daysRemaining}d)`,
      bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };
  } else if (status === 'EXPIRED') {
    statusBadge = {
      label: 'Expirada (Modo Leitura)',
      bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
    };
  } else if (status === 'UNLICENSED') {
    statusBadge = {
      label: 'Não Ativado',
      bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    };
  } else if (status === 'CLOCK_TAMPERED') {
    statusBadge = {
      label: 'Relógio Inconsistente',
      bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
    };
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
      {/* Decoração sutil de fundo */}
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-500 text-indigo-600">
        {Icons.Lock || Icons.Star}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-xs">
              {Icons.Lock || Icons.Star}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 tracking-tight text-base flex items-center gap-2">
                Licença & Ativação do Sistema
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerenciamento de período, hardware ID e titularidade do EduSys Pro.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSupport}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Suporte Técnico
          </button>

          <button
            type="button"
            onClick={() => setIsLicenseModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {status === 'UNLICENSED' ? 'Ativar Agora' : 'Renovar / Trocar Chave'}
          </button>
        </div>
      </div>

      {/* Grid de Informações da Licença */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Titular da Licença
          </span>
          <p className="text-sm font-bold text-slate-800 truncate" title={claims?.clientName || 'Não registrado'}>
            {claims?.clientName || 'Não registrado'}
          </p>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Plano Contratado
          </span>
          <p className="text-sm font-bold text-indigo-600">
            {getPlanLabel(claims?.planType)}
          </p>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Data de Expiração
          </span>
          <p className="text-sm font-bold text-slate-800">
            {claims?.expiresAt
              ? new Date(claims.expiresAt).toLocaleDateString('pt-BR')
              : 'Sem Expiração (Vitalícia)'}
          </p>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              ID da Máquina
            </span>
            <button
              type="button"
              onClick={handleCopyMid}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {copiedMid ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs font-mono font-bold text-slate-700 tracking-wider truncate">
            {mid}
          </p>
        </div>
      </div>

      {/* Seção Integrada de Atualização Automática */}
      <UpdaterStatusSection />
    </div>
  );
}

function UpdaterStatusSection() {
  const {
    state,
    progress,
    newVersion,
    currentVersion,
    isDownloaded,
    isDownloading,
    isAvailableToDownload,
    startDownload,
    installUpdate,
    checkNow,
    openFloating
  } = useAutoUpdater();

  const [isChecking, setIsChecking] = React.useState(false);
  const [checkFeedback, setCheckFeedback] = React.useState('');

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setCheckFeedback('Buscando atualizações no GitHub...');
    try {
      const res = await checkNow();
      if (res?.error) {
        setCheckFeedback(`Erro: ${res.error}`);
        setTimeout(() => setCheckFeedback(''), 8000);
      } else if (res?.message) {
        setCheckFeedback(res.message);
        setTimeout(() => setCheckFeedback(''), 6000);
      } else {
        setCheckFeedback('Verificação concluída!');
        setTimeout(() => setCheckFeedback(''), 4000);
      }
    } catch (err) {
      setCheckFeedback('Erro ao conectar ao GitHub Releases.');
      setTimeout(() => setCheckFeedback(''), 6000);
    } finally {
      setIsChecking(false);
    }
  };

  const displayVersion = currentVersion || '5.5.3';

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
        <span className="text-slate-500 font-medium">
          Versão do Sistema: <strong className="text-slate-800 font-bold">v{displayVersion}</strong>
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-400 text-[11px]">Canal Oficial: GitHub Releases</span>

        {checkFeedback && (
          <span className={`font-bold text-[11px] ml-1.5 px-2 py-0.5 rounded-md ${
            checkFeedback.startsWith('Erro') 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
          }`}>
            {checkFeedback}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isAvailableToDownload && (
          <>
            <button
              type="button"
              onClick={startDownload}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⬇️ Baixar v{newVersion || '5.5.3'}</span>
            </button>
            <button
              type="button"
              onClick={openFloating}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-all cursor-pointer"
              title="Abrir detalhes e novidades desta versão"
            >
              Ver Notificação
            </button>
          </>
        )}

        {isDownloading && (
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
            <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span>Baixando v{newVersion || '5.5.3'}: {progress}%</span>
          </div>
        )}

        {isDownloaded && (
          <button
            type="button"
            onClick={installUpdate}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <span>🎉 Versão {newVersion} Pronta! Reiniciar e Atualizar</span>
          </button>
        )}

        {!isDownloading && !isDownloaded && (
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isChecking}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Verificar Atualizações</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
