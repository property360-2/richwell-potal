"""
Password validation utilities for enhanced security.
"""

import re
from typing import Tuple, Optional


class PasswordValidator:
    """
    Enhanced password validator with complexity requirements.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """

    MIN_LENGTH = 8

    @staticmethod
    def validate(password: str) -> Tuple[bool, Optional[str]]:
        """
        Validate password complexity.

        Args:
            password: The password to validate

        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if password meets all requirements
            - error_message: None if valid, error message string if invalid
        """
        if not password:
            return False, "Password is required"

        if len(password) < PasswordValidator.MIN_LENGTH:
            return False, f"Password must be at least {PasswordValidator.MIN_LENGTH} characters long"

        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"

        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"

        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"

        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/`~]', password):
            return False, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>_-+=[]\\;/`~)"

        return True, None

    @staticmethod
    def get_strength(password: str) -> str:
        """
        Calculate password strength.

        Args:
            password: The password to evaluate

        Returns:
            Strength level: 'weak', 'medium', 'strong', or 'very_strong'
        """
        if not password:
            return 'weak'

        score = 0

        # Length score
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1

        # Complexity score
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/`~]', password):
            score += 1

        # Multiple character types
        char_types = sum([
            bool(re.search(r'[a-z]', password)),
            bool(re.search(r'[A-Z]', password)),
            bool(re.search(r'\d', password)),
            bool(re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/`~]', password))
        ])

        if char_types >= 4:
            score += 2

        # Map score to strength
        if score <= 3:
            return 'weak'
        elif score <= 5:
            return 'medium'
        elif score <= 7:
            return 'strong'
        else:
            return 'very_strong'
