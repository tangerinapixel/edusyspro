const fs = require('fs');
const crypto = require('crypto');

const ENCRYPTION_SECRET = 'EduSysPro_Local_Secure_Secret_Key_v3_2026';
const ALGORITHM = 'aes-256-cbc';
function getDerivedKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}
function decryptData(text) {
    if (typeof text !== 'string') return text;
    if (text.trim().startsWith('{')) return text;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const raw = fs.readFileSync('school_data.json', 'utf8');
const data = JSON.parse(decryptData(raw));

const pairs = [
  { ptId: 1, mpvId: 5, serie: '6º Ano' },
  { ptId: 2, mpvId: 7, serie: '7º Ano' },
  { ptId: 3, mpvId: 8, serie: '8º Ano' },
  { ptId: 4, mpvId: 6, serie: '9º Ano' },
];

function norm(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

pairs.forEach(pair => {
  const ptStudents = (data.students || []).filter(s => s.turma_id === pair.ptId);
  const mpvStudents = (data.students || []).filter(s => s.turma_id === pair.mpvId);
  console.log('\n=== SERIE: ' + pair.serie + ' ===');
  console.log('Portugues (Turma ' + pair.ptId + '): ' + ptStudents.length + ' alunos');
  console.log('MPV (Turma ' + pair.mpvId + '): ' + mpvStudents.length + ' alunos');
  
  const ptNorm = new Set(ptStudents.map(s => norm(s.name)));
  const mpvNorm = new Set(mpvStudents.map(s => norm(s.name)));

  const inMpvNotPt = mpvStudents.filter(s => !ptNorm.has(norm(s.name)));
  const inPtNotMpv = ptStudents.filter(s => !mpvNorm.has(norm(s.name)));

  if (inMpvNotPt.length || inPtNotMpv.length) {
    console.log('  Divergencias encontradas:');
    inPtNotMpv.forEach(s => console.log('   - So em PT: "' + s.name + '"'));
    inMpvNotPt.forEach(s => console.log('   - So em MPV: "' + s.name + '"'));
  } else {
    console.log('  -> 100% dos nomes conferem perfeitamente entre Portugues e MPV!');
  }
});
