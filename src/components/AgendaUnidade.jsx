import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

// Retorna a próxima data útil (ignorando sábados e domingos) em formato DD/MM
const getNextWorkdayString = (lastDateStr) => {
  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.match(/(\d{1,2})\/(\d{1,2})/);
    if (!parts) return null;
    const d = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10) - 1;
    const y = new Date().getFullYear();
    return new Date(y, m, d);
  };

  let dateObj = parseDate(lastDateStr);
  if (!dateObj || isNaN(dateObj.getTime())) {
    // Se a data for inválida ou não existir, usa a data atual (hoje)
    dateObj = new Date();
  } else {
    // Se for uma data válida, avança 1 dia
    dateObj.setDate(dateObj.getDate() + 1);
  }

  // Pula finais de semana (sábado = 6, domingo = 0)
  while (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
    dateObj.setDate(dateObj.getDate() + 1);
  }

  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
};

// Adiciona dias a uma data em formato DD/MM (padrão +7 dias) e ajusta se cair em fim de semana
const addDaysToDateStr = (dateStr, days = 7) => {
  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.match(/(\d{1,2})\/(\d{1,2})/);
    if (!parts) return null;
    const d = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10) - 1;
    const y = new Date().getFullYear();
    return new Date(y, m, d);
  };

  let dateObj = parseDate(dateStr);
  if (!dateObj || isNaN(dateObj.getTime())) {
    dateObj = new Date();
  } else {
    dateObj.setDate(dateObj.getDate() + days);
  }

  // Pula finais de semana (sábado = 6, domingo = 0)
  while (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
    dateObj.setDate(dateObj.getDate() + 1);
  }

  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
};

