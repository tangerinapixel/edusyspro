import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../../assets/icons";
import { useApp } from "../../contexts/AppContext";

const Omnisearch = () => {
  const { students, computedGrades, openProfileModal, setActiveTab, navigateToDiagnosis } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // Lidar com atalho Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focar no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelectStudent = (studentId) => {
    setIsOpen(false);
    openProfileModal(studentId);
  };

  const handleSelectPage = (page) => {
    setIsOpen(false);
    setActiveTab(page);
  };

  const filteredStudents = students
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const pages = [
    { id: "dashboard", name: "Dashboard", icon: Icons.Activity },
    { id: "alunos", name: "Gestão de Alunos", icon: Icons.User },
    { id: "notas", name: "Lançar Notas", icon: Icons.FileText },
    { id: "relatorios", name: "Relatórios", icon: Icons.FileText },
  ].filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <div className="w-5 h-5 text-slate-400 mr-3 flex items-center justify-center">
            {Icons.Search}
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-lg"
            placeholder="Buscar alunos, páginas ou ações..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center space-x-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
            <span>ESC</span> para fechar
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query && filteredStudents.length === 0 && pages.length === 0 && (
            <div className="p-4 text-center text-slate-500">Nenhum resultado encontrado.</div>
          )}

          {filteredStudents.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Alunos
              </div>
              {filteredStudents.map((s) => {
                const gradeInfo = computedGrades.find(g => Number(g.student_id) === Number(s.id));
                return (
                  <button
                    key={s.id}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group"
                    onClick={() => handleSelectStudent(s.id)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-500">
                        {Icons.User}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    {gradeInfo && (
                      <div className={`px-2 py-0.5 rounded text-xs font-medium ${gradeInfo.isAlert ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        Média: {gradeInfo.mediaFinal.toFixed(1)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {pages.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Navegação
              </div>
              {pages.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left flex items-center px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group"
                  onClick={() => handleSelectPage(p.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-500">
                    {p.icon}
                  </div>
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Omnisearch;
