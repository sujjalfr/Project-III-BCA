from rest_framework.views import APIView
from rest_framework.response import Response
from .utils.face_utils import match_face
from accounts.models import Student
from .models import Attendance
from django.utils import timezone
import os
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta, date
from accounts.models import Student
import openpyxl
from django.http import HttpResponse
from datetime import time as datetime_time

from .utils.image_store import save_attendance_image_from_path
from django.conf import settings
import logging
logger = logging.getLogger(__name__)

from datetime import timedelta, date, datetime, time as datetime_time, timezone as dt_timezone
from django.utils import timezone
NEPAL_TZ = timezone.get_fixed_timezone(5 * 60 + 45)  # UTC+5:45

def _local_time_iso(d, t):
    """Convert stored date+time to Nepal time ISO (+05:45).

    We now store attendance.times in Nepal local time to avoid offset confusion.
    This function attaches Asia/Kathmandu tz to the stored time and returns ISO.
    Example: "2026-01-26T20:10:39.466932+05:45".
    """
    if not d or not t:
        return None
    # Stored time is local NPT (naive). Attach NEPAL_TZ explicitly.
    local_dt = datetime.combine(d, t, tzinfo=NEPAL_TZ)
    return local_dt.isoformat()

def _now_local_iso():
    return timezone.localtime(timezone.now(), NEPAL_TZ).isoformat()

class AttendanceStatus(APIView):
    def get(self, request):
        roll_no = request.query_params.get("roll_no")
        if not roll_no:
            return Response({"error": "roll_no required"}, status=400)
        try:
            student = Student.objects.get(roll_no=roll_no)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)
        today = timezone.now().date()
        exists = Attendance.objects.filter(student=student, date=today).exists()
        # if already marked, include attendance time
        attendance_time = None
        if exists:
            att = Attendance.objects.filter(student=student, date=today).order_by("-time").first()
            if att:
                # attendance_time = att.time.isoformat()
                attendance_time = _local_time_iso(today, att.time)

        return Response({
            "alreadyMarked": exists,
            "roll_no": roll_no,
            "name": student.name,
            "class": student.class_group.name if student.class_group else None,
            "batch": student.batch.name if student.batch else None,
            "department": student.department.name if student.department else None,
            "time": attendance_time
        })

class AttendanceStatusList(APIView):
    """List attendance status for all students today"""
    def get(self, request):
        today = timezone.now().date()
        students = Student.objects.select_related('class_group', 'batch', 'department').all()
        
        # Define cutoff times
        CUTOFF_TIME = datetime_time(9, 0)  # 9:00 AM - on_time before this
        LATE_TIME = datetime_time(9, 30)   # 9:30 AM - late after this
        
        result = []
        for student in students:
            exists = Attendance.objects.filter(student=student, date=today).exists()
            attendance_time = None
            status = "absent"
            
            if exists:
                att = Attendance.objects.filter(student=student, date=today).order_by("-time").first()
                if att:
                    _local_dt_iso = _local_time_iso(today, att.time)
                    attendance_time = _local_dt_iso
                    local_dt = datetime.fromisoformat(_local_dt_iso)
                    att_time_local = local_dt.time()
                    if(att_time_local <= CUTOFF_TIME):
                        status = "on_time"
                    elif att_time_local <= LATE_TIME:
                        status = "late"
                    else:
                        status = "late"
                    # attendance_time = att.time.isoformat()
                    
                    # # Determine status based on time
                    # att_time = att.time.time()  # Extract time portion
                    # if att_time <= CUTOFF_TIME:
                    #     status = "on_time"
                    # elif att_time <= LATE_TIME:
                    #     status = "late"
                    # else:
                    #     status = "late"  # Very late
            
            result.append({
                "id": student.id,
                "roll_no": student.roll_no,
                "name": student.name,
                "class": student.class_group.name if student.class_group else None,
                "batch": student.batch.name if student.batch else None,
                "department": student.department.name if student.department else None,
                "alreadyMarked": exists,
                "time": attendance_time,
                "status": status
            })
        
        return Response({"results": result})

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
        existing_att = Attendance.objects.filter(student=student, date=today).order_by("-time").first()
        if existing_att:
            print("Attendance already marked today")
            return Response({
                "message": "Attendance already marked today",
                "name": student.name,
                "roll_no": student.roll_no,
                "class": student.class_group.name if student.class_group else None,
                "batch": student.batch.name if student.batch else None,
                "department": student.department.name if student.department else None,
                # "time": existing_att.time.isoformat() if existing_att else None
                "time": _local_time_iso(today, existing_att.time) if existing_att else None
})
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
            today = timezone.localdate()
            now_local = timezone.localtime(timezone.now(), NEPAL_TZ)
            if Attendance.objects.filter(student=student, date=today).exists():
                print("Attendance already marked today")
                return Response({"message": "Attendance already marked today"})
            # Store time explicitly in Nepal local time to avoid double conversions
            attendance = Attendance.objects.create(
                student=student,
                date=today,
                time=now_local.timetz(),
            )  # <-- capture created record
            try:
                saved_path = save_attendance_image_from_path(path, roll_no)
                logger.info(f"Saved attendance image to {saved_path}")
            except Exception as e:
                logger.exception("Failed to save attendance image: %s", e)
            finally:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass

            print(f"Attendance marked for {student.name}")
            return Response({
                "message": f"Attendance marked for {student.name}",
                "name": student.name,
                "roll_no": student.roll_no,
                "class": student.class_group.name if student.class_group else None,
                "batch": student.batch.name if student.batch else None,
                "department": student.department.name if student.department else None,
                # "time": attendance.time.isoformat() if attendance else None
                "time": _now_local_iso()
            })
        else:
            print("Error: Face did not match")
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return Response({"error": "Face did not match"}, status=400)


