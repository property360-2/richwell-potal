"""
PDF Document Generator for official school documents.
Uses ReportLab to generate professional PDF documents.
"""

import io
from datetime import datetime
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

from django.conf import settings


class DocumentPDFGenerator:
    """
    Generates PDF documents for official school releases.
    """
    
    # School info (can be moved to settings)
    SCHOOL_NAME = "RICHWELL COLLEGES"
    SCHOOL_ADDRESS = "123 Education Street, Manila, Philippines"
    SCHOOL_CONTACT = "Tel: (02) 123-4567 | Email: registrar@richwellcolleges.edu.ph"
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='DocumentTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=colors.HexColor('#1a365d')
        ))
        
        # Subtitle
        self.styles.add(ParagraphStyle(
            name='DocumentSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=30,
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='DocumentBody',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=12,
            leading=16,
        ))
        
        # Footer
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.gray,
        ))
    
    def _create_header(self, elements):
        """Add school header to document."""
        # School name
        elements.append(Paragraph(
            self.SCHOOL_NAME,
            self.styles['DocumentTitle']
        ))
        
        # Address
        elements.append(Paragraph(
            self.SCHOOL_ADDRESS,
            self.styles['DocumentSubtitle']
        ))
        
        # Contact
        elements.append(Paragraph(
            self.SCHOOL_CONTACT,
            self.styles['Footer']
        ))
        
        # Horizontal line
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=colors.HexColor('#1a365d')
        ))
        elements.append(Spacer(1, 20))
    
    def _create_footer(self, elements, document_code: str):
        """Add document footer with verification info."""
        elements.append(Spacer(1, 30))
        elements.append(HRFlowable(
            width="100%",
            thickness=1,
            color=colors.gray
        ))
        elements.append(Spacer(1, 10))
        
        footer_text = f"""
        Document Code: {document_code}<br/>
        Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        This is a computer-generated document. To verify authenticity, 
        please contact the Registrar's Office.
        """
        elements.append(Paragraph(footer_text, self.styles['Footer']))
    
    def generate_good_moral(
        self,
        student_name: str,
        student_number: str,
        program: str,
        document_code: str,
        purpose: str = ''
    ) -> bytes:
        """
        Generate Good Moral Certificate PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        elements = []
        self._create_header(elements)
        
        # Title
        elements.append(Paragraph(
            "CERTIFICATE OF GOOD MORAL CHARACTER",
            self.styles['DocumentTitle']
        ))
        elements.append(Spacer(1, 30))
        
        # Body
        body_text = f"""
        TO WHOM IT MAY CONCERN:
        <br/><br/>
        This is to certify that <b>{student_name}</b>, with Student Number 
        <b>{student_number}</b>, a bonafide student of <b>{self.SCHOOL_NAME}</b> 
        taking up <b>{program}</b>, has been found to be of GOOD MORAL CHARACTER 
        during their stay in this institution.
        <br/><br/>
        The student has not been involved in any disciplinary case nor has any 
        pending administrative charges filed against them.
        <br/><br/>
        This certification is issued upon the request of the above-named student 
        for {purpose or 'whatever legal purpose it may serve'}.
        """
        elements.append(Paragraph(body_text, self.styles['DocumentBody']))
        
        elements.append(Spacer(1, 40))
        
        # Date
        elements.append(Paragraph(
            f"Issued this {datetime.now().strftime('%d')}th day of "
            f"{datetime.now().strftime('%B, %Y')}.",
            self.styles['DocumentBody']
        ))
        
        elements.append(Spacer(1, 50))
        
        # Signature
        signature_data = [
            ['_' * 40],
            ['REGISTRAR'],
            [self.SCHOOL_NAME]
        ]
        signature_table = Table(signature_data, colWidths=[4*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(signature_table)
        
        self._create_footer(elements, document_code)
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_enrollment_certificate(
        self,
        student_name: str,
        student_number: str,
        program: str,
        year_level: int,
        semester: str,
        academic_year: str,
        document_code: str,
        purpose: str = ''
    ) -> bytes:
        """
        Generate Certificate of Enrollment PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        elements = []
        self._create_header(elements)
        
        # Title
        elements.append(Paragraph(
            "CERTIFICATE OF ENROLLMENT",
            self.styles['DocumentTitle']
        ))
        elements.append(Spacer(1, 30))
        
        # Body
        year_suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(year_level, 'th')
        body_text = f"""
        TO WHOM IT MAY CONCERN:
        <br/><br/>
        This is to certify that <b>{student_name}</b>, with Student Number 
        <b>{student_number}</b>, is officially enrolled at <b>{self.SCHOOL_NAME}</b> 
        for the <b>{semester}</b> of Academic Year <b>{academic_year}</b>.
        <br/><br/>
        <b>Program:</b> {program}<br/>
        <b>Year Level:</b> {year_level}{year_suffix} Year
        <br/><br/>
        This certification is issued upon the request of the above-named student 
        for {purpose or 'whatever legal purpose it may serve'}.
        """
        elements.append(Paragraph(body_text, self.styles['DocumentBody']))
        
        elements.append(Spacer(1, 40))
        
        # Date
        elements.append(Paragraph(
            f"Issued this {datetime.now().strftime('%d')}th day of "
            f"{datetime.now().strftime('%B, %Y')}.",
            self.styles['DocumentBody']
        ))
        
        elements.append(Spacer(1, 50))
        
        # Signature
        signature_data = [
            ['_' * 40],
            ['REGISTRAR'],
            [self.SCHOOL_NAME]
        ]
        signature_table = Table(signature_data, colWidths=[4*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(signature_table)
        
        self._create_footer(elements, document_code)
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_transcript(
        self,
        student_name: str,
        student_number: str,
        program: str,
        semesters: list,
        cumulative_gpa: str,
        document_code: str
    ) -> bytes:
        """
        Generate Transcript of Records PDF.
        
        Args:
            semesters: List of semester data with subjects and grades
                [
                    {
                        'semester': '1st Semester 2024-2025',
                        'subjects': [
                            {'code': 'CS101', 'title': 'Intro to CS', 'units': 3, 'grade': '1.50'}
                        ],
                        'gpa': '1.75'
                    }
                ]
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50
        )
        
        elements = []
        self._create_header(elements)
        
        # Title
        elements.append(Paragraph(
            "TRANSCRIPT OF RECORDS",
            self.styles['DocumentTitle']
        ))
        
        # Student info
        info_text = f"""
        <b>Student Name:</b> {student_name}<br/>
        <b>Student Number:</b> {student_number}<br/>
        <b>Program:</b> {program}
        """
        elements.append(Paragraph(info_text, self.styles['DocumentBody']))
        elements.append(Spacer(1, 20))
        
        # Grades by semester
        for sem_data in semesters:
            # Semester header
            elements.append(Paragraph(
                f"<b>{sem_data['semester']}</b>",
                self.styles['Normal']
            ))
            elements.append(Spacer(1, 5))
            
            # Grades table
            table_data = [['Code', 'Subject Title', 'Units', 'Grade']]
            for subj in sem_data.get('subjects', []):
                table_data.append([
                    subj.get('code', ''),
                    subj.get('title', ''),
                    str(subj.get('units', '')),
                    str(subj.get('grade', '-'))
                ])
            
            # Add GPA row
            table_data.append(['', '', 'Semester GPA:', sem_data.get('gpa', '-')])
            
            table = Table(table_data, colWidths=[1*inch, 3.5*inch, 0.7*inch, 0.8*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -2), 0.5, colors.gray),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))
        
        # Cumulative GPA
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(
            f"<b>Cumulative GPA: {cumulative_gpa}</b>",
            self.styles['DocumentBody']
        ))
        
        elements.append(Spacer(1, 30))
        
        # Signature
        signature_data = [
            ['_' * 40],
            ['REGISTRAR'],
            [self.SCHOOL_NAME]
        ]
        signature_table = Table(signature_data, colWidths=[4*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(signature_table)
        
        self._create_footer(elements, document_code)
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_generic_certificate(
        self,
        document_type: str,
        student_name: str,
        student_number: str,
        program: str,
        document_code: str,
        content: str = '',
        purpose: str = ''
    ) -> bytes:
        """
        Generate a generic certificate PDF for any document type.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        elements = []
        self._create_header(elements)
        
        # Title
        title = document_type.replace('_', ' ').title()
        elements.append(Paragraph(
            title.upper(),
            self.styles['DocumentTitle']
        ))
        elements.append(Spacer(1, 30))
        
        # Body
        if content:
            body_text = content
        else:
            body_text = f"""
            TO WHOM IT MAY CONCERN:
            <br/><br/>
            This is to certify that <b>{student_name}</b>, with Student Number 
            <b>{student_number}</b>, is a bonafide student of <b>{self.SCHOOL_NAME}</b> 
            taking up <b>{program}</b>.
            <br/><br/>
            This certification is issued upon the request of the above-named student 
            for {purpose or 'whatever legal purpose it may serve'}.
            """
        elements.append(Paragraph(body_text, self.styles['DocumentBody']))
        
        elements.append(Spacer(1, 40))
        
        # Date
        elements.append(Paragraph(
            f"Issued this {datetime.now().strftime('%d')}th day of "
            f"{datetime.now().strftime('%B, %Y')}.",
            self.styles['DocumentBody']
        ))
        
        elements.append(Spacer(1, 50))
        
        # Signature
        signature_data = [
            ['_' * 40],
            ['REGISTRAR'],
            [self.SCHOOL_NAME]
        ]
        signature_table = Table(signature_data, colWidths=[4*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(signature_table)
        
        self._create_footer(elements, document_code)
        
        doc.build(elements)
        return buffer.getvalue()
