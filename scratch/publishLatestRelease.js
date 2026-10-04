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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Dossiê Oficial em PDF & Seletores Premium

- **📄 Relatório Oficial Completo em PDF (Dossiê 360º)**: Exportação documental institucional de alta fidelidade diagramada para papel A4, incluindo cabeçalho oficial auditado, matriz de notas, instrumentos de avaliação, histórico de conduta, pareceres pedagógicos compilados de Markdown e área de assinaturas formais.
- **🎯 Funil Hierárquico Bidimensional (Unidade / Matéria)**: Nova arquitetura de filtragem no Dossiê que permite ao coordenador analisar tanto a visão global integrada quanto focar em matérias específicas, recalculando médias e KPIs em tempo real.
- **💎 Seletores Premium com Popovers Flutuantes**: Substituição dos controles nativos do navegador por seletores estilizados com badges de categoria (TURMA, UNIDADE, MATÉRIA), micro-animações de foco, rotação de chevron e menus com confirmação visual.
- **🛡️ Refinamento de UX no Header da Coordenação**: Ajuste contextual para ocultar o campo de busca global quando em visualização do dossiê individual, mantendo o ambiente limpo e focado no aluno.`;

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
