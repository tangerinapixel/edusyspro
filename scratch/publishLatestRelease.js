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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Inteligência da Governança Escolar & Blindagem de Dados

- **🏛️ Governança Escolar & Unificação Canônica Perfeita**: Saneamento completo do cofre da coordenação com purga automática prévia na reingestão de snapshots docentes, eliminando registros órfãos ou excluídos e consolidando as matrículas com precisão matemática.
- **🛡️ Isolamento Estrito de Unidade Letiva nas Médias Globais**: Cálculo da Média Geral da Escola e Dossiê 360º do Estudante protegidos contra vazamento inter-trimestral, contabilizando notas, atividades e penalidades exclusivamente na unidade de referência ativa.
- **📚 Histórico Completo & Transição Fluida de Unidades**: Rastreio granular de lições e atividades por unidade letiva, garantindo acesso completo ao histórico da 1ª e 2ª Unidade e continuidade de lançamentos na 3ª Unidade.
- **🔐 Segurança Nível SaaS na Gestão de Acessos**: Redefinição de senha e PIN do coordenador com exigência de re-autenticação prévia da credencial atual e proteção de sessão.
- **✨ Tolerância a Variações Cadastrais & Chave Canônica Robusta**: Resolvedor de identidade multi-docente aprimorado com tolerância a preposições da língua portuguesa, garantindo unificação impecável de prontuários em diferentes disciplinas.
- **🎨 Estabilidade Visual e Identidade Preservada**: Ícones vetoriais em alta fidelidade na autenticação e nas barras laterais, e ícone corporativo nativo do Windows (.exe) no instalador e Área de Trabalho.
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
