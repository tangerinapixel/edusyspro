/* eslint-disable react/prop-types */
import { createContext, useContext, useState } from 'react';
import CoordinatorSidebar from './CoordinatorSidebar';
import CoordinatorHeader from './CoordinatorHeader';

export const CoordinatorWorkspaceContext = createContext(null);

export function useCoordinatorWorkspace() {
  const ctx = useContext(CoordinatorWorkspaceContext);
  return ctx || {
    activeNav: 'overview',
    setActiveNav: () => {},
    searchQuery: '',
    setSearchQuery: () => {},
    selectedStudent: null,
    setSelectedStudent: () => {},
    coordinatorName: '',
    onExit: () => {}
  };
}

export default function CoordinatorLayout({ children, coordinatorName, onExit }) {
  const [activeNav, setActiveNav] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  return (
    <CoordinatorWorkspaceContext.Provider
      value={{
        activeNav,
        setActiveNav,
        searchQuery,
        setSearchQuery,
        selectedStudent,
        setSelectedStudent,
        coordinatorName,
        onExit
      }}
    >
      <div className="flex bg-[#f8fafc] text-slate-900 font-[Inter,sans-serif] h-screen overflow-hidden select-none">
        {/* Barra Lateral Institucional da Coordenação */}
        <CoordinatorSidebar
          activeNav={activeNav}
          onNavChange={(nav) => {
            setActiveNav(nav);
            setSelectedStudent(null);
          }}
          onExit={onExit}
        />

        {/* Conteúdo Principal do Workspace da Coordenação */}
        <main className="flex-1 flex flex-col min-w-0 relative bg-[#f8fafc] overflow-hidden">
          {/* Cabeçalho Institucional Padronizado */}
          <CoordinatorHeader
            coordinatorName={coordinatorName}
            activeNav={activeNav}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isViewingStudent={!!selectedStudent}
            studentName={selectedStudent?.canonical_name}
            onExit={onExit}
          />

          {/* Área Central de Visualização */}
          <section className="flex-1 overflow-hidden flex flex-col px-6 py-4">
            {children}
          </section>
        </main>
      </div>
    </CoordinatorWorkspaceContext.Provider>
  );
}
