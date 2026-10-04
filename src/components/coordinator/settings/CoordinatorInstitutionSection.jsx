/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Seção de Preferências Institucionais da Escola
 * Permite customizar o Nome da Escola e Subtítulo que alimentam o Dossiê Oficial em PDF.
 */
export default function CoordinatorInstitutionSection({ settings, onUpdateSuccess, onBack }) {
  const [schoolName, setSchoolName] = useState(settings?.schoolName || 'SISTEMA DE ENSINO INTEGRADO');
  const [schoolSubtitle, setSchoolSubtitle] = useState(settings?.schoolSubtitle || 'Coordenação Pedagógica • Gestão Escolar 360º');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setFeedback({ type: 'error', text: 'O nome institucional da escola não pode ficar em branco.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      if (!window.electronAPI?.coordinatorUpdatePreferences) {
        throw new Error('Canal de preferências indisponível.');
      }

      const res = await window.electronAPI.coordinatorUpdatePreferences({
        schoolName: schoolName.trim(),
        schoolSubtitle: schoolSubtitle.trim()
      });

      if (res && res.success) {
        setFeedback({ type: 'success', text: 'Dados institucionais salvos com sucesso!' });
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({
            schoolName: res.preferences?.schoolName || schoolName.trim(),
            schoolSubtitle: res.preferences?.schoolSubtitle || schoolSubtitle.trim()
          });
        }
      } else {
        setFeedback({ type: 'error', text: res?.error || 'Não foi possível salvar as preferências.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Erro inesperado ao salvar.' });
    } finally {
      setIsSaving(false);
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
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Identidade Institucional & Timbrado</h2>
              <p className="text-xs text-slate-500 font-medium">Nome e dados oficiais que encabeçam os Relatórios Oficiais e Dossiês em PDF.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100 rounded-lg">
            Cabeçalho A4
          </span>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Feedback */}
          {feedback.text && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Nome Oficial da Instituição de Ensino</span>
                <span className="text-[10px] text-slate-400 font-semibold">Título principal no PDF</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Ex: ESCOLA MUNICIPAL PROFESSOR DARCY RIBEIRO"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Subtítulo / Portaria / Unidade Mantenedora</span>
                <span className="text-[10px] text-slate-400 font-semibold">Linha descritiva no timbrado</span>
              </label>
              <input
                type="text"
                value={schoolSubtitle}
                onChange={(e) => setSchoolSubtitle(e.target.value)}
                placeholder="Ex: Coordenação Pedagógica • Educação Básica e Fundamental"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>
          </div>

          {/* Prévia ao Vivo do Cabeçalho Timbrado */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Prévia do Cabeçalho Oficial no Dossiê (Papel A4)
            </span>
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="border-b-2 border-indigo-600 pb-3 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                    {schoolName.trim() || 'NOME DA SUA ESCOLA'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {schoolSubtitle.trim() || 'Coordenação Pedagógica • Gestão Escolar'}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-400 shrink-0 font-medium">
                  <div>DOCUMENTO OFICIAL AUDITADO</div>
                  <div className="font-bold text-indigo-700 mt-0.5">EduSys Pro • Gestão 360º</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Salvando...' : 'Salvar Preferências Institucionais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
