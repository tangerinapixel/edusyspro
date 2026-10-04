/* eslint-disable react/prop-types */
import ReactMarkdown from 'react-markdown';
import { Icons } from '../../assets/icons';

export default function DiagnosisDetailModal({
  isOpen,
  diagnosis,
  onClose,
  onDelete,
  onExportPDF,
  onExportDoc,
  showAlert
}) {
  if (!isOpen || !diagnosis) return null;

  const metrics = diagnosis.metrics_snapshot || {};
  const mediaFinal = Number(metrics.media_final ?? 0);
  const behaviorScore = Number(metrics.behavior_score ?? 0);
  const behaviorStart = Number(metrics.behavior_start_score ?? 3.0);
  const adhesionRate = Number(metrics.adhesion_rate ?? 0);
  const occurrencesCount = metrics.occurrences_count ?? 0;
  const rank = metrics.rank_position || '-';
  const trend = metrics.trend || 'Estável';

  const dateObj = diagnosis.created_at ? new Date(diagnosis.created_at) : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + ' às ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Data recente';

  const handleCopyText = () => {
    if (diagnosis.diagnosis_text) {
      navigator.clipboard.writeText(diagnosis.diagnosis_text);
      if (showAlert) {
        showAlert('Copiado!', 'Parecer copiado para a área de transferência.', 'success');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        
        {/* BARRA SUPERIOR DO MODAL */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              {Icons.Brain}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-800 truncate">
                  {diagnosis.student_name}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold">
                  {diagnosis.turma_name || 'Turma'}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg text-[10px] font-semibold">
                  {diagnosis.unit_name || '1ª Unidade'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  trend === 'Melhorando'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : trend === 'Piorando'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}>
                  {trend}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Emitido em {formattedDate} {diagnosis.author_name ? `• por ${diagnosis.author_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyText}
              className="h-8 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Copiar Parecer Completo"
            >
              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <span className="hidden sm:inline">Copiar</span>
            </button>

            {onExportPDF && (
              <button
                type="button"
                onClick={() => onExportPDF(diagnosis)}
                className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Baixar Boletim e Parecer em PDF"
              >
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>PDF</span>
              </button>
            )}

            {onExportDoc && (
              <button
                type="button"
                onClick={() => onExportDoc(diagnosis)}
                className="h-8 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Exportar para Google Docs"
              >
                <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="hidden sm:inline">Docs</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Fechar"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* FAIXA TELEMÉTRICA GRAVADA (SNAPSHOT) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40 text-xs shrink-0">
          <div className="px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média Final</span>
            <span className={`text-sm font-black tabular-nums ${mediaFinal >= 6.0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {mediaFinal.toFixed(2)}
            </span>
          </div>

          <div className="px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conduta</span>
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {behaviorScore.toFixed(2)} / {behaviorStart}
            </span>
          </div>

          <div className="px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adesão Lições</span>
            <span className="text-sm font-black text-indigo-600 tabular-nums">
              {adhesionRate}%
            </span>
          </div>

          <div className="px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ocorrências</span>
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {occurrencesCount}
            </span>
          </div>

          <div className="px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posição / Rank</span>
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {rank}
            </span>
          </div>
        </div>

        {/* CORPO DO PARECER FORMATADO EM MARKDOWN */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed">
            <ReactMarkdown>{diagnosis.diagnosis_text}</ReactMarkdown>
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Registro histórico imutável mantido no acervo local.</span>
          </span>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(diagnosis)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl font-bold transition-all cursor-pointer"
              >
                Excluir Registro
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