const AgendaUnidade = ({ turmaId, turmaName, activeUnitId }) => {
  const { settings, turmas, activeTurmaId, units, showAlert, turmaUnitParams } = useApp();
  const [agendaItems, setAgendaItems] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedSemana, setSelectedSemana] = useState(null);

  // Parâmetros pedagógicos da turma selecionada na unidade (com fallback para turma base e settings globais)
  const targetTurmaId = turmaId || activeTurmaId;
  const currentTurma = turmas.find(t => t.id === targetTurmaId);
  const unitParams = (turmaUnitParams || []).find(p => p.turma_id === targetTurmaId && p.unit_id === activeUnitId);
  const maxActivities = unitParams?.max_activities ?? currentTurma?.max_activities ?? settings?.max_activities ?? 27;
  const maxActivitiesWeight = unitParams?.max_activities_weight ?? currentTurma?.max_activities_weight ?? settings?.max_activities_weight ?? 1.0;
  const valorPorLicao = maxActivities > 0 ? maxActivitiesWeight / maxActivities : 0;
  const criterioPadrao = `Visto (${valorPorLicao.toFixed(2).replace('.', ',')})`;

  // Ordena os itens para agrupar as mesmas semanas de forma contígua.
  // Preserva a ordem de ID (criação) como critério de desempate.
  const sortedItems = useMemo(() => {
    return [...agendaItems].sort((a, b) => {
      const getSemanaNum = (item) => {
        if (!item.semana || item.semana === "FECHAMENTO") return 9999;
        
        // Tenta achar o número associado diretamente à palavra "semana" (ex: "8º Ano - 1ª Semana")
        const m = item.semana.match(/(\d+)\s*[ªº°a-z]?\s*semana|semana\s*(\d+)/i);
        const numStr = m ? (m[1] || m[2]) : null;
        if (numStr) return parseInt(numStr);
        
        // Fallback: pega o primeiro número da string
        const fallback = item.semana.match(/(\d+)/);
        return fallback ? parseInt(fallback[1]) : 9999;
      };

      const numA = getSemanaNum(a);
      const numB = getSemanaNum(b);

      if (numA !== numB) {
        return numA - numB;
      }

      // Se pertencerem à mesma semana, as linhas normais aparecem primeiro.
      // A linha especial daquela semana é jogada para o final do bloco da própria semana.
      if (a.is_special_row && !b.is_special_row) return 1;
      if (!a.is_special_row && b.is_special_row) return -1;

      // Se ambas forem normais ou ambas especiais na mesma semana, ordena pela ordem de ID (criação)
      return a.id - b.id;
    });
  }, [agendaItems]);

  // Calcula o agrupamento (rowSpan) das semanas
  const semanaRowSpans = useMemo(() => {
    const spans = {};
    for (let i = 0; i < sortedItems.length; i++) {
      if (spans[i] === undefined) {
        let groupHasEditing = sortedItems[i].id === isEditing;
        let tempSpan = 1;
        
        for (let j = i + 1; j < sortedItems.length; j++) {
          if (sortedItems[i].semana === sortedItems[j].semana) {
            tempSpan++;
            if (sortedItems[j].id === isEditing) groupHasEditing = true;
          } else {
            break;
          }
        }

        if (groupHasEditing) {
          // Se alguma linha do grupo estiver sendo editada, desfaz o agrupamento
          spans[i] = 1;
          for (let j = i + 1; j < i + tempSpan; j++) {
            spans[j] = 1;
          }
        } else {
          spans[i] = tempSpan;
          for (let j = i + 1; j < i + tempSpan; j++) {
            spans[j] = 0;
          }
        }
      }
    }
    return spans;
  }, [sortedItems, isEditing]);

  // Calcula a cor de fundo alternada por bloco de semana
  const rowColors = useMemo(() => {
    const colors = [];
    let isAlternate = false;
    let lastSemana = null;

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      if (item.semana !== lastSemana) {
        if (lastSemana !== null) {
          isAlternate = !isAlternate;
        }
        lastSemana = item.semana;
      }
      if (item.is_special_row) {
        colors.push('special');
      } else {
        colors.push(isAlternate ? 'alt' : 'normal');
      }
    }
    return colors;
  }, [sortedItems]);

  useEffect(() => {
    if (turmaId) {
      loadAgenda();
    }
  }, [turmaId, activeUnitId]);

  const loadAgenda = async () => {
    if (window.electronAPI) {
      const items = await window.electronAPI.getUnitAgenda(turmaId, activeUnitId);

      // Interceptação de visualização: recalcula o valor numérico dos critérios
      // usando os parâmetros atuais da turma e os padroniza para "Visto (X,XX)".
      // Não grava nada no banco.
      const valorAtual = `(${valorPorLicao.toFixed(2).replace('.', ',')})`;
      const criterioRegex = /\([\d,.]+(\s*pts)?\)/i;

      const formattedItems = items.map(item => {
        if (!item.is_special_row && item.criterio && criterioRegex.test(item.criterio)) {
          let novoCriterio = item.criterio.replace(criterioRegex, valorAtual);
          // Substitui padrões legados como "Visto no caderno" por "Visto"
          novoCriterio = novoCriterio.replace(/Visto no caderno/i, "Visto");
          return {
            ...item,
            criterio: novoCriterio
          };
        }
        return item;
      });

      setAgendaItems(formattedItems);
    }
  };

  const handleExportPDF = async () => {
    if (!window.electronAPI) return;
    try {
      const unitName = units.find(u => u.id === activeUnitId)?.name || 'Unidade';
      const res = await window.electronAPI.exportUnitAgendaPDF({
        turmaName,
        unitName,
        agendaItems: sortedItems
      });
      if (res.success) {
        showAlert("Sucesso!", `Agenda de ${turmaName} exportada em PDF.`, "success");
      } else if (!res.cancelled) {
        showAlert("Erro na Exportação", res.error || "Erro ao gerar PDF.", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Erro Crítico", "Falha ao exportar a agenda em PDF.", "error");
    }
  };

  const handleAddRow = async (type = 'nova_semana') => {
    if (!window.electronAPI) return;

    let nextSemanaNum = agendaItems.length > 0 ? agendaItems.length + 1 : 1;
    let nextSemanaString = "";
    let nextAtividade = "Lição";
    let nextCriterio = criterioPadrao;
    let lastDateStr = "";

    const isSpecialRow = type === 'especial';

    if (type === 'nova_semana') {
      setSelectedSemana(null); // Limpa seleção ao criar nova semana
    }

    // Se houver uma semana selecionada e a ação for criar lição ou linha especial
    if (selectedSemana && (type === 'nova_licao' || type === 'especial')) {
      const lessonsInWeek = agendaItems.filter(a => a.semana === selectedSemana);
      if (lessonsInWeek.length > 0) {
        const sortedLessons = [...lessonsInWeek].sort((a, b) => b.id - a.id);
        lastDateStr = sortedLessons[0].referencia || "";
      }
      
      nextSemanaString = selectedSemana;

      if (type === 'nova_licao') {
        const lastNumberedInWeek = [...lessonsInWeek]
          .reverse()
          .find(a => !a.is_special_row && /lição\s*0*(\d+)/i.test(a.atividade));

        if (lastNumberedInWeek) {
          const ativMatch = lastNumberedInWeek.atividade.match(/Lição\s*0*(\d+)/i);
          const num = parseInt(ativMatch[1]) + 1;
          nextAtividade = `Lição ${num < 10 ? '0' + num : num}`;
        } else {
          // Fallback global de numeração
          const lastNumberedGlobal = [...agendaItems]
            .reverse()
            .find(a => !a.is_special_row && /lição\s*0*(\d+)/i.test(a.atividade));
          if (lastNumberedGlobal) {
            const ativMatch = lastNumberedGlobal.atividade.match(/Lição\s*0*(\d+)/i);
            const num = parseInt(ativMatch[1]) + 1;
            nextAtividade = `Lição ${num < 10 ? '0' + num : num}`;
          } else {
            nextAtividade = "Lição 01";
          }
        }
        nextCriterio = criterioPadrao;
      } else {
        // Linha especial vinculada à semana selecionada
        nextAtividade = "-";
        nextCriterio = "REVISÃO";
      }
    } else {
      // Comportamento padrão cronológico (sem semana selecionada)
      if (agendaItems.length > 0) {
        // Procurar o último item não especial para seguir a sequência
        const lastNormal = [...agendaItems].reverse().find(a => !a.is_special_row) || agendaItems[agendaItems.length - 1];

        if (isSpecialRow) {
          // Linha especial no fluxo cronológico: vincula-se à semana atual da última lição
          nextSemanaString = (lastNormal && lastNormal.semana) || '1ª Semana';
          nextAtividade = "-";
          nextCriterio = "REVISÃO";
          lastDateStr = (lastNormal && lastNormal.referencia) || "";
        } else {
          // --- LÓGICA DE SEMANA ---
          if (type === 'nova_semana') {
            let maxSemanaNum = 0;
            agendaItems.forEach(a => {
              if (!a.is_special_row) {
                const m = a.semana.match(/(\d+)/);
                if (m) {
                  const n = parseInt(m[1]);
                  if (n > maxSemanaNum) maxSemanaNum = n;
                }
              }
            });
            nextSemanaNum = maxSemanaNum + 1;
            nextSemanaString = `${nextSemanaNum}ª Semana`;
          } else if (type === 'nova_licao') {
            // Mantém a mesma semana da última lição
            nextSemanaString = (lastNormal && lastNormal.semana) || '1ª Semana';
          }

          // --- LÓGICA DE ATIVIDADE ---
          const lastNumberedLesson = [...agendaItems]
            .reverse()
            .find(a => !a.is_special_row && /lição\s*0*(\d+)/i.test(a.atividade));

          if (lastNumberedLesson) {
            const ativMatch = lastNumberedLesson.atividade.match(/Lição\s*0*(\d+)/i);
            const num = parseInt(ativMatch[1]) + 1;
            nextAtividade = `Lição ${num < 10 ? '0' + num : num}`;
          } else if (lastNormal && lastNormal.atividade && lastNormal.atividade.trim().toLowerCase() === 'lição') {
            nextAtividade = 'Lição 02';
          } else {
            nextAtividade = 'Lição 01';
          }

          // Copia o critério da última aula para manter padrão
          nextCriterio = (lastNormal && lastNormal.criterio) || nextCriterio;
          lastDateStr = (lastNormal && lastNormal.referencia) || "";
        }
      } else {
        nextSemanaString = '1ª Semana';
        if (isSpecialRow) {
          nextAtividade = "-";
          nextCriterio = "REVISÃO";
        }
      }
    }

    const nextDateStr = getNextWorkdayString(lastDateStr);

    const newItem = {
      semana: nextSemanaString || '1ª Semana',
      referencia: nextDateStr,
      atividade: isSpecialRow ? "-" : nextAtividade,
      criterio: isSpecialRow ? "REVISÃO" : nextCriterio,
      is_corrected: false,
      is_special_row: isSpecialRow,
      unit_id: activeUnitId
    };

    await window.electronAPI.addUnitAgendaItem(turmaId, newItem);
    setSelectedSemana(null); // Limpa seleção após concluir
    loadAgenda();
  };

  // Duplica uma semana completa recalculando datas (+7 dias) e mantendo sequência de lições
  const handleDuplicateSemana = async (semanaTarget) => {
    if (!window.electronAPI) return;

    const targetSemana = semanaTarget || selectedSemana || (sortedItems.length > 0 ? sortedItems[sortedItems.length - 1].semana : null);
    if (!targetSemana) {
      showAlert("Aviso", "Nenhuma semana selecionada para duplicação.", "warning");
      return;
    }

    const itemsInWeek = sortedItems.filter(item => item.semana === targetSemana);
    if (itemsInWeek.length === 0) {
      showAlert("Aviso", `Não foram encontrados itens na semana "${targetSemana}".`, "warning");
      return;
    }

    // Calcula o próximo número de semana
    let maxSemanaNum = 0;
    agendaItems.forEach(a => {
      if (a.semana) {
        const m = a.semana.match(/(\d+)\s*[ªº°a-z]?\s*semana|semana\s*(\d+)/i) || a.semana.match(/(\d+)/);
        if (m) {
          const n = parseInt(m[1] || m[2], 10);
          if (n > maxSemanaNum) maxSemanaNum = n;
        }
      }
    });
    const nextSemanaString = `${maxSemanaNum + 1}ª Semana`;

    // Localiza a maior numeração de lição existente na agenda
    let currentMaxLesson = 0;
    agendaItems.forEach(a => {
      if (!a.is_special_row && a.atividade) {
        const m = a.atividade.match(/lição\s*0*(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > currentMaxLesson) currentMaxLesson = num;
        }
      }
    });

    try {
      for (const item of itemsInWeek) {
        let nextAtividade = item.atividade;
        let nextCriterio = item.criterio || criterioPadrao;
        const isSpecial = item.is_special_row || item.atividade === '-' || /revisão/i.test(item.criterio);

        if (!isSpecial) {
          currentMaxLesson += 1;
          const numFormatted = currentMaxLesson < 10 ? `0${currentMaxLesson}` : `${currentMaxLesson}`;
          nextAtividade = `Lição ${numFormatted}`;
        }

        const nextDateStr = addDaysToDateStr(item.referencia, 7);

        const newItem = {
          semana: nextSemanaString,
          referencia: nextDateStr,
          atividade: isSpecial ? "-" : nextAtividade,
          criterio: isSpecial ? (item.criterio || "REVISÃO") : nextCriterio,
          is_corrected: false,
          is_special_row: isSpecial,
          unit_id: activeUnitId
        };

        await window.electronAPI.addUnitAgendaItem(turmaId, newItem);
      }

      showAlert("Sucesso!", `${targetSemana} duplicada com sucesso para ${nextSemanaString} com datas dinâmicas.`, "success");
      setSelectedSemana(nextSemanaString);
      await loadAgenda();
    } catch (error) {
      console.error("Erro ao duplicar semana:", error);
      showAlert("Erro", "Falha ao duplicar a semana.", "error");
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteUnitAgendaItem(id);
    loadAgenda();
  };

  const startEditing = (item) => {
    setIsEditing(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateUnitAgendaItem(isEditing, editForm);
    setIsEditing(null);
    loadAgenda();
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
  };

  const toggleCorrection = async (id) => {
    if (!window.electronAPI) return;
    await window.electronAPI.toggleAgendaCorrection(id);
    loadAgenda();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300 flex flex-col flex-1 min-h-0">
      {/* Header Slim Integrado */}
      <div className="px-5 py-2.5 border-b border-slate-100/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Agenda da Unidade • {turmaName}
              </h3>
              {selectedSemana && (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                  Foco: {selectedSemana}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Planejamento pedagógico semanal, controle de tarefas e vistos
            </p>
          </div>
        </div>

        {/* Barra de Ações Executiva */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAddRow('nova_semana')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            title="Criar nova semana de aulas"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
            <span>Nova Semana</span>
          </button>
          
          <button
            onClick={() => handleAddRow('nova_licao')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer hover:border-slate-300"
            title={selectedSemana ? `Adicionar lição na ${selectedSemana}` : "Adicionar lição na última semana"}
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>+ Lição</span>
          </button>
          
          <button
            onClick={() => handleAddRow('especial')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer hover:border-slate-300"
            title={selectedSemana ? `Adicionar revisão na ${selectedSemana}` : "Adicionar linha de revisão na semana atual"}
          >
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>Linha Especial</span>
          </button>

          <button
            onClick={() => handleDuplicateSemana(selectedSemana)}
            disabled={sortedItems.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedSemana ? `Duplicar estrutura da ${selectedSemana} para a próxima semana com datas dinâmicas` : "Duplicar última semana com datas dinâmicas"}
          >
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Duplicar Semana</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer hover:border-slate-300"
            title="Exportar agenda em PDF"
          >
            <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Tabela de Planejamento */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-3.5 py-2 w-32 border-r border-b border-slate-200/80">Semana</th>
                <th className="px-3.5 py-2 w-28 border-r border-b border-slate-200/80">Data</th>
                <th className="px-3.5 py-2 border-r border-b border-slate-200/80">Atividade</th>
                <th className="px-3.5 py-2 border-r border-b border-slate-200/80">Critério de Avaliação</th>
                <th className="px-3.5 py-2 w-24 text-center border-r border-b border-slate-200/80">Visto</th>
                <th className="px-3.5 py-2 w-24 text-center border-b border-slate-200/80">Ações</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {sortedItems.map((item, idx) => {
                const isSpecial = item.is_special_row;
                const editing = isEditing === item.id;
                const rowSpan = semanaRowSpans[idx];
                const isFirstRowOfWeek = idx === 0 || sortedItems[idx].semana !== sortedItems[idx - 1].semana;
                const isNewWeekBlock = isFirstRowOfWeek && idx > 0;
                
                // Define o estilo de fundo com base no agrupamento de semana (Light Theme)
                const bgClass = isSpecial 
                  ? 'bg-amber-50/50 hover:bg-amber-50/80' 
                  : rowColors[idx] === 'alt' 
                    ? 'bg-slate-50/40 hover:bg-slate-100/60' 
                    : 'bg-white hover:bg-slate-50/80';
                
                // Linha divisória superior: linha reforçada (border-t-2) ao iniciar um novo bloco de semana
                const cellBorderTop = isNewWeekBlock ? 'border-t-2 border-t-slate-300' : (idx > 0 ? 'border-t border-slate-100' : '');

                return (
                  <tr 
                    key={item.id} 
                    className={`transition-colors ${bgClass}`}
                  >
                    {/* SEMANA (Agrupada) */}
                    {rowSpan > 0 && (() => {
                      const isSelected = selectedSemana === item.semana;
                      const cellCursor = (!isSpecial && !editing) ? 'cursor-pointer' : '';

                      return (
                        <td 
                          rowSpan={rowSpan}
                          onClick={() => !isSpecial && !editing && setSelectedSemana(prev => prev === item.semana ? null : item.semana)}
                          className={`px-3 py-2 border-r border-slate-200/90 align-middle transition-all duration-200 ${cellCursor} ${
                            isNewWeekBlock ? 'border-t-2 border-t-slate-300' : (idx > 0 ? 'border-t border-slate-100' : '')
                          } border-b border-b-slate-200/80 ${
                            isSelected 
                              ? 'bg-indigo-50/90 text-indigo-700 border-l-4 border-l-indigo-600' 
                              : isSpecial 
                                ? 'bg-amber-50/60 text-amber-800 border-l-4 border-l-amber-500' 
                                : 'bg-slate-50/80 text-slate-700 border-l-4 border-l-indigo-400 hover:bg-slate-100/70'
                          }`}
                          title={(!isSpecial && !editing) ? "Clique para selecionar esta semana para novas ações" : undefined}
                        >
                          {editing ? (
                            <input
                              type="text"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              value={editForm.semana}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setEditForm({...editForm, semana: e.target.value})}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-tight shadow-2xs transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : isSpecial 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                              }`}>
                                {item.semana}
                              </span>
                              {isSelected ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                    Ativa
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateSemana(item.semana);
                                    }}
                                    className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-full font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                                    title={`Duplicar toda a estrutura da ${item.semana} com datas da próxima semana`}
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    <span>Duplicar</span>
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </td>
                      );
                    })()}

                    {/* DATA */}
                    <td className={`px-3.5 py-2 border-r border-slate-100 border-b border-slate-100 text-xs font-semibold text-slate-600 ${cellBorderTop}`}>
                      {editing ? (
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="DD/MM"
                          value={editForm.referencia}
                          onChange={e => setEditForm({...editForm, referencia: e.target.value})}
                        />
                      ) : (
                        <span>{item.referencia || "—"}</span>
                      )}
                    </td>

                    {/* ATIVIDADE */}
                    <td className={`px-3.5 py-2 border-r border-slate-100 border-b border-slate-100 text-xs ${cellBorderTop} ${isSpecial ? 'text-amber-800 font-bold' : 'font-semibold text-slate-800'}`}>
                      {editing ? (
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          value={editForm.atividade}
                          onChange={e => setEditForm({...editForm, atividade: e.target.value})}
                        />
                      ) : (
                        isSpecial && (!item.atividade || item.atividade === '-') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100/80 text-amber-800 border border-amber-200/80">
                            Revisão Semanal
                          </span>
                        ) : (
                          item.atividade
                        )
                      )}
                    </td>

                    {/* CRITÉRIO */}
                    <td className={`px-3.5 py-2 border-r border-slate-100 border-b border-slate-100 text-xs ${cellBorderTop} ${isSpecial ? 'font-bold text-amber-800' : 'text-slate-600 font-medium'}`}>
                      {editing ? (
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          value={editForm.criterio}
                          onChange={e => setEditForm({...editForm, criterio: e.target.value})}
                        />
                      ) : (
                        item.criterio
                      )}
                    </td>

                    {/* CORREÇÃO / VISTO */}
                    <td className={`px-3.5 py-2 border-r border-slate-100 border-b border-slate-100 text-center ${cellBorderTop}`}>
                      <button 
                        onClick={() => toggleCorrection(item.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          item.is_corrected 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs hover:bg-emerald-700' 
                            : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'
                        }`}
                        title={item.is_corrected ? "Lição com visto atribuído" : "Clique para marcar visto"}
                      >
                        {item.is_corrected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>

                    {/* AÇÕES */}
                    <td className={`px-3.5 py-2 border-b border-slate-100 text-center ${cellBorderTop}`}>
                      {editing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="Salvar alterações"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar edição"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {agendaItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-3 border border-indigo-100/80">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">Nenhum cronograma cadastrado</h4>
                      <p className="text-xs text-slate-400 font-medium mb-4">
                        Inicie o planejamento pedagógico desta unidade criando a primeira semana de aulas.
                      </p>
                      <button
                        onClick={() => handleAddRow('nova_semana')}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                        <span>Começar Planejamento</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    );
};

export default AgendaUnidade;
