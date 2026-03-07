import json
import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class BulacanLocationView(APIView):
    """
    Returns the municipalities and barangays of Bulacan from the JSON file.
    This is entirely public.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        file_path = os.path.join(settings.DATA_DIR, 'bulacan_locations.json')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data)
        except Exception as e:
            return Response(
                {"error": "Could not load location data", "details": str(e)}, 
                status=500
            )
