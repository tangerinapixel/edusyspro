import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/components/modals/GlobalModals.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure import is there
if (!content.includes('AnimatedModal')) {
    content = content.replace(/(import React.*?;\n)/, "$1import AnimatedModal from '../shared/AnimatedModal';\n");
}

// Remove the 3 modals that were moved to Atividades.jsx to avoid duplication.
// 1. topicModalOpen
// 2. isConfirmUncheckOpen
// 3. deleteActivityConfirmOpen
// 4. isConfirmOccurrenceUncheckOpen (Wait, was this moved? No, only Activity ones).
// Actually, it's safer to just replace all modals with AnimatedModal rather than deleting them if they might still be used here. 
// If Atividades.jsx also renders them, they might duplicate but React will just render both.
// Let's just refactor ALL conditionals.

const pattern = /\{([a-zA-Z0-9_]+ModalOpen|is[a-zA-Z0-9_]+Open|[a-zA-Z0-9_]+ConfirmOpen|alertConfig\.open)\s*(?:&&\s*([a-zA-Z0-9_]+(?:\.length)?))?\s*&&\s*\(\s*(<div className="fixed inset-0[\s\S]*?)\s*\)\}/g;

// Wait, the regex is too brittle.
// I will just use manual replace chunks using multi_replace_file_content for each modal.
