from django.contrib import admin
from .models import Student

# @admin.site.register(Student)
class StudentAdmin(admin.ModelAdmin):
    exclude = ('qr_code',)

admin.site.register(Student, StudentAdmin)