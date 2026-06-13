# =====================================================
#  LIMA FASHION — Flask REST API Backend
#  Run: python app.py
#  API Base: http://localhost:5000/api
# =====================================================

import json
import sys
import os
import uuid
import hashlib
from datetime import datetime

# Make sure config.py is importable from the same directory
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS
import psycopg2
import psycopg2.extras
from psycopg2 import Error

from config import DB_CONFIG, FLASK_HOST, FLASK_PORT, FLASK_DEBUG, CORS_ORIGINS, SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD

# ─────────────────────────────────────────────────────
#  App Setup
# ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS)

# In-memory token store: token -> expiry datetime
_sa_tokens: dict = {}

# Regional classifications
HO_REGIONS = ["Upper East", "North East", "Northern", "Oti", "Volta", "Upper West"]

# ─────────────────────────────────────────────────────
#  Super Admin helpers
# ─────────────────────────────────────────────────────
def _hash(plain: str) -> str:
    """Return SHA-256 hex digest of a plain-text string."""
    return hashlib.sha256(plain.encode()).hexdigest()

def _require_sa():
    """Abort 401 if request does not carry a valid super admin token."""
    token = request.headers.get("X-Super-Admin-Token", "")
    if not token or token not in _sa_tokens:
        abort(401, description="Super admin authentication required")


# ─────────────────────────────────────────────────────
#  DB Connection Helper
# ─────────────────────────────────────────────────────
def get_db():
    """Return a fresh PostgreSQL connection."""
    try:
        from config import DATABASE_URL
        if DATABASE_URL:
            conn = psycopg2.connect(DATABASE_URL)
        else:
            conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"[DB ERROR] {e}")
        abort(503, description=f"Database connection failed: {e}")


def query(sql, params=(), fetch="all"):
    """Run a query and return results."""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(sql, params)
    if fetch == "all":
        result = cursor.fetchall()
    elif fetch == "one":
        result = cursor.fetchone()
    else:
        result = None
    cursor.close()
    conn.close()
    return result


