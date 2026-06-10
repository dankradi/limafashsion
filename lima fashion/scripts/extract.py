import re

html_path = r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\mainpage.html'
css_path = r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\style.css'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS and save
css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if css_match:
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css_match.group(1).strip())

content = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="style.css">', content, flags=re.DOTALL)

# Add page-shop after page-home
shop_page_html = """
        <section id="page-shop" class="page">
            <div class="section" style="padding-top: 120px;">
                <div class="section-header">
                    <div class="section-tag" id="shopTag">ALL PRODUCTS</div>
                    <h2 class="section-title" id="shopTitle">Shop <em class="lime">Collection</em></h2>
                </div>
                <div id="shopGrid" class="featured-grid" style="padding: 0 5%;">
                    <!-- Shop items inserted via JS -->
                </div>
            </div>
            
            <footer class="site-footer">
                <div class="footer-logo">Lime<span>.</span>Fashion</div>
                <div class="footer-copy">&copy; 2025 Lime Fashion Ghana. All rights reserved.</div>
                <div class="footer-links">
                    <span>📍 Accra, Ghana | </span>
                    <span>📞 +233 24 000 0000 | </span>
                    <span>✉️ hello@limefashion.gh</span>
                </div>
            </footer>
        </section>
"""

content = content.replace('</section>\n    </main>', '</section>\n' + shop_page_html + '    </main>')

# Replace <script>
content = re.sub(r'<script>.*?</script>', '<script src="script.js"></script>', content, flags=re.DOTALL)

# Update nav links to use router functions
content = content.replace('<li><a class="active">HOME</a></li>', '<li><a class="active" onclick="showPage(\'home\')" style="cursor:pointer">HOME</a></li>')
content = content.replace('<li><a>WOMEN</a></li>', '<li><a onclick="showCategory(\'WOMEN\')" style="cursor:pointer">WOMEN</a></li>')
content = content.replace('<li><a>MEN</a></li>', '<li><a onclick="showCategory(\'MEN\')" style="cursor:pointer">MEN</a></li>')
content = content.replace('<li><a>CHILDREN</a></li>', '<li><a onclick="showCategory(\'CHILDREN\')" style="cursor:pointer">CHILDREN</a></li>')
content = content.replace('<li><a>ALL PRODUCTS</a></li>', '<li><a onclick="showCategory(\'ALL\')" style="cursor:pointer">ALL PRODUCTS</a></li>')

# Navbar clicks for logo
content = content.replace('onclick="showPage(\'home\')">Lime<span>.</span>Fashion', 'onclick="showPage(\'home\')" style="cursor:pointer;">Lime<span>.</span>Fashion')

# The big buttons in hero and categories
content = content.replace('<button class="btn-small-lime">Shop Women &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(\'WOMEN\')">Shop Women &rarr;</button>')
content = content.replace('<button class="btn-small-lime">Shop Men &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(\'MEN\')">Shop Men &rarr;</button>')
content = content.replace('<button class="btn-small-lime">Shop Kids &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(\'CHILDREN\')">Shop Kids &rarr;</button>')
content = content.replace('<button class="btn-outline">Browse Categories</button>', '<button class="btn-outline" onclick="showCategory(\'ALL\')">Browse Categories</button>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
