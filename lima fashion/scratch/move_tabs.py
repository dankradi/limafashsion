import re

def move_tabs():
    admin_html = r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\admin\yourlimadash.html"
    super_html = r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\index.html"
    
    with open(admin_html, "r", encoding="utf-8") as f:
        content = f.read()

    # We need to extract:
    # 1. nav links (to remove from admin)
    nav_links_pattern = re.compile(
        r'(\s*<li><a onclick="switchTab\(\'plugins\'\)">🔌 Plugins</a></li>\s*<li><a onclick="switchTab\(\'templates\'\)">🎨 Templates</a></li>\s*<li><a onclick="switchTab\(\'settings\'\)">⚙️ Settings</a></li>)'
    )
    content = nav_links_pattern.sub("", content)

    # 2. Extract tab contents
    # For Products, we KEEP it in admin, but COPY to super_admin
    prod_match = re.search(r'(<div id="tab-products".*?<!-- ==================== ORDERS TAB ==================== -->)', content, re.DOTALL)
    prod_html = prod_match.group(1).replace('<!-- ==================== ORDERS TAB ==================== -->', '') if prod_match else ""

    # For Plugins, Templates, Settings, we REMOVE from admin and MOVE to super_admin
    # Find start of tab-plugins
    start_plugins = content.find('<div id="tab-plugins"')
    # Find end of tab-settings (before <!-- VIEW ORDER MODAL -->)
    end_settings = content.find('<!-- VIEW ORDER MODAL -->')
    
    tabs_html = content[start_plugins:end_settings]
    
    # Remove from admin
    new_admin_content = content[:start_plugins] + content[end_settings:]
    
    with open(admin_html, "w", encoding="utf-8") as f:
        f.write(new_admin_content)
        
    # Now for super_admin/index.html
    with open(super_html, "r", encoding="utf-8") as f:
        super_content = f.read()
        
    # Insert nav links in super_admin
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
    
    # Insert tab contents in super_admin before </main>
    # We need to change the class from "admin-tab" to "tab-content" for super_admin
    prod_html = prod_html.replace('class="admin-tab"', 'class="tab-content"')
    tabs_html = tabs_html.replace('class="admin-tab"', 'class="tab-content"')
    
    # Insert products
    super_content = super_content.replace('</main>', prod_html + '\n' + tabs_html + '\n</main>')
    
    with open(super_html, "w", encoding="utf-8") as f:
        f.write(super_content)

if __name__ == "__main__":
    move_tabs()
    print("Migration complete")
