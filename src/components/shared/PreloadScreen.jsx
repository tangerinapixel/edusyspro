import React from "react";

const PreloadScreen = ({ message }) => (
  <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center animate-in fade-in duration-700">
    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full"></div>

    <div className="relative flex flex-col items-center z-10">
      <div className="absolute w-40 h-40 rounded-full border-t-2 border-r-2 border-indigo-500/30 animate-spin [animation-duration:3s]"></div>
      <div className="absolute w-36 h-36 rounded-full border-b-2 border-l-2 border-orange-500/20 animate-spin [animation-direction:reverse] [animation-duration:2s]"></div>

      <div className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.3)] animate-pulse relative z-20">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <div className="mt-12 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tighter mb-4 animate-in slide-in-from-bottom-2 duration-700">
          EduSys <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-bold">Pro</span>
        </h1>

        <div className="flex flex-col items-center gap-2">
          <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.3em] h-4 animate-pulse">
            {message}
          </p>
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-orange-500 w-full animate-loading-bar origin-left"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PreloadScreen;