def execute(sql, params=(), fetch_id=False):
    """Run INSERT / UPDATE / DELETE and return last insert id or rowcount."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    
    last_id = None
    if fetch_id:
        row = cursor.fetchone()
        if row:
            last_id = row[0]
            
    rowcount = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return last_id, rowcount


# ─────────────────────────────────────────────────────
#  Helper: parse JSON fields returned from DB
# ─────────────────────────────────────────────────────
def parse_json_fields(row, fields):
    for f in fields:
        if row and f in row and isinstance(row[f], str):
            try:
                row[f] = json.loads(row[f])
            except Exception:
                row[f] = []
    return row


# =====================================================
#  PRODUCTS  /api/products
# =====================================================

@app.route("/api/products", methods=["GET"])
def get_products():
    category = request.args.get("category")
    if category:
        id_rows = query("SELECT id FROM products WHERE category = %s ORDER BY created_at DESC", (category,))
    else:
        id_rows = query("SELECT id FROM products ORDER BY created_at DESC")
    
    product_ids = [r["id"] for r in id_rows]
    if not product_ids:
        return jsonify([])
        
    format_strings = ','.join(['%s'] * len(product_ids))
    full_rows = query(f"SELECT * FROM products WHERE id IN ({format_strings})", tuple(product_ids))
    
    full_rows_dict = {r["id"]: r for r in full_rows}
    sorted_rows = [full_rows_dict[pid] for pid in product_ids]
    
    for row in sorted_rows:
        parse_json_fields(row, ["images"])
    return jsonify(sorted_rows)


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    row = query("SELECT * FROM products WHERE id = %s", (product_id,), fetch="one")
    if not row:
        abort(404, description="Product not found")
    parse_json_fields(row, ["images"])
    return jsonify(row)


@app.route("/api/products", methods=["POST"])
def add_product():
    _require_sa()
    data = request.get_json(force=True)
    name     = data.get("name", "").strip()
    category = data.get("category", "WOMEN").upper()
    price    = float(data.get("price", 0))
    badge    = data.get("badge") or None
    size_type = data.get("size_type", "none").strip().lower()
    images   = json.dumps(data.get("images", []))
    
    stock_total = int(data.get("stock_total", 0))
    stock_unassigned = int(data.get("stock_unassigned", 0))
    stock_ho = int(data.get("stock_ho", 0))
    stock_accra = int(data.get("stock_accra", 0))

    if not name:
        abort(400, description="Product name is required")
    if category not in ("WOMEN", "MEN", "CHILDREN"):
        abort(400, description="Invalid category")

    last_id, _ = execute(
        "INSERT INTO products (name, category, price, badge, size_type, images, stock_total, stock_unassigned, stock_ho, stock_accra) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
        (name, category, price, badge, size_type, images, stock_total, stock_unassigned, stock_ho, stock_accra),
        fetch_id=True
    )
    new_product = query("SELECT * FROM products WHERE id = %s", (last_id,), fetch="one")
    parse_json_fields(new_product, ["images"])
    return jsonify(new_product), 201


@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    _require_sa()
    data   = request.get_json(force=True)
    fields = []
    params = []

    if "name"     in data: fields.append("name = %s");     params.append(data["name"])
    if "category" in data: fields.append("category = %s"); params.append(data["category"].upper())
    if "price"    in data: fields.append("price = %s");    params.append(float(data["price"]))
    if "badge"    in data: fields.append("badge = %s");    params.append(data["badge"] or None)
    if "size_type" in data: fields.append("size_type = %s"); params.append(data["size_type"].lower())
    if "images"   in data: fields.append("images = %s");   params.append(json.dumps(data["images"]))
    if "stock_total" in data: fields.append("stock_total = %s"); params.append(int(data["stock_total"]))
    if "stock_unassigned" in data: fields.append("stock_unassigned = %s"); params.append(int(data["stock_unassigned"]))
    if "stock_ho" in data: fields.append("stock_ho = %s"); params.append(int(data["stock_ho"]))
    if "stock_accra" in data: fields.append("stock_accra = %s"); params.append(int(data["stock_accra"]))

    if not fields:
        abort(400, description="No fields to update")

    params.append(product_id)
    execute(f"UPDATE products SET {', '.join(fields)} WHERE id = %s", params)
    updated = query("SELECT * FROM products WHERE id = %s", (product_id,), fetch="one")
    parse_json_fields(updated, ["images"])
    return jsonify(updated)


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    _require_sa()
    _, rowcount = execute("DELETE FROM products WHERE id = %s", (product_id,))
    if rowcount == 0:
        abort(404, description="Product not found")
    return jsonify({"message": "Product deleted", "id": product_id})


# =====================================================
#  ORDERS  /api/orders
# =====================================================

@app.route("/api/orders", methods=["GET"])
def get_orders():
    region = request.args.get("region")
    status = request.args.get("status")

    sql    = "SELECT * FROM orders WHERE 1=1"
    params = []

    if region == "Ho":
        sql += f" AND region IN ({', '.join(['%s']*len(HO_REGIONS))})"
        params.extend(HO_REGIONS)
    elif region == "Accra":
        sql += f" AND region NOT IN ({', '.join(['%s']*len(HO_REGIONS))})"
        params.extend(HO_REGIONS)
    elif region:
        sql += " AND region = %s"
        params.append(region)

    if status:
        sql += " AND status = %s"
        params.append(status)

    sql += " ORDER BY created_at DESC"
    rows = query(sql, params)
    for row in rows:
        parse_json_fields(row, ["items", "customer_data"])
        # Rename customer_data → customer for frontend compatibility
        row["customer"] = row.pop("customer_data", {})
        # Ensure created_at is JSON-serialisable
        if isinstance(row.get("created_at"), datetime):
            row["date"] = row["created_at"].isoformat()
        if isinstance(row.get("updated_at"), datetime):
            row["updated_at"] = row["updated_at"].isoformat()
    return jsonify(rows)


@app.route("/api/orders/<string:order_id>", methods=["GET"])
def get_order(order_id):
    row = query("SELECT * FROM orders WHERE id = %s", (order_id,), fetch="one")
    if not row:
        abort(404, description="Order not found")
    parse_json_fields(row, ["items", "customer_data"])
    row["customer"] = row.pop("customer_data", {})
    if isinstance(row.get("created_at"), datetime):
        row["date"] = row["created_at"].isoformat()
    if isinstance(row.get("updated_at"), datetime):
        row["updated_at"] = row["updated_at"].isoformat()
    return jsonify(row)


@app.route("/api/orders", methods=["POST"])
def create_order():
    data   = request.get_json(force=True)
    region = data.get("region", "").strip()
    items  = data.get("items", [])
    total  = float(data.get("total", 0))
    customer_data = data.get("customer", {})
    payment_method = data.get("payment_method", "")
    notes  = data.get("notes", "")

    if not region or not items:
        abort(400, description="region and items are required")

    # Deduce stock pool based on region
    stock_col = "stock_ho" if region in HO_REGIONS else "stock_accra"

    # Verify inventory first
    for item in items:
        # Front-end cart item must have id and qty
        prod_id = item.get("id")
        qty = int(item.get("qty", 1))
        if not prod_id:
            continue
        prod = query(f"SELECT id, {stock_col} FROM products WHERE id = %s", (prod_id,), fetch="one")
        if not prod:
            abort(400, description=f"Product ID {prod_id} not found")
        if prod[stock_col] < qty:
            abort(400, description=f"Insufficient stock for product '{item.get('name', prod_id)}' in region {region}")

    # Deduct stock
    for item in items:
        prod_id = item.get("id")
        qty = int(item.get("qty", 1))
        if prod_id:
            execute(f"UPDATE products SET {stock_col} = {stock_col} - %s, stock_total = stock_total - %s WHERE id = %s", (qty, qty, prod_id))

    # Generate order ID matching the existing JS format
    order_id = f"ORD-{int(datetime.now().timestamp() * 1000)}"

    # Optionally upsert customer record
    customer_id = None
    if customer_data.get("fname"):
        last_id, _ = execute(
            """INSERT INTO customers (fname, lname, phone, email, address, city, region)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                customer_data.get("fname", ""),
                customer_data.get("lname", ""),
                customer_data.get("phone", ""),
                customer_data.get("email", ""),
                customer_data.get("address", ""),
                customer_data.get("city", ""),
                region,
            ),
            fetch_id=True
        )
        customer_id = last_id

    execute(
        """INSERT INTO orders (id, customer_id, customer_data, items, total, region, status, payment_method, notes)
           VALUES (%s, %s, %s, %s, %s, %s, 'Pending', %s, %s)""",
        (
            order_id,
            customer_id,
            json.dumps(customer_data),
            json.dumps(items),
            total,
            region,
            payment_method,
            notes,
        )
    )

    new_order = query("SELECT * FROM orders WHERE id = %s", (order_id,), fetch="one")
    parse_json_fields(new_order, ["items", "customer_data"])
    new_order["customer"] = new_order.pop("customer_data", {})
    if isinstance(new_order.get("created_at"), datetime):
        new_order["date"] = new_order["created_at"].isoformat()
    if isinstance(new_order.get("updated_at"), datetime):
        new_order["updated_at"] = new_order["updated_at"].isoformat()
    return jsonify(new_order), 201


