import mysql.connector
import os

DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": "Dankradi123",
    "autocommit": True,
}

def execute_sql_file(filename):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    with open(filename, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Split by semicolon and execute one by one
    statements = sql.split(';')
    for statement in statements:
        if statement.strip():
            cursor.execute(statement)
    
    cursor.close()
    conn.close()
    print(f"Finished {filename}")

if __name__ == "__main__":
    try:
        execute_sql_file("database/schema.sql")
        execute_sql_file("database/seed.sql")
        print("Database successfully initialized!")
    except Exception as e:
        print(f"Error: {e}")
