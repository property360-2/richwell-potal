"""
File validation utilities for secure file uploads.
"""

import os
import mimetypes
from django.core.exceptions import ValidationError
from django.conf import settings


# Allowed file extensions (whitelist approach)
ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']

# Max file size (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

# MIME type validation mapping
ALLOWED_MIME_TYPES = {
    '.pdf': ['application/pdf'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
}


def validate_file_extension(file):
    """
    Validate file extension against whitelist.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file extension is not allowed
    """
    ext = os.path.splitext(file.name)[1].lower()

    if not ext:
        raise ValidationError("File must have an extension")

    if ext not in ALLOWED_EXTENSIONS:
        allowed_str = ', '.join(ALLOWED_EXTENSIONS)
        raise ValidationError(
            f"File type '{ext}' is not allowed. Allowed types: {allowed_str}"
        )


def validate_file_size(file):
    """
    Validate file size against maximum limit.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file size exceeds limit
    """
    if file.size > MAX_FILE_SIZE:
        size_mb = MAX_FILE_SIZE / (1024 * 1024)
        actual_mb = file.size / (1024 * 1024)
        raise ValidationError(
            f"File size ({actual_mb:.2f}MB) exceeds maximum allowed size ({size_mb:.0f}MB)"
        )


def validate_file_mime_type(file):
    """
    Validate MIME type matches the file extension.
    This helps prevent file extension spoofing.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If MIME type doesn't match extension
    """
    ext = os.path.splitext(file.name)[1].lower()

    # Get expected MIME types for this extension
    expected_mimes = ALLOWED_MIME_TYPES.get(ext, [])

    if not expected_mimes:
        return  # Extension already validated elsewhere

    # Get actual MIME type from file
    content_type = file.content_type

    # Also try to guess from file content
    guessed_type, _ = mimetypes.guess_type(file.name)

    # Check if either matches expected types
    if content_type not in expected_mimes and guessed_type not in expected_mimes:
        raise ValidationError(
            f"File MIME type '{content_type}' doesn't match extension '{ext}'. "
            f"Possible file tampering detected."
        )


def validate_uploaded_file(file):
    """
    Comprehensive file validation.
    Runs all validation checks on an uploaded file.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If any validation check fails

    Usage:
        from apps.core.validators import validate_uploaded_file

        try:
            validate_uploaded_file(request.FILES['document'])
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
    """
    if not file:
        raise ValidationError("No file provided")

    # Run all validation checks
    validate_file_extension(file)
    validate_file_size(file)
    validate_file_mime_type(file)

    return True


def validate_image_file(file):
    """
    Specialized validation for image files only.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file is not a valid image
    """
    ext = os.path.splitext(file.name)[1].lower()

    image_extensions = ['.jpg', '.jpeg', '.png', '.gif']

    if ext not in image_extensions:
        raise ValidationError(
            f"File must be an image. Allowed types: {', '.join(image_extensions)}"
        )

    # Run standard validation
    validate_uploaded_file(file)

    # Additional image-specific validation could be added here
    # For example, using Pillow to verify it's actually an image:
    # try:
    #     from PIL import Image
    #     Image.open(file)
    # except Exception:
    #     raise ValidationError("File is not a valid image")

    return True


def validate_pdf_file(file):
    """
    Specialized validation for PDF files only.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file is not a valid PDF
    """
    ext = os.path.splitext(file.name)[1].lower()

    if ext != '.pdf':
        raise ValidationError("File must be a PDF document")

    # Run standard validation
    validate_uploaded_file(file)

    # Additional PDF-specific validation
    # Check PDF magic bytes (first 4 bytes should be %PDF)
    file.seek(0)
    header = file.read(4)
    file.seek(0)  # Reset file pointer

    if header != b'%PDF':
        raise ValidationError("File does not appear to be a valid PDF")

    return True
