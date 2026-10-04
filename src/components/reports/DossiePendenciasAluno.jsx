import React, { useState, useMemo } from 'react';
import AnimatedModal from '../shared/AnimatedModal';
import { Icons } from '../../assets/icons';

export default function DossiePendenciasAluno({
  isOpen,
  onClose,
  studentData,
  activities = [],
  activityTopics = [],
  turmaName = '',
  unidade = '1',
  schoolName = '',
  onPrintPDF
}) {
  const [filterMode, setFilterMode] = useState('todas'); // 'todas' | 'pendentes' | 'entregues'
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Normaliza o estudante selecionado
  const student = studentData?.student || null;
  const studentId = student?.student_id || student?.id;
  const studentName = student?.name || 'Estudante';

  // Mapeia todas as lições registradas com o status individual do aluno
  const lessonsHistory = useMemo(() => {
    if (!studentId || !Array.isArray(activityTopics)) return [];

    return activityTopics
      .map(topic => {
        const isCompleted = activities.some(
          a => String(a.student_id) === String(studentId) && a.date === topic.date && Boolean(a.is_completed)
        );
        return {
          date: topic.date || '',
          topic: topic.topic || 'Sem assunto registrado',
          isCompleted
        };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // Ordena por data decrescente
  }, [studentId, activityTopics, activities]);

  const totalLessons = lessonsHistory.length;
  const completedLessons = useMemo(() => lessonsHistory.filter(l => l.isCompleted).length, [lessonsHistory]);
  const pendingLessons = totalLessons - completedLessons;
  const completionPct = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Filtragem da lista
  const filteredLessons = useMemo(() => {
    return lessonsHistory.filter(lesson => {
      if (filterMode === 'pendentes' && lesson.isCompleted) return false;
      if (filterMode === 'entregues' && !lesson.isCompleted) return false;

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const dateFormatted = (lesson.date || '').split('-').reverse().join('/');
        const matchTopic = (lesson.topic || '').toLowerCase().includes(term);
        const matchDate = dateFormatted.includes(term) || (lesson.date || '').includes(term);
        return matchTopic || matchDate;
      }
      return true;
    });
  }, [lessonsHistory, filterMode, searchTerm]);

  const handlePrint = async () => {
    if (typeof onPrintPDF === 'function') {
      try {
        setIsExporting(true);
        await onPrintPDF({
          student,
          studentName,
          turmaName,
          unidade,
          schoolName,
          lessonsHistory,
          totalLessons,
          completedLessons,
          pendingLessons,
          completionPct
        });
      } finally {
        setIsExporting(false);
      }
    }
  };

  const formatDateDisplay = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  if (!isOpen || !student) return null;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" zIndex="z-50">
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* CABEÇALHO DO DOSSIÊ (BLINDADO COM SHRINK-0) */}
        <div className="shrink-0 pt-8 pb-6 px-8 sm:px-10 bg-slate-900 text-white flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            {Icons.Book}
          </div>
          <div className="relative z-10 pr-6 min-w-0">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2.5 leading-tight truncate sm:whitespace-normal">
              {studentName}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-400/20">
                Dossiê Individual de Lições
              </span>
              {turmaName && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-bold">
                  {turmaName}
                </span>
              )}
              <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-bold">
                {unidade}ª Unidade
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all cursor-pointer relative z-10 shrink-0"
            title="Fechar Dossiê"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* MÉTRICAS EM CARDS (BLINDADO COM SHRINK-0) */}
        <div className="shrink-0 p-5 sm:px-10 sm:py-6 bg-slate-50/60 border-b border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Total de Aulas</div>
              <div className="text-xl font-black text-slate-800">{totalLessons}</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-0.5">Concluídas</div>
              <div className="text-xl font-black text-emerald-600">{completedLessons}</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-0.5">Pendências</div>
              <div className="text-xl font-black text-rose-600">{pendingLessons}</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">Aproveitamento</div>
              <div className="text-xl font-black text-indigo-600">{completionPct.toFixed(0)}%</div>
            </div>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionPct >= 80 ? 'bg-emerald-500' : completionPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* BARRA DE CONTROLE: FILTROS E BUSCA (BLINDADO COM SHRINK-0) */}
        <div className="shrink-0 p-4 sm:px-10 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterMode('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'todas'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({totalLessons})
            </button>
            <button
              onClick={() => setFilterMode('pendentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'pendentes'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              Pendentes ({pendingLessons})
            </button>
            <button
              onClick={() => setFilterMode('entregues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'entregues'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Concluídas ({completedLessons})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {Icons.Search}
            </span>
            <input
              type="text"
              placeholder="Buscar por assunto ou data..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* LISTAGEM DETALHADA COM ROLAGEM (ISOLADA COM MIN-H-0) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10 divide-y divide-slate-100">
          {filteredLessons.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Nenhuma lição encontrada para o filtro selecionado.
            </div>
          ) : (
            filteredLessons.map((lesson, idx) => (
              <div
                key={`${lesson.date}-${idx}`}
                className={`py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 transition-colors ${
                  !lesson.isCompleted ? 'bg-rose-50/20 -mx-6 sm:-mx-10 px-6 sm:px-10' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs mt-0.5 ${
                      lesson.isCompleted
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {lesson.isCompleted ? Icons.Check : '!'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        {formatDateDisplay(lesson.date)}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          lesson.isCompleted
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {lesson.isCompleted ? 'Entregue' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">
                      {lesson.topic}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RODAPÉ DE AÇÕES (BLINDADO COM SHRINK-0) */}
        <div className="shrink-0 p-4 sm:px-10 sm:py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Exibindo {filteredLessons.length} de {totalLessons} registro{totalLessons !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Baixar relatório oficial em formato PDF"
            >
              <span className="w-4 h-4">{Icons.Download}</span>
              <span>{isExporting ? 'Preparando PDF...' : 'Baixar Relatório (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </AnimatedModal>
  );
}
