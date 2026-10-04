import React, { useState, useEffect, useRef, useMemo } from 'react';

// Nomes dos meses e dias em português do Brasil
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Converte string 'AAAA-MM-DD' em Date local sem distorção de fuso horário
 */
const parseISODate = (str) => {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Formata ano, índice do mês e dia no padrão ISO 'AAAA-MM-DD'
 */
const formatToISO = (year, monthIndex, day) => {
  const y = String(year).padStart(4, '0');
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Formata 'AAAA-MM-DD' para exibição amigável 'DD/MM/AAAA'
 */
const formatToBR = (isoStr) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return isoStr;
};

/**
 * Componente de Calendário Popover Premium
 * Totalmente compatível com a interface de um <input type="date">
 */
export default function CustomDatePicker({
  value,
  onChange,
  name,
  id,
  placeholder = 'Selecione uma data',
  compact = false,
  align = 'left',
  disabled = false,
  className = '',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Data de referência para navegação do calendário (mês/ano em exibição)
  const initialDate = useMemo(() => {
    return parseISODate(value) || new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Sincroniza a visualização caso o valor mude externamente e o calendário esteja fechado
  useEffect(() => {
    if (!isOpen && value) {
      const parsed = parseISODate(value);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }, [value, isOpen]);

  // Hoje em formato ISO
  const todayISO = useMemo(() => {
    const now = new Date();
    return formatToISO(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Navegação de meses
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Disparo do evento compatível com input nativo (target.value) e com handlers diretos
  const handleSelectDate = (dateISO) => {
    if (disabled) return;
    if (onChange) {
      onChange({
        target: { name: name || '', value: dateISO },
        currentTarget: { name: name || '', value: dateISO },
        value: dateISO
      }, dateISO);
    }
    setIsOpen(false);
  };

  // Selecionar data de hoje
  const handleSelectToday = (e) => {
    e.stopPropagation();
    handleSelectDate(todayISO);
  };

  // Cálculo da matriz de dias para exibição na grade
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Domingo
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: dayNum,
        iso: formatToISO(prevYear, prevMonthIdx, dayNum),
        isCurrentMonth: false
      });
    }

    // Dias do mês atual
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      days.push({
        day: dayNum,
        iso: formatToISO(viewYear, viewMonth, dayNum),
        isCurrentMonth: true
      });
    }

    // Dias do mês seguinte para completar as semanas na grade (múltiplo de 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let dayNum = 1; dayNum <= remaining; dayNum++) {
        const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({
          day: dayNum,
          iso: formatToISO(nextYear, nextMonthIdx, dayNum),
          isCurrentMonth: false
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  return (
    <div className={`relative inline-block ${compact ? '' : 'w-full'}`} ref={containerRef}>
      {/* Botão Gatilho do Seletor */}
      {compact ? (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-400 text-slate-700 font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none active:scale-[0.98] ${
            isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          title="Selecionar Data"
        >
          <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-slate-700 font-bold text-xs tracking-tight">
            {formatToBR(value) || placeholder}
          </span>
          <svg className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer select-none active:scale-[0.99] ${
            isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          title="Selecionar Data"
        >
          <div className="flex items-center gap-2 truncate">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={value ? 'text-slate-800 font-bold tracking-tight' : 'text-slate-400 font-normal'}>
              {formatToBR(value) || placeholder}
            </span>
          </div>

          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Overlay com transição suave de opacidade ao clicar fora */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Popover Flutuante do Calendário com Animação Bidirecional */}
      <div
        className={`absolute ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} top-[100%] mt-2 w-72 bg-white rounded-2xl border border-slate-200/90 p-3.5 z-50 shadow-2xl transition-all duration-200 ease-out select-none ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Cabeçalho de Navegação de Mês e Ano */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Mês Anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-800 tracking-tight">
              {MONTH_NAMES[viewMonth]}
            </span>
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
              {viewYear}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Próximo Mês"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Siglas dos Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 mb-1 text-center">
          {WEEK_DAYS.map((wd, idx) => (
            <span
              key={wd}
              className={`text-[9px] font-black uppercase tracking-wider py-1 ${
                idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {wd}
            </span>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            const isSelected = value === item.iso;
            const isToday = todayISO === item.iso;

            let dayClasses = 'text-slate-700 hover:bg-slate-100 font-bold';

            if (!item.isCurrentMonth) {
              dayClasses = 'text-slate-300 hover:bg-slate-50 font-normal';
            }

            if (isToday && !isSelected) {
              dayClasses = 'border border-indigo-400 text-indigo-700 bg-indigo-50/60 font-black';
            }

            if (isSelected) {
              dayClasses = 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30 scale-105';
            }

            return (
              <button
                key={`${item.iso}-${idx}`}
                type="button"
                onClick={() => handleSelectDate(item.iso)}
                className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs transition-all cursor-pointer ${dayClasses}`}
                title={item.iso}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Rodapé com Atalho "Hoje" e Fechar */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Selecionar Hoje
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
