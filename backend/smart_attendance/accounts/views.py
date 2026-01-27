from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Student, Department, Batch, ClassGroup
from attendance.utils.face_utils import get_face_encoding
from django.http import JsonResponse

from rest_framework import generics, pagination, filters
from django.db import models
from .serializers import StudentSerializer
from rest_framework import viewsets, status
import logging

logger = logging.getLogger(__name__)


def departments_list(request):
    qs = Department.objects.order_by('name').values('id', 'name')
    return JsonResponse(list(qs), safe=False)


def department_batches(request, dept_id):
    qs = Batch.objects.filter(classgroup__department_id=dept_id).distinct().values('id', 'name')
    # Also include batches directly linked to department via ClassGroup
    return JsonResponse(list(qs), safe=False)


def batch_classgroups(request, batch_id):
    qs = ClassGroup.objects.filter(batch_id=batch_id).values('id', 'name', 'department_id')
    return JsonResponse(list(qs), safe=False)


def all_batches(request):
    """Return all batches across all departments"""
    qs = Batch.objects.order_by('name').values('id', 'name')
    return JsonResponse(list(qs), safe=False)


def all_classgroups(request):
    """Return all class groups with their department and batch info"""
    qs = ClassGroup.objects.select_related('department', 'batch').order_by('name').values(
        'id', 'name', 'department_id', 'department__name', 'batch_id', 'batch__name'
    )
    return JsonResponse(list(qs), safe=False)


def department_classgroups(request, dept_id):
    """Return class groups for a specific department"""
    qs = ClassGroup.objects.filter(department_id=dept_id).values('id', 'name', 'batch_id')
    return JsonResponse(list(qs), safe=False)


class RegisterStudent(APIView):
    def post(self, request):
        # handle file upload via DRF
        image = request.FILES.get('image')
        if image:
            path = f"media/{image.name}"
            with open(path, 'wb+') as f:
                for chunk in image.chunks():
                    f.write(chunk)

            encoding = get_face_encoding(path)
        else:
            encoding = None

        print(f"Encoding returned from get_face_encoding: {encoding}")

        # Validate encoding
        if image and encoding is None:
            return Response({"error": "No face detected or encoding error"}, status=400)

        # Save student with encoding and image
        student = Student.objects.create(
            roll_no=request.data.get('roll_no'),
            name=request.data.get('name'),
            face_encoding=encoding if encoding is not None else None
        )
        if image:
            student.image.save(image.name, image, save=True)
        print(f"Registered student {student.roll_no}")

        return Response({"message": "Student registered successfully"})


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 200


class StudentListView(generics.ListAPIView):
    """API endpoint that returns students with filtering and pagination.

    Query params:
      - page (DRF page number)
      - page_size (optional)
      - date_from (YYYY-MM-DD)
      - date_to (YYYY-MM-DD)
      - batch (batch id)
      - department (department id)
      - search (search string for name or roll)
    """
    queryset = Student.objects.select_related('department', 'batch', 'class_group').order_by('-created_at')
    serializer_class = StudentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'roll_no']

    def get_queryset(self):
        qs = Student.objects.select_related('department', 'batch', 'class_group').order_by('-created_at')
        req = self.request
        date_from = req.GET.get('date_from')
        date_to = req.GET.get('date_to')
        batch = req.GET.get('batch')
        dept = req.GET.get('department')
        search = req.GET.get('search')

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if batch:
            qs = qs.filter(batch_id=batch)
        if dept:
            qs = qs.filter(department_id=dept)
        if search:
            qs = qs.filter(models.Q(name__icontains=search) | models.Q(roll_no__icontains=search))

        return qs

    def list(self, request, *args, **kwargs):
        """Override to add debugging and ensure proper response format"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            print(f"DEBUG: Found {queryset.count()} students")
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.exception("Error in StudentListView.list: %s", e)
            return Response(
                {"error": f"Failed to fetch students: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StudentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Student.objects.select_related('department', 'batch', 'class_group').all()
    serializer_class = StudentSerializer
    lookup_field = 'pk'
    
    def patch(self, request, *args, **kwargs):
        """Handle PATCH for partial updates"""
        return self.partial_update(request, *args, **kwargs)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('department', 'batch', 'class_group').all()
    serializer_class = StudentSerializer
    
    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for student updates"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
        except Exception as e:
            logger.exception("Error updating student: %s", e)
            return Response(
                {"detail": f"Failed to update student: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


