/* eslint-disable react/prop-types */
import { Icons } from '../../assets/icons';

export default function DiagnosisCardGrid({
  diagnoses = [],
  onSelect,
  onDelete,
  onExportPDF,
  onResetFilters
}) {
  if (!diagnoses || diagnoses.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-4 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
          {Icons.Brain}
        </div>
        <h4 className="text-base font-bold text-slate-800 mb-1">
          Nenhum diagnóstico arquivado
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          Nenhum relatório foi encontrado para os filtros atuais. Você pode emitir novos diagnósticos na tela de Estudantes ou Notas.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Limpar Filtros e Ver Todos
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
      {diagnoses.map((diag) => {
        const dateObj = diag.created_at ? new Date(diag.created_at) : null;
        const formattedDate = dateObj
          ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' às ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : 'Data recente';

        const metrics = diag.metrics_snapshot || {};
        const mediaFinal = Number(metrics.media_final ?? 0);
        const behaviorScore = Number(metrics.behavior_score ?? 0);
        const adhesionRate = Number(metrics.adhesion_rate ?? 0);
        const trend = metrics.trend || 'Estável';

        // Remove marcações markdown simples para o texto de prévia
        const previewText = (diag.diagnosis_text || '')
          .replace(/[#*_`]/g, '')
          .replace(/\n+/g, ' ')
          .trim()
          .slice(0, 140);

        return (
          <div
            key={diag.id}
            onClick={() => onSelect(diag)}
            className="bg-white border border-slate-200/90 hover:border-indigo-300 p-5 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            {/* Faixa decorativa superior ao passar o cursor */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div>
              {/* Cabeçalho do Card: Nome e Data */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {diag.student_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formattedDate}</span>
                  </p>
                </div>

                {/* Badges de Turma e Unidade */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/80 rounded-lg text-[10px] font-bold">
                    {diag.turma_name || 'Turma'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg text-[10px] font-semibold">
                    {diag.unit_name || '1ª Unidade'}
                  </span>
                </div>
              </div>

              {/* Grid Compacto de Métricas Gravadas */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Média</span>
                  <span className={`text-xs font-black tabular-nums ${
                    mediaFinal >= 6.0 ? 'text-emerald-600' : mediaFinal >= 5.0 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {mediaFinal.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Conduta</span>
                  <span className="text-xs font-black text-slate-700 tabular-nums">
                    {behaviorScore.toFixed(1)}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lições</span>
                  <span className="text-xs font-black text-indigo-600 tabular-nums">
                    {adhesionRate}%
                  </span>
                </div>
              </div>

              {/* Prévia do Parecer Textual */}
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4 font-normal">
                {previewText || 'Parecer emitido pela inteligência pedagógica.'}...
              </p>
            </div>

            {/* Rodapé do Card com Ações */}
            <div className="pt-3 border-t border-slate-100/90 flex items-center justify-between gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                trend === 'Melhorando'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : trend === 'Piorando'
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}>
                {trend}
              </span>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {/* Botão Rápido de PDF */}
                {onExportPDF && (
                  <button
                    type="button"
                    onClick={() => onExportPDF(diag)}
                    className="w-8 h-8 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                    title="Baixar Boletim em PDF"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}

                {/* Botão de Excluir */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(diag)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    title="Excluir Registro do Acervo"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* Botão Principal de Ver Parecer */}
                <button
                  type="button"
                  onClick={() => onSelect(diag)}
                  className="px-3 h-8 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>Ver</span>
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
