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

  const changelog = `### 🚀 EduSys Pro v${pkg.version} - Central de Configurações da Gestão & Governança Institucional

- **⚙️ Central de Configurações da Gestão Escolar (Coordenação)**: Nova aba dedicada e modular no Painel da Coordenação contendo gestão centralizada de identidade, segurança mestre, nuvem e timbrado institucional.
- **👤 Perfil & Identidade do Gestor**: Configuração de nome de exibição do coordenador pedagógico e inclusão/remoção de foto de perfil (avatar) com compressão e redimensionamento automático via Canvas (256x256).
- **🔐 Troca Segura de PIN Institucional & Auto-Lock**: Alteração de PIN mestre com hash criptográfico PBKDF2 (100.000 iterações com salt seguro), validação estrita de senha atual e política de auto-lock por inatividade customizável (5, 15, 30 ou 60 minutos).
- **☁️ Gestão da Conta Google Drive**: Visualização em tempo real do status de conexão na nuvem, alternância segura de conta Google institucional e opção de desconexão.
- **🏛️ Timbrado Institucional & Dossiê em PDF**: Definição oficial de nome da escola e subtítulo/slogan com prévia em tempo real de folha A4 e sincronização automática com o motor de exportação do Dossiê 360º em PDF.`;

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
