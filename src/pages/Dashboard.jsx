import React from "react";
import { useApp } from "../contexts/AppContext";
import { Icons } from "../assets/icons";

const Dashboard = () => {
  const {
    computedGrades,
    turmas,
    activeTurmaId,
    openProfileModal,
    dashboardStats,
    showAllRankings,
    setShowAllRankings
  } = useApp();

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 animate-in fade-in duration-500">
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total de Alunos */}
        <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden group card-dynamic-shadow">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Corpo Discente
              </h3>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">
                {dashboardStats.totalStudents}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {dashboardStats.avgEngagement.toFixed(0)}% Engajamento
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              {Icons.Users}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: `${dashboardStats.avgEngagement}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Status de Alerta */}
        <div className="bg-gradient-to-br from-rose-600 to-red-700 rounded-2xl p-5 relative overflow-hidden group card-dynamic-shadow shadow-md shadow-rose-200/40">
          <div className="absolute right-[-5%] bottom-[-5%] p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="relative z-10 flex justify-between items-center h-full">
            <div className="flex-1">
              <h3 className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Status Crítico
              </h3>
              <p className="text-3xl font-black text-white tracking-tighter">
                {dashboardStats.alertsCount}
              </p>
              <p className="text-[11px] text-rose-100/80 font-bold mt-1.5">
                {dashboardStats.alertPct.toFixed(1)}% do total da turma
              </p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="transparent" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="transparent"
                  stroke="white"
                  strokeWidth="6"
                  strokeDasharray="163.36"
                  style={{
                    strokeDashoffset: 163.36 - (163.36 * dashboardStats.alertPct / 100),
                    "--dashoffset": 163.36 - (163.36 * dashboardStats.alertPct / 100)
                  }}
                  className="animate-ring"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-white">{dashboardStats.alertsCount > 0 ? "!" : "OK"}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Impacto Disciplinar */}
        <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 relative overflow-hidden group card-dynamic-shadow">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Impacto Disciplinar
              </h3>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">
                {dashboardStats.totalOccurrences}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  Média: {dashboardStats.avgOccs} por aluno
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-2xs">
              {Icons.Alert}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 p-3 opacity-[0.03] group-hover:scale-150 transition-transform duration-1000 pointer-events-none">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>
      </div>

      {/* RANKING PREMIUM REDESIGN */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden flex flex-col">
        <div className="p-4 pb-2 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 bg-slate-50/40">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
              <h3 className="font-black text-slate-800 text-base tracking-tight">
                Ranking de Impacto Disciplinar
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium ml-2.5">Monitoramento em tempo real de descontos e critérios</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-white border border-slate-200/80 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Global - {turmas.find(t => t.id === activeTurmaId)?.name || 'Turma'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-0 no-scrollbar space-y-1">
            {(() => {
              const list = [...computedGrades]
                .filter((a) => a.pointsLost < 0)
                .sort((a, b) => a.pointsLost - b.pointsLost);
              const displayList = showAllRankings ? list : list.slice(0, 3);
              const maxLoss = list.length > 0 ? Math.abs(list[0].pointsLost) : 1;

              if (list.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      {Icons.Check}
                    </div>
                    <p className="font-bold text-sm tracking-wide">Nenhum registro crítico encontrado</p>
                  </div>
                )
              }

              return (
                <>
                  {displayList.map((aluno, i) => {
                    const lossPct = Math.min(100, (Math.abs(aluno.pointsLost) / maxLoss) * 100);
                    const initials = (aluno.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={i}
                        className={`group relative p-3 rounded-3xl transition-all duration-300 border flex flex-col md:flex-row md:items-center gap-4 animate-fade-in-up stagger-${i + 1} ${aluno.isAlert ? "bg-rose-50/20 border-rose-100/50" : "bg-white border-transparent hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/20"}`}
                      >
                        {/* Student Info Section */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner transition-transform group-hover:scale-110 duration-500 ${aluno.isAlert ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{aluno.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest">{aluno.occurrencesCount || 0} Registros</span>
                            </div>
                          </div>
                        </div>

                        {/* Impact Bar Section */}
                        <div className="flex-1 px-3 lg:px-6">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impacto na Média</span>
                            <span className="text-sm font-black text-rose-600 tracking-tighter">{Number(aluno.pointsLost || 0).toFixed(2)} pts</span>
                          </div>
                          <div className="impact-bar-bg bg-slate-100/80">
                            <div
                              className={`impact-bar-fill ${aluno.isAlert ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                              style={{ width: `${lossPct}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Status Badge & Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 min-w-[140px]">
                          {aluno.isAlert ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {aluno.alertReasons?.includes('disciplinar')
                                  ? 'Conduta'
                                  : aluno.alertReasons?.includes('licoes')
                                  ? 'Lições'
                                  : aluno.alertReasons?.includes('avaliativo')
                                  ? 'Avaliação'
                                  : 'Atenção'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                              <span className="text-[10px] font-black uppercase tracking-widest">Seguro</span>
                            </div>
                          )}

                          <button
                            onClick={() => openProfileModal(aluno.student_id)}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Explorar Perfil Detalhado"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {list.length > 3 && (
                    <div className="pt-4 flex justify-center">
                      <button
                        onClick={() => setShowAllRankings(!showAllRankings)}
                        className="px-6 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-600/10 transition-all active:scale-95 flex items-center gap-2 group"
                      >
                        {showAllRankings ? "Recolher Lista" : `Ver Integrantes (+${list.length - 3})`}
                        <svg className={`w-3.5 h-3.5 transition-transform duration-500 ${showAllRankings ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
