import qrcode
from io import BytesIO
from django.core.files import File
from django.db import models
from django.core.exceptions import ValidationError
from datetime import datetime
import os

def student_image_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    date_str = datetime.now().strftime('%Y%m%d')
    safe_name = "".join([c for c in instance.name if c.isalnum() or c in (' ', '_')]).rstrip().replace(' ', '_')
    filename = f"{safe_name}_{date_str}.{ext}"
    return os.path.join('students', filename)


class Student(models.Model):
    roll_no = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    face_encoding = models.BinaryField()
    # image = models.ImageField(upload_to='students/', null=True, blank=True)
    image = models.ImageField(upload_to=student_image_upload_path, null=True, blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if Student.objects.exclude(pk=self.pk).filter(roll_no=self.roll_no).exists():
            raise ValidationError({'roll_no': 'A student with this roll number already exists.'})


    def save(self, *args, **kwargs):
        if self.roll_no and not self.qr_code:
            qr_img = qrcode.make(self.roll_no)
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG')
            self.qr_code.save(f'{self.roll_no}_qr.png', File(buffer), save=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.roll_no} - {self.name}"
