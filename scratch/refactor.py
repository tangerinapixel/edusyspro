import re

with open('src/components/modals/GlobalModals.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if missing
if 'AnimatedModal' not in content:
    content = re.sub(r'(import React.*?;)', r"\1\nimport AnimatedModal from '../shared/AnimatedModal';", content, count=1)

# A function to find balanced braces
def find_balanced(text, start):
    count = 0
    for i in range(start, len(text)):
        if text[i] == '{':
            count += 1
        elif text[i] == '}':
            count -= 1
            if count == 0:
                return i
    return -1

# A function to replace a specific modal pattern
def replace_modal(content, modal_state, close_fn, max_width='max-w-lg', z_index='z-50', extra_condition=None):
    # Search for the pattern {modal_state && ( or {modal_state && extra_condition && (
    cond_str = modal_state
    if extra_condition:
        cond_str = f"{modal_state} && {extra_condition}"
        
    pattern = r"\{" + cond_str.replace('.', r'\.') + r"\s*&&\s*\(\s*<div className=\"fixed inset-0[^>]*>\s*<div className=\"[^\"]*w-full (" + max_width + r")[^\"]*\"[^>]*>"
    
    match = re.search(pattern, content)
    if not match:
        # Try without specific max-width
        pattern = r"\{" + cond_str.replace('.', r'\.') + r"\s*&&\s*\(\s*<div className=\"fixed inset-0[^>]*>\s*<div className=\"[^\"]*w-full ([a-zA-Z0-9_-]+)[^\"]*\"[^>]*>"
        match = re.search(pattern, content)
        if not match:
            return content

    start_idx = match.start()
    end_brace = find_balanced(content, start_idx)
    
    if end_brace == -1:
        return content
        
    block = content[start_idx:end_brace+1]
    
    # We found the block. We need to extract the inner content.
    # The block looks like:
    # {condition && (
    #   <div fixed inset-0>
    #      <div wrapper>
    #         INNER CONTENT
    #      </div>
    #   </div>
    # )}
    
    # We will just replace the outer two divs with AnimatedModal.
    # We need to find the first <div fixed inset-0> and the first <div wrapper>
    
    div1_start = block.find('<div')
    div1_end = block.find('>', div1_start)
    
    div2_start = block.find('<div', div1_end)
    div2_end = block.find('>', div2_start)
    
    # Extract inner content by removing the closing </div></div>)}
    # The last characters are typically </div>\n      </div>\n    )}\n
    
    # Let's use a simpler regex replacement for the start and end of the block
    inner_content_start = div2_end + 1
    
    # Find the matching closing div for div2
    count = 1
    i = inner_content_start
    while count > 0 and i < len(block):
        if block.startswith('<div', i):
            count += 1
        elif block.startswith('</div', i):
            count -= 1
        i += 1
    inner_content_end = i - 6 # len('</div>')
    
    inner_html = block[inner_content_start:inner_content_end]
    
    actual_max_width = match.group(1)
    
    on_close = f"() => {close_fn}" if close_fn else "() => {}"
    
    new_block = f"""<AnimatedModal isOpen={{{modal_state}}} onClose={{{on_close}}} maxWidth="{actual_max_width}" zIndex="{z_index}">
{inner_html}
      </AnimatedModal>"""
      
    if extra_condition:
        new_block = f"{{{extra_condition} && (\n      {new_block}\n      )}}"

    return content[:start_idx] + new_block + content[end_brace+1:]

# List of modals to replace
modals = [
    ('isParamsModalOpen', 'setIsParamsModalOpen(false)', 'max-w-2xl', 'z-50', 'settings'),
    ('isMetricsModalOpen', 'setIsMetricsModalOpen(false)', 'max-w-4xl', 'z-50', 'settings'),
    ('isPremiumModalOpen', 'setIsPremiumModalOpen(false)', 'max-w-2xl', 'z-50', 'settings'),
    ('profileModalOpen', 'setProfileModalOpen(false)', 'max-w-4xl', 'z-50', 'studentProfile'),
    ('isModalOpen', 'setIsModalOpen(false)', 'max-w-md', 'z-50', None),
    ('bulkModalOpen', 'setBulkModalOpen(false)', 'max-w-2xl', 'z-50', None),
    ('evalModalOpen', 'setEvalModalOpen(false)', 'max-w-5xl', 'z-50', 'studentForEval'),
    ('deleteModalOpen', 'setDeleteModalOpen(false)', 'max-w-sm', 'z-50', 'studentToDelete'),
    ('isConfirmOccurrenceUncheckOpen', '{ setIsConfirmOccurrenceUncheckOpen(false); setPendingOccurrenceUncheck(null); }', 'max-w-sm', 'z-[110]', 'pendingOccurrenceUncheck'),
    ('turmaModalOpen', 'setTurmaModalOpen(false)', 'max-w-md', 'z-[100]', None),
    ('logoutConfirmOpen', 'setLogoutConfirmOpen(false)', 'max-w-sm', 'z-[60]', None),
    ('restoreConfirmOpen', 'setRestoreConfirmOpen(false)', 'max-w-sm', 'z-[60]', None),
    ('alertConfig.open', 'setAlertConfig({ ...alertConfig, open: false })', 'max-w-sm', 'z-[100]', None),
    ('isAIModalOpen', 'setIsAIModalOpen(false)', 'max-w-2xl', 'z-[100]', None),
    ('isEditTurmaModalOpen', 'setIsEditTurmaModalOpen(false)', 'max-w-md', 'z-[110]', 'turmaToManage'),
    ('isDeleteTurmaModalOpen', 'setIsDeleteTurmaModalOpen(false)', 'max-w-sm', 'z-[110]', 'turmaToManage'),
    ('isDisciplinaryModalOpen', 'setIsDisciplinaryModalOpen(false)', 'max-w-6xl', 'z-[200]', None),
]

for m in modals:
    content = replace_modal(content, m[0], m[1], m[2], m[3], m[4])

# Also, topicModalOpen, isConfirmUncheckOpen, deleteActivityConfirmOpen should be deleted 
# since they are now exclusively in Atividades.jsx.
def delete_modal_block(content, modal_state):
    pattern = r"\{" + modal_state + r"\s*&&\s*\("
    match = re.search(pattern, content)
    if match:
        start_idx = match.start()
        # Find where the comment for this modal starts, usually just above
        comment_pattern = r"\s*\{\/\*\s*MODAL.*" + modal_state + r".*\*\/\}\s*"
        # Actually it's simpler to just find the balanced brace.
        end_brace = find_balanced(content, start_idx)
        if end_brace != -1:
            # check previous line for comment
            lines_before = content[:start_idx].rstrip()
            last_newline = lines_before.rfind('\n')
            if "MODAL" in lines_before[last_newline:]:
                start_idx = last_newline
            
            return content[:start_idx] + content[end_brace+1:]
    return content

content = delete_modal_block(content, "topicModalOpen")
content = delete_modal_block(content, "deleteActivityConfirmOpen")
content = delete_modal_block(content, "isConfirmUncheckOpen && pendingActivityUncheck")

with open('src/components/modals/GlobalModals.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
