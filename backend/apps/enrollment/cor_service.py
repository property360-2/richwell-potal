"""
Certificate of Registration (COR) generation service.
"""
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas as pdf_canvas


class CORService:
    """Service for generating Certificate of Registration PDFs."""

    @staticmethod
    def can_generate_cor(enrollment):
        """
        Check if student has enrolled subjects.

        Args:
            enrollment: Enrollment object

        Returns:
            bool: True if student has at least one ENROLLED subject
        """
        from .models import SubjectEnrollment

        return SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            status=SubjectEnrollment.Status.ENROLLED
        ).exists()

    @staticmethod
    def generate_cor_pdf(enrollment):
        """
        Generate COR PDF for an enrollment.

        Args:
            enrollment: Enrollment object

        Returns:
            bytes: PDF file content

        Raises:
            ValueError: If no enrolled subjects found
        """
        from .models import SubjectEnrollment

        if not CORService.can_generate_cor(enrollment):
            raise ValueError("No enrolled subjects found for this student")

        buffer = BytesIO()
        p = pdf_canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Header
        p.setFont("Helvetica-Bold", 18)
        p.drawCentredString(width/2, height - 50, "RICHWELL COLLEGES")

        p.setFont("Helvetica", 10)
        p.drawCentredString(width/2, height - 65, "Address Line 1, City, Province")
        p.drawCentredString(width/2, height - 78, "Contact: (123) 456-7890 | Email: info@richwell.edu.ph")

        # Draw line
        p.line(50, height - 90, width - 50, height - 90)

        # Title
        p.setFont("Helvetica-Bold", 14)
        p.drawCentredString(width/2, height - 110, "CERTIFICATE OF REGISTRATION")

        # Student Info
        student = enrollment.student
        profile = student.student_profile

        y = height - 140
        p.setFont("Helvetica", 10)

        # Left column
        p.drawString(60, y, f"Student Number:")
        p.setFont("Helvetica-Bold", 10)
        p.drawString(180, y, f"{student.student_number}")

        p.setFont("Helvetica", 10)
        y -= 15
        p.drawString(60, y, f"Name:")
        p.setFont("Helvetica-Bold", 10)
        p.drawString(180, y, f"{student.get_full_name()}")

        # Right column
        y = height - 140
        p.setFont("Helvetica", 10)
        p.drawString(350, y, f"Program:")
        p.setFont("Helvetica-Bold", 10)
        p.drawString(430, y, f"{profile.program.code}")

        p.setFont("Helvetica", 10)
        y -= 15
        p.drawString(350, y, f"Year Level:")
        p.setFont("Helvetica-Bold", 10)
        p.drawString(430, y, f"{profile.get_year_level_display()}")

        y -= 15
        p.setFont("Helvetica", 10)
        p.drawString(350, y, f"Semester:")
        p.setFont("Helvetica-Bold", 10)
        p.drawString(430, y, f"{enrollment.semester.name}")

        # Subject Table Header
        y -= 35
        p.line(50, y, width - 50, y)
        y -= 20

        # Table Headers
        p.setFont("Helvetica-Bold", 9)
        p.drawString(60, y, "Subject Code")
        p.drawString(150, y, "Subject Title")
        p.drawString(380, y, "Section")
        p.drawString(450, y, "Units")
        p.drawString(510, y, "Schedule")

        y -= 5
        p.line(50, y, width - 50, y)
        y -= 15

        # Get enrolled subjects
        subjects = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            status=SubjectEnrollment.Status.ENROLLED
        ).select_related('subject', 'section').order_by('subject__code')

        total_units = 0
        p.setFont("Helvetica", 8)

        for se in subjects:
            # Check if we need a new page
            if y < 100:
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 8)

            # Subject code
            p.drawString(60, y, se.subject.code)

            # Subject title (truncate if too long)
            title = se.subject.title[:35] + "..." if len(se.subject.title) > 35 else se.subject.title
            p.drawString(150, y, title)

            # Section
            section_name = se.section.name if se.section else "N/A"
            p.drawString(390, y, section_name)

            # Units
            p.drawString(460, y, str(se.subject.units))
            total_units += se.subject.units

            # Schedule (simplified)
            if se.section:
                from apps.academics.models import SectionSubject
                section_subject = SectionSubject.objects.filter(
                    section=se.section,
                    subject=se.subject
                ).first()

                if section_subject:
                    slots = section_subject.schedule_slots.filter(is_deleted=False)[:2]
                    schedule_str = ", ".join([
                        f"{slot.get_day_display()[:3]} {slot.start_time.strftime('%H:%M')}"
                        for slot in slots
                    ])
                    if len(schedule_str) > 25:
                        schedule_str = schedule_str[:25] + "..."
                    p.drawString(510, y, schedule_str)

            y -= 15

        # Total line
        y -= 5
        p.line(50, y, width - 50, y)
        y -= 20

        p.setFont("Helvetica-Bold", 10)
        p.drawString(380, y, "Total Units:")
        p.drawString(460, y, str(total_units))

        # Footer
        y -= 50
        p.setFont("Helvetica", 9)
        p.drawString(60, y, "Student Signature: _____________________________")
        p.drawString(350, y, "Registrar Signature: _____________________________")

        y -= 20
        p.setFont("Helvetica", 8)
        p.drawString(60, y, f"Date Issued: {enrollment.created_at.strftime('%B %d, %Y')}")

        # Save PDF
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
