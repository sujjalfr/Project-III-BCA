from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)  # for upload flow
    department = serializers.SerializerMethodField()
    batch = serializers.SerializerMethodField()
    class_group = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'roll_no', 'name', 'face_encoding', 'qr_code', 'created_at', 'image', 'department', 'batch', 'class_group']
        read_only_fields = ['face_encoding', 'qr_code', 'created_at']
    
    def get_department(self, obj):
        if obj.department:
            return {'id': obj.department.id, 'name': obj.department.name}
        return None
    
    def get_batch(self, obj):
        if obj.batch:
            return {'id': obj.batch.id, 'name': obj.batch.name}
        return None
    
    def get_class_group(self, obj):
        if obj.class_group:
            return {'id': obj.class_group.id, 'name': obj.class_group.name}
        return None
