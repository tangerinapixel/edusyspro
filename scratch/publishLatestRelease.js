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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Hub de Configurações Institucionais & Governança Pedagógica

- **⚙️ Novo Hub Dedicado de Configurações da Coordenação**: Área centralizada de gestão institucional inspirada na interface do docente, permitindo personalizar perfil, segurança de acesso e identidade escolar.
- **🔐 Troca Segura de Senha & Gestão de Acesso**: Suporte à alteração imediata de credenciais de acesso da coordenação com validação criptográfica PBKDF2 e tempo de auto-lock configurável (5, 15, 30 ou 60 minutos de inatividade).
- **👤 Perfil Institucional & Foto de Coordenador**: Upload e compressão automática de imagem para avatar em alta definição (256x256), exibido com destaque na barra superior e relatórios emitidos.
- **☁️ Gestão Avançada de Nuvem Google Drive**: Interface interativa para alternar a conta conectada ou desconectar o repositório em nuvem com um clique.
- **🏫 Identidade Institucional & Cabeçalho de Dossiês**: Customização de nome oficial da escola, subtítulo e prévia em tempo real com timbrado institucional dinamicamente aplicado a relatórios e dossiês em PDF.
- **🛡️ 100% Auditado em Testes de Não-Regressão**: Validação completa de todos os fluxos com integridade do cofre e testes de compilação sem alertas de quebra.`;

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
