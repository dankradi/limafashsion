import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\Manuel.MANUEL\Desktop\lima fashion\mainpage.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if any(k in line.lower() for k in ["payment", "momo", "paystack", "checkout", "momo_number"]):
        print(f"Line {i+1}: {line.strip()[:100]}")
