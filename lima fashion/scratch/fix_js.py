with open(r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def fix(line_idx, expected_str, replacement):
    if expected_str in lines[line_idx]:
        lines[line_idx] = lines[line_idx].replace(expected_str, replacement)

# Since we don't know exact line numbers due to appending, we just replace the exact match on the exact line 
# wait, line numbers didn't change for the first 431 lines!
fix(77, "{ username, password }", "{ username, password });") # line 77: apiFetch("POST", "/superadmin/login", { username, password }
fix(88, "}", "});") # line 88: loginForm.addEventListener("submit"
fix(98, "catch(() => {}", "catch(() => {});")
fix(101, "}", "});") # logoutBtn click
fix(141, "}", "});") # nav-item click inner
fix(142, "}", "});") # nav-item forEach outer
fix(146, "}", "});") # refreshBtn click
fix(308, "}", "});") # openAddAdminBtn click
fix(335, "email }", "email });") # add admin API call
fix(343, "}", "});") # addAdminForm submit
fix(369, "{ password: pw }", "{ password: pw });") # reset password API
fix(373, "}", "});") # confirmResetBtn click

# Fix the initPluginsTemplates closing
for i in range(len(lines)):
    if 'function initPluginsTemplates() {' in lines[i]:
        # find the next line with '});'
        for j in range(i, len(lines)):
            if '});' in lines[j]:
                lines[j] = lines[j].replace('});', '}')
                break
        break

with open(r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Fixed JS syntax errors")
