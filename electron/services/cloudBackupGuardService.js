const crypto = require('crypto');

/**
 * cloudBackupGuardService.js
 * 
 * Especialidade: Data Shrinkage Guard & Validador Anti-Regressão
 * 
 * Inspeciona volumetricamente o banco de dados antes do upload para a nuvem.
 * Se uma solicitação de backup contiver um volume substancialmente menor de registros
 * que o estado consolidado na nuvem (ex: perda de atividades, alunos ou notas por falha
 * de inicialização ou regressão de IA), a operação é IMEDIATAMENTE BLOQUEADA.
 */

class CloudBackupGuardService {
    /**
     * Extrai métricas estruturadas de um objeto de banco de dados do EduSys Pro.
     */
    static extractMetrics(data) {
        if (!data || typeof data !== 'object') {
            return {
                valid: false,
                totalStudents: 0,
                totalTurmas: 0,
                totalActivities: 0,
                totalMiniTestes: 0,
                totalProvas: 0,
                totalTrabalhos: 0,
                totalOccurrences: 0,
                activeUnits: 0,
                appVersion: 'unknown'
            };
        }

        const students = Array.isArray(data.students) ? data.students.length : 0;
        const turmas = Array.isArray(data.turmas) ? data.turmas.length : 0;
        const activities = Array.isArray(data.activities) ? data.activities.length : 0;
        const miniTestes = Array.isArray(data.mini_testes) ? data.mini_testes.length : 0;
        const provas = Array.isArray(data.provas) ? data.provas.length : 0;
        const trabalhos = Array.isArray(data.trabalhos) ? data.trabalhos.length : 0;
        const occurrences = Array.isArray(data.occurrences) ? data.occurrences.length : 0;
        const units = Array.isArray(data.units) ? data.units.filter(u => u.created_at).length : 0;
        const appVersion = data.metadata?.app_version || 'unknown';

        return {
            valid: students > 0 || turmas > 0,
            totalStudents: students,
            totalTurmas: turmas,
            totalActivities: activities,
            totalMiniTestes: miniTestes,
            totalProvas: provas,
            totalTrabalhos: trabalhos,
            totalOccurrences: occurrences,
            activeUnits: units,
            totalEvaluations: miniTestes + provas + trabalhos,
            appVersion
        };
    }

    /**
     * Calcula o hash criptográfico SHA-256 de uma string de dados.
     */
    static computeHash(content) {
        const payload = typeof content === 'string' ? content : JSON.stringify(content);
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }

    /**
     * Cria um Envelope de Integridade Blindado com metadados e métricas embutidas.
     */
    static createSealedEnvelope(encryptedPayload, metrics, version = '5.5.4') {
        const payloadStr = typeof encryptedPayload === 'string' 
            ? encryptedPayload 
            : JSON.stringify(encryptedPayload);

        const hash = this.computeHash(payloadStr);

        return {
            _edusys: true,
            _security_grade: 'SAAS_RESILIENT_V2',
            app_version: version,
            uploaded_at: new Date().toISOString(),
            hash,
            metrics: {
                students: metrics.totalStudents,
                turmas: metrics.totalTurmas,
                activities: metrics.totalActivities,
                evaluations: metrics.totalEvaluations,
                occurrences: metrics.totalOccurrences,
                units: metrics.activeUnits
            },
            payload: payloadStr
        };
    }

    /**
     * Avalia se é seguro realizar a sobrescrita do ponteiro de backup.
     * Retorna { safe: boolean, error?: string, localMetrics, remoteMetrics }
     */
    static assessBackupSafety(localMetrics, remoteEnvelopeOrMetrics, options = {}) {
        // Se a nuvem ainda não tem backup anterior, o primeiro envio é sempre seguro
        if (!remoteEnvelopeOrMetrics) {
            return {
                safe: true,
                localMetrics,
                remoteMetrics: null,
                message: 'Primeiro backup inicial da instituição.'
            };
        }

        const remoteMetrics = remoteEnvelopeOrMetrics.metrics 
            ? remoteEnvelopeOrMetrics.metrics 
            : remoteEnvelopeOrMetrics;

        // Se a nuvem não tiver métricas legíveis, permite envio com ressalva
        if (!remoteMetrics) {
            return {
                safe: true,
                localMetrics,
                remoteMetrics: null,
                message: 'Backup remoto em formato legado sem métricas comparativas.'
            };
        }

        // Bypass Administrativo com Rastreio: ignora o bloqueio de encolhimento se forceBypass for true
        if (options.forceBypass === true) {
            return {
                safe: true,
                localMetrics,
                remoteMetrics,
                bypassed: true,
                message: 'Bypass administrativo autorizado. Encolhimento de dados permitido com rastreio.'
            };
        }

        const remoteStudents = remoteMetrics.students ?? remoteMetrics.totalStudents ?? 0;
        const remoteActivities = remoteMetrics.activities ?? remoteMetrics.totalActivities ?? 0;
        const remoteEvaluations = remoteMetrics.evaluations ?? remoteMetrics.totalEvaluations ?? 0;

        // Regra 1: Alunos nunca podem diminuir drasticamente sem autorização explícita (> 10%)
        if (remoteStudents > 0 && localMetrics.totalStudents < (remoteStudents * 0.9)) {
            if (!options.allowShrinkage && !options.forceBypass) {
                return {
                    safe: false,
                    error: `[REGRESSÃO DE MATRÍCULAS BLOQUEADA] O banco local contém ${localMetrics.totalStudents} alunos, mas a nuvem tem ${remoteStudents} alunos. Backup abortado para evitar perda de dados.`,
                    localMetrics,
                    remoteMetrics
                };
            }
        }

        // Regra 2: Atividades/Lições não podem regredir drasticamente (> 15% de encolhimento)
        if (remoteActivities > 50 && localMetrics.totalActivities < (remoteActivities * 0.85)) {
            if (!options.allowShrinkage && !options.forceBypass) {
                return {
                    safe: false,
                    error: `[REGRESSÃO DE ATIVIDADES BLOQUEADA] O banco local contém ${localMetrics.totalActivities} atividades, mas a nuvem possui ${remoteActivities} atividades consolidadas. O backup foi bloqueado para impedir corrupção de histórico.`,
                    localMetrics,
                    remoteMetrics
                };
            }
        }

        // Regra 3: Notas/Avaliações consolidadas não podem sumir
        if (remoteEvaluations > 50 && localMetrics.totalEvaluations < (remoteEvaluations * 0.85)) {
            if (!options.allowShrinkage && !options.forceBypass) {
                return {
                    safe: false,
                    error: `[REGRESSÃO DE NOTAS BLOQUEADA] O banco local contém ${localMetrics.totalEvaluations} notas computadas, enquanto a nuvem possui ${remoteEvaluations} notas. O backup foi bloqueado preventivamente.`,
                    localMetrics,
                    remoteMetrics
                };
            }
        }

        return {
            safe: true,
            localMetrics,
            remoteMetrics,
            message: 'Integridade volumétrica validada com sucesso.'
        };
    }
}

module.exports = CloudBackupGuardService;
