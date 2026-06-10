import re

log_path = r'C:\Users\Manuel.MANUEL\.gemini\antigravity\brain\da3ccf4e-1eb0-48a1-8606-7ad1c73cf2d7\.system_generated\logs\overview.txt'
super_js = r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js'

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
for i in range(len(lines)-1, -1, -1):
    if 'File Path: `file:///c:/Users/Manuel.MANUEL/Desktop/lima%20fashion/super_admin/superadmin.js`' in lines[i]:
        start_idx = i
        break

if start_idx != -1:
    # Find start of file content
    content_start = -1
    for i in range(start_idx, len(lines)):
        if re.match(r'^\d+: ', lines[i]):
            content_start = i
            break
            
    # Read until line 432
    original_lines = []
    for i in range(content_start, len(lines)):
        match = re.match(r'^\d+: (.*)', lines[i])
        if match:
            original_lines.append(match.group(1) + '\n')
            if lines[i].startswith('432:'):
                break
        else:
            break
            
    # Now read the current superadmin.js and get everything from line 433 onwards
    with open(super_js, 'r', encoding='utf-8') as f:
        current_lines = f.readlines()
        
    # the appended logic starts after line 432 in current_lines
    appended_logic = current_lines[432:]
    
    # Fix the initPluginsTemplates closing brace in the appended logic
    # Find "function initPluginsTemplates() {" and replace the matching "});" with "}"
    fixed_appended = []
    for line in appended_logic:
        if line.strip() == '});':
            # Check if this is the end of initPluginsTemplates
            fixed_appended.append(line.replace('});', '}'))
        else:
            fixed_appended.append(line)
            
    # Write back
    with open(super_js, 'w', encoding='utf-8') as f:
        f.writelines(original_lines)
        f.writelines(fixed_appended)
    print("Restored successfully")
else:
    print("Could not find in log")
