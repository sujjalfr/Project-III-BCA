"""
URL configuration for smart_attendance project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from accounts.views import (
    RegisterStudent,
    departments_list,
    department_batches,
    batch_classgroups,
    StudentListView,
)
from attendance.views import MarkAttendance

urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', RegisterStudent.as_view()),
    path('api/students/', StudentListView.as_view()),
    path('api/departments/', departments_list),
    path('api/departments/<int:dept_id>/batches/', department_batches),
    path('api/batches/<int:batch_id>/classgroups/', batch_classgroups),
    path('attendance/', MarkAttendance.as_view()),
]
