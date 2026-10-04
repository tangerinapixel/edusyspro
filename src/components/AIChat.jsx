import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { useApp } from "../contexts/AppContext";

const Icons = {
  Brain: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Send: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Close: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Sparkles: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
  ),
  Edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Cancel: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Copy: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  )
};

export default function AIChat() {
  const { activeTurmaId, activeUnitId } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Escuta evento global de abertura vindo do Header ou atalhos
  useEffect(() => {
    const handleToggleMentor = () => {
      setIsOpen(prev => {
        const nextState = !prev;
        if (nextState) setIsDocked(false);
        return nextState;
      });
    };
    window.addEventListener("toggle-ai-mentor", handleToggleMentor);
    return () => window.removeEventListener("toggle-ai-mentor", handleToggleMentor);
  }, []);
  const getStorageKey = () => `ai_chat_history_${activeTurmaId || 'all'}_${activeUnitId || 1}`;
  const [messages, setMessages] = useState(() => {
    const key = `ai_chat_history_${activeTurmaId || 'all'}_${activeUnitId || 1}`;
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Olá, aqui é o Edu! Sou o seu Mentor Pedagógico. Como posso auxiliar o professor hoje?' }
    ];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editInput, setEditInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Limpeza de timer de micro-buffer ao desmontar o componente
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
      }
    };
  }, []);

  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Auto-focus no campo de edição quando abrir
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingIndex]);


  // Auto-resize do textarea de entrada (estilo WhatsApp)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const newHeight = Math.min(inputRef.current.scrollHeight, 140);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Auto-focus input when chat opens or AI finishes typing
  useEffect(() => {
    if (isOpen && !isTyping && inputRef.current) {
      // Pequeno delay para garantir que o elemento está habilitado no DOM
      const timeoutId = setTimeout(() => {
        inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isTyping]);

  // Recarrega o histórico isolado ao alternar de turma ou unidade
  useEffect(() => {
    const key = getStorageKey();
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([{ role: 'assistant', content: 'Olá, aqui é o Edu! Sou o seu Mentor Pedagógico. Como posso auxiliar o professor hoje?' }]);
      }
    } else {
      setMessages([{ role: 'assistant', content: 'Olá, aqui é o Edu! Sou o seu Mentor Pedagógico. Como posso auxiliar o professor hoje?' }]);
    }
  }, [activeTurmaId, activeUnitId]);

  // Persistência diferida: grava em sessionStorage apenas fora do streaming para evitar bloqueio da thread principal
  useEffect(() => {
    if (!isTyping) {
      sessionStorage.setItem(getStorageKey(), JSON.stringify(messages));
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeTurmaId, activeUnitId]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const currentInput = input;
    const userMessage = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setInput("");
    setIsTyping(true);

    let accumulated = "";
    let pendingFlush = false;

    const flushChunk = () => {
      if (!pendingFlush) return;
      pendingFlush = false;
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: accumulated
          };
        }
        return updated;
      });
    };

    try {
      if (window.electronAPI && window.electronAPI.askAIChatStream) {
        const response = await window.electronAPI.askAIChatStream(
          { message: currentInput, history: messages, turmaId: activeTurmaId, unitId: activeUnitId },
          (chunk) => {
            accumulated += chunk;
            if (!pendingFlush) {
              pendingFlush = true;
              if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
              streamTimerRef.current = setTimeout(flushChunk, 60);
            }
          }
        );

        if (streamTimerRef.current) {
          clearTimeout(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        flushChunk();

        if (response.success && response.text) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { role: 'assistant', content: response.text };
            }
            return updated;
          });
        } else if (!response.success) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { role: 'assistant', content: response.error };
            }
            return updated;
          });
        }
      } else {
        const response = await window.electronAPI.askAIChat({
          message: currentInput,
          history: messages,
          turmaId: activeTurmaId,
          unitId: activeUnitId
        });
        const content = response.success ? response.text : response.error;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content };
          return updated;
        });
      }
    } catch (err) {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = { role: 'assistant', content: "Erro crítico ao conectar com a IA." };
        }
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !editInput.trim() || isTyping) return;
    
    const idx = editingIndex;
    const currentEditInput = editInput;
    
    const baseHistory = messages.slice(0, idx);
    const newMessages = [...baseHistory, { role: 'user', content: currentEditInput }, { role: 'assistant', content: '' }];
    
    setMessages(newMessages);
    setEditingIndex(null);
    setIsTyping(true);

    let accumulated = "";
    let pendingFlush = false;

    const flushChunk = () => {
      if (!pendingFlush) return;
      pendingFlush = false;
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: accumulated
          };
        }
        return updated;
      });
    };

    try {
      if (window.electronAPI && window.electronAPI.askAIChatStream) {
        const response = await window.electronAPI.askAIChatStream(
          { message: currentEditInput, history: baseHistory, turmaId: activeTurmaId, unitId: activeUnitId },
          (chunk) => {
            accumulated += chunk;
            if (!pendingFlush) {
              pendingFlush = true;
              if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
              streamTimerRef.current = setTimeout(flushChunk, 60);
            }
          }
        );

        if (streamTimerRef.current) {
          clearTimeout(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        flushChunk();

        if (response.success && response.text) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { role: 'assistant', content: response.text };
            }
            return updated;
          });
        }
      } else {
        const response = await window.electronAPI.askAIChat({
          message: currentEditInput,
          history: baseHistory,
          turmaId: activeTurmaId,
          unitId: activeUnitId
        });
        const content = response.success ? response.text : response.error;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content };
          return updated;
        });
      }
    } catch (err) {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = { role: 'assistant', content: "Erro ao atualizar contexto com a IA." };
        }
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditInput("");
  };

  const clearChat = () => {
    const initialMessage = { role: 'assistant', content: 'Histórico limpo. Como posso ajudar agora?' };
    setMessages([initialMessage]);
    sessionStorage.removeItem(getStorageKey());
    setInput("");
    setIsTyping(false);
    setShowConfirmClear(false);
  };

  if (isDocked && !isOpen) {
    return (
      <div className="fixed bottom-6 right-0 z-[1000] flex items-center animate-in slide-in-from-right-3 duration-300">
        <button
          onClick={() => {
            setIsDocked(false);
            setIsOpen(true);
          }}
          className="pl-3 pr-2 py-2.5 bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-l-2xl shadow-xl hover:translate-x-0 translate-x-1 transition-all flex items-center gap-2 cursor-pointer border border-r-0 border-indigo-400/30 group"
          title="Abrir Mentor Pedagógico IA (Expandir)"
        >
          <div className="w-4 h-4 text-white group-hover:scale-110 transition-transform">
            {Icons.Brain}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Mentor IA</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
      {/* Botão Flutuante (FAB) */}
      <div className="flex items-center gap-2 group/fab">
        {/* Botão de Docking sutil no hover */}
        {!isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDocked(true);
            }}
            className="w-7 h-7 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60 shadow-md opacity-0 group-hover/fab:opacity-100 transition-all flex items-center justify-center cursor-pointer text-xs"
            title="Recolher para a borda lateral"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 group cursor-pointer relative ${
            isOpen
              ? 'bg-slate-800 rotate-90 text-white shadow-slate-900/30'
              : 'bg-gradient-to-tr from-indigo-600 to-blue-500 hover:scale-105 active:scale-95 text-white shadow-indigo-600/25'
          }`}
          title={isOpen ? "Fechar Mentor" : "Abrir Mentor Pedagógico IA"}
        >
          <div className="text-white group-hover:scale-110 transition-transform">
            {isOpen ? Icons.Close : Icons.Brain}
          </div>
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
          )}
        </button>
      </div>

      {/* Janela de Chat */}
      <div className={`absolute bottom-16 right-0 w-[420px] h-[620px] bg-white rounded-2xl shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col transition-all duration-300 ease-out origin-bottom-right ${
        isOpen
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-90 translate-y-6 pointer-events-none'
      }`}>

        {/* Header */}
        <div className="p-4 px-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
              {Icons.Brain}
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight tracking-tight">Mentor Pedagógico</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Sincronizado</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsDocked(true);
              }}
              className="p-2 bg-white/5 hover:bg-white/15 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400 cursor-pointer"
              title="Recolher para a lateral"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowConfirmClear(true)}
              className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl transition-all active:scale-90 text-slate-400 cursor-pointer"
              title="Novo Chat (Limpar)"
            >
              {Icons.Trash}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white/5 hover:bg-white/15 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400 cursor-pointer"
              title="Fechar Janela"
            >
              {Icons.Close}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar scroll-smooth bg-slate-50/20"
        >
          {messages.map((m, i) => {
            // Oculta completamente bolhas de mensagem do assistente que ainda estejam vazias (enquanto a IA está pensando)
            if (m.role === 'assistant' && (!m.content || m.content.trim() === '')) {
              return null;
            }

            return (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}>
                <div className={`flex items-center gap-3 mb-2 px-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-800 text-white'}`}>
                    {m.role === 'user' ? 'ME' : 'AI'}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {m.role === 'user' ? 'Você' : 'Mentor Pedagógico'}
                  </span>
                </div>

                <div className={`relative group max-w-[92%] p-3.5 rounded-2xl shadow-sm transition-all ${m.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 text-white rounded-tr-none shadow-xl shadow-indigo-200 ring-1 ring-white/20'
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-md shadow-slate-200/50'
                  }`}>
                  
                  {/* Botão de Editar flutuante para o professor */}
                  {m.role === 'user' && editingIndex !== i && (
                    <button
                      onClick={() => {
                        setEditingIndex(i);
                        setEditInput(m.content);
                      }}
                      className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white hover:scale-110 active:scale-90"
                      title="Editar mensagem"
                    >
                      {Icons.Edit}
                    </button>
                  )}

                  <div>
                    {editingIndex === i ? (
                      <div className="flex flex-col gap-3 min-w-[240px]">
                        <textarea
                          ref={editInputRef}
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-2xl p-3 text-white text-sm focus:outline-none focus:bg-white/20 transition-all resize-none font-semibold leading-relaxed"
                          rows={Math.max(2, editInput.split('\n').length)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            {Icons.Cancel} Cancelar
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg"
                          >
                            {Icons.Check} Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'prose-invert !text-white' : 'prose-slate'} font-medium`}>
                          <ReactMarkdown components={{
                            p: ({ children }) => <p className={`leading-relaxed mb-0 ${m.role === 'user' ? '!text-white' : ''}`}>{children}</p>,
                            li: ({ children }) => <li className={`text-sm ${m.role === 'user' ? '!text-white' : ''}`}>{children}</li>,
                            strong: ({ children }) => <strong className={`font-black underline decoration-2 underline-offset-2 ${m.role === 'user' ? 'decoration-white/40 !text-white' : 'decoration-indigo-300/40'}`}>{children}</strong>
                          }}>
                            {m.content}
                          </ReactMarkdown>
                        </div>

                        {m.role === 'assistant' && m.content && m.content.trim().length > 0 && (!isTyping || i < messages.length - 1) && (
                          <div className="flex items-center justify-start mt-2.5 pt-2 border-t border-slate-100/60 shrink-0 animate-in fade-in duration-200">
                            <button
                              type="button"
                              onClick={() => handleCopyText(m.content, i)}
                              className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider ${
                                copiedIndex === i
                                  ? 'text-emerald-600 bg-emerald-50 border border-emerald-200/60'
                                  : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <span className="shrink-0 flex items-center">{copiedIndex === i ? Icons.Check : Icons.Copy}</span>
                              <span>{copiedIndex === i ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {m.role === 'user' && editingIndex !== i && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (!messages.length || !messages[messages.length - 1]?.content) && (
            <div className="flex flex-col items-start animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-2 px-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-[8px] font-black animate-pulse border border-indigo-100">AI</div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500 animate-pulse">Pensando...</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-indigo-50 shadow-md shadow-indigo-100/50 flex gap-1.5 px-5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area (Estilo WhatsApp) */}
        <div className="p-4 bg-white border-t border-slate-100 relative z-10">
          <form
            onSubmit={handleSend}
            className="relative flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={isTyping ? "Sincronizando contextos..." : "Fale com seu mentor pedagógico..."}
              disabled={isTyping}
              className="flex-1 min-h-[46px] max-h-[140px] py-3 pl-5 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50 resize-none leading-relaxed overflow-y-auto no-scrollbar"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-90 shrink-0 group mb-0.5"
              title="Enviar mensagem (Enter / Shift+Enter para quebra de linha)"
            >
              <div className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300">
                {Icons.Send}
              </div>
            </button>
          </form>
        </div>

        <div className="px-6 py-3 bg-white border-t border-slate-50 text-center">
          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            {Icons.Sparkles} EduSys Intelligence Framework v5.1.0
          </p>
        </div>

        {/* Premium Confirmation Overlay */}
        {showConfirmClear && (
          <div className="absolute inset-0 z-[101] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full shadow-2xl scale-in-95 duration-200 text-center border border-slate-100">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-100">
                {Icons.Trash}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">Limpar Conversa?</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Isso removerá todo o histórico atual e permitirá começar um novo diálogo do zero.
              </p>
              <div className="flex flex-col space-y-2.5 w-full">
                <button
                  onClick={clearChat}
                  className="w-full py-3 bg-rose-600 text-white rounded-xl font-black shadow-lg shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Sim, Limpar Tudo
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all outline-none text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
