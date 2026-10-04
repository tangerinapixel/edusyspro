import React from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";

const Notas = () => {
  const {
    computedGrades,
    openProfileModal,
    navigateToDiagnosis,
    openEvalModal,
    activeTurmaId,
    turmas,
    activeUnitId,
    units,
    showAlert
  } = useApp();

  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  // Síntese Executiva em tempo real da turma ativa
  const stats = React.useMemo(() => {
    if (!computedGrades || computedGrades.length === 0) {
      return { total: 0, mediaGeral: 0, aprovados: 0, taxaAprovacao: 0, alertas: 0 };
    }
    const total = computedGrades.length;
    const soma = computedGrades.reduce((acc, g) => acc + (Number(g.mediaFinal) || 0), 0);
    const mediaGeral = total > 0 ? soma / total : 0;
    const aprovados = computedGrades.filter(g => (Number(g.mediaFinal) || 0) >= 5.0).length;
    const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;
    const alertas = computedGrades.filter(g => (Number(g.mediaFinal) || 0) < 5.0 || g.isAlert).length;
    return { total, mediaGeral, aprovados, taxaAprovacao, alertas };
  }, [computedGrades]);

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    if (!computedGrades || computedGrades.length === 0) {
      showAlert("Aviso", "Não há notas para exportar nesta turma.", "warning");
      return;
    }

    setIsExportingPDF(true);
    try {
      const activeTurma = turmas.find((t) => t.id === activeTurmaId);
      const activeUnit = units.find((u) => u.id === activeUnitId);

      // Invoca a ponte segura exposta pelo Electron
      const res = await window.electronAPI.exportGradesPDF({
        turmaName: activeTurma ? activeTurma.name : "Sem Turma",
        unitName: activeUnit ? activeUnit.name : "Sem Unidade",
        grades: computedGrades,
      });

      if (res.success) {
        showAlert(
          "Sucesso!",
          `Boletim exportado com sucesso.`,
          "success"
        );
      } else if (res.error) {
        showAlert("Erro", `Falha ao exportar PDF: ${res.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro crítico ao exportar o arquivo PDF.", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden animate-in fade-in flex flex-col flex-1 min-h-0">
      <div className="px-5 py-3 border-b border-slate-100/80 bg-slate-50/50 shrink-0 z-20 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">Central de Notas</h3>
        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF || computedGrades.length === 0}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
        >
          {isExportingPDF ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Exportando...</span>
            </>
          ) : (
            <>
              {Icons.Download}
              <span>Exportar PDF</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-white sticky top-0 z-10 shadow-xs">
            <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <th className="w-[260px] md:w-[320px] px-4 py-2.5">Estudante</th>
              <th className="w-24 px-2 py-2.5 text-center">Comp.</th>
              <th className="w-24 px-2 py-2.5 text-center">Lição</th>
              <th className="w-24 px-2 py-2.5 text-center">Mód. Testes</th>
              <th className="w-24 px-2 py-2.5 text-center">Trabalho</th>
              <th className="w-24 px-2 py-2.5 text-center">Prova</th>
              <th className="w-24 px-2 py-2.5 text-center">Bônus</th>
              <th className="w-24 px-2 py-2.5 text-center font-bold">Média</th>
              <th className="py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {computedGrades.map((gradeInfo) => (
              <tr key={gradeInfo.student_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="w-[260px] md:w-[320px] px-4 py-2">
                  <div className="flex items-center justify-between group/row">
                    <div className="min-w-0 flex-1 pr-2 truncate">
                      <span className="font-bold text-slate-700 text-sm truncate block" title={gradeInfo.name}>
                        {gradeInfo.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openProfileModal(gradeInfo.student_id)}
                        className="p-1 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        title="Ver Perfil Completo"
                      >
                        {Icons.Users}
                      </button>
                      <button
                        onClick={() => navigateToDiagnosis(gradeInfo)}
                        className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-lg shadow-2xs hover:bg-indigo-700 transition-all uppercase tracking-tighter flex items-center gap-1 cursor-pointer"
                      >
                        {Icons.Sparkles} IA
                      </button>
                    </div>
                  </div>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <span className={`inline-flex items-center justify-center min-w-[58px] px-2 py-1 rounded-lg text-xs font-bold shadow-2xs ${gradeInfo.pointsLost < 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {Number(gradeInfo.behaviorScore || 0).toFixed(2)}
                  </span>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <span className="inline-flex items-center justify-center min-w-[58px] px-2 py-1 rounded-lg text-xs font-bold shadow-2xs bg-blue-100 text-blue-700">
                    {Number(gradeInfo.licao || 0).toFixed(2)}
                  </span>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <button
                    onClick={() => openEvalModal(gradeInfo, "mini_testes")}
                    className="inline-flex items-center justify-center min-w-[58px] px-2 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs shadow-2xs hover:scale-105 transition-transform outline-none cursor-pointer"
                  >
                    {Number(gradeInfo.totalMiniTestes || 0).toFixed(2)}
                  </button>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <button
                    onClick={() => openEvalModal(gradeInfo, "trabalhos")}
                    className="inline-flex items-center justify-center min-w-[58px] px-2 py-1 bg-purple-100 text-purple-700 font-bold rounded-lg text-xs shadow-2xs hover:scale-105 transition-transform outline-none cursor-pointer"
                  >
                    {Number(gradeInfo.trabalho || 0).toFixed(2)}
                  </button>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <button
                    onClick={() => openEvalModal(gradeInfo, "provas")}
                    className="inline-flex items-center justify-center min-w-[58px] px-2 py-1 bg-rose-100 text-rose-700 font-bold rounded-lg text-xs shadow-2xs hover:scale-105 transition-transform outline-none cursor-pointer"
                  >
                    {Number(gradeInfo.prova || 0).toFixed(2)}
                  </button>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  <button
                    onClick={() => openEvalModal(gradeInfo, "bonus")}
                    className="inline-flex items-center justify-center min-w-[58px] px-2 py-1 bg-amber-100 hover:bg-amber-200/80 text-amber-800 font-bold rounded-lg text-xs shadow-2xs hover:scale-105 transition-transform outline-none cursor-pointer"
                    title="Gerenciar Atividades Bônus"
                  >
                    {Number(gradeInfo.bonus || 0).toFixed(2)}
                  </button>
                </td>
                <td className="w-24 px-2 py-2 text-center text-nowrap">
                  {(() => {
                    const media = Number(gradeInfo.mediaFinal || 0);
                    const isAdequado = media >= 5.0;
                    const colorClass = isAdequado
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-emerald-500/5"
                      : "bg-rose-50 text-rose-700 border-rose-200/80 shadow-rose-500/5";

                    return (
                      <span
                        className={`inline-flex items-center justify-center min-w-[58px] px-2 py-1 rounded-xl text-xs font-black tracking-tight tabular-nums shadow-2xs border ${colorClass}`}
                        title={isAdequado ? "Média Adequada (≥ 5.00)" : "Média Abaixo da Média (< 5.00)"}
                      >
                        {media.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé Fixo com Métricas da Turma & Safe-Area */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
        <div className="flex items-center gap-4 text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <strong className="text-slate-700 font-bold">{stats.total}</strong> Estudantes
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <strong className="text-slate-700 font-bold">{stats.taxaAprovacao}%</strong> Rendimento (≥ 5.0)
          </span>
          {stats.alertas > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <strong className="font-black">{stats.alertas}</strong> em Atenção
              </span>
            </>
          )}
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Média da Turma:</span>
            <span className={`px-2.5 py-0.5 rounded-xl text-xs font-black tabular-nums border shadow-2xs ${
              stats.mediaGeral >= 5.0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}>
              {stats.mediaGeral.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notas;
