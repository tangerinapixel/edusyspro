import React, { useState, useMemo } from 'react';
import { Icons } from '../../assets/icons';
import DossieComportamentoModal from './DossieComportamentoModal';

export default function MapaComportamentoView({
  computedGrades = [],
  turmaOccurrences = [],
  occurrenceTypes = [],
  settings = {},
  turmaName = '',
  unitName = '',
  unidade = '1'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'alerta' | 'com_ocorrencias' | 'exemplar'
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState(null);

  const startScore = Number(settings?.behavior_start_score ?? 3.0);
  const totalStudents = computedGrades.length;

  // Métricas agregadas da turma
  const stats = useMemo(() => {
    if (totalStudents === 0) {
      return { avgScore: startScore, totalOccs: 0, alertCount: 0, withOccsCount: 0, exemplarCount: 0 };
    }

    const sumScore = computedGrades.reduce((acc, g) => acc + (Number(g.behaviorScore) || 0), 0);
    const avgScore = sumScore / totalStudents;
    const totalOccs = turmaOccurrences.length;

    const alertCount = computedGrades.filter(g => {
      const points = Number(g.pointsLost || 0);
      const score = Number(g.behaviorScore || 0);
      return points <= -1.0 || score < 2.0;
    }).length;

    const withOccsCount = computedGrades.filter(g => (Number(g.occurrencesCount) || 0) > 0).length;
    const exemplarCount = computedGrades.filter(g => (Number(g.occurrencesCount) || 0) === 0).length;

    return { avgScore, totalOccs, alertCount, withOccsCount, exemplarCount };
  }, [computedGrades, turmaOccurrences, totalStudents, startScore]);

  // Distribuição percentual por tipo de ocorrência
  const typeDistribution = useMemo(() => {
    const total = turmaOccurrences.length || 1;
    return (occurrenceTypes || []).map(type => {
      const count = turmaOccurrences.filter(o => o.type === type.id).length;
      const pct = Math.round((count / total) * 100);
      return {
        ...type,
        count,
        pct
      };
    }).filter(t => t.count > 0);
  }, [turmaOccurrences, occurrenceTypes]);

  // Filtragem e ordenação dos estudantes
  const filteredStudents = useMemo(() => {
    return computedGrades.filter(student => {
      const points = Number(student.pointsLost || 0);
      const score = Number(student.behaviorScore || 0);
      const hasOccs = (Number(student.occurrencesCount) || 0) > 0;
      const isAlert = points <= -1.0 || score < 2.0;
      const isExemplar = !hasOccs;

      if (activeFilter === 'alerta' && !isAlert) return false;
      if (activeFilter === 'com_ocorrencias' && !hasOccs) return false;
      if (activeFilter === 'exemplar' && !isExemplar) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (student.name || '').toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => {
      if (activeFilter === 'exemplar') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // Ordena por menor escore (quem precisa de mais atenção fica no topo)
      return (Number(a.behaviorScore) || 0) - (Number(b.behaviorScore) || 0);
    });
  }, [computedGrades, activeFilter, searchTerm]);

  // Ocorrências do aluno selecionado para o modal
  const selectedOccurrences = useMemo(() => {
    if (!selectedStudentForDossier) return [];
    const sId = selectedStudentForDossier.student_id || selectedStudentForDossier.id;
    return turmaOccurrences.filter(o => o.student_id === sId);
  }, [selectedStudentForDossier, turmaOccurrences]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* 1. FAIXA SUPERIOR DE TELEMETRIA COMPACTA (INLINE TELEMETRY) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Média da Turma</span>
            <span className={`text-xl font-black tabular-nums ${stats.avgScore >= 2.5 ? 'text-indigo-600' : 'text-amber-600'}`}>
              {stats.avgScore.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium ml-1">/ {startScore.toFixed(2)}</span>
          </div>
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
            {Icons.Award || Icons.Star}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Ocorrências</span>
            <span className="text-xl font-black text-slate-800 tabular-nums">
              {stats.totalOccs}
            </span>
            <span className="text-[10px] text-slate-400 font-medium ml-1">registradas</span>
          </div>
          <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-sm">
            {Icons.Alert}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Em Alerta Disciplinar</span>
            <span className="text-xl font-black text-rose-600 tabular-nums">
              {stats.alertCount}
            </span>
            <span className="text-[10px] text-rose-400 font-medium ml-1">estudantes</span>
          </div>
          <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Conduta Exemplar</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums">
              {stats.exemplarCount}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium ml-1">sem ocorrências</span>
          </div>
          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-sm">
            {Icons.Shield}
          </div>
        </div>
      </div>

      {/* 2. MINIBARRA DE DISTRIBUIÇÃO DAS INFRAÇÕES (SUBSTITUI O CARTÃO ESCURO GIGANTE) */}
      {typeDistribution.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Distribuição:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-start sm:justify-end">
            {typeDistribution.map(t => (
              <div
                key={t.id}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-1.5 shadow-2xs text-[11px]"
              >
                <span className="font-semibold text-slate-700">{t.title}:</span>
                <span className="font-black text-indigo-600">{t.count}x</span>
                <span className="text-[10px] text-slate-400 font-bold">({t.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MATRIZ DE ESTUDANTES COM BARRA DE PRODUTIVIDADE */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
        
        {/* BARRA DE FILTROS + BUSCA */}
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Acompanhamento Disciplinar por Estudante
            </h4>
            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-bold tabular-nums">
              {filteredStudents.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Abas Rápidas de Filtro */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setActiveFilter('todos')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({totalStudents})
              </button>

              <button
                onClick={() => setActiveFilter('alerta')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === 'alerta' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                Em Alerta ({stats.alertCount})
              </button>

              <button
                onClick={() => setActiveFilter('com_ocorrencias')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === 'com_ocorrencias' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                Com Infrações ({stats.withOccsCount})
              </button>

              <button
                onClick={() => setActiveFilter('exemplar')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === 'exemplar' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Exemplares ({stats.exemplarCount})
              </button>
            </div>

            {/* Input de Busca Instantânea */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {Icons.Search}
              </span>
              <input
                type="text"
                placeholder="Buscar estudante..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-44 pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* TABELA DE ALUNOS COM LUPA DO CONSELHO DE CLASSE */}
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              Nenhum estudante encontrado para os critérios selecionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="w-[240px] md:w-[280px] px-4 py-2.5">Estudante</th>
                  <th className="w-36 px-3 py-2.5 text-center">Status</th>
                  <th className="w-28 px-3 py-2.5 text-center">Nota Conduta</th>
                  <th className="w-28 px-3 py-2.5 text-center">Penalidades</th>
                  <th className="px-3 py-2.5">Incidências Registradas</th>
                  <th className="w-32 px-4 py-2.5 text-right">Ação Oficial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredStudents.map(student => {
                  const points = Number(student.pointsLost || 0);
                  const score = Number(student.behaviorScore || startScore);
                  const occCount = Number(student.occurrencesCount || 0);
                  const isAlert = points <= -1.0 || score < 2.0;
                  const isExemplar = occCount === 0;

                  const breakdownObj = student.occurrenceBreakdown || {};
                  const breakdownKeys = Object.keys(breakdownObj);

                  return (
                    <tr key={student.student_id || student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="w-[240px] md:w-[280px] px-4 py-2.5">
                        <span className="font-bold text-slate-800 truncate block" title={student.name}>
                          {student.name}
                        </span>
                      </td>

                      <td className="w-36 px-3 py-2.5 text-center whitespace-nowrap">
                        {isAlert ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            Alerta Crítico
                          </span>
                        ) : isExemplar ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Exemplar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Atenção
                          </span>
                        )}
                      </td>

                      <td className="w-28 px-3 py-2.5 text-center tabular-nums whitespace-nowrap">
                        <span className={`font-black text-xs ${isAlert ? 'text-rose-600' : isExemplar ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {score.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold"> / {startScore.toFixed(1)}</span>
                      </td>

                      <td className="w-28 px-3 py-2.5 text-center tabular-nums whitespace-nowrap">
                        {points < 0 ? (
                          <span className="font-bold text-rose-600">
                            {points.toFixed(2)} pts
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">0.00</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        {breakdownKeys.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Sem registros</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {breakdownKeys.map(k => (
                              <span
                                key={k}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                              >
                                {k}: <strong className="text-slate-900">{breakdownObj[k]}x</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="w-32 px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedStudentForDossier(student)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ml-auto"
                          title="Abrir Dossiê Individual e Exportar para Conselho de Classe"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" strokeWidth="2.2" />
                            <path d="M21 21l-4.35-4.35" strokeWidth="2.2" strokeLinecap="round" />
                          </svg>
                          <span>Conselho</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DO DOSSIÊ DO CONSELHO DE CLASSE */}
      {selectedStudentForDossier && (
        <DossieComportamentoModal
          isOpen={Boolean(selectedStudentForDossier)}
          onClose={() => setSelectedStudentForDossier(null)}
          student={selectedStudentForDossier}
          occurrences={selectedOccurrences}
          occurrenceTypes={occurrenceTypes}
          turmaName={turmaName}
          unidade={unidade}
          settings={settings}
        />
      )}

    </div>
  );
}
