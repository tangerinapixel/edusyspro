import React, { useState } from 'react';
import AnimatedModal from '../shared/AnimatedModal';
import { Icons } from '../../assets/icons';
import AcervoExamScopeSelector from '../acervo/AcervoExamScopeSelector';
import { formatAiUserErrorMessage, isAiAuthError } from '../../utils/aiErrorHandler';
import { useApp } from '../../contexts/AppContext';

export default function CadernoAtividadesModal({
  isOpen,
  onClose,
  planData,
  title,
  unitLabel,
  professorName,
  onExportSuccess,
  initialLessonIndex = null,
  initialFormat = null
}) {
  const { setIsAIModalOpen } = useApp();
  const [format, setFormat] = useState(initialFormat || 'caderno_padrao'); // 'caderno_padrao' | 'avaliacao_formal' | 'estudo_dirigido'
  const [printMode, setPrintMode] = useState('colorido'); // 'colorido' | 'economico_xerox'
  const [includeSelfAssessment, setIncludeSelfAssessment] = useState(false);
  const [includeFamilySignature, setIncludeFamilySignature] = useState(false);
  const [includeTeacherGuide, setIncludeTeacherGuide] = useState(false);
  const [maxScore, setMaxScore] = useState('10,0');
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('');

  // Configurações do Modo de Prova Inédita com IA (1 a 20 questões)
  const [examCompositionMode, setExamCompositionMode] = useState('ia_inedita'); // 'ia_inedita' | 'plano_aulas'
  const [scopeMode, setScopeMode] = useState('plano_atual'); // 'plano_atual' | 'multissemanas'
  const [lessonScopeMode, setLessonScopeMode] = useState(
    initialLessonIndex !== null && initialLessonIndex !== undefined ? 'aulas_especificas' : 'todas'
  );
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(
    initialLessonIndex !== null && initialLessonIndex !== undefined ? initialLessonIndex : 0
  );
  const [selectedScopePlanIds, setSelectedScopePlanIds] = useState([]);
  const [numAiQuestions, setNumAiQuestions] = useState(10); // 1 a 20
  const [maxAiTexts, setMaxAiTexts] = useState(1); // 1 ou 2
  const [aiQuestionTypes, setAiQuestionTypes] = useState({
    multipla_escolha: true,
    associacao: true,
    lacunas: true,
    dissertativa: true
  });

  const aulas = Array.isArray(planData?.aulas) ? planData.aulas : [];

  // Índices de aulas selecionadas (todas por padrão)
  const [selectedLessonIndices, setSelectedLessonIndices] = useState(() => 
    aulas.map((_, idx) => idx)
  );

  // Sincroniza se planData mudar
  React.useEffect(() => {
    if (aulas.length > 0) {
      setSelectedLessonIndices(aulas.map((_, idx) => idx));
    }
  }, [planData]);

  // Sincroniza e isola o estado sempre que o modal abre ou initialLessonIndex/initialFormat muda
  React.useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setLoadingStatusText('');
      setScopeMode('plano_atual');
      setSelectedScopePlanIds([]);
      if (initialFormat) {
        setFormat(initialFormat);
      }
      if (initialLessonIndex !== null && initialLessonIndex !== undefined) {
        setLessonScopeMode('aulas_especificas');
        setSelectedLessonIndices([initialLessonIndex]);
        setSelectedLessonIndex(initialLessonIndex);
      } else {
        setLessonScopeMode('todas');
        setSelectedLessonIndices(aulas.map((_, idx) => idx));
        setSelectedLessonIndex(0);
      }
    }
  }, [initialFormat, initialLessonIndex, isOpen, aulas.length]);

  const toggleLesson = (idx) => {
    if (selectedLessonIndices.includes(idx)) {
      if (selectedLessonIndices.length === 1) return; // Mantém no mínimo 1 aula
      setSelectedLessonIndices(selectedLessonIndices.filter(i => i !== idx));
    } else {
      setSelectedLessonIndices([...selectedLessonIndices, idx].sort((a, b) => a - b));
    }
  };

  const selectAllLessons = () => {
    setSelectedLessonIndices(aulas.map((_, idx) => idx));
  };

  const deselectAllLessons = () => {
    setSelectedLessonIndices([0]);
  };

  const toggleAiQuestionType = (typeKey) => {
    const activeCount = Object.values(aiQuestionTypes).filter(Boolean).length;
    if (aiQuestionTypes[typeKey] && activeCount <= 1) {
      return; // Mantém ao menos um formato ativo
    }
    setAiQuestionTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

  // Contagem de questões nas aulas selecionadas (modo plano de aulas)
  const countQuestionsInText = (text) => {
    if (!text) return 0;
    const regex = /(?:^|\n)\s*\d+[\.\)]\s+[\s\S]*?(?=(?:\n\s*\d+[\.\)]\s+)|$)/g;
    const matches = [...String(text).matchAll(regex)];
    return matches.length;
  };

  const totalQuestions = selectedLessonIndices.reduce((acc, idx) => {
    const aula = aulas[idx];
    return acc + (aula ? countQuestionsInText(aula.atividades) : 0);
  }, 0);

  const maxScoreNum = parseFloat(String(maxScore).replace(',', '.')) || 10.0;
  const valPerQuestionNum = totalQuestions > 0 ? (maxScoreNum / totalQuestions) : maxScoreNum;
  const valPerQuestionStr = Number.isInteger(valPerQuestionNum) ? valPerQuestionNum.toString() : valPerQuestionNum.toFixed(1).replace('.', ',');
  const valPerAiQuestionNum = numAiQuestions > 0 ? (maxScoreNum / numAiQuestions) : maxScoreNum;
  const valPerAiQuestionStr = Number.isInteger(valPerAiQuestionNum) ? valPerAiQuestionNum.toString() : valPerAiQuestionNum.toFixed(1).replace('.', ',');

  if (!isOpen || !planData) return null;

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setLoadingStatusText('Preparando documento...');

    try {
      const isUnitExam = scopeMode === 'multissemanas';
      const options = {
        format,
        printMode,
        includeSelfAssessment,
        includeFamilySignature,
        includeTeacherGuide,
        maxScore,
        selectedLessonIndices,
        scopeMode,
        isUnitExam
      };

      // Se for Avaliação Formal no modo Inédito com IA, formula a prova sob demanda
      let effectiveContextPlanData = planData;
      if (format === 'avaliacao_formal' && examCompositionMode === 'ia_inedita') {
        setLoadingStatusText('Elaborando avaliação oficial com IA...');

        let effectiveTema = planData.tema || title || 'Conteúdo Curricular';
        let effectiveBncc = planData.bnccCodes || [];
        const isSpecific = scopeMode === 'plano_atual' && (lessonScopeMode === 'aulas_especificas' || lessonScopeMode === 'aula_especifica');
        let targetAulas = aulas;
        let targetLessonNumbers = [];

        if (scopeMode === 'multissemanas' && selectedScopePlanIds.length > 0 && window.electronAPI?.planArchiveCompileSummary) {
          setLoadingStatusText('Consolidando conteúdos das semanas selecionadas...');
          const summaryRes = await window.electronAPI.planArchiveCompileSummary(selectedScopePlanIds);
          if (summaryRes && summaryRes.success) {
            effectiveTema = `Avaliação Geral da Unidade (${summaryRes.totalWeeks} semanas)`;
            effectiveBncc = summaryRes.aggregatedBnccCodes;
            effectiveContextPlanData = {
              ...planData,
              tema: effectiveTema,
              habilidades: effectiveBncc.join(', '),
              aulas: summaryRes.weeksModules.flatMap(w => w.aulasSummary.map(a => ({ titulo: a, objetivo: '' })))
            };
          }
        } else if (isSpecific && selectedLessonIndices.length > 0 && selectedLessonIndices.length < aulas.length) {
          targetAulas = selectedLessonIndices.map(i => aulas[i]).filter(Boolean);
          targetLessonNumbers = selectedLessonIndices.map(i => i + 1);

          let scopeLabel = '';
          if (targetLessonNumbers.length === 1) {
            const num = targetLessonNumbers[0];
            const tit = targetAulas[0]?.titulo || `Aula ${num}`;
            scopeLabel = `Aula ${num < 10 ? '0' + num : num}: ${tit}`;
          } else {
            const numsStr = targetLessonNumbers.map(n => n < 10 ? '0' + n : n).join(', ');
            scopeLabel = `Aulas ${numsStr}`;
          }

          effectiveTema = scopeLabel;
          effectiveContextPlanData = {
            ...planData,
            tema: effectiveTema,
            targetLessonNumbers,
            targetLessonNumber: targetLessonNumbers.length === 1 ? targetLessonNumbers[0] : null,
            targetAulas,
            targetLesson: targetAulas.length === 1 ? targetAulas[0] : null,
            aulas: targetAulas
          };
          options.targetLessonNumbers = targetLessonNumbers;
          options.targetLessonNumber = targetLessonNumbers.length === 1 ? targetLessonNumbers[0] : null;
          options.targetLessonTitle = scopeLabel;
          options.isSpecificLesson = true;
          options.selectedLessonIndices = selectedLessonIndices;
        }

        const examRes = await window.electronAPI.generateExamWithAI({
          disciplina: planData.disciplina || 'Língua Portuguesa',
          tema: effectiveTema,
          publico: planData.publico || planData.turma || 'Ensino Fundamental II',
          unitLabel,
          professorName,
          numQuestions: numAiQuestions,
          maxTexts: maxAiTexts,
          questionTypes: aiQuestionTypes,
          bnccCodes: effectiveBncc,
          planData: effectiveContextPlanData,
          isSpecificLesson: isSpecific && targetLessonNumbers.length > 0,
          targetLessonNumbers: targetLessonNumbers,
          targetLessonNumber: targetLessonNumbers.length === 1 ? targetLessonNumbers[0] : null
        });

        if (!examRes || !examRes.success || !examRes.exam) {
          throw new Error(examRes?.error || 'A IA não conseguiu formular o instrumento de avaliação.');
        }

        options.examData = examRes.exam;
      }

      setLoadingStatusText('Diagramando e gerando PDF...');
      const res = await window.electronAPI.exportStudentActivitiesPDF(
        effectiveContextPlanData || planData,
        title,
        unitLabel,
        professorName,
        options
      );

      if (res && res.success) {
        if (typeof onExportSuccess === 'function') {
          onExportSuccess();
        }
        onClose();
      } else if (res && !res.cancelled && res.error) {
        const userMessage = formatAiUserErrorMessage(res.error, 'gerar o caderno/avaliação');
        if (isAiAuthError(res.error)) {
          if (window.confirm(userMessage + '\n\nDeseja abrir as Configurações de IA agora para cadastrar ou validar sua chave?')) {
            if (setIsAIModalOpen) setIsAIModalOpen(true);
            onClose();
          }
        } else {
          alert('Atenção na Geração da Avaliação:\n\n' + userMessage);
        }
      }
    } catch (err) {
      console.error('Erro ao exportar caderno personalizado:', err);
      const rawError = err?.message || String(err || '');
      const userMessage = formatAiUserErrorMessage(rawError, 'gerar o caderno/avaliação');

      if (isAiAuthError(rawError)) {
        if (window.confirm(userMessage + '\n\nDeseja abrir as Configurações de IA agora para cadastrar ou validar sua chave?')) {
          if (setIsAIModalOpen) setIsAIModalOpen(true);
          onClose();
        }
      } else {
        alert('Atenção na Geração da Avaliação:\n\n' + userMessage);
      }
    } finally {
      setIsExporting(false);
      setLoadingStatusText('');
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" zIndex="z-50">
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-white rounded-2xl shadow-2xl">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="shrink-0 p-5 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Estúdio Editorial Discente
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {unitLabel}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              Personalizar Caderno de Atividades
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5 truncate max-w-md">
              {planData.tema || title || 'Atividades Práticas da Turma'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CORPO DE CONFIGURAÇÃO COM ROLAGEM CONFORTÁVEL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-700 text-xs">

          {/* 1. SELEÇÃO DO MODELO / FINALIDADE */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              1. Finalidade Pedagógica do Material
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Opção 1: Caderno Prático Clássico (Padrão Atual) */}
              <div
                onClick={() => setFormat('caderno_padrao')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  format === 'caderno_padrao'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-slate-900 text-xs">Caderno Prático</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    Padrão
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Modelo clássico de dever de casa e lições de classe, com visto/nota.
                </p>
              </div>

              {/* Opção 2: Avaliação Formal / Prova */}
              <div
                onClick={() => setFormat('avaliacao_formal')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  format === 'avaliacao_formal'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-slate-900 text-xs">Avaliação / Prova</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                    Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Cabeçalho avaliativo, nota máxima e instruções formais de conduta.
                </p>
              </div>

              {/* Opção 3: Estudo Dirigido */}
              <div
                onClick={() => setFormat('estudo_dirigido')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  format === 'estudo_dirigido'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-slate-900 text-xs">Estudo Dirigido</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Pesquisa
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Para metodologias ativas, resolução em equipe e investigação.
                </p>
              </div>

            </div>
          </div>

          {/* CONFIGURAÇÃO DA AVALIAÇÃO FORMAL */}
          {format === 'avaliacao_formal' && (
            <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-3.5 animate-in fade-in duration-200">
              
              {/* Alternador de Modo de Composição */}
              <div className="flex bg-indigo-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setExamCompositionMode('ia_inedita')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    examCompositionMode === 'ia_inedita'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-900 hover:bg-white/50'
                  }`}
                >
                  <span>✨ Elaborar Prova Oficial com IA</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                    examCompositionMode === 'ia_inedita' ? 'bg-amber-400 text-slate-950' : 'bg-indigo-200 text-indigo-900'
                  }`}>
                    RECOMENDADO
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExamCompositionMode('plano_aulas')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    examCompositionMode === 'plano_aulas'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-indigo-900 hover:bg-white/50'
                  }`}
                >
                  Compilar Exercícios das Aulas
                </button>
              </div>

              {/* MODO A: ELABORAR PROVA INÉDITA COM IA */}
              {examCompositionMode === 'ia_inedita' && (
                <div className="space-y-3.5">
                  {/* Seletor de Escopo Curricular: Plano Atual vs Prova Geral da Unidade */}
                  <AcervoExamScopeSelector
                    currentPlan={planData}
                    turmaId={planData.turmaId}
                    unitId={planData.unitId}
                    scopeMode={scopeMode}
                    onChangeScopeMode={setScopeMode}
                    lessonScopeMode={lessonScopeMode}
                    onChangeLessonScopeMode={setLessonScopeMode}
                    selectedLessonIndices={selectedLessonIndices}
                    onToggleLessonIndex={toggleLesson}
                    onSelectAllLessons={selectAllLessons}
                    onDeselectAllLessons={deselectAllLessons}
                    selectedLessonIndex={selectedLessonIndex}
                    onSelectLessonIndex={setSelectedLessonIndex}
                    selectedPlanIds={selectedScopePlanIds}
                    onTogglePlanId={(id) => {
                      if (selectedScopePlanIds.includes(id)) {
                        setSelectedScopePlanIds(selectedScopePlanIds.filter(x => x !== id));
                      } else {
                        setSelectedScopePlanIds([...selectedScopePlanIds, id]);
                      }
                    }}
                    onSelectAllPlans={(ids) => setSelectedScopePlanIds(ids)}
                    onDeselectAllPlans={() => setSelectedScopePlanIds([])}
                  />

                  {/* 1. Quantidade de Questões (1 a 20) */}
                  <div className="bg-white/90 p-3 rounded-xl border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-indigo-950 text-xs block uppercase tracking-wide">
                          Quantidade de Questões (1 a 20):
                        </span>
                        <span className="text-[10.5px] text-slate-500">
                          Escolha o volume de itens para a prova do estudante.
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setNumAiQuestions(Math.max(1, numAiQuestions - 1))}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-xs text-indigo-950">
                          {numAiQuestions}
                        </span>
                        <button
                          type="button"
                          onClick={() => setNumAiQuestions(Math.min(20, numAiQuestions + 1))}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Chips rápidos de quantidade */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Rápido:</span>
                      {[5, 8, 10, 12, 15, 20].map((qtd) => (
                        <button
                          key={qtd}
                          type="button"
                          onClick={() => setNumAiQuestions(qtd)}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                            numAiQuestions === qtd
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {qtd}Q
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Tipologia de Questões (Formatos) */}
                  <div className="bg-white/90 p-3 rounded-xl border border-indigo-100 space-y-2">
                    <span className="font-black text-indigo-950 text-xs block uppercase tracking-wide">
                      Tipologia de Questões a Incluir:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.multipla_escolha}
                          onChange={() => toggleAiQuestionType('multipla_escolha')}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 block">Múltipla Escolha</span>
                          <span className="text-[10px] text-slate-500">Alternativas A, B, C, D com gabarito</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.associacao}
                          onChange={() => toggleAiQuestionType('associacao')}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 block">Associação de Colunas</span>
                          <span className="text-[10px] text-slate-500">Relacione a Coluna A com a B</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.lacunas}
                          onChange={() => toggleAiQuestionType('lacunas')}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 block">Preencher Lacunas</span>
                          <span className="text-[10px] text-slate-500">Frases com termos conceituais</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.dissertativa}
                          onChange={() => toggleAiQuestionType('dissertativa')}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 block">Dissertativas / Abertas</span>
                          <span className="text-[10px] text-slate-500">Com linhas pautadas no modelo</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 3. Textos-Base de Leitura */}
                  <div className="bg-white/90 p-3 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-black text-indigo-950 text-xs block uppercase tracking-wide">
                        Textos de Apoio / Leitura:
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Evita excesso de textos na folha de prova.
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setMaxAiTexts(0)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          maxAiTexts === 0
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Avaliação direta, formulando perguntas objetivas sem textos-base de apoio"
                      >
                        Sem Texto (Direta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaxAiTexts(1)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          maxAiTexts === 1
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        1 Texto (Padrão)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaxAiTexts(2)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          maxAiTexts === 2
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        2 Textos
                      </button>
                    </div>
                  </div>

                  {/* 4. Linha de Pontuação e Cálculo Matemático da IA */}
                  <div className="pt-2 border-t border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 p-2.5 rounded-lg border border-indigo-100">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">Valor Máximo da Avaliação:</span>
                      <span className="text-[10.5px] text-emerald-700 font-bold">
                        {numAiQuestions} questão(ões) no total • Cada questão valerá {valPerAiQuestionStr} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-500">Nota Total:</span>
                      <input
                        type="text"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        placeholder="10,0"
                        className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODO B: COMPILAR EXERCÍCIOS DAS AULAS DA SEMANA */}
              {examCompositionMode === 'plano_aulas' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                    <div>
                      <span className="font-black text-indigo-950 text-xs block uppercase tracking-wide">
                        Escopo de Aulas da Semana
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Selecione as aulas do plano que fornecerão os exercícios.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllLessons}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          selectedLessonIndices.length === aulas.length
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        Toda a Semana ({aulas.length} aulas)
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes de Seleção de Aulas */}
                  {aulas.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aulas.map((aula, idx) => {
                        const isSelected = selectedLessonIndices.includes(idx);
                        const qCount = countQuestionsInText(aula.atividades);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleLesson(idx)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-white border-indigo-400 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-800 block truncate">
                                  Aula {idx + 1}: {aula.titulo ? aula.titulo.replace(/^(?:aulas?\s+\d+[:\s-]*)/i, '') : `Aula ${idx + 1}`}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {qCount > 0 ? `${qCount} questão(ões)` : 'Sem questões'}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                                Inclusa
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Linha de Pontuação e Cálculo Matemático em Tempo Real */}
                  <div className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">Valor Máximo da Avaliação:</span>
                      <span className="text-[10.5px] text-slate-500">
                        {totalQuestions > 0 ? (
                          <span className="text-emerald-700 font-bold">
                            {totalQuestions} questão(ões) no total • Cada questão valerá {valPerQuestionStr} pts
                          </span>
                        ) : (
                          'Nenhuma questão encontrada nas aulas selecionadas.'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-500">Nota Total:</span>
                      <input
                        type="text"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        placeholder="10,0"
                        className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* SELEÇÃO DE ESCOPO OPCIONAL PARA CADERNO PADRÃO E ESTUDO DIRIGIDO */}
          {format !== 'avaliacao_formal' && aulas.length > 1 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 text-xs">Aulas a Incluir no Caderno:</span>
                <button
                  type="button"
                  onClick={selectAllLessons}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {selectedLessonIndices.length === aulas.length ? 'Todas Selecionadas' : 'Selecionar Todas'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aulas.map((aula, idx) => {
                  const isSelected = selectedLessonIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleLesson(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      Aula {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. MODO DE IMPRESSÃO / TONALIDADE */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              2. Modo de Impressão e Tonalidade
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <div
                onClick={() => setPrintMode('colorido')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  printMode === 'colorido'
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  🎨
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Padrão Institucional</div>
                  <div className="text-[11px] text-slate-500">Tons suaves de índigo e ardósia de alta elegância.</div>
                </div>
              </div>

              <div
                onClick={() => setPrintMode('economico_xerox')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  printMode === 'economico_xerox'
                    ? 'border-slate-900 bg-slate-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  📄
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Econômico (Xerox)</div>
                  <div className="text-[11px] text-slate-500">Preto e branco puro de alto contraste para fotocopiadoras.</div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. RECURSOS PEDAGÓGICOS OPCIONAIS */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              3. Recursos Didáticos Opcionais
            </label>
            <div className="space-y-2">
              
              {/* Opção Metacognição */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="pr-3">
                  <div className="font-bold text-slate-800 text-xs">Autoavaliação Metacognitiva do Aluno</div>
                  <div className="text-[11px] text-slate-500">Adiciona caixa no fim do caderno onde o estudante indica sua percepção (Fácil / Médio / Desafiador).</div>
                </div>
                <input
                  type="checkbox"
                  checked={includeSelfAssessment}
                  onChange={(e) => setIncludeSelfAssessment(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Opção Visto Familiar */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="pr-3">
                  <div className="font-bold text-slate-800 text-xs">Campo de Ciente da Família / Responsável</div>
                  <div className="text-[11px] text-slate-500">Adiciona linhas de assinatura conjunta para o professor e o responsável legal.</div>
                </div>
                <input
                  type="checkbox"
                  checked={includeFamilySignature}
                  onChange={(e) => setIncludeFamilySignature(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Opção Gabarito Docente Destacável */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="pr-3">
                  <div className="font-bold text-slate-800 text-xs">Anexar Gabarito do Docente ao Final</div>
                  <div className="text-[11px] text-slate-500">Gera uma página extra destacável com os gabaritos e critérios de socialização para o professor.</div>
                </div>
                <input
                  type="checkbox"
                  checked={includeTeacherGuide}
                  onChange={(e) => setIncludeTeacherGuide(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

            </div>
          </div>

        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="shrink-0 p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`px-5 py-2.5 rounded-xl font-black text-xs text-white transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              isExporting
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{loadingStatusText || 'Gerando PDF...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>
                  {format === 'avaliacao_formal'
                    ? (examCompositionMode === 'ia_inedita' ? 'Elaborar Prova Oficial com IA e Gerar PDF' : 'Gerar Avaliação / Prova em PDF')
                    : format === 'estudo_dirigido'
                    ? 'Gerar Estudo Dirigido em PDF'
                    : 'Gerar Caderno de Atividades em PDF'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </AnimatedModal>
  );
}
