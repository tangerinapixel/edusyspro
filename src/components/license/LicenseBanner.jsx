import React from 'react';
import { useApp } from '../../contexts/AppContext';

export default function LicenseBanner() {
  const { licenseInfo, setIsLicenseModalOpen, checkLicense } = useApp();

  if (!licenseInfo) return null;

  const { status, daysRemaining, message } = licenseInfo;

  // Se a licença estiver perfeitamente válida e não estiver perto de vencer, não ocupa espaço
  if (status === 'VALID' && (daysRemaining > 15 || daysRemaining === 99999)) {
    return null;
  }

  const daysLabel = daysRemaining === 1 ? '1 dia' : `${daysRemaining} dias`;

  // Definições visuais de alto contraste e harmonia cromática
  let theme = {
    container: 'bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border-b border-amber-200/90',
    iconBg: 'bg-amber-500/15 text-amber-700 border border-amber-300/60',
    badge: 'bg-amber-100/90 text-amber-900 border border-amber-300/80 font-black',
    text: 'text-slate-700',
    highlight: 'text-amber-900 font-black',
    button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xs shadow-amber-600/30',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: 'Licença Próxima do Vencimento',
    desc: <>Sua licença expira em <span className="font-extrabold text-amber-950 underline decoration-amber-400 decoration-2 underline-offset-2">{daysLabel}</span>. Renove para manter acesso ininterrupto a novos planos e avaliações.</>,
    actionLabel: 'Renovar Licença'
  };

  if (status === 'EXPIRED') {
    theme = {
      container: 'bg-gradient-to-r from-rose-50 via-red-50/70 to-rose-50 border-b border-rose-200/90',
      iconBg: 'bg-rose-500/15 text-rose-700 border border-rose-300/60',
      badge: 'bg-rose-100/90 text-rose-900 border border-rose-300/80 font-black',
      text: 'text-slate-700',
      highlight: 'text-rose-900 font-black',
      button: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-xs shadow-rose-600/30',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Modo Somente Leitura (Licença Expirada)',
      desc: <>Sua licença expirou. <span className="font-bold text-rose-950">Consultas e relatórios estão liberados</span>, mas novas gerações de IA requerem renovação.</>,
      actionLabel: 'Reativar Licença'
    };
  } else if (status === 'CLOCK_TAMPERED') {
    theme = {
      container: 'bg-gradient-to-r from-red-50 via-rose-50/70 to-red-50 border-b border-red-200/90',
      iconBg: 'bg-red-500/15 text-red-700 border border-red-300/60',
      badge: 'bg-red-100/90 text-red-900 border border-red-300/80 font-black',
      text: 'text-slate-700',
      highlight: 'text-red-900 font-black',
      button: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-xs',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Inconsistência de Horário',
      desc: <>O relógio do sistema foi alterado. Sincronize a data e hora do Windows com a internet para normalizar.</>,
      actionLabel: 'Verificar Licença'
    };
  } else if (status === 'UNLICENSED') {
    theme = {
      container: 'bg-gradient-to-r from-indigo-50 via-blue-50/70 to-indigo-50 border-b border-indigo-200/90',
      iconBg: 'bg-indigo-500/15 text-indigo-700 border border-indigo-300/60',
      badge: 'bg-indigo-100/90 text-indigo-900 border border-indigo-300/80 font-black',
      text: 'text-slate-700',
      highlight: 'text-indigo-900 font-black',
      button: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs shadow-indigo-600/30',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: 'EduSys Pro Não Ativado',
      desc: <>Ative sua licença com a chave oficial para desbloquear todos os módulos de inteligência e corretores.</>,
      actionLabel: 'Ativar Agora'
    };
  }

  return (
    <div className={`w-full px-6 py-2.5 transition-all z-40 flex items-center justify-between gap-4 ${theme.container}`}>
      {/* Lado Esquerdo: Ícone + Badge + Texto */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          {theme.icon}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap truncate">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shrink-0 shadow-2xs ${theme.badge}`}>
            {theme.title}
          </span>
          <span className={`text-xs font-normal leading-relaxed truncate ${theme.text}`}>
            {theme.desc}
          </span>
        </div>
      </div>

      {/* Lado Direito: Botão de Ação */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsLicenseModalOpen(true)}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${theme.button}`}
        >
          <span>{theme.actionLabel}</span>
          <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
