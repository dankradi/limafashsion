import mysql.connector
import json
from config import DB_CONFIG

products = [
    { "name": "Floral Maxi Dress", "price": 280, "cat": "WOMEN", "badge": "NEW" },
    { "name": "Strappy Heels", "price": 220, "cat": "WOMEN", "badge": "HOT" },
    { "name": "Oxford Dress Shirt", "price": 190, "cat": "MEN", "badge": "NEW" },
    { "name": "Leather Sneakers", "price": 350, "cat": "MEN", "badge": "HOT" },
    { "name": "Knit Sweater", "price": 150, "cat": "WOMEN", "badge": "" },
    { "name": "Denim Jacket", "price": 260, "cat": "MEN", "badge": "" },
    { "name": "Kids T-Shirt", "price": 80, "cat": "CHILDREN", "badge": "" },
    { "name": "School Backpack", "price": 120, "cat": "CHILDREN", "badge": "NEW" }
]

def seed():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM products")
    if cursor.fetchone()[0] == 0:
        for p in products:
            cursor.execute('''
                INSERT INTO products (name, category, price, badge, size_type, stock_total, stock_ho, stock_accra, stock_unassigned, images)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (p["name"], p["cat"], p["price"], p["badge"], "none", 50, 20, 20, 10, "[]"))
        conn.commit()
        print("Inserted default products")
    else:
        print("Products already exist")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed()
