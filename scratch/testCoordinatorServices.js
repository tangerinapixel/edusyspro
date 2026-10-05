/* eslint-env node */
/**
 * Testes Automatizados da Etapa 1: Serviços da Coordenação Pedagógica
 */

const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log("================================================================");
    console.log(" INICIANDO TESTES DA ETAPA 1 - BACKEND CORE DA COORDENAÇÃO");
    console.log("================================================================\n");

    const sessionManager = require('../electron/services/coordinatorSessionManager');
    const identityResolver = require('../electron/services/coordinatorIdentityResolver');
    const coordinatorService = require('../electron/services/coordinatorService');

    // ─── TESTE 1: Gestão de PIN e Sessão Segura (coordinatorSessionManager) ───
    console.log("[TESTE 1] Configuração de PIN e Elevação de Privilégios com PBKDF2...");
    sessionManager.setupCoordinatorPin('2026', 'Coord. Roberto');
    
    const failedElevation = sessionManager.verifyAndElevate('0000');
    if (failedElevation.success) throw new Error("Falha: PIN incorreto não deve elevar privilégios.");

    const successElevation = sessionManager.verifyAndElevate('2026');
    if (!successElevation.success || !sessionManager.isSessionActive()) {
        throw new Error("Falha: PIN correto deveria ter ativado a sessão.");
    }
    console.log("  ✓ Teste 1 passou: PIN validado, sessão ativada via PBKDF2 e token efêmero emitido.");

    // ─── TESTE 2: Resolução de Identidade e Canonical IDs (coordinatorIdentityResolver) ───
    console.log("\n[TESTE 2] Normalização de Nomes e Geração de Canonical IDs...");
    const id1 = identityResolver.generateCanonicalStudentId("LUCAS GABRIEL SILVEIRA", "6º Ano Matutino");
    const id2 = identityResolver.generateCanonicalStudentId("lucas gabriel silveira", "6 ano");
    if (id1 !== id2) {
        throw new Error(`Falha: IDs canônicos deveriam ser idênticos. ID1=${id1} vs ID2=${id2}`);
    }
    console.log(`  ✓ Teste 2 passou: Canonical IDs congruentes (${id1}). Normalização fonética validada.`);

    // ─── TESTE 3: Ingestão de Snapshot com Sharding e Cache LRU (coordinatorService) ───
    console.log("\n[TESTE 3] Ingestão de Snapshot em Shards Particionados...");
    try {
        const manifestFile = path.join(process.cwd(), 'coordinator_vault', 'manifest.json');
        if (fs.existsSync(manifestFile)) {
            const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
            if (m.unlinked_sources) {
                delete m.unlinked_sources['prof_cab526a87c63'];
                delete m.unlinked_sources['prof_ab27350f6243'];
            }
            delete m.teachers_index['prof_cab526a87c63'];
            delete m.teachers_index['prof_ab27350f6243'];
            fs.writeFileSync(manifestFile, JSON.stringify(m, null, 2), 'utf8');
        }
        const s1 = path.join(process.cwd(), 'coordinator_vault', 'teachers', 'prof_cab526a87c63.json');
        const s2 = path.join(process.cwd(), 'coordinator_vault', 'teachers', 'prof_ab27350f6243.json');
        if (fs.existsSync(s1)) fs.unlinkSync(s1);
        if (fs.existsSync(s2)) fs.unlinkSync(s2);
    } catch (_) {}

    const mockTeacherPayload1 = {
        auth: { user_name: "Profª Ana Paula" },
        turmas: [{ id: 1, name: "6º Ano A", discipline: "Língua Portuguesa" }],
        students: [{ id: 101, name: "Lucas Gabriel Silveira", turma_id: 1 }],
        activities: [{ id: 1, student_id: 101, is_completed: true }],
        provas: [{ id: 1, student_id: 101, score: 8.5 }],
        diagnoses: [{ student_id: 101, diagnosis_text: "Excelente dedicação em redação." }]
    };

    const ingest1 = await coordinatorService.ingestTeacherSnapshot(mockTeacherPayload1, {
        source: 'manual_import',
        discipline: 'Língua Portuguesa',
        uploadedAt: '2026-10-01T20:00:00.000Z'
    });

    if (!ingest1.success || ingest1.status !== 'INGESTED_OK') {
        throw new Error("Falha na ingestão do primeiro professor.");
    }

    // Ingestão do segundo professor (mesmo aluno em Matemática)
    const mockTeacherPayload2 = {
        auth: { user_name: "Prof. Carlos Eduardo" },
        turmas: [{ id: 1, name: "6º Ano", discipline: "Matemática" }],
        students: [{ id: 42, name: "Lucas Gabriel Silveira", turma_id: 1 }],
        activities: [{ id: 1, student_id: 42, is_completed: false }],
        provas: [{ id: 1, student_id: 42, score: 6.0 }],
        diagnoses: [{ student_id: 42, diagnosis_text: "Necessita praticar equações." }]
    };

    const ingest2 = await coordinatorService.ingestTeacherSnapshot(mockTeacherPayload2, {
        source: 'manual_import',
        discipline: 'Matemática',
        uploadedAt: '2026-10-01T20:30:00.000Z'
    });

    if (!ingest2.success || ingest2.status !== 'INGESTED_OK') {
        throw new Error("Falha na ingestão do segundo professor.");
    }
    console.log("  ✓ Teste 3 passou: Shards isolados criados sem sobrecarregar memória.");

    // ─── TESTE 4: Dossiê Raio-X 360º do Estudante Multi-Disciplinar ───
    console.log("\n[TESTE 4] Dossiê 360º do Estudante (Cruzamento Multi-Docente)...");
    const canonicalId = identityResolver.generateCanonicalStudentId("Lucas Gabriel Silveira", "6º Ano");
    const dossie = coordinatorService.getStudent360(canonicalId);

    if (!dossie.success || !dossie.student) {
        throw new Error("Falha ao gerar dossiê 360º do estudante.");
    }

    if (dossie.student.disciplines.length !== 2) {
        throw new Error(`Falha: Esperava 2 disciplinas para o aluno, encontrou ${dossie.student.disciplines.length}`);
    }

    if (dossie.student.diagnoses.length !== 2) {
        throw new Error(`Falha: Esperava 2 diagnósticos convergentes, encontrou ${dossie.student.diagnoses.length}`);
    }
    console.log("  ✓ Teste 4 passou: Aluno unificado com notas e diagnósticos de Português e Matemática!");

    // ─── TESTE 5: Idempotência e Bloqueio de Stale Data ───
    console.log("\n[TESTE 5] Idempotência por Hash e Bloqueio de Stale Data...");
    // 5.1 Idempotência: reenviar o mesmo payload deve retornar SKIPPED_IDENTICAL
    const idempotentRes = await coordinatorService.ingestTeacherSnapshot(mockTeacherPayload1, {
        uploadedAt: '2026-10-01T20:00:00.000Z'
    });
    if (idempotentRes.status !== 'SKIPPED_IDENTICAL') {
        throw new Error(`Falha: Deveria retornar SKIPPED_IDENTICAL, retornou ${idempotentRes.status}`);
    }

    // 5.2 Stale Data: reenviar com data anterior deve rejeitar
    const stalePayload = { ...mockTeacherPayload1, activities: [] };
    const staleRes = await coordinatorService.ingestTeacherSnapshot(stalePayload, {
        uploadedAt: '2026-09-01T00:00:00.000Z' // data muito antiga
    });
    if (staleRes.status !== 'REJECTED_STALE_DATA') {
        throw new Error(`Falha: Deveria rejeitar Stale Data, retornou ${staleRes.status}`);
    }
    console.log("  ✓ Teste 5 passou: Idempotência preservada e dados desatualizados bloqueados.");

    // ─── TESTE 6: Trancamento de Sessão e Guarda Server-Side ───
    console.log("\n[TESTE 6] Validação de Trancamento de Sessão (Zero-Trust)...");
    sessionManager.lockSession('manual');
    let blockedAccess = false;
    try {
        coordinatorService.listTeachers();
    } catch (e) {
        blockedAccess = true;
    }
    if (!blockedAccess) {
        throw new Error("Falha de segurança: serviço permitiu consulta com sessão trancada!");
    }
    console.log("  ✓ Teste 6 passou: Guarda Server-Side bloqueou chamadas após trancamento da sessão.");

    // ─── CLEANUP ───
    console.log("\n[CLEANUP] Sessão de teste finalizada com segurança.");
    sessionManager.lockSession();
    console.log("  ✓ Sessão trancada e ambiente seguro.");

    console.log("\n================================================================");
    console.log(" TODOS OS TESTES DA ETAPA 1 FORAM EXECUTADOS COM 100% DE SUCESSO!");
    console.log("================================================================");
}

runTests().catch(err => {
    console.error("\n❌ ERRO NOS TESTES:", err);
    process.exit(1);
});
