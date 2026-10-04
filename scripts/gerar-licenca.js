/**
 * GERADOR ADMINISTRATIVO DE LICENÇAS - EDUSYS PRO
 * Uso exclusivo do Desenvolvedor / Administrador
 * 
 * Exemplos de Execução:
 * node scripts/gerar-licenca.js --init-keys
 * node scripts/gerar-licenca.js --cliente "Prof. Roberto" --id "B3F9-8A12-4C77-9E01" --periodo 7d
 * node scripts/gerar-licenca.js --cliente "Escola Dom Pedro" --id "B3F9-8A12-4C77-9E01" --periodo 3m
 * node scripts/gerar-licenca.js --cliente "Prof. Carlos" --id "B3F9-8A12-4C77-9E01" --periodo 1y
 * node scripts/gerar-licenca.js --cliente "Demo" --id "B3F9-8A12-4C77-9E01" --periodo vitalicio
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_DIR = path.join(__dirname, 'chaves');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.key');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.key');

function ensureKeys() {
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log('[🔑] Gerando novo par de chaves mestras Ed25519...');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf8');
        fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf8');
        console.log('[✅] Chaves salvas em scripts/chaves/');
    }

    return {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
    };
}

function parsePeriodo(periodoStr, customTermino = null) {
    const rawInput = (customTermino || periodoStr || '').trim();

    if (!rawInput || rawInput.toLowerCase() === 'vitalicio') {
        return { planType: 'LIFETIME', expiresAt: null, label: 'Vitalícia' };
    }

    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Suporte a Data Explícita no Formato ISO (YYYY-MM-DD) ou Brasileiro (DD/MM/YYYY)
    const isoMatch = rawInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const brMatch = rawInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (isoMatch || brMatch) {
        let year, month, day;
        if (isoMatch) {
            year = parseInt(isoMatch[1], 10);
            month = parseInt(isoMatch[2], 10);
            day = parseInt(isoMatch[3], 10);
        } else {
            day = parseInt(brMatch[1], 10);
            month = parseInt(brMatch[2], 10);
            year = parseInt(brMatch[3], 10);
        }

        const expires = new Date(year, month - 1, day, 23, 59, 59, 999);
        if (isNaN(expires.getTime())) {
            throw new Error(`Data de término inválida: "${rawInput}".`);
        }

        const expMidnight = new Date(year, month - 1, day).getTime();
        const diffDays = Math.round((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            throw new Error(`A data de término informada (${rawInput}) já expirou no passado.`);
        }

        let planType = 'CUSTOM_TERM';
        if (diffDays === 7) planType = 'TRIAL_7D';
        else if (diffDays === 15) planType = 'TRIAL_15D';
        else if (diffDays >= 85 && diffDays <= 95) planType = '3_MONTHS';
        else if (diffDays >= 170 && diffDays <= 190) planType = '6_MONTHS';
        else if (diffDays >= 360 && diffDays <= 370) planType = '1_YEAR';

        return {
            planType,
            expiresAt: expires.toISOString(),
            label: `Válida até ${expires.toLocaleDateString('pt-BR')} (${diffDays} dias)`
        };
    }

    // 2. Períodos Relativos (ex: 7d, 15d, 3m, 6m, 1y)
    const match = rawInput.toLowerCase().match(/^(\d+)([dmya]?)$/);
    if (!match) {
        throw new Error(`Formato de período ou data inválido: "${rawInput}". Use períodos (ex: 7d, 15d, 3m, 6m, 1y, vitalicio) ou datas (ex: 2026-12-31, 31/12/2026).`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'd';
    let days = 0;

    switch (unit) {
        case 'd': days = value; break;
        case 'm': days = value * 30; break;
        case 'y':
        case 'a': days = value * 365; break;
        default: days = value;
    }

    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    expires.setHours(23, 59, 59, 999);

    let planType = `${days}_DAYS`;
    if (days === 7) planType = 'TRIAL_7D';
    else if (days === 15) planType = 'TRIAL_15D';
    else if (days >= 85 && days <= 95) planType = '3_MONTHS';
    else if (days >= 170 && days <= 190) planType = '6_MONTHS';
    else if (days >= 360 && days <= 370) planType = '1_YEAR';

    return {
        planType,
        expiresAt: expires.toISOString(),
        label: `${days} dias (expira em ${expires.toLocaleDateString('pt-BR')})`
    };
}

function generateLicenseToken({ clientName, machineId, periodoStr, customTermino = null }) {
    const { privateKey } = ensureKeys();
    const periodo = parsePeriodo(periodoStr, customTermino);

    const payload = {
        clientName: clientName || 'Cliente EduSys Pro',
        machineId: (machineId || '*').toUpperCase().trim(),
        planType: periodo.planType,
        issuedAt: new Date().toISOString(),
        expiresAt: periodo.expiresAt,
        features: ['ALL_MODULES', 'BNCC_UNIFIED', 'AI_PREMIUM', 'OMR_SCANNER']
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');

    const signatureBuffer = crypto.sign(null, Buffer.from(payloadB64), privateKey);
    const signatureB64 = signatureBuffer.toString('base64');
    const token = `EDUSYS.${payloadB64}.${signatureB64}`;

    return { token, payload, label: periodo.label };
}

// Execução CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--init-keys')) {
        const { publicKey } = ensureKeys();
        console.log('\n--- CHAVE PÚBLICA PARA EMBUTIR NO APP ---');
        console.log(publicKey);
        process.exit(0);
    }

    let clientName = 'Professor Usuário';
    let machineId = '';
    let periodoStr = '1y';
    let customTermino = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--cliente' && args[i + 1]) {
            clientName = args[i + 1];
            i++;
        } else if ((args[i] === '--id' || args[i] === '--machine') && args[i + 1]) {
            machineId = args[i + 1];
            i++;
        } else if (args[i] === '--periodo' && args[i + 1]) {
            periodoStr = args[i + 1];
            i++;
        } else if ((args[i] === '--termino' || args[i] === '--data' || args[i] === '--ate') && args[i + 1]) {
            customTermino = args[i + 1];
            i++;
        }
    }

    if (!machineId) {
        console.log('\n⚠️ ATENÇÃO: Nenhum Machine ID fornecido (--id XXXX-XXXX-XXXX-XXXX).');
        console.log('Emitindo licença universal (*) ou especifique o ID do cliente.\n');
        machineId = '*';
    }

    try {
        const res = generateLicenseToken({ clientName, machineId, periodoStr, customTermino });
        console.log('\n======================================================');
        console.log('🎉 LICENÇA EDUSYS PRO EMITIDA COM SUCESSO');
        console.log('======================================================');
        console.log(`Cliente:      ${res.payload.clientName}`);
        console.log(`Machine ID:   ${res.payload.machineId}`);
        console.log(`Validade:     ${res.label}`);
        console.log(`Expiração:    ${res.payload.expiresAt || 'Sem Expiração (Vitalícia)'}`);
        console.log('------------------------------------------------------');
        console.log('COPIE A CHAVE ABAIXO E ENVIE AO CLIENTE:');
        console.log('------------------------------------------------------');
        console.log(res.token);
        console.log('======================================================\n');
    } catch (err) {
        console.error('❌ Erro ao emitir licença:', err.message);
        process.exit(1);
    }
}

module.exports = {
    ensureKeys,
    generateLicenseToken,
    parsePeriodo
};
