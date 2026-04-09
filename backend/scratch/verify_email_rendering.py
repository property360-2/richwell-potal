import os
import sys
import django
from django.template.loader import render_to_string
from django.conf import settings

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def verify_template(template_name, context, output_file):
    try:
        html = render_to_string(template_name, context)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Successfully rendered {template_name} to {output_file}")
    except Exception as e:
        print(f"Failed to render {template_name}: {str(e)}")

if __name__ == "__main__":
    # Context for account_verified
    context_verified = {
        'full_name': 'John Doe',
        'idn': '240001',
        'password': 'password123',
        'login_url': 'http://localhost:5173/login'
    }
    
    # Context for welcome_legacy
    context_legacy = {
        'student_name': 'Jane Doe',
        'idn': '230005',
        'password': 'legacyPassword!',
        'login_url': 'http://localhost:5173/login'
    }

    # Create scratch output directory
    output_dir = os.path.join(settings.BASE_DIR, 'scratch', 'email_previews')
    os.makedirs(output_dir, exist_ok=True)

    verify_template('emails/account_verified.html', context_verified, os.path.join(output_dir, 'account_verified_preview.html'))
    verify_template('emails/welcome_legacy_student.html', context_legacy, os.path.join(output_dir, 'welcome_legacy_preview.html'))