@app.route("/api/orders/<string:order_id>/status", methods=["PUT"])
def update_order_status(order_id):
    data       = request.get_json(force=True)
    new_status = data.get("status", "").strip()
    valid      = ("Pending", "Walk in Sale", "Delivered", "Canceled")

    if new_status not in valid:
        abort(400, description=f"Status must be one of: {', '.join(valid)}")

    _, rowcount = execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, order_id))
    if rowcount == 0:
        abort(404, description="Order not found")

    return jsonify({"message": "Status updated", "id": order_id, "status": new_status})


@app.route("/api/orders/<string:order_id>", methods=["DELETE"])
def delete_order(order_id):
    _, rowcount = execute("DELETE FROM orders WHERE id = %s", (order_id,))
    if rowcount == 0:
        abort(404, description="Order not found")
    return jsonify({"message": "Order deleted", "id": order_id})


# =====================================================
#  CUSTOMERS  /api/customers
# =====================================================

@app.route("/api/customers", methods=["GET"])
def get_customers():
    rows = query("SELECT * FROM customers ORDER BY created_at DESC")
    for row in rows:
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()
    return jsonify(rows)


# =====================================================
#  SETTINGS  /api/settings
# =====================================================

@app.route("/api/settings", methods=["GET"])
def get_settings():
    rows = query('SELECT "key", "value" FROM settings')
    # Return as flat object { key: value, ... }
    result = {row["key"]: row["value"] for row in rows}
    return jsonify(result)


