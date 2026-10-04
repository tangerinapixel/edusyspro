import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./contexts/AppContext";

// Layout & Components
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import CoordinatorLayout from "./components/layout/CoordinatorLayout";
import GlobalModals from "./components/modals/GlobalModals";
import PreloadScreen from "./components/shared/PreloadScreen";
import LoginScreen from "./components/auth/LoginScreen";
import AIChat from "./components/AIChat";
import Omnisearch from "./components/shared/Omnisearch";
import LicenseBanner from "./components/license/LicenseBanner";
import LicenseActivationModal from "./components/license/LicenseActivationModal";
import { UpdateFloatingNotification, UpdateChangelogModal } from "./components/updater";

// Pages
import Dashboard from "./pages/Dashboard";
import Alunos from "./pages/Alunos";
import Atividades from "./pages/Atividades";
import Registro from "./pages/Registro";
import Notas from "./pages/Notas";
import Relatorios from "./pages/Relatorios";
import AiGenerator from "./pages/AiGenerator";
import Restaurar from "./pages/Restaurar";
import Settings from "./pages/Settings";
import DiagnosticoDetalhe from "./pages/DiagnosticoDetalhe";
import Corretor from "./pages/Corretor";
import AcervoPedagogico from "./pages/AcervoPedagogico";
import HistoricoDiagnosticos from "./pages/HistoricoDiagnosticos";
import Coordenacao from "./pages/Coordenacao";

import AgendaUnidade from "./components/AgendaUnidade";

function AgendaUnidadeWrapper() {
  const { turmas, activeTurmaId, activeUnitId } = useApp();
  const turmaName = turmas.find(t => t.id === activeTurmaId)?.name || 'Turma';
  return <AgendaUnidade turmaId={activeTurmaId} turmaName={turmaName} activeUnitId={activeUnitId} />;
}

function App() {
  const {
    activeTab,
    authStatus,
    authName,
    authError,
    recoveryKey,
    isAppLoading,
    loadingMessage,
    handleLogin,
    handleSetup,
    handleReset,
    setAuthStatus,
    isLicenseModalOpen,
    setIsLicenseModalOpen
  } = useApp();

  const [isCoordinatorActive, setIsCoordinatorActive] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState("");

  // Escuta evento de auto-lock da coordenação para retornar ao login
  useEffect(() => {
    let unsubscribe = null;
    if (window.electronAPI?.onCoordinatorSessionLocked) {
      unsubscribe = window.electronAPI.onCoordinatorSessionLocked(() => {
        setIsCoordinatorActive(false);
        setCoordinatorName("");
      });
    }
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // 1. Workspace Isolado da Coordenação (Entrada Direta sem Renderizar Professor)
  if (isCoordinatorActive) {
    return (
      <CoordinatorLayout
        coordinatorName={coordinatorName}
        onExit={async () => {
          if (window.electronAPI?.coordinatorLockSession) {
            await window.electronAPI.coordinatorLockSession();
          }
          setIsCoordinatorActive(false);
          setCoordinatorName("");
        }}
      >
        <Coordenacao />
      </CoordinatorLayout>
    );
  }

  // 1. Tela de Carregamento Inicial
  if (isAppLoading) {
    return <PreloadScreen message={loadingMessage} />;
  }

  // 2. Fluxo de Autenticação
  if (authStatus !== "authenticated") {
    return (
      <LoginScreen
        status={authStatus}
        userName={authName}
        error={authError}
        recoveryKey={recoveryKey}
        onLogin={handleLogin}
        onSetup={handleSetup}
        onReset={handleReset}
        onBackToLogin={() => setAuthStatus("unauthenticated")}
        onGoToRecover={() => setAuthStatus("recovering")}
        onFinishSetup={() => setAuthStatus("authenticated")}
        onCoordinatorLogin={(session) => {
          setCoordinatorName(session?.coordinatorName || "");
          setIsCoordinatorActive(true);
        }}
      />
    );
  }

  // 4. Renderização de Rotas do Professor
  const renderRoutes = () => (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/alunos" element={<Alunos />} />
      <Route path="/atividades" element={<Atividades />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/notas" element={<Notas />} />
      <Route path="/relatorios" element={<Relatorios />} />
      <Route path="/agenda_unidade" element={<AgendaUnidadeWrapper />} />
      <Route path="/corretor" element={<Corretor />} />
      <Route path="/ai_generator" element={<AiGenerator />} />
      <Route path="/restaurar" element={<Restaurar />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/diagnostico-detalhe" element={<DiagnosticoDetalhe />} />
      <Route path="/acervo-pedagogico" element={<AcervoPedagogico />} />
      <Route path="/historico-diagnosticos" element={<HistoricoDiagnosticos />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  // 4. Layout Principal do App
  return (
    <div className="flex bg-[#f8fafc] text-slate-900 font-[Inter,sans-serif] h-screen overflow-hidden select-none">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        <LicenseBanner />
        <Header />
        
        <section className={`flex-1 overflow-hidden flex flex-col ${(activeTab === 'ai_generator' || activeTab === 'acervo-pedagogico') ? 'p-0' : 'px-6 py-4'}`}>
          {renderRoutes()}
        </section>

        {/* Componente Flutuante de IA (Chat) */}
        <AIChat />
      </main>

      {/* Container de Modais e Overlays Globais */}
      <GlobalModals />
      <LicenseActivationModal 
        isOpen={isLicenseModalOpen} 
        onClose={() => setIsLicenseModalOpen(false)} 
      />
      <Omnisearch />
      <UpdateFloatingNotification />
      <UpdateChangelogModal />
    </div>
  );
}

export default App;
