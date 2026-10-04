import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import DiagnosisFilterBar from '../components/diagnostico/DiagnosisFilterBar';
import DiagnosisCardGrid from '../components/diagnostico/DiagnosisCardGrid';
import DiagnosisDetailModal from '../components/diagnostico/DiagnosisDetailModal';

export default function HistoricoDiagnosticos() {
  const navigate = useNavigate();
  const { turmas, activeTurmaId, units, activeUnitId, showAlert } = useApp();

  const [diagnoses, setDiagnoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState(activeTurmaId || 'todas');
  const [selectedUnit, setSelectedUnit] = useState(activeUnitId || 'todas');

  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Carrega diagnósticos do acervo via IPC
  const loadDiagnoses = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.diagnosisArchiveList) {
        const filters = {};
        if (selectedTurma !== 'todas') {
          filters.turmaId = Number(selectedTurma);
        }
        if (selectedUnit !== 'todas') {
          filters.unitId = Number(selectedUnit);
        }
        if (searchTerm.trim()) {
          filters.search = searchTerm.trim();
        }

        const res = await window.electronAPI.diagnosisArchiveList(filters);
        if (res.success) {
          setDiagnoses(res.diagnoses || []);
        } else {
          showAlert('Aviso', res.error || 'Não foi possível carregar o histórico.', 'warning');
        }
      }
    } catch (err) {
      console.error('[HistoricoDiagnosticos] Erro ao carregar acervo:', err);
      showAlert('Erro', 'Falha ao conectar com o banco de dados do acervo.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTurma, selectedUnit, searchTerm, showAlert]);

  useEffect(() => {
    loadDiagnoses();
  }, [loadDiagnoses]);

  // Abertura do Modal de Leitura
  const handleSelectDiagnosis = (diag) => {
    setSelectedDiagnosis(diag);
    setIsModalOpen(true);
  };

  // Exclusão de Diagnóstico
  const handleDeleteDiagnosis = async (diag) => {
    if (!diag || !diag.id || !window.electronAPI?.diagnosisArchiveDelete) return;

    const confirmed = window.confirm(`Deseja realmente remover o diagnóstico de "${diag.student_name}" emitido para a ${diag.unit_name || 'unidade'}?`);
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.diagnosisArchiveDelete(diag.id);
      if (res.success) {
        showAlert('Sucesso', 'Registro removido do acervo.', 'success');
        if (selectedDiagnosis?.id === diag.id) {
          setIsModalOpen(false);
          setSelectedDiagnosis(null);
        }
        loadDiagnoses();
      } else {
        showAlert('Erro', res.error || 'Falha ao excluir registro.', 'error');
      }
    } catch (err) {
      showAlert('Erro', 'Falha ao processar exclusão.', 'error');
    }
  };

  // Exportação em PDF do Boletim e Parecer Histórico
  const handleExportPDF = async (diag) => {
    if (!diag || isExportingPDF || !window.electronAPI?.exportStudentReportPDF) return;

    setIsExportingPDF(true);
    try {
      const metrics = diag.metrics_snapshot || {};
      const studentGrades = {
        name: diag.student_name,
        licao: metrics.adhesion_rate ? (metrics.adhesion_rate / 10).toFixed(2) : 0,
        licaoCheckCount: metrics.delivered_activities ?? 0,
        maxActivities: metrics.applied_activities ?? 0,
        trabalho: 0,
        totalMiniTestes: 0,
        behaviorScore: metrics.behavior_score ?? 0,
        prova: 0,
        mediaFinal: metrics.media_final ?? 0
      };

      const res = await window.electronAPI.exportStudentReportPDF({
        turmaName: diag.turma_name || 'Turma',
        unitName: diag.unit_name || 'Unidade',
        studentName: diag.student_name,
        grades: studentGrades,
        parecerTexto: diag.diagnosis_text
      });

      if (res.success) {
        showAlert('Sucesso!', `Boletim de ${diag.student_name} exportado com sucesso.`, 'success');
      } else if (!res.cancelled) {
        showAlert('Erro na Exportação', res.error || 'Erro ao gerar PDF.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Erro Crítico', 'Falha ao gerar o PDF.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Exportação para o Google Docs
  const handleExportDoc = async (diag) => {
    if (!diag || !diag.diagnosis_text || !window.electronAPI?.exportToDoc) return;
    try {
      const title = `DIAGNÓSTICO: ${diag.student_name} (${diag.unit_name || 'Unidade'})`;
      const res = await window.electronAPI.exportToDoc(diag.diagnosis_text, title);

      if (res.success) {
        if (res.link) {
          window.open(res.link, '_blank');
        } else {
          showAlert('Sucesso!', `Diagnóstico de ${diag.student_name} exportado para o Google Docs.`, 'success');
        }
      } else {
        showAlert('Erro na Exportação', res.error || 'Falha ao exportar.', 'error');
      }
    } catch (err) {
      showAlert('Erro', 'Falha ao conectar com o Google Drive.', 'error');
    }
  };

  const handleResetFilters = () => {
    setSelectedTurma('todas');
    setSelectedUnit('todas');
    setSearchTerm('');
  };

  // Nome formatado para o subtítulo
  const currentTurmaName = useMemo(() => {
    if (selectedTurma === 'todas') return 'Todas as Turmas';
    const found = turmas.find(t => String(t.id) === String(selectedTurma));
    return found ? found.name : 'Turma Selecionada';
  }, [selectedTurma, turmas]);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in duration-300">
      
      {/* CABEÇALHO DA PÁGINA (ESTILO ACERVO PEDAGÓGICO) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/relatorios')}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Voltar aos Relatórios"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Acervo de Diagnósticos Pedagógicos
              </h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold">
                I.A. Longitudinal
              </span>
            </div>
            <p className="text-slate-500 font-medium text-xs mt-0.5">
              Histórico consolidado de pareceres emitidos para <strong className="text-indigo-600 font-bold">{currentTurmaName}</strong>. Consulte e gere PDFs a qualquer momento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => navigate('/alunos')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Novo Diagnóstico</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <DiagnosisFilterBar
        totalCount={diagnoses.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTurma={selectedTurma}
        onTurmaChange={setSelectedTurma}
        turmas={turmas}
        selectedUnit={selectedUnit}
        onUnitChange={setSelectedUnit}
        units={units}
      />

      {/* CONTEÚDO PRINCIPAL (GRID COM ROLAGEM) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-4 shadow-2xs">
            <div className="w-10 h-10 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-700">Carregando acervo de diagnósticos...</p>
          </div>
        ) : (
          <DiagnosisCardGrid
            diagnoses={diagnoses}
            onSelect={handleSelectDiagnosis}
            onDelete={handleDeleteDiagnosis}
            onExportPDF={handleExportPDF}
            onResetFilters={handleResetFilters}
          />
        )}
      </div>

      {/* MODAL DETALHADO DO DIAGNÓSTICO */}
      <DiagnosisDetailModal
        isOpen={isModalOpen}
        diagnosis={selectedDiagnosis}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDiagnosis(null);
        }}
        onDelete={handleDeleteDiagnosis}
        onExportPDF={handleExportPDF}
        onExportDoc={handleExportDoc}
        showAlert={showAlert}
      />

    </div>
  );
}
