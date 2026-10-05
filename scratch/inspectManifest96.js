const fs = require('fs');
const path = require('path');

const localVault = path.join(process.cwd(), 'coordinator_vault');
const manifest = JSON.parse(fs.readFileSync(path.join(localVault, 'manifest.json'), 'utf8'));

const students = Object.values(manifest.canonical_students);
console.log('Total de estudantes no manifest.json:', students.length);

// Agrupar por turma_base
const byBase = {};
students.forEach(s => {
  const base = s.turma_base || 'sem_base';
  if (!byBase[base]) byBase[base] = [];
  byBase[base].push(s);
});

for (const [base, list] of Object.entries(byBase)) {
  console.log(`\nBase: ${base} -> ${list.length} estudantes`);
  // Verificar se há nomes com apenas 1 enrolled_teacher ou nomes parecidos
  list.forEach(s => {
    const enrollCount = (s.enrolled_teachers || []).length;
    if (enrollCount < 2) {
      console.log(`  [ENROLL < 2] ${s.canonical_name} (${s.canonical_id}) - enrolled: ${enrollCount} - turmas: ${JSON.stringify(s.turmas)}`);
    }
  });
}
