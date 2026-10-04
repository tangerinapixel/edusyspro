import React, { useState } from 'react';

export default function AcervoDetailView({
  plan,
  onBack,
  onExportLessonPlanPDF,
  isExportingPDF = false,
  onGenerateMiniTest,
  onExportActivityBook,
  onDeletePlan
}) {
  const [activeLessonTab, setActiveLessonTab] = useState(0);

  if (!plan) return null;

  const aulas = Array.isArray(plan.aulas) ? plan.aulas : [];
  const activeAula = aulas[activeLessonTab] || aulas[0] || {};
  const formattedDate = plan.createdAt
    ? new Date(plan.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Barra de Ações Superior com Botão Voltar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1 w-full md:w-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer active:scale-95"
            title="Voltar para a lista do Acervo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar ao Acervo</span>
          </button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="px-2 py-0.5 bg-indigo-100/70 text-indigo-700 rounded text-[10px] font-black uppercase tracking-wider shrink-0">
                {plan.turmaName || 'Turma'}
              </span>
              <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                {plan.unitLabel || 'Unidade'}
              </span>
              <span className="text-[11px] font-medium text-slate-400 shrink-0">
                {formattedDate}
              </span>
            </div>
            <h3
              className="text-base font-bold text-slate-900 leading-tight mt-0.5 truncate max-w-[280px] sm:max-w-[380px] md:max-w-[480px] lg:max-w-[620px] xl:max-w-[780px] cursor-help hover:text-indigo-600 transition-colors"
              title={plan.tema || 'Plano de Aula'}
            >
              {plan.tema || 'Plano de Aula'}
            </h3>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
          <button
            onClick={() => onGenerateMiniTest(plan, null)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            title="Formular avaliação ou prova baseada nesta semana ou aula em foco"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Gerar Avaliação / Prova</span>
          </button>

          <button
            onClick={() => onExportActivityBook(plan)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            title="Exportar ou reimprimir caderno de atividades do aluno"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Caderno do Aluno</span>
          </button>

          <button
            onClick={() => onDeletePlan(plan.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Excluir este plano do acervo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Visão de Abas das Aulas */}
      <div className="border-b border-slate-200 px-6 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
        {aulas.map((aula, idx) => (
          <button
            key={idx}
            onClick={() => setActiveLessonTab(idx)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeLessonTab === idx
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm -mb-[1px] rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Aula {idx + 1}: {aula.titulo ? (aula.titulo.length > 25 ? aula.titulo.substring(0, 25) + '...' : aula.titulo) : `Parte ${idx + 1}`}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aula Selecionada */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Painel de Metadados e Objetivos */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Componente & Docente
            </h5>
            <p className="text-sm font-semibold text-slate-800">
              {plan.disciplina || 'Componente Curricular'} &bull; {plan.professorName || 'Professor(a)'}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Habilidades BNCC Alinhadas
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {plan.bnccCodes && plan.bnccCodes.length > 0 ? (
                plan.bnccCodes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-black border border-purple-200"
                  >
                    {code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Conforme diretrizes curriculares</span>
              )}
            </div>
          </div>
        </div>

        {/* Banner Didático de Exportação do Plano */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h6 className="text-xs font-bold text-slate-800">Plano Docente Completo em PDF</h6>
              <p className="text-[11px] text-slate-500 font-medium">Baixe o documento pedagógico formatado com todas as aulas e habilidades desta semana</p>
            </div>
          </div>
          <button
            onClick={() => onExportLessonPlanPDF && onExportLessonPlanPDF(plan)}
            disabled={isExportingPDF}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Baixar PDF do Plano</span>
          </button>
        </div>

        {/* Detalhe da Aula Atual */}
        {activeAula && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                  Aula {activeLessonTab + 1} de {aulas.length}
                </span>
                <h4 className="text-lg font-bold text-slate-900">
                  {activeAula.titulo || `Aula ${activeLessonTab + 1}`}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                  Duração: {activeAula.duracao || '50 min'}
                </span>
                {onGenerateMiniTest && (
                  <button
                    type="button"
                    onClick={() => onGenerateMiniTest(plan, activeLessonTab)}
                    className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    title={`Gerar prova/avaliação focada exclusivamente na Aula ${activeLessonTab + 1}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Gerar Prova Desta Aula</span>
                  </button>
                )}
              </div>
            </div>

            {/* Conceito / Metodologia */}
            {activeAula.conceito && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Mediação Didática & Conceito Inicial
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {activeAula.conceito}
                </p>
              </div>
            )}

            {/* Texto de Apoio / Base */}
            {(activeAula.textoBase || activeAula.textoApoio) && (
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-5">
                <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  Texto-Base Trabalhado com a Turma
                </h5>
                <div className="text-xs text-slate-800 leading-relaxed font-serif bg-white p-4 rounded-lg border border-amber-100 shadow-inner whitespace-pre-line">
                  {activeAula.textoBase || activeAula.textoApoio}
                </div>
              </div>
            )}

            {/* Atividades Práticas e Desafios */}
            {(activeAula.atividades || activeAula.questoes || activeAula.exercicios) && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Exercícios e Atividades do Aluno
                </h5>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium bg-slate-50/80 p-4 rounded-lg border border-slate-100">
                  {typeof activeAula.atividades === 'string'
                    ? activeAula.atividades
                    : Array.isArray(activeAula.questoes)
                    ? activeAula.questoes.map((q, qIdx) => `${qIdx + 1}. ${q.enunciado || q}`).join('\n\n')
                    : 'Nenhum exercício registrado para esta aula.'}
                </div>
              </div>
            )}

            {/* Gabarito Docente */}
            {activeAula.gabarito && (
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-5">
                <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Gabarito Comentado e Critérios de Correção
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {activeAula.gabarito}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
