import re

admin_file = r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\admin\yourlimadash.html"
super_html = r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\index.html"
super_js = r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js"

with open(admin_file, 'r', encoding='utf-8') as f:
    admin_content = f.read()

# 1. Extract Products HTML
prod_start = admin_content.find('<!-- ==================== PRODUCTS TAB ==================== -->')
prod_end = admin_content.find('<!-- ==================== ORDERS TAB ==================== -->')
prod_html = admin_content[prod_start:prod_end]

# 2. Extract Plugins, Templates, Settings HTML
plug_start = admin_content.find('<!-- ==================== PLUGINS TAB ==================== -->')
set_end = admin_content.find('<!-- VIEW ORDER MODAL -->')
pts_html = admin_content[plug_start:set_end]

# 3. Extract Products JS
js_prod_start = admin_content.find('// 3. Admin Products Logic (LocalStorage sync)')
js_prod_end = admin_content.find('// --- ADMIN REGION LOGIC ---')
js_prod = admin_content[js_prod_start:js_prod_end]

# 4. Extract Plugins, Templates, Settings JS
js_pts_start = admin_content.find('// =============================================\n        //  PLUGINS DATA & LOGIC')
js_pts_end = admin_content.find('// 4. Chart Initialization')
if js_pts_end == -1: js_pts_end = len(admin_content) # fallback
js_pts = admin_content[js_pts_start:js_pts_end]

# 5. Extract specific CSS
css_block = """
<style>
.plugin-filter, .template-filter, .s-pill { padding: 8px 18px; border-radius: 999px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--dark2); color: var(--grey2); transition: all 0.2s; }
.plugin-filter.active, .template-filter.active, .s-pill.active { background: var(--lime); color: var(--black); border: none; }
.plugin-card { padding: 24px; transition: all 0.2s; cursor: default; position: relative; overflow: hidden; background: var(--dark2); border: 1px solid var(--border); border-radius: 12px; }
.panel { background: var(--dark2); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.dashboard-grid { display: grid; gap: 24px; }
.s-section { display: none; }
.s-section.active { display: block; }
.sf { margin-bottom: 15px; }
.sl { display: block; font-size: 0.85rem; color: var(--grey2); margin-bottom: 6px; font-weight: 600; }
.si { width: 100%; padding: 12px; background: var(--dark3); border: 1px solid var(--border); border-radius: 8px; color: var(--white); outline: none; }
.si:focus { border-color: var(--lime); }
.stoggle { margin-bottom: 15px; display: flex; flex-direction: column; }
.tgl { position: relative; display: inline-block; width: 44px; height: 24px; }
.tgl input { opacity: 0; width: 0; height: 0; }
.tgl-track { position: absolute; inset: 0; background: var(--dark4); border-radius: 12px; transition: 0.3s; cursor: pointer; }
.tgl-track:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: var(--grey); border-radius: 50%; transition: 0.3s; }
.tgl input:checked + .tgl-track { background: var(--lime); }
.tgl input:checked + .tgl-track:before { transform: translateX(20px); background: var(--black); }
.ntoggle { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
.nsub { font-size: 0.8rem; color: var(--grey); }
.dz-btn { background: var(--dark3); color: white; border: 1px solid rgba(239,68,68,0.4); border-radius: 999px; padding: 10px 18px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.dz-btn:hover { background: rgba(239,68,68,0.1); }
.diff-up { color: var(--lime); background: var(--lime-muted); padding: 2px 8px; border-radius: 6px; font-weight: 600;}
</style>
"""

# Modify admin content (Remove Plugins, Templates, Settings HTML and Nav)
new_admin_content = admin_content[:plug_start] + admin_content[set_end:]
new_admin_content = re.sub(r'\s*<li><a onclick="switchTab\(\'plugins\'\)">🔌 Plugins</a></li>\s*<li><a onclick="switchTab\(\'templates\'\)">🎨 Templates</a></li>\s*<li><a onclick="switchTab\(\'settings\'\)">⚙️ Settings</a></li>', '', new_admin_content)

with open(admin_file, 'w', encoding='utf-8') as f:
    f.write(new_admin_content)

# Update Super Admin HTML
with open(super_html, 'r', encoding='utf-8') as f:
    super_content = f.read()

nav_insert = """
      <button class="nav-item" data-tab="products">
        <span class="nav-icon">👗</span> Products
      </button>
      <button class="nav-item" data-tab="plugins">
        <span class="nav-icon">🔌</span> Plugins
      </button>
      <button class="nav-item" data-tab="templates">
        <span class="nav-icon">🎨</span> Templates
      </button>
      <button class="nav-item" data-tab="settings">
        <span class="nav-icon">⚙️</span> Settings
      </button>
"""
super_content = super_content.replace('</nav>', nav_insert + '</nav>')

prod_html = prod_html.replace('class="admin-tab"', 'class="tab-content"')
pts_html = pts_html.replace('class="admin-tab"', 'class="tab-content"')
super_content = super_content.replace('</head>', css_block + '</head>')
super_content = super_content.replace('</main>', prod_html + '\n' + pts_html + '\n</main>')

with open(super_html, 'w', encoding='utf-8') as f:
    f.write(super_content)

# Update Super Admin JS
with open(super_js, 'r', encoding='utf-8') as f:
    js_content = f.read()

titles_insert = """
  products: ["Products", "Manage store products"],
  plugins:  ["Plugins", "Manage integrations"],
  templates:["Templates", "Storefront themes"],
  settings: ["Settings", "Global store configuration"],
"""
js_content = js_content.replace('activity: ["Activity Log", "All system events across both regions"],', 'activity: ["Activity Log", "All system events across both regions"],\n' + titles_insert)

js_pts = js_pts.replace("document.addEventListener('DOMContentLoaded', function() {", "function initPluginsTemplates() {")
js_prod = js_prod.replace("const defaultProducts", "var defaultProducts")
js_content += "\\n// --- PORTED PRODUCTS LOGIC ---\\n" + js_prod + "\\n// --- PORTED SETTINGS LOGIC ---\\n" + js_pts
js_content += "\\nsetTimeout(() => { if(typeof renderAdminProducts === 'function') renderAdminProducts(); if(typeof initPluginsTemplates === 'function') initPluginsTemplates(); }, 500);\\n"

settings_logic = """
function showSettingsSection(id, btn) {
    document.querySelectorAll('.s-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.s-section').forEach(s => s.style.display = 'none');
    btn.classList.add('active');
    document.getElementById('ss-' + id).style.display = 'block';
}

function saveAllSettings() {
    alert("Settings saved successfully!");
}
"""
js_content += "\\n" + settings_logic

with open(super_js, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Migration successful")