@app.route("/api/settings", methods=["POST"])
def save_settings():
    """Accept { key: value, ... } and upsert all."""
    data = request.get_json(force=True)
    if not isinstance(data, dict):
        abort(400, description="Expected a JSON object of key-value pairs")

    for key, value in data.items():
        execute(
            'INSERT INTO settings ("key", "value") VALUES (%s, %s) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"',
            (str(key), str(value) if value is not None else "")
        )

    return jsonify({"message": "Settings saved", "count": len(data)})


# =====================================================
#  ENQUIRIES  /api/enquiries
# =====================================================

@app.route("/api/enquiries", methods=["GET"])
def get_enquiries():
    rows = query("SELECT * FROM enquiries ORDER BY created_at DESC")
    for row in rows:
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()
    return jsonify(rows)


@app.route("/api/enquiries", methods=["POST"])
def submit_enquiry():
    data = request.get_json(force=True)
    name       = data.get("name", "").strip()
    phone      = data.get("phone", "")
    email      = data.get("email", "")
    product_id = data.get("product_id") or None
    message    = data.get("message", "")

    if not name:
        abort(400, description="Name is required")

    last_id, _ = execute(
        "INSERT INTO enquiries (name, phone, email, product_id, message) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (name, phone, email, product_id, message),
        fetch_id=True
    )
    return jsonify({"message": "Enquiry submitted", "id": last_id}), 201


# =====================================================
#  DASHBOARD STATS  /api/dashboard/stats
# =====================================================

@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    region = request.args.get("region")

    # Build region filter
    if region == "Ho":
        region_sql = f"AND region IN ({', '.join(['%s']*len(HO_REGIONS))})"
        region_params = tuple(HO_REGIONS)
    elif region == "Accra":
        region_sql = f"AND region NOT IN ({', '.join(['%s']*len(HO_REGIONS))})"
        region_params = tuple(HO_REGIONS)
    elif region:
        region_sql = "AND region = %s"
        region_params = (region,)
    else:
        region_sql = ""
        region_params = ()

    # Total revenue (non-cancelled orders)
    rev_row = query(
        f"SELECT COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status != 'Canceled' {region_sql}",
        region_params, fetch="one"
    )
    revenue = float(rev_row["revenue"]) if rev_row else 0

    # Order count
    cnt_row = query(
        f"SELECT COUNT(*) AS cnt FROM orders WHERE 1=1 {region_sql}",
        region_params, fetch="one"
    )
    order_count = int(cnt_row["cnt"]) if cnt_row else 0

    # Customer count (global)
    cust_row = query("SELECT COUNT(*) AS cnt FROM customers", fetch="one")
    customer_count = int(cust_row["cnt"]) if cust_row else 0

    # Product count
    prod_row = query("SELECT COUNT(*) AS cnt FROM products", fetch="one")
    product_count = int(prod_row["cnt"]) if prod_row else 0

    # Status breakdown
    status_rows = query(
        f"SELECT status, COUNT(*) AS cnt FROM orders WHERE 1=1 {region_sql} GROUP BY status",
        region_params
    )
    status_breakdown = {r["status"]: r["cnt"] for r in status_rows}

    # Recent 5 orders
    recent_rows = query(
        f"SELECT id, status, total, region, created_at FROM orders WHERE 1=1 {region_sql} ORDER BY created_at DESC LIMIT 5",
        region_params
    )
    for r in recent_rows:
        if isinstance(r.get("created_at"), datetime):
            r["date"] = r["created_at"].isoformat()
            del r["created_at"]

    # Revenue by last 7 days (for chart)
    chart_rows = query(
        f"""SELECT DATE(created_at) AS day, COALESCE(SUM(total),0) AS revenue
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '7 days'
              AND status != 'Canceled'
              {region_sql}
            GROUP BY DATE(created_at)
            ORDER BY day ASC""",
        region_params
    )
    chart_labels  = [str(r["day"]) for r in chart_rows]
    chart_revenue = [float(r["revenue"]) for r in chart_rows]

    return jsonify({
        "revenue":          revenue,
        "order_count":      order_count,
        "customer_count":   customer_count,
        "product_count":    product_count,
        "status_breakdown": status_breakdown,
        "recent_orders":    recent_rows,
        "chart": {
            "labels":  chart_labels,
            "revenue": chart_revenue,
        }
    })



