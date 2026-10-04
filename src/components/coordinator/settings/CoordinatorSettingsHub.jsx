/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import CoordinatorProfileSection from './CoordinatorProfileSection';
import CoordinatorSecuritySection from './CoordinatorSecuritySection';
import CoordinatorDriveSection from './CoordinatorDriveSection';
import CoordinatorInstitutionSection from './CoordinatorInstitutionSection';

/**
 * Hub Principal de Configurações da Gestão Escolar (Coordenação Pedagógica)
 * Arquitetura em Cards Modulares inspirada no Hub de Configurações do Professor.
 */
export default function CoordinatorSettingsHub({ onProfileChange }) {
  const [activeSection, setActiveSection] = useState(null); // null | 'profile' | 'security' | 'drive' | 'institution'
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!window.electronAPI?.coordinatorGetSettings) {
        throw new Error('Canal de configurações da coordenação indisponível.');
      }
      const res = await window.electronAPI.coordinatorGetSettings();
      if (res && res.success) {
        setSettings(res.settings);
      } else {
        setError(res?.error || 'Não foi possível carregar as preferências institucionais.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao consultar configurações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateSuccess = (updatedFields) => {
    setSettings(prev => {
      const merged = { ...prev, ...updatedFields };
      if (typeof onProfileChange === 'function' && updatedFields.coordinatorName) {
        onProfileChange(updatedFields.coordinatorName);
      }
      return merged;
    });
  };

  const categories = [
    {
      id: 'profile',
      group: 'Identidade & Perfil',
      title: 'Perfil da Gestão & Avatar',
      description: 'Nome do coordenador, foto de perfil e identificação nos relatórios.',
      badge: settings?.coordinatorName || 'Gestor(a)',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-indigo-600 to-violet-600',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'security',
      group: 'Segurança & Acesso',
      title: 'Segurança & PIN Institucional',
      description: 'Código mestre PBKDF2 e temporizador de auto-lock por inatividade.',
      badge: `${settings?.sessionTimeoutMinutes || 15} min Auto-Lock`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'drive',
      group: 'Conectividade & Nuvem',
      title: 'Google Drive Institucional',
      description: 'Status da conexão, troca de e-mail e nuvem escolar de sincronização.',
      badge: settings?.isDriveAuthenticated ? 'Drive Conectado' : 'Desconectado',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      color: 'from-sky-600 to-blue-700',
      badgeColor: settings?.isDriveAuthenticated ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      id: 'institution',
      group: 'Governança & Documentos',
      title: 'Identidade da Escola & Dossiê',
      description: 'Nome da mantenedora e timbrado oficial que encabeça os relatórios em PDF.',
      badge: 'Cabeçalho A4 Ativo',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'from-purple-600 to-pink-600',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    }
  ];

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Carregando painel de configurações da gestão...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-md mx-auto my-12">
        <p className="text-xs font-bold text-rose-800">{error}</p>
        <button
          onClick={loadSettings}
          className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all cursor-pointer"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Renderização das Subseções Dedicadas
  if (activeSection === 'profile') {
    return <CoordinatorProfileSection settings={settings} onUpdateSuccess={handleUpdateSuccess} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'security') {
    return <CoordinatorSecuritySection settings={settings} onUpdateSuccess={handleUpdateSuccess} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'drive') {
    return <CoordinatorDriveSection settings={settings} onUpdateSuccess={handleUpdateSuccess} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'institution') {
    return <CoordinatorInstitutionSection settings={settings} onUpdateSuccess={handleUpdateSuccess} onBack={() => setActiveSection(null)} />;
  }

  const initial = (settings?.coordinatorName || 'G').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-300">
      {/* 1. Header do Hub com Banner do Gestor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-200 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl shadow-sm shrink-0">
            {settings?.avatar ? (
              <img src={settings.avatar} alt="Avatar do Gestor" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {settings?.coordinatorName || 'Coordenador Pedagógico'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                Gestão Escolar
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Ambiente de Governança Institucional, Segurança e Preferências do Cofre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sessão Protegida ({settings?.sessionTimeoutMinutes || 15}m)</span>
          </div>
        </div>
      </div>

      {/* 2. Grid de Cards de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setActiveSection(cat.id)}
            className="group bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md shadow-indigo-600/10 group-hover:scale-105 transition-transform shrink-0`}>
                  {cat.icon}
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${cat.badgeColor}`}>
                  {cat.badge}
                </span>
              </div>

              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {cat.group}
              </div>
              <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Personalizar Ajustes</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
