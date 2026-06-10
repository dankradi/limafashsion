import os

log_path = r'C:\Users\Manuel.MANUEL\.gemini\antigravity\brain\da3ccf4e-1eb0-48a1-8606-7ad1c73cf2d7\.system_generated\logs\overview.txt'

if not os.path.exists(log_path):
    print("Log file not found.")
else:
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    target_idx = -1
    for i in range(len(lines)-1, -1, -1):
        if 'File Path:' in lines[i] and 'superadmin.js' in lines[i]:
            target_idx = i
            break

    if target_idx != -1:
        print("Found file header at line", target_idx)
        # Find the start of the code (the first line starting with '1: ')
        code_start = -1
        for i in range(target_idx, len(lines)):
            if lines[i].startswith('1: '):
                code_start = i
                break
                
        if code_start != -1:
            print("Found code start at line", code_start)
            extracted = []
            for i in range(code_start, len(lines)):
                # lines are in format '1: content'
                parts = lines[i].split(':', 1)
                if len(parts) == 2 and parts[0].isdigit():
                    extracted.append(parts[1][1:]) # skip the leading space after colon
                else:
                    # End of file content
                    print("End of code block at line", i)
                    break
                    
            with open(r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\scratch\recovered.js', 'w', encoding='utf-8') as f:
                f.writelines(extracted)
            print("Extracted", len(extracted), "lines to recovered.js")
        else:
            print("Could not find code start")
    else:
        print("Could not find superadmin.js in log")
