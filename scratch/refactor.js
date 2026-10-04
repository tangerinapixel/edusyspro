const fs = require('fs');

let content = fs.readFileSync('src/components/modals/GlobalModals.jsx', 'utf8');

// Add import if missing
if (!content.includes('AnimatedModal')) {
    content = content.replace(/(import React.*?;)/, "$1\nimport AnimatedModal from '../shared/AnimatedModal';");
}

function findBalanced(text, start) {
    let count = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') count++;
        else if (text[i] === '}') {
            count--;
            if (count === 0) return i;
        }
    }
    return -1;
}

function replaceModal(text, modalState, closeFn, maxWidth, zIndex, extraCond) {
    let condStr = modalState;
    if (extraCond) condStr = `${modalState} && ${extraCond}`;
    
    // Search for {condStr && (
    let escapedCondStr = condStr.replace(/\./g, '\\.');
    let regexStr = `\\{` + escapedCondStr + `\\s*&&\\s*\\(\\s*<div className="fixed inset-0[^>]*>\\s*<div className="[^"]*w-full (${maxWidth})[^"]*"[^>]*>`;
    let regex = new RegExp(regexStr);
    let match = regex.exec(text);
    
    if (!match) {
        regexStr = `\\{` + escapedCondStr + `\\s*&&\\s*\\(\\s*<div className="fixed inset-0[^>]*>\\s*<div className="[^"]*w-full ([a-zA-Z0-9_-]+)[^"]*"[^>]*>`;
        regex = new RegExp(regexStr);
        match = regex.exec(text);
        if (!match) return text;
    }

    let startIdx = match.index;
    let endBrace = findBalanced(text, startIdx);
    
    if (endBrace === -1) return text;
    
    let block = text.substring(startIdx, endBrace + 1);
    
    let div1Start = block.indexOf('<div');
    let div1End = block.indexOf('>', div1Start);
    let div2Start = block.indexOf('<div', div1End);
    let div2End = block.indexOf('>', div2Start);
    
    let innerContentStart = div2End + 1;
    
    let count = 1;
    let i = innerContentStart;
    while (count > 0 && i < block.length) {
        if (block.startsWith('<div', i)) count++;
        else if (block.startsWith('</div', i)) count--;
        i++;
    }
    let innerContentEnd = i - 6; // len('</div>')
    
    let innerHtml = block.substring(innerContentStart, innerContentEnd);
    let actualMaxWidth = match[1];
    
    let onClose = closeFn ? `() => ${closeFn}` : `() => {}`;
    
    let newBlock = `<AnimatedModal isOpen={${modalState}} onClose={${onClose}} maxWidth="${actualMaxWidth}" zIndex="${zIndex}">\n${innerHtml}\n      </AnimatedModal>`;
    
    if (extraCond) {
        newBlock = `{${extraCond} && (\n      ${newBlock}\n      )}`;
    }

    return text.substring(0, startIdx) + newBlock + text.substring(endBrace + 1);
}

const modals = [
    ['isParamsModalOpen', 'setIsParamsModalOpen(false)', 'max-w-2xl', 'z-50', 'settings'],
    ['isMetricsModalOpen', 'setIsMetricsModalOpen(false)', 'max-w-4xl', 'z-50', 'settings'],
    ['isPremiumModalOpen', 'setIsPremiumModalOpen(false)', 'max-w-2xl', 'z-50', 'settings'],
    ['profileModalOpen', 'setProfileModalOpen(false)', 'max-w-4xl', 'z-50', 'studentProfile'],
    ['isModalOpen', 'setIsModalOpen(false)', 'max-w-md', 'z-50', null],
    ['bulkModalOpen', 'setBulkModalOpen(false)', 'max-w-2xl', 'z-50', null],
    ['evalModalOpen', 'setEvalModalOpen(false)', 'max-w-5xl', 'z-50', 'studentForEval'],
    ['deleteModalOpen', 'setDeleteModalOpen(false)', 'max-w-sm', 'z-50', 'studentToDelete'],
    ['isConfirmOccurrenceUncheckOpen', '{ setIsConfirmOccurrenceUncheckOpen(false); setPendingOccurrenceUncheck(null); }', 'max-w-sm', 'z-[110]', 'pendingOccurrenceUncheck'],
    ['turmaModalOpen', 'setTurmaModalOpen(false)', 'max-w-md', 'z-[100]', null],
    ['logoutConfirmOpen', 'setLogoutConfirmOpen(false)', 'max-w-sm', 'z-[60]', null],
    ['restoreConfirmOpen', 'setRestoreConfirmOpen(false)', 'max-w-sm', 'z-[60]', null],
    ['alertConfig.open', 'setAlertConfig({ ...alertConfig, open: false })', 'max-w-sm', 'z-[100]', null],
    ['isAIModalOpen', 'setIsAIModalOpen(false)', 'max-w-2xl', 'z-[100]', null],
    ['isEditTurmaModalOpen', 'setIsEditTurmaModalOpen(false)', 'max-w-md', 'z-[110]', 'turmaToManage'],
    ['isDeleteTurmaModalOpen', 'setIsDeleteTurmaModalOpen(false)', 'max-w-sm', 'z-[110]', 'turmaToManage'],
    ['isDisciplinaryModalOpen', 'setIsDisciplinaryModalOpen(false)', 'max-w-6xl', 'z-[200]', null],
];

for (let m of modals) {
    content = replaceModal(content, m[0], m[1], m[2], m[3], m[4]);
}

// Delete duplicate modals that were moved to Atividades.jsx
function deleteModalBlock(text, modalState) {
    let regex = new RegExp(`\\{\\s*${modalState.replace(/\./g, '\\.')}\\s*&&\\s*\\(`);
    let match = regex.exec(text);
    if (match) {
        let startIdx = match.index;
        let endBrace = findBalanced(text, startIdx);
        if (endBrace !== -1) {
            let linesBefore = text.substring(0, startIdx).trimEnd();
            let lastNewline = linesBefore.lastIndexOf('\n');
            if (linesBefore.substring(lastNewline).includes('MODAL')) {
                startIdx = lastNewline;
            }
            return text.substring(0, startIdx) + text.substring(endBrace + 1);
        }
    }
    return text;
}

content = deleteModalBlock(content, 'topicModalOpen');
content = deleteModalBlock(content, 'deleteActivityConfirmOpen');
content = deleteModalBlock(content, 'isConfirmUncheckOpen && pendingActivityUncheck');

fs.writeFileSync('src/components/modals/GlobalModals.jsx', content, 'utf8');
console.log("Refactored successfully");