# =====================================================
#  SUPER ADMIN AUTH  /api/superadmin
# =====================================================

@app.route("/api/superadmin/login", methods=["POST"])
def superadmin_login():
    data     = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    password_ok = (password == SUPER_ADMIN_PASSWORD or _hash(password) == SUPER_ADMIN_PASSWORD)
    if username != SUPER_ADMIN_USERNAME or not password_ok:
        abort(401, description="Invalid super admin credentials")

    token = str(uuid.uuid4())
    _sa_tokens[token] = datetime.now()

    # Log the login
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor) VALUES (%s, %s, %s, %s)",
        (None, "superadmin_login", "Super admin logged in", username)
    )

    return jsonify({"token": token, "username": username})


@app.route("/api/superadmin/verify", methods=["GET"])
def superadmin_verify():
    _require_sa()
    return jsonify({"valid": True})


@app.route("/api/superadmin/logout", methods=["POST"])
def superadmin_logout():
    token = request.headers.get("X-Super-Admin-Token", "")
    _sa_tokens.pop(token, None)
    return jsonify({"message": "Logged out"})


# =====================================================
#  ADMIN USERS  /api/admin-users
#  Only callable with a valid super admin token
# =====================================================

@app.route("/api/admin-users", methods=["GET"])
def list_admin_users():
    _require_sa()
    rows = query(
        """SELECT id, username, account, full_name, email, is_active,
                  created_by, last_login, created_at
           FROM admin_users ORDER BY created_at DESC"""
    )
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
        if isinstance(r.get("last_login"), datetime):
            r["last_login"] = r["last_login"].isoformat()
    return jsonify(rows)


