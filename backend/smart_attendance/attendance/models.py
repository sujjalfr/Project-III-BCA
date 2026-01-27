from django.db import models
from accounts.models import Student
from django.utils import timezone

# Create your models here.
class Attendance(models.Model):
    STATUS_CHOICES = [
        ('absent', 'Absent'),
        ('on_time', 'On Time'),
        ('late', 'Late'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.localdate)  # Allow updates
    time = models.TimeField(null=True, blank=True)  # Allow null for edits, don't auto_now_add
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    already_marked = models.BooleanField(default=True)  # Track if marked
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']
        unique_together = ('student', 'date')  # One attendance per student per day

    def __str__(self):
        return f"{self.student.name} - {self.date} ({self.status})"
