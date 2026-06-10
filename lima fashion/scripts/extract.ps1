$htmlPath = 'c:\Users\Manuel.MANUEL\Desktop\lima fashion\mainpage.html'
$cssPath = 'c:\Users\Manuel.MANUEL\Desktop\lima fashion\style.css'

$content = Get-Content $htmlPath -Raw

if ($content -match '(?s)<style>(.*?)</style>') {
    Set-Content -Path $cssPath -Value $matches[1].Trim() -Encoding UTF8
    $content = $content -replace '(?s)<style>.*?</style>', '<link rel="stylesheet" href="style.css">'
}

$shopPageHtml = @"
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
"@

$content = $content -replace '(?s)</section>\s*</main>', "</section>`n$shopPageHtml`n    </main>"

$content = $content -replace '(?s)<script>.*?</script>', '<script src="script.js"></script>'

$content = $content -replace '<li><a class="active">HOME</a></li>', '<li><a class="active" onclick="showPage(''home'')" style="cursor:pointer">HOME</a></li>'
$content = $content -replace '<li><a>WOMEN</a></li>', '<li><a onclick="showCategory(''WOMEN'')" style="cursor:pointer">WOMEN</a></li>'
$content = $content -replace '<li><a>MEN</a></li>', '<li><a onclick="showCategory(''MEN'')" style="cursor:pointer">MEN</a></li>'
$content = $content -replace '<li><a>CHILDREN</a></li>', '<li><a onclick="showCategory(''CHILDREN'')" style="cursor:pointer">CHILDREN</a></li>'
$content = $content -replace '<li><a>ALL PRODUCTS</a></li>', '<li><a onclick="showCategory(''ALL'')" style="cursor:pointer">ALL PRODUCTS</a></li>'

$content = $content -replace 'onclick="showPage\(''home''\)">Lime<span>\.</span>Fashion', 'onclick="showPage(''home'')" style="cursor:pointer;">Lime<span>.</span>Fashion'

$content = $content -replace '<button class="btn-small-lime">Shop Women &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(''WOMEN'')">Shop Women &rarr;</button>'
$content = $content -replace '<button class="btn-small-lime">Shop Men &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(''MEN'')">Shop Men &rarr;</button>'
$content = $content -replace '<button class="btn-small-lime">Shop Kids &rarr;</button>', '<button class="btn-small-lime" onclick="showCategory(''CHILDREN'')">Shop Kids &rarr;</button>'
$content = $content -replace '<button class="btn-outline">Browse Categories</button>', '<button class="btn-outline" onclick="showCategory(''ALL'')">Browse Categories</button>'

Set-Content -Path $htmlPath -Value $content -Encoding UTF8
