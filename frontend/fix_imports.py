import os

# Base directory for pages
pages_dir = r"c:\Users\Administrator\Desktop\richwell-potal\frontend\src\pages"

def fix_imports():
    print("Fixing imports in src/pages subdirectories...")
    for root, dirs, files in os.walk(pages_dir):
        # Skip the root pages directory itself (though it should be empty)
        if root == pages_dir:
            continue
            
        for filename in files:
            if not filename.endswith(".js"):
                continue
                
            filepath = os.path.join(root, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Standardize imports to always be exactly ../../ (one level to pages, one level to src)
            # We look for patterns like ../../../ and replace with ../../
            
            import re
            
            # Replace any sequence of 3 or more ../ with exactly ../../
            new_content = re.sub(r'\.\./\.\./\.\./+', '../../', content)
            # Also catch the 3-level ones
            new_content = new_content.replace('../../../', '../../')
            
            if new_content != content:
                print(f"Fixed {filepath}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

if __name__ == "__main__":
    fix_imports()