@app.route("/api/admin-users", methods=["POST"])
def create_admin_user():
    _require_sa()
    data      = request.get_json(force=True)
    username  = data.get("username", "").strip()
    password  = data.get("password", "").strip()
    account   = data.get("account", "").strip().lower()
    full_name = data.get("full_name", "").strip()
    email     = data.get("email", "").strip()

    if not username or not password:
        abort(400, description="username and password are required")
    if account not in ("ho", "accra"):
        abort(400, description="account must be 'ho' or 'accra'")

    # Check duplicate username
    existing = query("SELECT id FROM admin_users WHERE username = %s", (username,), fetch="one")
    if existing:
        abort(400, description=f"Username '{username}' already exists")

    hashed = _hash(password)
    last_id, _ = execute(
        """INSERT INTO admin_users (username, password, account, full_name, email, created_by)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (username, hashed, account, full_name, email, SUPER_ADMIN_USERNAME),
        fetch_id=True
    )

    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (account, "admin_user_created", f"Admin user '{username}' created for {account} account", SUPER_ADMIN_USERNAME, str(last_id))
    )

    new_user = query("SELECT id, username, account, full_name, email, is_active, created_by, created_at FROM admin_users WHERE id = %s", (last_id,), fetch="one")
    if isinstance(new_user.get("created_at"), datetime):
        new_user["created_at"] = new_user["created_at"].isoformat()
    return jsonify(new_user), 201


@app.route("/api/admin-users/<int:user_id>/toggle", methods=["PUT"])
def toggle_admin_user(user_id):
    _require_sa()
    user = query("SELECT id, username, is_active, account FROM admin_users WHERE id = %s", (user_id,), fetch="one")
    if not user:
        abort(404, description="Admin user not found")

    new_status = 0 if user["is_active"] else 1
    execute("UPDATE admin_users SET is_active = %s WHERE id = %s", (new_status, user_id))

    action = "admin_user_enabled" if new_status else "admin_user_disabled"
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (user["account"], action, f"Admin user '{user['username']}' {'enabled' if new_status else 'disabled'}", SUPER_ADMIN_USERNAME, str(user_id))
    )

    return jsonify({"id": user_id, "is_active": new_status})


@app.route("/api/admin-users/<int:user_id>", methods=["DELETE"])
def delete_admin_user(user_id):
    _require_sa()
    user = query("SELECT id, username, account FROM admin_users WHERE id = %s", (user_id,), fetch="one")
    if not user:
        abort(404, description="Admin user not found")

    execute("DELETE FROM admin_users WHERE id = %s", (user_id,))
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (user["account"], "admin_user_deleted", f"Admin user '{user['username']}' deleted", SUPER_ADMIN_USERNAME, str(user_id))
    )
    return jsonify({"message": "Admin user deleted", "id": user_id})


@app.route("/api/admin-users/<int:user_id>/reset-password", methods=["PUT"])
def reset_admin_password(user_id):
    _require_sa()
    data        = request.get_json(force=True)
    new_password = data.get("password", "").strip()
    if not new_password or len(new_password) < 6:
        abort(400, description="Password must be at least 6 characters")

    user = query("SELECT username, account FROM admin_users WHERE id = %s", (user_id,), fetch="one")
    if not user:
        abort(404, description="Admin user not found")

    execute("UPDATE admin_users SET password = %s WHERE id = %s", (_hash(new_password), user_id))
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (user["account"], "password_reset", f"Password reset for '{user['username']}'", SUPER_ADMIN_USERNAME, str(user_id))
    )
    return jsonify({"message": "Password updated", "id": user_id})


# =====================================================
#  ACTIVITY LOG  /api/activity-log
# =====================================================

@app.route("/api/activity-log", methods=["GET"])
def get_activity_log():
    _require_sa()
    region = request.args.get("region")
    limit  = int(request.args.get("limit", 200))

    sql    = "SELECT * FROM activity_log WHERE 1=1"
    params = []
    if region:
        sql += " AND region = %s"
        params.append(region)
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    rows = query(sql, params)
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    return jsonify(rows)


@app.route("/api/activity-log", methods=["POST"])
def log_activity():
    """Called by regional dashboards to record events."""
    data = request.get_json(force=True)
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (
            data.get("region"),
            data.get("action_type", "unknown"),
            data.get("description", ""),
            data.get("actor", "system"),
            data.get("reference"),
        )
    )
    return jsonify({"message": "Logged"}), 201


# =====================================================
#  COMBINED STATS  /api/dashboard/stats/combined
# =====================================================

@app.route("/api/dashboard/stats/combined", methods=["GET"])
def combined_stats():
    _require_sa()

    def _stats_for(region):
        if region == "Ho":
            region_filter = f"region IN ({', '.join(['%s']*len(HO_REGIONS))})"
            params = tuple(HO_REGIONS)
        else:
            region_filter = f"region NOT IN ({', '.join(['%s']*len(HO_REGIONS))})"
            params = tuple(HO_REGIONS)

        rev = query(
            f"SELECT COALESCE(SUM(total),0) AS r FROM orders WHERE status != 'Canceled' AND {region_filter}",
            params, fetch="one"
        )
        orders = query(f"SELECT COUNT(*) AS c FROM orders WHERE {region_filter}", params, fetch="one")
        status_rows = query(
            f"SELECT status, COUNT(*) AS cnt FROM orders WHERE {region_filter} GROUP BY status", params
        )
        return {
            "revenue":   float(rev["r"]) if rev else 0,
            "orders":    int(orders["c"]) if orders else 0,
            "breakdown": {r["status"]: r["cnt"] for r in status_rows},
        }

    ho_stats    = _stats_for("Ho")
    accra_stats = _stats_for("Accra")

    cust = query("SELECT COUNT(*) AS c FROM customers", fetch="one")
    prod = query("SELECT COUNT(*) AS c FROM products", fetch="one")
    users = query("SELECT COUNT(*) AS c FROM admin_users WHERE is_active = 1", fetch="one")

    # Activity count
    logs = query("SELECT COUNT(*) AS c FROM activity_log", fetch="one")

    return jsonify({
        "ho":             ho_stats,
        "accra":          accra_stats,
        "total_customers": int(cust["c"]) if cust else 0,
        "total_products":  int(prod["c"]) if prod else 0,
        "active_admins":   int(users["c"]) if users else 0,
        "activity_count":  int(logs["c"]) if logs else 0,
    })


# =====================================================
#  ADMIN LOGIN (Regional Dashboards)  /api/admin/login
# =====================================================

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    """Validate credentials for Ho/Accra regional dashboards."""
    data     = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    account  = data.get("account", "").strip().lower()

    if not username or not password or account not in ("ho", "accra"):
        abort(400, description="username, password, and account (ho/accra) are required")

    user = query(
        "SELECT id, username, account, full_name, is_active FROM admin_users WHERE username=%s AND password=%s AND account=%s",
        (username, _hash(password), account), fetch="one"
    )
    if not user:
        abort(401, description="Invalid credentials")
    if not user["is_active"]:
        abort(403, description="Account disabled. Contact super admin.")

    # Update last_login
    execute("UPDATE admin_users SET last_login = NOW() WHERE id = %s", (user["id"],))
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (account, "admin_login", f"Admin '{username}' logged into {account} dashboard", username, str(user["id"]))
    )

    return jsonify({
        "message":   "Login successful",
        "username":  user["username"],
        "account":   user["account"],
        "full_name": user["full_name"],
    })


# =====================================================
#  UNIFIED LOGIN  /api/auth/login
# =====================================================

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    """Unified login for Super Admin, Ho Admin, and Accra Admin."""
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        abort(400, description="Username and password are required")

    # 1. Try Super Admin
    password_ok = (password == SUPER_ADMIN_PASSWORD or _hash(password) == SUPER_ADMIN_PASSWORD)
    if username == SUPER_ADMIN_USERNAME and password_ok:
        token = str(uuid.uuid4())
        _sa_tokens[token] = datetime.now()
        execute(
            "INSERT INTO activity_log (region, action_type, description, actor) VALUES (%s, %s, %s, %s)",
            (None, "superadmin_login", "Super admin logged in via unified portal", username)
        )
        return jsonify({
            "token": token,
            "username": username,
            "role": "superadmin"
        })

    # 2. Try Regional Admin
    user = query(
        "SELECT id, username, account, full_name, is_active FROM admin_users WHERE username=%s AND password=%s",
        (username, _hash(password)), fetch="one"
    )
    if not user:
        abort(401, description="Invalid credentials")
    if not user["is_active"]:
        abort(403, description="Account disabled. Contact super admin.")

    execute("UPDATE admin_users SET last_login = NOW() WHERE id = %s", (user["id"],))
    execute(
        "INSERT INTO activity_log (region, action_type, description, actor, reference) VALUES (%s, %s, %s, %s, %s)",
        (user["account"], "admin_login", f"Admin '{username}' logged in via unified portal", username, str(user["id"]))
    )

    return jsonify({
        "message":   "Login successful",
        "username":  user["username"],
        "account":   user["account"],
        "full_name": user["full_name"],
        "role":      user["account"]
    })


# =====================================================
#  HEALTH CHECK
# =====================================================

@app.route("/api/health", methods=["GET"])
def health():
    try:
        conn = get_db()
        conn.close()
        return jsonify({"status": "ok", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 503


# ─────────────────────────────────────────────────────
#  Error handlers
# ─────────────────────────────────────────────────────
@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e.description)}), 400

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": str(e.description)}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": str(e.description)}), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e.description)}), 404

@app.errorhandler(503)
def service_unavailable(e):
    return jsonify({"error": str(e.description)}), 503


# ─────────────────────────────────────────────────────
#  Static File Serving Routes
# ─────────────────────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

FRONTEND_DIR = os.path.abspath(
    os.path.join(BACKEND_DIR, "..", "frontend")
)

@app.route("/")
def serve_superadmin():
    return send_from_directory(BACKEND_DIR, "index.html")


@app.route("/admin")
@app.route("/admin/")
def serve_admin():
    return send_from_directory(
        os.path.join(FRONTEND_DIR, "admin"),
        "yourlimadash.html"
    )


@app.route("/admin/<path:path>")
def serve_admin_files(path):
    return send_from_directory(
        os.path.join(FRONTEND_DIR, "admin"),
        path
    )


@app.route("/shop")
def serve_shop():
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


@app.route("/images/<path:path>")
def serve_images(path):
    return send_from_directory(
        os.path.join(FRONTEND_DIR, "images"),
        path
    )

# ─────────────────────────────────────────────────────
#  Entry Point
# ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    print("=" * 55)
    print("  Lima Fashion API -- Starting...")
    print(f"  Listening on http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"  API base: http://localhost:{FLASK_PORT}/api")
    print(f"  Health:   http://localhost:{FLASK_PORT}/api/health")
    print("=" * 55)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
