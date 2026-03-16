import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
from django.db.models import Q
from apps.students.models import Student, StudentEnrollment
from apps.grades.models import Grade
from apps.scheduling.models import Schedule
from apps.academics.models import Subject

class ReportService:
    @staticmethod
    def generate_masterlist_excel(term_id, program_id=None, year_level=None):
        """
        Generates an Excel masterlist of enrolled students for a specific term.
        """
        wb = Workbook()
        ws = wb.active
        ws.title = "Masterlist"

        # Styles
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        center_align = Alignment(horizontal="center")
        border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

        # Header
        headers = ["ID Number", "Last Name", "First Name", "Middle Name", "Program", "Year", "Gender", "Status"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = border

        # Data
        enrollments = StudentEnrollment.objects.filter(term_id=term_id)
        if program_id:
            enrollments = enrollments.filter(student__program_id=program_id)
        if year_level:
            enrollments = enrollments.filter(year_level=year_level)

        for row_num, enrollment in enumerate(enrollments, 2):
            student = enrollment.student
            ws.cell(row=row_num, column=1, value=student.idn).border = border
            ws.cell(row=row_num, column=2, value=student.user.last_name).border = border
            ws.cell(row=row_num, column=3, value=student.user.first_name).border = border
            ws.cell(row=row_num, column=4, value=student.middle_name or "").border = border
            ws.cell(row=row_num, column=5, value=student.program.code).border = border
            ws.cell(row=row_num, column=6, value=f"Year {enrollment.year_level}").border = border
            ws.cell(row=row_num, column=7, value=student.get_gender_display()).border = border
            ws.cell(row=row_num, column=8, value=student.get_status_display()).border = border

        # Column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except: pass
            ws.column_dimensions[column].width = max_length + 2

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @staticmethod
    def generate_cor_pdf(student_id, term_id):
        """
        Generates a PDF Certificate of Registration (COR) for a student.
        """
        student = Student.objects.get(id=student_id)
        enrollment = StudentEnrollment.objects.get(student_id=student_id, term_id=term_id)
        grades = Grade.objects.filter(student_id=student_id, term_id=term_id, advising_status='APPROVED')
        
        if not grades.exists():
            raise ValueError("No approved subjects found for this student in the selected term. Please ensure advising is approved.")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, spaceAfter=20)
        info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, leading=14)
        table_header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', color=colors.whitesmoke)

        # Header Info
        elements.append(Paragraph("<b>RICHWELL COLLEGES, INC.</b>", title_style))
        elements.append(Paragraph("Certificate of Registration", ParagraphStyle('SubTitle', parent=styles['Normal'], alignment=1, fontSize=12, spaceAfter=20)))
        
        # Student Info Table
        data = [
            [f"ID NO: {student.idn}", f"NAME: {student.user.get_full_name().upper()}"],
            [f"PROGRAM: {student.program.name}", f"YEAR LEVEL: {enrollment.year_level}"],
            [f"TERM: {enrollment.term.code}", f"DATE: {enrollment.enrollment_date.strftime('%B %d, %Y') if enrollment.enrollment_date else '-' }"]
        ]
        t = Table(data, colWidths=[2.5*inch, 4.5*inch])
        t.setStyle(TableStyle([
            ('SIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.2*inch))

        # Subjects Table
        subject_data = [["CODE", "DESCRIPTION", "UNITS", "SCHEDULE", "ROOM"]]
        total_units = 0
        
        for g in grades:
            # Find schedule for this subject and term
            schedule = Schedule.objects.filter(subject=g.subject, term_id=term_id).first()
            sched_str = "TBA"
            room_str = "TBA"
            if schedule:
                days = "".join(schedule.days)
                time = f"{schedule.start_time.strftime('%I:%M%p')}-{schedule.end_time.strftime('%I:%M%p')}" if schedule.start_time else ""
                sched_str = f"{days} {time}"
                room_str = schedule.room.name if schedule.room else "TBA"
            
            subject_data.append([
                g.subject.code,
                Paragraph(g.subject.description, styles['Normal']),
                str(g.subject.total_units),
                sched_str,
                room_str
            ])
            total_units += g.subject.total_units

        # Totals
        subject_data.append(["", "TOTAL UNITS", str(total_units), "", ""])

        s_table = Table(subject_data, colWidths=[0.8*inch, 2.5*inch, 0.6*inch, 2.0*inch, 1.1*inch])
        s_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('GRID', (0,0), (-1,-2), 0.5, colors.grey),
            ('ALIGN', (2,0), (2,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTNAME', (1,-1), (2,-1), 'Helvetica-Bold'),
        ]))
        elements.append(s_table)
        
        # Signatures
        elements.append(Spacer(1, 1.0*inch))
        sig_data = [
            ["________________________", "________________________"],
            ["Registrar / Authorized Representative", "Student's Signature"]
        ]
        sig_table = Table(sig_data, colWidths=[3.5*inch, 3.5*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
        ]))
        elements.append(sig_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer

    @staticmethod
    def graduation_check(student_id):
        """
        Full audit of a student's passed subjects vs their curriculum requirements.
        """
        student = Student.objects.get(id=student_id)
        curriculum = student.curriculum
        
        # Get all subjects required by the curriculum
        required_subjects = Subject.objects.filter(curriculum=curriculum)
        required_ids = set(required_subjects.values_list('id', flat=True))
        
        # Get all passed subjects (PASSED status)
        passed_grades = Grade.objects.filter(student=student, grade_status='PASSED')
        passed_ids = set(passed_grades.values_list('subject_id', flat=True))
        
        # Identify missing subjects
        missing_ids = required_ids - passed_ids
        missing_subjects = required_subjects.filter(id__in=missing_ids)
        
        total_units_required = sum(rs.total_units for rs in required_subjects)
        total_units_earned = sum(pg.subject.total_units for pg in passed_grades)
        
        is_eligible = len(missing_ids) == 0
        
        return {
            "is_eligible": is_eligible,
            "total_units_required": total_units_required,
            "total_units_earned": total_units_earned,
            "missing_subjects": [
                {
                    "code": ms.code,
                    "name": ms.description,
                    "units": ms.total_units,
                    "year": ms.year_level,
                    "semester": ms.semester
                } for ms in missing_subjects
            ],
            "passed_count": len(passed_ids),
            "required_count": len(required_ids)
        }
