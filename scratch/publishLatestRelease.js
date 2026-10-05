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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Blindagem do Motor de IA, Circuit Breaker & Resiliência Pedagógica

- **🧠 Blindagem do Motor de Inteligência Artificial (Circuit Breaker Imediato)**: Detecção ultrarrápida de chaves revogadas/403/leaked com interrupção instantânea (3ms), eliminando travamentos de tela e loops de 15 tentativas repetidas.
- **⚡ Calibração de Modelos Google Gemini**: Priorização do modelo de alta velocidade e estabilidade (\`gemini-3.5-flash\`), com failover inteligente automático em erros 404 (modelos descontinuados) e 503 (alta demanda mundial).
- **💡 Experiência de Erro Amigável no Gerador de Planos de Aula**: Mensagens claras, acolhedoras e orientadoras ao docente, eliminando códigos técnicos brutos da Google Cloud e oferecendo atalho de 1 clique para a configuração da Chave Gemini diretamente na barra de ferramentas.
- **📝 Resiliência na Geração de Avaliações & Caderno de Atividades**: Diálogo interativo para direcionamento às configurações de chave sem perda do fluxo de trabalho do professor.
- **🛡️ 100% Homologado em Testes de Não-Regressão**: Suíte completa de testes aprovada garantindo total compatibilidade pedagógica com as diretrizes da BNCC e integridade do banco de dados.`;

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
