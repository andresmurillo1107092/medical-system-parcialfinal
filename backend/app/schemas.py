# DTOs para validación automática de datos de entrada/salida HTTP
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models import AppointmentStatus

# Schemas de Paciente
class PatientCreate(BaseModel):
    full_name: str
    identification: str
    email: EmailStr
    phone: str

class PatientResponse(PatientCreate):
    id: int
    class Config:
        from_attributes = True

# Schemas de Médico
class DoctorCreate(BaseModel):
    full_name: str
    specialty: str
    email: EmailStr

class DoctorResponse(DoctorCreate):
    id: int
    class Config:
        from_attributes = True

# Schemas de Citas
class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: str

class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: str
    status: AppointmentStatus
    class Config:
        from_attributes = True