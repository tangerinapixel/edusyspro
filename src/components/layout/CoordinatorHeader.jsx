/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoordinatorHeader({
  coordinatorName,
  activeNav,
  searchQuery,
  onSearchChange,
  isViewingStudent = false,
  studentName = '',
  onExit
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(coordinatorName || '');

  useEffect(() => {
    let isMounted = true;
    if (!coordinatorName && window.electronAPI?.coordinatorGetStatus) {
      window.electronAPI.coordinatorGetStatus().then(res => {
        if (isMounted && res.success && res.coordinatorName) {
          setName(res.coordinatorName);
        }
      }).catch(() => {});
    } else if (coordinatorName) {
      setName(coordinatorName);
    }
    return () => { isMounted = false; };
  }, [coordinatorName]);

  const handleReturnToTeacher = async () => {
    try {
      if (typeof onExit === 'function') {
        await onExit();
      } else {
        if (window.electronAPI?.coordinatorLockSession) {
          await window.electronAPI.coordinatorLockSession();
        }
        navigate('/');
      }
    } catch (err) {
      console.error('[CoordinatorHeader] Erro ao retornar para modo professor:', err);
      navigate('/');
    }
  };

  const navLabels = {
    overview: 'Visão Geral da Escola',
    students360: 'Dossiê dos Estudantes 360º',
    teachers: 'Corpo Docente & Turmas',
    cloud_sync: 'Sincronização & Nuvem'
  };

  return (
    <header className="px-6 py-3.5 flex justify-between items-center z-40 flex-shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md select-none gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight truncate">
            Painel da Coordenação Pedagógica
          </h2>
          <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
            isViewingStudent
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
              : 'bg-amber-50 text-amber-800 border-amber-200/80'
          }`}>
            {isViewingStudent ? 'Dossiê do Estudante' : (navLabels[activeNav] || 'Gestão Escolar')}
          </span>
        </div>
        <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
          {name ? `Gestor(a): ${name}` : 'Ambiente Institucional'} • {isViewingStudent ? `Visualizando registros de ${studentName || 'estudante'}` : 'Governança, Dossiês e Acompanhamento Multi-Docente'}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Campo de Busca Rápida Unificado no Header apenas quando em modo Estudantes e na listagem da tabela */}
        {activeNav === 'students360' && !isViewingStudent && typeof onSearchChange === 'function' && (
          <div className="relative hidden md:block w-52 xl:w-64 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder="Buscar estudante..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {/* Status da Sessão e Auto-Lock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl shadow-2xs text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-400/30" />
          <span>Sessão Protegida (15m)</span>
        </div>

        {/* Botão de Bloqueio Imediato */}
        <button
          onClick={handleReturnToTeacher}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl shadow-2xs text-xs font-bold transition-all active:scale-95 cursor-pointer"
          title="Bloquear sessão e retornar ao portal docente"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Bloquear Sessão</span>
        </button>
      </div>
    </header>
  );
}
