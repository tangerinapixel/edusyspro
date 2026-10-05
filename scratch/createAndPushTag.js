require('dotenv').config();
const { execSync } = require('child_process');

const pkg = require('../package.json');
const tag = `v${pkg.version}`;

try {
    console.log(`Criando tag local ${tag}...`);
    execSync(`git tag -a ${tag} -m "${tag} - Arquitetura de Backup Resiliente Nivel SaaS"`, { stdio: 'inherit' });
    console.log(`Enviando tag ${tag} com GH_TOKEN...`);
    const url = `https://${process.env.GH_TOKEN}@github.com/tangerinapixel/edusyspro.git`;
    execSync(`git push ${url} ${tag}`, { stdio: 'inherit' });
    console.log(`Tag ${tag} enviada com sucesso!`);
} catch (e) {
    console.error('Erro na tag:', e.message);
    process.exit(1);
}
