/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react';

/**
 * Seletor Dropdown Premium com Menu Popover Flutuante
 * Padrão visual de alta fidelidade para o ecossistema institucional.
 */
export default function CoordinatorFilterDropdown({
  categoryLabel,
  icon,
  color = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'purple'
  value,
  onChange,
  options = [],
  placeholder = 'Selecionar...',
  widthClass = 'w-64',
  align = 'left',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha o dropdown caso o usuário pressione ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const currentLabel = selectedOption?.label || placeholder;

  // Esquema de cores refinadas
  const theme = {
    indigo: {
      dotActive: 'bg-indigo-600',
      dotInactive: 'bg-slate-300',
      hoverBorder: 'hover:border-indigo-300',
      activeItem: 'bg-indigo-50 text-indigo-700 shadow-2xs',
      checkColor: 'text-indigo-600',
      headerDot: 'bg-indigo-500'
    },
    emerald: {
      dotActive: 'bg-emerald-500',
      dotInactive: 'bg-slate-300',
      hoverBorder: 'hover:border-emerald-300',
      activeItem: 'bg-emerald-50 text-emerald-800 shadow-2xs',
      checkColor: 'text-emerald-600',
      headerDot: 'bg-emerald-500'
    },
    amber: {
      dotActive: 'bg-amber-500',
      dotInactive: 'bg-slate-300',
      hoverBorder: 'hover:border-amber-300',
      activeItem: 'bg-amber-50 text-amber-800 shadow-2xs',
      checkColor: 'text-amber-600',
      headerDot: 'bg-amber-500'
    },
    purple: {
      dotActive: 'bg-purple-600',
      dotInactive: 'bg-slate-300',
      hoverBorder: 'hover:border-purple-300',
      activeItem: 'bg-purple-50 text-purple-800 shadow-2xs',
      checkColor: 'text-purple-600',
      headerDot: 'bg-purple-500'
    }
  }[color] || {
    dotActive: 'bg-indigo-600',
    dotInactive: 'bg-slate-300',
    hoverBorder: 'hover:border-indigo-300',
    activeItem: 'bg-indigo-50 text-indigo-700 shadow-2xs',
    checkColor: 'text-indigo-600',
    headerDot: 'bg-indigo-500'
  };

  const handleSelect = (val) => {
    if (disabled) return;
    if (typeof onChange === 'function') {
      onChange(val);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative select-none" ref={containerRef}>
      {/* Botão Gatilho Premium */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 ${theme.hoverBorder} rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
        title={`Filtrar por ${categoryLabel || 'categoria'}`}
      >
        {icon && (
          <span className="shrink-0 flex items-center justify-center">
            {icon}
          </span>
        )}

        {categoryLabel && (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">
            {categoryLabel}
          </span>
        )}

        <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dotActive}`} />

        <span className="text-slate-800 font-extrabold max-w-[130px] md:max-w-[170px] truncate text-left">
          {currentLabel}
        </span>

        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu Popover Flutuante */}
      {isOpen && (
        <>
          {/* Overlay invisível para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 ${widthClass} bg-white rounded-2xl border border-slate-200/90 p-1.5 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-0.5`}
          >
            {/* Cabeçalho do Popover */}
            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${theme.headerDot}`} />
                <span>{categoryLabel ? `Filtrar por ${categoryLabel}` : 'Selecione uma opção'}</span>
              </div>
              <span className="text-slate-400 font-bold">{options.length}</span>
            </div>

            {/* Lista Scrollável de Opções */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 no-scrollbar py-0.5">
              {options.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value ?? idx}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? theme.activeItem
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? theme.dotActive : theme.dotInactive
                        }`}
                      />
                      <div className="truncate">
                        <span className="truncate block">{opt.label}</span>
                        {opt.subtitle && (
                          <span className="text-[10px] text-slate-400 font-normal truncate block">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <svg
                        className={`w-4 h-4 shrink-0 ${theme.checkColor}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
