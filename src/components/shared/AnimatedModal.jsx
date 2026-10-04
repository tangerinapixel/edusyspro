import React, { useEffect, useState } from 'react';

const AnimatedModal = ({ isOpen, onClose, children, maxWidth = 'max-w-lg', zIndex = 'z-50' }) => {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  // Sincroniza a montagem e dispara a visibilidade para criar a animação de entrada
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Double requestAnimationFrame garante que o browser pinte o DOM inicial antes de aplicar a classe que engatilha a transição
      let raf1, raf2;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    } else {
      // Dispara a animação de saída imediatamente
      setVisible(false);
    }
  }, [isOpen]);

  // Acessibilidade: permite fechar qualquer modal pressionando a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Remove do DOM apenas após a animação de saída terminar
  const handleTransitionEnd = (e) => {
    // Evita que eventos de transição de elementos filhos (ex: botões) disparem a desmontagem
    if (e.target === e.currentTarget && !isOpen) {
      setMounted(false);
    } else if (!isOpen) {
      // Fallback
      setTimeout(() => setMounted(false), 200);
    }
  };

  // Se não estiver aberto e a animação já acabou, desmonte para não pesar na memória
  if (!mounted) return null;

  return (
    <div 
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Overlay Escuro com Desfoque */}
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Container Principal do Modal com Efeito Turma Ativa */}
      <div 
        className={`relative bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] shadow-2xl border border-slate-100/50 flex flex-col overflow-hidden transition-all duration-200 ease-out origin-center ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
      >
        {children}
      </div>
    </div>
  );
};

export default AnimatedModal;
