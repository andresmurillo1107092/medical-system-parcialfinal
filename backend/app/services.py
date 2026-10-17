# Servicio con la lógica del negocio
from sqlalchemy.orm import Session
from app.models import Patient, Doctor, Appointment, AppointmentStatus
from app.schemas import PatientCreate, DoctorCreate, AppointmentCreate
from fastapi import HTTPException, status
import requests
import os

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL")

class AppointmentService:

    @staticmethod
    def create_patient(db: Session, patient_data: PatientCreate):
        patient = Patient(**patient_data.model_dump())
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    @staticmethod
    def get_patients(db: Session):
        return db.query(Patient).all()

    @staticmethod
    def create_doctor(db: Session, doctor_data: DoctorCreate):
        doctor = Doctor(**doctor_data.model_dump())
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
        return doctor

    @staticmethod
    def get_doctors(db: Session):
        return db.query(Doctor).all()

    @staticmethod
    def create_appointment(db: Session, app_data: AppointmentCreate):
        # 1. Validar que exista el paciente
        patient = db.query(Patient).filter(Patient.id == app_data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="El Paciente no existe")

        # 2. Validar que exista el médico
        doctor = db.query(Doctor).filter(Doctor.id == app_data.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="El Médico no existe")

        # 3. Validación de citas simultáneas para el mismo médico
        existing_app = db.query(Appointment).filter(
            Appointment.doctor_id == app_data.doctor_id,
            Appointment.appointment_date == app_data.appointment_date,
            Appointment.status != AppointmentStatus.CANCELLED
        ).first()

        if existing_app:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El médico ya tiene una cita agendada en esa fecha y hora."
            )

        appointment = Appointment(**app_data.model_dump())
        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        # Disparo de notificación al microservicio secundario
        if NOTIFICATION_SERVICE_URL:
            try:
                requests.post(f"{NOTIFICATION_SERVICE_URL}/notify", json={
                    "email": patient.email,
                    "message": f"Cita confirmada para la fecha: {appointment.appointment_date}"
                }, timeout=2)
            except Exception:
                pass # No bloquea la transacción si falla la notificación

        return appointment

    @staticmethod
    def get_appointments(db: Session):
        return db.query(Appointment).all()

    @staticmethod
    def get_appointment_by_id(db: Session, app_id: int):
        app = db.query(Appointment).filter(Appointment.id == app_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        return app

    @staticmethod
    def update_status(db: Session, app_id: int, new_status: AppointmentStatus):
        app = AppointmentService.get_appointment_by_id(db, app_id)
        app.status = new_status
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def cancel_appointment(db: Session, app_id: int):
        # Eliminación lógica conservando el historial mediante cambio de estado
        return AppointmentService.update_status(db, app_id, AppointmentStatus.CANCELLED)