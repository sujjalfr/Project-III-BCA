from rest_framework.views import APIView
from rest_framework.response import Response
from .utils.face_utils import match_face
from accounts.models import Student
from .models import Attendance
from django.utils import timezone
import os

from .utils.image_store import save_attendance_image_from_path
from django.conf import settings
import logging
logger = logging.getLogger(__name__)

class MarkAttendance(APIView):
    def post(self, request):
        print("Received attendance request")
        roll_no = request.data.get('roll_no')
        image = request.FILES.get('image')
        print(f"Roll No: {roll_no}, Image: {image}")

        if not roll_no or not image:
            print("Error: Missing roll_no or image")
            return Response({"error": "Roll number and image are required"}, status=400)

        try:
            student = Student.objects.get(roll_no=roll_no)
        except Student.DoesNotExist:
            print(f"Error: Student with roll_no {roll_no} not found")
            return Response({"error": "Student not found"}, status=404)

        # Check if attendance is already marked for today before proceeding
        today = timezone.now().date()
        if Attendance.objects.filter(student=student, date=today).exists():
            print("Attendance already marked today")
            return Response({"message": "Attendance already marked today"})
        
        if not student.face_encoding:
            print(f"Error: Student {student.roll_no} has no face encoding. Register via /register/ API or fix with management command.")
            return Response({"error": "Student has no face encoding. Register via /register/ API or fix with management command."}, status=400)

        # Ensure directory exists
        os.makedirs("media/temp", exist_ok=True)

        # Save uploaded image temporarily
        path = f"media/temp/{roll_no}.jpg"
        with open(path, 'wb+') as f:
            for chunk in image.chunks():
                f.write(chunk)

        # Match face with student
        try:
            print(f"Matching face for student: {student.name} ({student.roll_no})")
            matched_student = match_face(path, [student])
            print(f"Match result: {matched_student}")
            if matched_student == "no_face":
                print("Error: No face detected in image")
                return Response({"error": "No face detected in image"}, status=400)
        except Exception as e:
            print(f"Exception during face matching: {e}")
            return Response({"error": f"Error processing image: {str(e)}"}, status=500)

        if matched_student:
            today = timezone.now().date()
            if Attendance.objects.filter(student=student, date=today).exists():
                print("Attendance already marked today")
                return Response({"message": "Attendance already marked today"})
            Attendance.objects.create(student=student)
            try:
                # Save attendance image to weekday folder and cleanup old archives
                saved_path = save_attendance_image_from_path(path, roll_no)
                logger.info(f"Saved attendance image to {saved_path}")
            except Exception as e:
                logger.exception("Failed to save attendance image: %s", e)
            finally:
                # remove temp file if exists
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass

            print(f"Attendance marked for {student.name}")
            return Response({"message": f"Attendance marked for {student.name}"})
        else:
            print("Error: Face did not match")
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return Response({"error": "Face did not match"}, status=400)
