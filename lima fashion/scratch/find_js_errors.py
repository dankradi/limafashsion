import esprima
import sys

filepath = r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

try:
    esprima.parseScript(content)
    print("No syntax errors!")
except Exception as e:
    print(f"Syntax error: {e}")
