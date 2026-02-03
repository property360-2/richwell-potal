import os
import re

base_dir = r"c:\Users\Administrator\Desktop\richwell-potal\frontend\src"

def fix_all_imports():
    print("Fixing all imports in src...")
    for root, dirs, files in os.walk(base_dir):
        for filename in files:
            if not filename.endswith(".js"):
                continue
                
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, base_dir)
            depth = len(rel_path.split(os.sep)) - 1
            
            # Expected relative path prefix to get to src/
            expected_prefix = "../" * depth if depth > 0 else "./"
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # Patterns to fix:
            # import ... from '((../)+)core/...'
            # import ... from '((../)+)atoms/...'
            # import ... from '((../)+)api.js'
            # etc.
            
            common_dirs = ['core', 'atoms', 'molecules', 'organisms', 'templates', 'utils', 'components', 'config']
            common_files = ['api.js', 'utils.js', 'style.css']
            
            for d in common_dirs:
                # Regex to find any ../../.../ (one or more) followed by the dir
                # We replace it with the expected prefix
                pattern = r"(['\"])(\.\./)+(" + d + r"/)"
                replacement = r"\1" + expected_prefix + r"\3"
                new_content = re.sub(pattern, replacement, new_content)
                
            for f_name in common_files:
                pattern = r"(['\"])(\.\./)+(" + f_name + r")"
                replacement = r"\1" + expected_prefix + r"\3"
                new_content = re.sub(pattern, replacement, new_content)

            if new_content != content:
                print(f"Fixed {filepath} (depth {depth}, expected {expected_prefix})")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

if __name__ == "__main__":
    fix_all_imports()
