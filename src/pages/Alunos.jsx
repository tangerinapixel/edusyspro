import React, { useState, useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";

const Alunos = () => {
  const { 
    students, 
    computedGrades,
    turmas,
    activeTurmaId,
    openProfileModal, 
    navigateToDiagnosis,
    setIsModalOpen,
    setBulkModalOpen,
    setStudentToDelete,
    setDeleteModalOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");

  const activeTurma = useMemo(() => {
    return (turmas || []).find((t) => t.id === activeTurmaId);
  }, [turmas, activeTurmaId]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students || [];
    const term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (students || []).filter((s) => {
      const name = (s.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return name.includes(term);
    });
  }, [students, searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300 flex flex-col flex-1 min-h-0">
      {/* Cabeçalho da Aba */}
      <div className="px-5 py-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Estudantes</h3>
          <span className="px-2.5 py-0.5 bg-slate-200/60 text-slate-600 rounded-lg text-xs font-bold">
            {students.length} {students.length === 1 ? "aluno" : "alunos"}
          </span>
          {activeTurma && (
            <span className="hidden md:inline-flex px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/60 rounded-lg text-xs font-bold">
              {activeTurma.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Campo de Busca Rápida */}
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno..."
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-44 md:w-52 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 text-sm font-bold p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                &times;
              </button>
            )}
          </div>

          <button 
            onClick={() => setBulkModalOpen(true)} 
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors outline-none cursor-pointer flex items-center gap-1.5"
          >
            <span>Importar Lista</span>
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors outline-none cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <span>+ Add Aluno</span>
          </button>
        </div>
      </div>

      {/* Tabela de Estudantes Slim de Alta Densidade */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-4">
        {filteredStudents.length > 0 ? (
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-white sticky top-0 z-10 shadow-xs">
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="w-12 px-3 py-2.5 text-center">#</th>
                <th className="px-4 py-2.5">Estudante</th>
                <th className="w-40 px-3 py-2.5 text-center hidden sm:table-cell">Conduta</th>
                <th className="w-36 px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((aluno, index) => {
                const gradeInfo = (computedGrades || []).find((g) => g.student_id === aluno.id);
                const isPenalized = gradeInfo && typeof gradeInfo.pointsLost === "number" && gradeInfo.pointsLost < 0;
                
                return (
                  <tr 
                    key={aluno.id}
                    className="hover:bg-indigo-100/80 transition-colors duration-150 group"
                  >
                    {/* Número sequencial de chamada */}
                    <td className="w-12 px-3 py-2 text-center text-xs font-mono font-medium text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    {/* Nome com avatar compacto */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/60 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {aluno.name ? aluno.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span className="font-semibold text-slate-700 text-sm truncate" title={aluno.name}>
                          {aluno.name}
                        </span>
                      </div>
                    </td>

                    {/* Status de Conduta / Escore */}
                    <td className="w-40 px-3 py-2 text-center hidden sm:table-cell">
                      {gradeInfo ? (
                        <span
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs ${
                            isPenalized
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                          title={isPenalized ? `Penalidades acumuladas: ${gradeInfo.pointsLost.toFixed(1)} pts` : "Conduta Íntegra"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPenalized ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                          {Number(gradeInfo.behaviorScore ?? 0).toFixed(2)} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* Botões de Ação Slim */}
                    <td className="w-36 px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openProfileModal(aluno.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Ver Perfil Acadêmico"
                        >
                          {Icons.Users}
                        </button>
                        <button
                          onClick={() => navigateToDiagnosis(aluno)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition-all uppercase tracking-tighter flex items-center gap-1 cursor-pointer"
                          title="Diagnóstico IA Pedagógico"
                        >
                          {Icons.Sparkles} IA
                        </button>
                        <button
                          onClick={() => { setStudentToDelete(aluno); setDeleteModalOpen(true); }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
                          title="Remover Estudante"
                        >
                          {Icons.Trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Empty State */
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
              {Icons.Users}
            </div>
            {searchTerm ? (
              <>
                <p className="text-sm font-bold text-slate-700">Nenhum estudante encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Não encontramos resultados para "{searchTerm}".</p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Limpar filtro de busca
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-700">Nenhum estudante cadastrado nesta turma</p>
                <p className="text-xs text-slate-400 mt-1">Comece adicionando manualmente ou importe uma lista de nomes.</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Importar Lista
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    + Add Aluno
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alunos;
