import os
import re

def find_imports(file_path):
    imports = []
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        # Find standard imports: import ... from '...' or import '...'
        matches = re.finditer(r"import\s+(?:(?:[\w\s{},*]+)\s+from\s+)?['\"]([^'\"]+)['\"]", content)
        for m in matches:
            imports.append(m.group(1))
        # Find dynamic imports: import('...')
        matches = re.finditer(r"import\(['\"]([^'\"]+)['\"]\)", content)
        for m in matches:
            imports.append(m.group(1))
    return imports

def resolve_path(base_dir, current_file, import_path):
    if import_path.startswith('.'):
        # Relative import
        dir_name = os.path.dirname(current_file)
        target = os.path.normpath(os.path.join(dir_name, import_path))
    else:
        # Absolute or alias - potentially skip if not configured, but check src/
        # Many projects use src as root
        target = os.path.normpath(os.path.join(base_dir, import_path))
    
    return target

def check_exists(path):
    if os.path.exists(path):
        return True
    # Check with extensions
    for ext in ['.jsx', '.js', '.css', '.module.css', '.png', '.jpg', '.svg']:
        if os.path.exists(path + ext):
            return True
    # Check directory index
    if os.path.isdir(path):
        for index in ['index.jsx', 'index.js', 'index.css']:
            if os.path.exists(os.path.join(path, index)):
                return True
    return False

def main():
    base_dir = r'c:\Users\junal\OneDrive\Desktop\school-projects\richwell-potal\frontend\src'
    broken = []
    
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(('.js', '.jsx', '.css')):
                file_path = os.path.join(root, file)
                imports = find_imports(file_path)
                for imp in imports:
                    if imp.startswith(('lucide-react', 'react', 'axios', 'framer-motion', 'clsx', 'tailwind-merge', 'react-router-dom', 'date-fns')):
                        continue
                    
                    resolved = resolve_path(base_dir, file_path, imp)
                    if not check_exists(resolved):
                        broken.append({
                            'file': file_path,
                            'import': imp,
                            'resolved': resolved
                        })

    print(f"Found {len(broken)} broken imports:")
    for b in broken:
        print(f"File: {b['file']}")
        print(f"  Import: {b['import']}")
        print(f"  Resolved: {b['resolved']}")
        print("-" * 20)

if __name__ == '__main__':
    main()
