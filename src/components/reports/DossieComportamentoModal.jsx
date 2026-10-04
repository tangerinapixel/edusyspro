import React, { useState, useMemo } from 'react';
import AnimatedModal from '../shared/AnimatedModal';
import { Icons } from '../../assets/icons';

export default function DossieComportamentoModal({
  isOpen,
  onClose,
  student,
  occurrences = [],
  occurrenceTypes = [],
  turmaName = '',
  unidade = '1',
  settings = {},
  onPrintPDF
}) {
  const [isExporting, setIsExporting] = useState(false);

  const studentName = student?.name || 'Estudante';
  const startScore = Number(settings?.behavior_start_score ?? 3.0);
  const penalties = Number(student?.pointsLost ?? 0);
  const finalScore = Number(student?.behaviorScore ?? startScore);

  const isAlert = penalties <= -1.0 || finalScore < 2.0;
  const isSatisfactory = finalScore >= startScore;

  // Ocorrências do aluno ordenadas cronologicamente da mais recente para a mais antiga
  const studentOccurrences = useMemo(() => {
    return [...occurrences].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [occurrences]);

  // Agrupamento por tipo de ocorrência
  const breakdown = useMemo(() => {
    return studentOccurrences.reduce((acc, curr) => {
      const typeConfig = (occurrenceTypes || []).find(t => t.id === curr.type);
      const title = typeConfig ? typeConfig.title : curr.type;
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {});
  }, [studentOccurrences, occurrenceTypes]);

  const handlePrint = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const exportPayload = {
        studentName,
        turmaName,
        unidade,
        schoolName: settings?.school_name,
        behaviorStartScore: startScore,
        totalPenalties: penalties,
        behaviorScore: finalScore,
        occurrencesList: studentOccurrences.map(occ => {
          const typeConfig = (occurrenceTypes || []).find(t => t.id === occ.type);
          return {
            date: occ.date,
            typeTitle: typeConfig ? typeConfig.title : occ.type,
            points: occ.points !== undefined ? occ.points : (typeConfig?.penalty ?? 0),
            note: occ.note || occ.description || 'Registro em diário de classe'
          };
        }),
        occurrenceBreakdown: breakdown
      };

      if (typeof onPrintPDF === 'function') {
        await onPrintPDF(exportPayload);
      } else {
        const api = window.electronAPI || window.api;
        if (api && typeof api.exportStudentBehaviorPDF === 'function') {
          const result = await api.exportStudentBehaviorPDF(exportPayload);
          if (result && !result.success && !result.cancelled && result.error) {
            console.error('Falha ao exportar PDF comportamental:', result.error);
            alert('Não foi possível gerar o arquivo PDF: ' + result.error);
          }
        }
      }
    } catch (err) {
      console.error('Erro na exportação do dossiê:', err);
      alert('Erro ao exportar PDF: ' + (err.message || 'Falha inesperada'));
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateDisplay = (isoDate) => {
    if (!isoDate) return '-';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  if (!isOpen || !student) return null;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" zIndex="z-50">
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-white rounded-2xl shadow-xl">
        
        {/* CABEÇALHO DO DOSSIÊ */}
        <div className="shrink-0 p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 pr-6 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-indigo-400/20">
                Conselho de Classe
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                {turmaName || 'Turma'}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                {unidade}ª Unidade Letiva
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
              {studentName}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Dossiê Disciplinar e Relatório de Conduta Discente
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer relative z-10 shrink-0"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FAIXA TELEMÉTRICA COMPACTA */}
        <div className="shrink-0 p-4 sm:px-6 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nota Base</span>
              <span className="text-base font-black text-slate-700 tabular-nums">{startScore.toFixed(2)}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block mb-0.5">Deduções</span>
              <span className="text-base font-black text-rose-600 tabular-nums">{penalties.toFixed(2)} pts</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Escore Final</span>
              <span className={`text-base font-black tabular-nums ${isAlert ? 'text-rose-600' : isSatisfactory ? 'text-emerald-600' : 'text-amber-600'}`}>
                {finalScore.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Ocorrências</span>
              <span className="text-base font-black text-slate-800 tabular-nums">{studentOccurrences.length}</span>
            </div>
          </div>

          {/* CHIPS DE DISTRIBUIÇÃO */}
          {Object.keys(breakdown).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Incidências:</span>
              {Object.entries(breakdown).map(([title, count]) => (
                <span
                  key={title}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold shadow-2xs"
                >
                  {title}: <strong className="text-slate-900 font-black">{count}x</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CORPO: LINHA DO TEMPO CRONOLÓGICA DAS INFRAÇÕES */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar min-h-0">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              {Icons.Alert} Histórico Detalhado de Ocorrências
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              {studentOccurrences.length} {studentOccurrences.length === 1 ? 'registro' : 'registros'} nesta unidade
            </span>
          </div>

          {studentOccurrences.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3">
                {Icons.Shield}
              </div>
              <h5 className="text-sm font-bold text-slate-800 mb-1">Conduta Exemplar</h5>
              <p className="text-xs text-slate-500 max-w-sm">
                Este estudante não possui nenhuma ocorrência disciplinar registrada na unidade letiva vigente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {studentOccurrences.map((occ, idx) => {
                const typeConfig = (occurrenceTypes || []).find(t => t.id === occ.type);
                const penaltyVal = occ.points !== undefined ? occ.points : (typeConfig?.penalty ?? 0);

                return (
                  <div key={occ.id || idx} className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold tabular-nums shrink-0">
                        {formatDateDisplay(occ.date)}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">
                          {typeConfig?.title || occ.type}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {occ.note || occ.description || 'Registro em diário de classe'}
                        </span>
                      </div>
                    </div>
                    
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
                      {Number(penaltyVal).toFixed(2)} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="shrink-0 px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                {Icons.Download}
                <span>Imprimir Relatório Oficial (PDF)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </AnimatedModal>
  );
}
