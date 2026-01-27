from rest_framework import serializers
from .models import Attendance
from datetime import time as datetime_time

class AttendanceSerializer(serializers.ModelSerializer):
    time = serializers.TimeField(format='%H:%M:%S', allow_null=True, required=False)
    
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'date', 'time', 'status']
        read_only_fields = ['student', 'date', 'status']
    
    def validate_time(self, value):
        """Validate time is in valid range"""
        if value is None:
            return value
        if not isinstance(value, datetime_time):
            raise serializers.ValidationError("Time must be a valid time value (HH:MM:SS)")
        return value
    
    def update(self, instance, validated_data):
        """Update time if provided"""
        if 'time' in validated_data:
            instance.time = validated_data['time']
        instance.save()
        return instance
