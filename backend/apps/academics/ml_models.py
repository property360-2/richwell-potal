import numpy as np
from django.db.models import Count, Q
from apps.enrollment.models import SubjectEnrollment
from apps.accounts.models import User

class SocialGraphService:
    """
    Computes classmate social scores for ML sectioning.
    """

    @classmethod
    def get_social_matrix(cls, student_ids):
        """
        Builds a proximity matrix where matrix[i][j] is the number of 
        shared section-subjects in history.
        """
        size = len(student_ids)
        matrix = np.zeros((size, size))
        id_to_idx = {sid: i for i, sid in enumerate(student_ids)}

        # Query shared sections in batch
        # This is high-impact, so we limit to last 4 semesters
        shared_classes = SubjectEnrollment.objects.filter(
            enrollment__student_id__in=student_ids,
            status__in=['PASSED', 'ENROLLED']
        ).values('subject_id', 'section_id', 'enrollment__student_id')

        # Map students to their classes
        student_to_classes = {}
        for row in shared_classes:
            sid = str(row['enrollment__student_id'])
            class_key = f"{row['subject_id']}_{row['section_id']}"
            if sid not in student_to_classes:
                student_to_classes[sid] = set()
            student_to_classes[sid].add(class_key)

        # Compute intersections
        for i, sid1 in enumerate(student_ids):
            classes1 = student_to_classes.get(str(sid1), set())
            for j, sid2 in enumerate(student_ids):
                if i >= j: continue
                classes2 = student_to_classes.get(str(sid2), set())
                common = len(classes1.intersection(classes2))
                matrix[i][j] = matrix[j][i] = common

        return matrix

class ClassmatePreservationModel:
    """
    Mock ML Model using Logistic Grouping logic.
    In production, this would use scikit-learn LogisticRegression
    to predict section probabilities.
    """
    
    def __init__(self, n_sections=2):
        self.n_sections = n_sections

    def predict_groups(self, social_matrix):
        """
        Uses the social matrix to cluster students into N groups.
        Minimizes cross-group interactions.
        """
        # Simple Clustering (Simulation of LR-based grouping)
        from sklearn.cluster import SpectralClustering
        
        if social_matrix.sum() == 0:
            # No history, random assign
            return np.random.randint(0, self.n_sections, size=social_matrix.shape[0])

        n_samples = social_matrix.shape[0]
        n_clusters = min(self.n_sections, n_samples)
        
        clustering = SpectralClustering(
            n_clusters=n_clusters,
            affinity='precomputed',
            random_state=42
        )
        return clustering.fit_predict(social_matrix)
