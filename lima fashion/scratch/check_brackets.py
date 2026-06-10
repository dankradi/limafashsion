with open(r'c:\Users\Manuel.MANUEL\Desktop\lima fashion\super_admin\superadmin.js', 'r', encoding='utf-8') as f:
    text = f.read()

def check_brackets(text):
    stack = []
    line_no = 1
    for i, char in enumerate(text):
        if char == '\n':
            line_no += 1
        elif char in '({[':
            stack.append((char, line_no))
        elif char in ')}]':
            if not stack:
                print(f"Error: unmatched {char} at line {line_no}")
                return False
            top, top_line = stack.pop()
            if (top == '(' and char != ')') or \
               (top == '{' and char != '}') or \
               (top == '[' and char != ']'):
                print(f"Error: mismatched {top} (line {top_line}) and {char} (line {line_no})")
                return False
    if stack:
        print("Error: unclosed brackets:")
        for char, line in stack:
            print(f"  {char} at line {line}")
        return False
    print("Brackets match!")
    return True

# We must strip out comments and strings first for an accurate check
import re

def remove_strings_and_comments(code):
    # remove single line comments
    code = re.sub(r'//.*', '', code)
    # remove multiline comments
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    # remove template literals (simplistic)
    code = re.sub(r'`[^`]*`', '', code, flags=re.DOTALL)
    # remove single/double quotes (simplistic)
    code = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '', code)
    code = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", '', code)
    return code

clean_text = remove_strings_and_comments(text)
check_brackets(clean_text)
