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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Centralização da Atualização & Blindagem Visual Total de Modais

- **🎯 Centralização Absoluta do Popup de Atualização**: O aviso de novas versões agora se posiciona no centro exato do monitor com transição suave, eliminando o deslocamento para o rodapé.
- **📐 Dimensões Estáveis & Zero Layout Shift (CLS)**: O popup possui dimensões fixas (460px × 196px) com slot permanente reservado para a barra de progresso, impedindo que o card altere de tamanho ou dê saltos verticais ao iniciar o download.
- **🛡️ Blindagem de Backdrop sem Vazamento de Camadas (Z-Index)**: Reestruturação da escala de empilhamento do sistema (modais em \`z-[1100]\` e confirmações em \`z-[1200]\`), garantindo que o escurecimento translúcido cubra perfeitamente o cabeçalho superior e botões flutuantes.
- **📦 Arquitetura de Backup Resiliente Nível SaaS (Google Drive)**: Cofre imutável WORM com assinatura SHA-256, guardião volumétrico anti-encolhimento (>5%), air-gap profundo de ambientes, política de retenção GFS e auto-healing de consistência de ponteiros.
- **🏛️ Sincronização Multi-Docente Blindada na Gestão Escolar**: Filtro inteligente de varredura isolando os snapshots do cofre e paginação de 1000 docentes no painel da Coordenação.
- **⏳ Máquina do Tempo de Backups com Rollback Preventivo**: Interface visual de restauração histórica com geração automática de snapshot de emergência local.
- **✅ 100% Homologado em Testes de Não-Regressão**: Suíte de testes aprovada garantindo total estabilidade do aplicativo.`;

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
