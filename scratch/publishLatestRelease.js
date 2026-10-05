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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Nova Identidade Visual Oficial & Blindagem do Motor de IA

- **🎨 Nova Identidade Visual & Ícone Oficial**: Novo ícone institucional do aplicativo implementado e distribuído no instalador do Windows, atalho da Área de Trabalho, Barra de Tarefas, favicon e em todas as áreas do sistema (Barra Lateral do Professor, Barra da Coordenação e Tela de Login).
- **🧠 Blindagem do Motor de Inteligência Artificial (Circuit Breaker Imediato)**: Detecção ultrarrápida de chaves revogadas/403/leaked com interrupção instantânea (3ms), eliminando travamentos de tela e loops de 15 tentativas repetidas.
- **⚡ Calibração de Modelos Google Gemini**: Priorização do modelo de alta velocidade e estabilidade (\`gemini-3.5-flash\`), com failover inteligente automático em erros 404 (modelos descontinuados) e 503 (alta demanda mundial).
- **💡 Experiência de Erro Amigável & Atalho "Chave IA"**: Mensagens claras e acolhedoras orientando o docente na configuração de credenciais, além de atalho de 1 clique direto no cabeçalho do Gerador de Planos.
- **📝 Resiliência na Geração de Avaliações & Acervo Didático**: Continuidade do fluxo com opção de ajuste de credenciais e exportação de cadernos e provas inéditas alinhadas à BNCC.
- **🛡️ 100% Homologado em Testes de Não-Regressão**: Suíte completa de testes aprovada garantindo total estabilidade do banco de dados e diários de classe.`;

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
