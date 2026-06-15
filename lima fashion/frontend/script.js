const API_URL = "https://limafashsion.onrender.com";

let products = [];

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);

if (!response.ok) {
    throw new Error("Failed to fetch products");
}

products = await response.json();
      

console.log("Products loaded:", products);

renderProducts('featuredGrid', products.slice(0, 4));
renderProducts('shopGrid', products);

    } catch (error) {
        console.error("Failed to load products:", error);
    }
}

let cart = [];

function toggleCart(open) {
    document.getElementById('cartSidebar').classList.toggle('open', open);
    document.getElementById('cartOverlay').classList.toggle('open', open);
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const exists = cart.find(item => item.id === id);
    if (exists) {
        exists.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    toggleCart(true);
}

function updateCartUI() {
    const list = document.getElementById('cartList');
    const count = document.getElementById('cartCount');
    const total = document.getElementById('cartTotal');

    let html = '';
    let sum = 0;
    let itemsTotal = 0;

    cart.forEach(item => {
        sum += item.price * item.qty;
        itemsTotal += item.qty;
        html += `
          <div class="cart-item">
           <div class="cart-item-thumb">
    <img src="${item.images && item.images.length ? item.images[0] : ''}"
         style="width:50px;height:50px;object-fit:cover;">
</div> 
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div style="font-size: 0.85rem; color: #888; margin-bottom: 6px;">Qty: ${item.qty}</div>
              <div class="cart-item-price">GH₵ ${item.price}</div>
            </div>
          </div>
        `;
    });

    list.innerHTML = cart.length ? html : '<div style="text-align:center;color:#888;margin-top:40px;">Your cart is empty</div>';
    count.innerText = itemsTotal;
    total.innerText = 'GH₵ ' + sum.toFixed(2);
}

function renderProducts(gridId, prods) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = prods.map(p => `
      <div class="product-card">
        <div class="product-card-top" style="justify-content: flex-end;">
            ${p.badge ? `<span class="badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '<div></div>'}
        </div>
        <div class="product-img">
    <img src="${p.images && p.images.length ? p.images[0] : ''}"
         style="width:100%;height:100%;object-fit:cover;">
</div>
        <div class="product-info">
            <div class="product-cat">${p.category}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price-row">
                <span class="product-price">GH₵ ${p.price}</span>
                <button class="add-btn" onclick="addToCart(${p.id})">+ Add</button>
            </div>
        </div>
      </div>
    `).join('');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});

    // Update nav links
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.innerText.toLowerCase() === pageId) a.classList.add('active');
    });
}

function showCategory(catToken) {
    let filtered = products;
    let title = "Fashion";
    let tag = "ALL PRODUCTS";
    
    if (catToken !== 'ALL') {
    filtered = products.filter(p =>
        p.category && p.category.toUpperCase().includes(catToken)
    );
}

    if (catToken === 'WOMEN') { title = "Women's Collection"; tag = "SHOP WOMEN"; }
    if (catToken === 'MEN') { title = "Men's Collection"; tag = "SHOP MEN"; }
    if (catToken === 'CHILDREN') { title = "Kids' Collection"; tag = "SHOP CHILDREN"; }
    
    const shopTitle = document.getElementById('shopTitle');
    const shopTag = document.getElementById('shopTag');
    if (shopTitle) shopTitle.innerHTML = title;
    if (shopTag) shopTag.innerText = tag;

    renderProducts('shopGrid', filtered);
    showPage('shop');

    // Update nav matching
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.innerText.toUpperCase().includes(catToken)) a.classList.add('active');
    });
}

window.onload = () => {
    loadProducts();
};
