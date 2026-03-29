"""
Richwell Portal — Faculty Views

This module provides API endpoints for managing faculty profiles, their 
subject assignments, and availability for scheduling. It handles both 
individual record management and bulk cross-application assignments.
"""

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth import get_user_model
from core.permissions import IsStaff, IsAdmin
import datetime

from .models import Professor, ProfessorSubject, ProfessorAvailability
from .serializers import ProfessorSerializer, ProfessorCreateUpdateSerializer, ProfessorSubjectSerializer, ProfessorAvailabilitySerializer
from apps.academics.models import Subject

User = get_user_model()

class ProfessorViewSet(viewsets.ModelViewSet):
    """
    Main ViewSet for managing Professor profiles. 
    Includes actions for subject assignment and availability tracking.
    """
    queryset = Professor.objects.all()
    permission_classes = [IsAdmin]
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'department']
    filterset_fields = ['department', 'employment_status', 'is_active']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProfessorCreateUpdateSerializer
        return ProfessorSerializer

    def perform_create(self, serializer):
        data = self.request.data
        with transaction.atomic():
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            email = data.get('email')
            employee_id = data.get('employee_id')
            date_of_birth = serializer.validated_data.get('date_of_birth')
            
            if not employee_id:
                # Auto-generate employee_id: EMP-{YY}{seq}
                year_prefix = str(datetime.datetime.now().year)[2:]
                last_prof = Professor.objects.filter(employee_id__startswith=f"EMP-{year_prefix}").order_by('-employee_id').first()
                if last_prof and last_prof.employee_id.startswith(f"EMP-{year_prefix}"):
                    try:
                        seq = int(last_prof.employee_id.split('-')[1][2:]) + 1
                    except ValueError:
                        seq = 1
                else:
                    seq = 1
                employee_id = f"EMP-{year_prefix}{str(seq).zfill(4)}"
            
            # Check if email is taken
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError({'email': 'User with this email already exists.'})

            # Create User
            user = User.objects.create(
                username=email, # Using email as username initially or employee_id
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='PROFESSOR',
                is_active=True
            )
            
            user.username = employee_id # username is employee_id
            
            # Set initial password: {employee_id}{MMDD}
            dob_suffix = date_of_birth.strftime('%m%d')
            initial_password = f"{employee_id}{dob_suffix}"
            user.set_password(initial_password)
            user.save()

            # Pop user-related fields so they don't get passed to Professor.objects.create()
            serializer.validated_data.pop('first_name', None)
            serializer.validated_data.pop('last_name', None)
            serializer.validated_data.pop('email', None)

            serializer.save(user=user, employee_id=employee_id)

    @action(detail=True, methods=['post', 'get'])
    def subjects(self, request, pk=None):
        """
        Manages the list of subjects a professor is qualified to teach.
        GET: Returns current subjects.
        POST: Adds new subjects to the list.
        """
        professor = self.get_object()
        
        if request.method == 'GET':
            subjects = ProfessorSubject.objects.filter(professor=professor)
            serializer = ProfessorSubjectSerializer(subjects, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            subject_ids = request.data.get('subject_ids', [])
            
            with transaction.atomic():
                # Clear existing if we are doing a full replace
                # ProfessorSubject.objects.filter(professor=professor).delete()
                
                # Or just add new ones, ignoring existing
                added_count = 0
                for subj_id in subject_ids:
                    try:
                        subject = Subject.objects.get(id=subj_id)
                        obj, created = ProfessorSubject.objects.get_or_create(
                            professor=professor,
                            subject=subject
                        )
                        if created:
                            added_count += 1
                    except Subject.DoesNotExist:
                        continue
                        
                return Response({'status': f'Added {added_count} subjects'})

    @action(detail=True, methods=['post'])
    def assign_subjects(self, request, pk=None):
        """
        Full replacement of assigned subjects for a professor.
        Removes any existing assignments not included in the request.
        """
        professor = self.get_object()
        subject_ids = request.data.get('subject_ids', [])
        
        with transaction.atomic():
            # Remove subjects not in the new list
            ProfessorSubject.objects.filter(professor=professor).exclude(subject_id__in=subject_ids).delete()
            
            # Add new subjects
            for subj_id in subject_ids:
                try:
                    subject = Subject.objects.get(id=subj_id)
                    ProfessorSubject.objects.get_or_create(
                        professor=professor,
                        subject=subject
                    )
                except Subject.DoesNotExist:
                    pass
                    
        return Response({'status': 'Subjects successfully updated'})

    @action(detail=True, methods=['get', 'post'])
    def availability(self, request, pk=None):
        """
        Manages professor teaching session preferences.
        GET: Returns current availability slots.
        POST: Replaces existing availability with new data.
        """
        professor = self.get_object()
        
        if request.method == 'GET':
            availabilities = ProfessorAvailability.objects.filter(professor=professor)
            serializer = ProfessorAvailabilitySerializer(availabilities, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            # Expecting a list of availability objects: [{day: 'M', session: 'AM'}, ...]
            availability_data = request.data.get('availabilities', [])
            
            with transaction.atomic():
                # For this simple implementation, we fully replace the availability
                ProfessorAvailability.objects.filter(professor=professor).delete()
                
                created_count = 0
                for item in availability_data:
                    day = item.get('day')
                    session = item.get('session')
                    if day and session:
                        ProfessorAvailability.objects.create(
                            professor=professor,
                            day=day,
                            session=session
                        )
                        created_count += 1
                        
                return Response({'status': f'Updated {created_count} availability slots'})
