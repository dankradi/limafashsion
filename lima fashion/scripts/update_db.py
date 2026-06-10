import mysql.connector

try:
    conn = mysql.connector.connect(host='localhost',user='root',password='Dankradi123',database='lima_fashion_db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE orders MODIFY COLUMN status ENUM('Pending','Walk in Sale','Delivered','Canceled') DEFAULT 'Pending'")
    cursor.execute("UPDATE orders SET status='Walk in Sale' WHERE status='Shipped'")
    conn.commit()
    print("DB Updated Successfully.")
except Exception as e:
    print(e)
finally:
    if 'conn' in locals() and conn.is_connected():
        cursor.close()
        conn.close()
