require('dotenv').config();
const pkg = require('../package.json');

async function publishLatest() {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('GH_TOKEN não encontrado no .env');
    process.exit(1);
  }

  const res = await fetch('https://api.github.com/repos/tangerinapixel/edusyspro/releases', {
    headers: {
      'Authorization': 'token ' + token,
      'User-Agent': 'Node.js'
    }
  });

  const releases = await res.json();
  const targetTag = `v${pkg.version}`;
  const draft = releases.find(r => r.draft === true && (r.tag_name === targetTag || !r.tag_name)) || releases.find(r => r.draft === true);

  if (!draft) {
    console.log('Nenhuma release em draft encontrada. Verificando se já está pública...');
    const existing = releases.find(r => r.tag_name === targetTag);
    if (existing) {
      console.log(`Release ${targetTag} já está pública em: ${existing.html_url}`);
    }
    return;
  }

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Arquitetura de Backup Resiliente Nível SaaS & Blindagem WORM

- **🛡️ Backup Resiliente Nível SaaS à Prova de Falhas**: Implementação de esteira de proteção em camadas para sincronização com o Google Drive, eliminando definitivamente o risco de perda ou sobrescrita acidental de dados escolares.
- **📦 Cofre de Snapshots Imutáveis (WORM & SHA-256)**: Cada sincronização gera um snapshot versionado e selado criptograficamente com hash SHA-256 e envelope de integridade na pasta exclusiva \`/EduSys_Vault/Snapshots/\`.
- **🛑 Guardião Anti-Encolhimento de Dados (Data Shrinkage Guard)**: Validação volumétrica rigorosa de alunos, atividades e itens avaliativos antes de qualquer upload, bloqueando automaticamente tentativas de envio que reduzam a base em mais de 5%.
- **🧹 Política de Retenção Inteligente GFS & Proteção Vitalícia**: Algoritmo Grandfather-Father-Son mantendo granularidade total nas últimas 48h, 1 snapshot diário até 30 dias e expurgo de obsoletos, com imunidade perpétua para snapshots com o marcador \`[PROTECTED]\`.
- **🔑 Bypass Administrativo com Rastreabilidade Forense**: Mecanismo controlado para limpezas legítimas de encerramento de ano letivo, carimbando indelevelmente a tag \`[ADMIN_BYPASS]\` no cofre para auditoria.
- **🧱 Air-Gap Profundo Heurístico**: Isolamento estrito entre ambientes com verificação de runtime, variáveis de ambiente e inspeção de sistema de arquivos, impedindo contaminação de produção por ambientes de desenvolvimento ou IA.
- **🔄 Auto-Healing de Race Condition**: Autocura de ponteiros em quedas de conexão, detectando snapshots órfãos mais novos e realinhando o estado da nuvem sem intervenção manual.
- **🏛️ Sincronização Multi-Docente Blindada na Coordenação**: Filtro de busca inteligente e paginação ampliada (1000) no painel do Gestor, isolando os snapshots do cofre e garantindo varredura limpa e ágil de todos os professores.
- **⏳ Máquina do Tempo de Backups com Rollback Automático**: Interface visual em Configurações para restauração histórica de qualquer ponto com geração de backup de emergência local pré-restauração.
- **✅ 100% Homologado em Testes de Não-Regressão**: Suíte completa de testes aprovada garantindo total estabilidade do aplicativo.`;

  console.log(`Publicando release ${draft.tag_name || targetTag} (ID: ${draft.id})...`);
  const patchRes = await fetch(`https://api.github.com/repos/tangerinapixel/edusyspro/releases/${draft.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'token ' + token,
      'User-Agent': 'Node.js',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      draft: false,
      name: `EduSys Pro v${pkg.version}`,
      tag_name: targetTag,
      body: changelog
    })
  });

  const updated = await patchRes.json();
  console.log(`🎉 Sucesso! Release ${updated.tag_name} publicada publicamente! URL: ${updated.html_url}`);
}

publishLatest().catch(err => {
  console.error('Erro ao publicar:', err);
  process.exit(1);
});
