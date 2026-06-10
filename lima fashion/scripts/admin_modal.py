import re

with open('admin/yourlimadash.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject the HTML Modal right before <!-- LOGIC -->
modal_html = """
    <!-- VIEW ORDER MODAL -->
    <div id="viewOrderModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:5000; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
        <div style="background:var(--dark2); padding:30px; border-radius:var(--radius-xl); width:700px; max-width:95%; border:1px solid var(--border); box-shadow:0 20px 60px rgba(0,0,0,0.5); position:relative; display:flex; flex-direction:column; max-height: 90vh;">
            
            <button onclick="closeOrderModal()" style="position:absolute; top:20px; right:20px; background:var(--dark3); border:none; width:36px; height:36px; border-radius:50%; color:var(--white); font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid var(--border);">
                <div>
                    <h2 id="modalOrderId" style="font-family:var(--font-display); font-size:1.8rem;">#ORD-0000</h2>
                    <p id="modalOrderDate" class="grey" style="font-size:0.9rem;">Date/Time</p>
                </div>
                <div>
                    <span id="modalOrderStatus" class="status-pill status-pending" style="font-size:1.1rem; padding:8px 16px;">PENDING</span>
                </div>
            </div>

            <div style="flex:1; overflow-y:auto; padding-right:10px;">
                <!-- GRID FOR ITEMS AND CUSTOMER DATA -->
                <div style="display:grid; grid-template-columns: 3fr 2fr; gap:30px;">
                    
                    <!-- LEFT: ITEMS -->
                    <div>
                        <h4 style="margin-bottom:15px; color:var(--grey2); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">Ordered Items</h4>
                        <div id="modalOrderItems" style="background:var(--dark3); border-radius:12px; padding:15px; border:1px solid var(--border);">
                            <!-- JS injected elements go here -->
                        </div>
                        
                        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; font-family:var(--font-display); font-size:1.4rem;">
                            <span>Total</span>
                            <span id="modalOrderTotal" style="color:var(--lime);">GH₵ 0.00</span>
                        </div>
                    </div>

                    <!-- RIGHT: CUSTOMER -->
                    <div>
                        <h4 style="margin-bottom:15px; color:var(--grey2); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">Customer Details</h4>
                        <div style="background:var(--dark); border-radius:12px; padding:20px; border:1px solid var(--border);">
                            <div style="margin-bottom:15px;">
                                <strong style="display:block; font-size:0.8rem; color:var(--grey); margin-bottom:4px;">NAME</strong>
                                <span id="modalCustName">Kofi Mensah</span>
                            </div>
                            <div style="margin-bottom:15px;">
                                <strong style="display:block; font-size:0.8rem; color:var(--grey); margin-bottom:4px;">PHONE</strong>
                                <span id="modalCustPhone">+233 24 000 0000</span>
                            </div>
                            <div style="margin-bottom:15px;">
                                <strong style="display:block; font-size:0.8rem; color:var(--grey); margin-bottom:4px;">ADDRESS & CITY</strong>
                                <span id="modalCustAddress">Adenta, Accra</span>
                            </div>
                            <div>
                                <strong style="display:block; font-size:0.8rem; color:var(--grey); margin-bottom:4px;">REGION</strong>
                                <span id="modalCustRegion" style="color:var(--lime);">Greater Accra</span>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>

            <!-- ACTION FOOTER -->
            <div style="margin-top:30px; padding-top:20px; border-top:1px solid var(--border); display:flex; gap:15px;">
                <button class="btn-lime" style="flex:1; padding:12px; font-size:1rem;" onclick="updateOrderStatus('Walk in Sale')">Walk in Sale</button>
                <button style="flex:1; background:var(--dark3); color:white; border:1px solid var(--border); border-radius:var(--radius-pill); font-weight:700; cursor:pointer;" onclick="updateOrderStatus('Delivered')">Mark Delivered</button>
                <button style="flex:0.5; background:rgba(239, 68, 68, 0.1); color:var(--error); border:1px solid var(--error); border-radius:var(--radius-pill); font-weight:700; cursor:pointer;" onclick="updateOrderStatus('Canceled')">Cancel Order</button>
            </div>
            
        </div>
    </div>
"""

# Inject before closing main tag
html = html.replace('</main>', modal_html + '\n    </main>')

# 2. Add Javascript Logic
js_logic = """
        // --- ORDER MODAL LOGIC ---
        let currentViewOrderId = null;

        function openOrderModal(orderId) {
            currentViewOrderId = orderId;
            let allOrders = JSON.parse(localStorage.getItem('lime_live_orders') || '[]');
            let order = allOrders.find(o => o.id === orderId);
            if(!order) return alert("Order not found!");

            document.getElementById('modalOrderId').innerText = order.id;
            
            const d = new Date(order.date);
            document.getElementById('modalOrderDate').innerText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
            
            const stNode = document.getElementById('modalOrderStatus');
            stNode.innerText = order.status.toUpperCase();
            stNode.className = 'status-pill status-' + order.status.toLowerCase().replace(' ', '-');

            // Render Items
            const itemsNode = document.getElementById('modalOrderItems');
            itemsNode.innerHTML = order.items.map(item => `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div>
                        <span style="font-weight:600;">${item.name}</span><br>
                        <span style="font-size:0.8rem; color:var(--grey);">Qty: ${item.qty}</span>
                    </div>
                    <div style="font-weight:600;">
                        GH₵ ${(item.price * item.qty).toFixed(2)}
                    </div>
                </div>
            `).join('');
            
            document.getElementById('modalOrderTotal').innerText = 'GH₵ ' + order.total.toFixed(2);

            // Customer rendering
            if (order.customer) {
                document.getElementById('modalCustName').innerText = order.customer.fname + ' ' + order.customer.lname;
                document.getElementById('modalCustPhone').innerText = order.customer.phone || 'N/A';
                document.getElementById('modalCustAddress').innerText = (order.customer.address || '') + ', ' + (order.customer.city || '');
            } else {
                document.getElementById('modalCustName').innerText = '[Legacy Order] No Name';
                document.getElementById('modalCustPhone').innerText = 'N/A';
                document.getElementById('modalCustAddress').innerText = 'N/A';
            }
            document.getElementById('modalCustRegion').innerText = order.region;

            document.getElementById('viewOrderModal').style.display = 'flex';
        }

        function closeOrderModal() {
            document.getElementById('viewOrderModal').style.display = 'none';
        }

        function updateOrderStatus(newStatus) {
            if(!currentViewOrderId) return;
            
            let allOrders = JSON.parse(localStorage.getItem('lime_live_orders') || '[]');
            let index = allOrders.findIndex(o => o.id === currentViewOrderId);
            
            if(index !== -1) {
                allOrders[index].status = newStatus;
                localStorage.setItem('lime_live_orders', JSON.stringify(allOrders));
                
                // Refresh UI
                renderOrders();
                closeOrderModal();
                alert(`Order ${currentViewOrderId} successfully marked as ${newStatus}!`);
            }
        }
"""

html = html.replace('// Initialize display\n        renderOrders();', js_logic + '\n        // Initialize display\n        renderOrders();')

# 3. Fix the "View" buttons to actually trigger `openOrderModal` instead of an alert!
# We will carefully rebuild `renderOrders` inner logic for buttons.
# Just doing a broad regex string replacement.
html = html.replace('onclick="alert(\'Viewing Details for \' + o.id)"', 'onclick="openOrderModal(\'${o.id}\')"')

with open('admin/yourlimadash.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Modal injection completed successfully.")
