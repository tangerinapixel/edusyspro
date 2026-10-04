import React, { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";
import CustomDatePicker from "../components/shared/CustomDatePicker";

const Registro = () => {
  const {
    students,
    occurrences,
    occurrenceTypes,
    computedGrades,
    loadData,
    selectedDate,
    setSelectedDate,
    setPendingOccurrenceUncheck,
    setIsConfirmOccurrenceUncheckOpen
  } = useApp();


  // Mapa indexado para busca O(1) instantânea de ocorrências por aluno e tipo na data selecionada
  const occurrencesMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < (occurrences || []).length; i++) {
      const o = occurrences[i];
      if (o.date === selectedDate) {
        map.set(`${o.student_id}_${o.type}`, o);
      }
    }
    return map;
  }, [occurrences, selectedDate]);

  const toggleOccurrence = async (aluno, type) => {
    if (!window.electronAPI) return;
    
    // Busca instantânea O(1) no mapa indexado
    const existing = occurrencesMap.get(`${aluno.id}_${type.id}`);

    if (existing) {
      setPendingOccurrenceUncheck({ 
        id: existing.id, 
        studentName: aluno.name, 
        typeName: type.title 
      });
      setIsConfirmOccurrenceUncheckOpen(true);
      return;
    }

    await window.electronAPI.addOccurrence({
      student_id: aluno.id,
      date: selectedDate,
      type: type.id,
    });
    loadData();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300 flex flex-col flex-1 min-h-0">
      <div className="px-5 py-3 bg-slate-50/50 flex justify-between items-center shrink-0 relative z-30 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">Checklist Disciplinar</h3>
        <CustomDatePicker
          compact
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          align="right"
        />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar pb-8">
        <table className="w-full text-center border-collapse table-fixed min-w-[680px]">
          <thead className="bg-[#f8fafc] sticky top-0 z-10 shadow-2xs">
            <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <th className="text-left px-4 py-2.5 w-[240px]">Estudante</th>
              <th className="w-24 px-2 py-2.5 text-center">Conduta</th>
              {occurrenceTypes.map((t) => (
                <th key={t.id} className="px-2 py-2 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="truncate max-w-[100px] block" title={t.title}>{t.title}</span>
                    <span className="text-[8px] opacity-60">({t.penalty})</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-indigo-100/80 transition-colors duration-150 group">
                <td className="px-4 py-2 text-left font-bold text-slate-700">
                  <span className="font-bold text-slate-700 text-sm truncate block" title={aluno.name}>
                    {aluno.name}
                  </span>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  {(() => {
                    const gradeInfo = (computedGrades || []).find((g) => g.student_id === aluno.id);
                    if (!gradeInfo) return <span className="text-xs text-slate-400">—</span>;
                    const isPenalized = typeof gradeInfo.pointsLost === "number" && gradeInfo.pointsLost < 0;
                    return (
                      <span
                        className={`inline-flex items-center justify-center min-w-[58px] px-2 py-0.5 rounded-lg text-[10px] font-black border shadow-2xs ${
                          isPenalized
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                        title={isPenalized ? `Penalidade acumulada: ${gradeInfo.pointsLost.toFixed(1)} pts` : "Conduta Íntegra"}
                      >
                        {Number(gradeInfo.behaviorScore ?? 0).toFixed(2)} pts
                      </span>
                    );
                  })()}
                </td>
                {occurrenceTypes.map((type) => {
                  const isChecked = occurrencesMap.has(`${aluno.id}_${type.id}`);
                  return (
                    <td key={type.id} className="px-2 py-1">
                      <button
                        onClick={() => toggleOccurrence(aluno, type)}
                        className={`w-8 h-8 mx-auto rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isChecked
                            ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105"
                            : "bg-white border-slate-300 group-hover:border-slate-400 hover:!border-indigo-600 shadow-2xs hover:scale-105"
                        }`}
                      >
                        {isChecked && Icons.Check}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td
                  colSpan={(occurrenceTypes?.length || 0) + 2}
                  className="py-20 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-14 h-14 mb-3.5 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                      {Icons.Users}
                    </div>
                    <p className="font-bold text-slate-700 text-base">Nenhum estudante encontrado nesta turma</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Cadastre novos estudantes ou selecione outra turma ativa para realizar os lançamentos disciplinares.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {/* Espaço extra no final para scroll */}
            <tr>
              <td colSpan={(occurrenceTypes?.length || 0) + 2} className="h-16"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Registro;