class MostAbsentAPIView(APIView):
    def get(self, request):
        days = int(request.query_params.get("days", 7))
        class_id = request.query_params.get("class_id")  # optional filter
        end = timezone.localdate()
        start = end - timedelta(days=days-1)
        # count present per student in range:
        present_qs = Attendance.objects.filter(date__range=(start, end))
        if class_id:
            present_qs = present_qs.filter(student__class_group_id=class_id)
        present_counts = present_qs.values('student_id', 'student__roll_no', 'student__name', 'student__class_group__name')\
                                   .annotate(presents=Count('id'))
        # build dict by student
        presents_map = {p['student_id']: p for p in present_counts}
        # students to evaluate
        students = Student.objects.all()
        if class_id:
            students = students.filter(class_group_id=class_id)
        total_days = days
        result = []
        for s in students:
            p = presents_map.get(s.id)
            presents = p['presents'] if p else 0
            absences = total_days - presents
            result.append({"roll_no": s.roll_no, "name": s.name, "class": s.class_group and s.class_group.name, "presents": presents, "absences": absences})
        # sort by absences desc
        result.sort(key=lambda x: x['absences'], reverse=True)
        return Response({"period_days": total_days, "start": start, "end": end, "data": result})

class ExportAttendanceExcelAPIView(APIView):
    def get(self, request):
        days = int(request.query_params.get("days", 7))
        end = timezone.localdate()
        start = end - timedelta(days=days-1)
        qs = Attendance.objects.filter(date__range=(start, end)).select_related('student','student__class_group')
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Date","Roll No","Name","Class","Present"])
        for a in qs.order_by('date'):
            ws.append([a.date.isoformat(), a.student.roll_no, a.student.name, a.student.class_group and a.student.class_group.name or "", bool(a.status)])
        resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = f'attachment; filename=attendance_{start}_{end}.xlsx'
        wb.save(resp)
        return resp

from rest_framework import status
from django.db.models import Q
from rest_framework import generics
from .serializers import AttendanceSerializer

class StudentAttendanceDetail(APIView):
    """
    Returns attendance stats and records for a student.
    Query params:
      - date_from (YYYY-MM-DD, optional)
      - date_to (YYYY-MM-DD, optional)
    """
    def get(self, request, roll_no):
        date_from = request.GET.get("date_from")
        date_to = request.GET.get("date_to")
        try:
            student = Student.objects.select_related("class_group", "batch", "department").get(roll_no=roll_no)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        qs = Attendance.objects.filter(student=student)

        # Parse date filters safely
        start = end = None
        try:
            if date_from:
                start = datetime.strptime(date_from, "%Y-%m-%d").date()
                qs = qs.filter(date__gte=start)
            if date_to:
                end = datetime.strptime(date_to, "%Y-%m-%d").date()
                qs = qs.filter(date__lte=end)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start is None or end is None:
            if qs.exists():
                start = qs.order_by("date").first().date
                end = qs.order_by("-date").first().date

        # Build date range and counts
        all_dates = []
        if start and end and end >= start:
            delta = (end - start).days
            all_dates = [start + timedelta(days=i) for i in range(delta + 1)]

        present_days = qs.count()
        present_dates = set(qs.values_list("date", flat=True))
        absent_days = len([d for d in all_dates if d not in present_dates]) if all_dates else 0
        total_days = len(all_dates) if all_dates else present_days

        # Status breakdown with timezone-safe comparison
        status_counts = {"on_time": 0, "late": 0}
        CUTOFF_TIME = datetime_time(9, 0)
        LATE_TIME = datetime_time(9, 30)

        def _naive_time(t):
            return t.replace(tzinfo=None) if t and getattr(t, "tzinfo", None) else t

        for att in qs:
            att_time = _naive_time(att.time)
            if att_time:
                if att_time <= CUTOFF_TIME:
                    status_counts["on_time"] += 1
                elif att_time <= LATE_TIME:
                    status_counts["late"] += 1
                else:
                    status_counts["late"] += 1

        records = [
            {
                "date": a.date.isoformat(),
                "time": (_naive_time(a.time).isoformat() if _naive_time(a.time) else None),
                "status": (
                    "on_time" if (_naive_time(a.time) and _naive_time(a.time) <= CUTOFF_TIME)
                    else "late" if (_naive_time(a.time) and _naive_time(a.time) <= LATE_TIME)
                    else "late" if a.time else "absent"
                ),
            }
            for a in qs.order_by("-date")
        ]

        return Response({
            "roll_no": student.roll_no,
            "name": student.name,
            "class": student.class_group.name if student.class_group else None,
            "batch": student.batch.name if student.batch else None,
            "department": student.department.name if student.department else None,
            "present_days": present_days,
            "absent_days": absent_days,
            "on_time_days": status_counts["on_time"],
            "late_days": status_counts["late"],
            "total_days": total_days,
            "records": records,
        })

class AttendanceUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    lookup_field = "pk"
    
    def patch(self, request, *args, **kwargs):
        """Handle PATCH request for partial updates"""
        try:
            return super().patch(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Error updating attendance: %s", e)
            return Response(
                {"detail": f"Failed to update attendance: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )