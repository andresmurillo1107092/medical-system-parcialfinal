# API REST Routers (Endpoints)
from fastapi import FastAPI, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, Base, engine
from app import schemas
from app.services import AppointmentService

# Creación de tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Sistema de Gestión de Citas Médicas")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/patients", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED)
def register_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    return AppointmentService.create_patient(db, patient)

@app.get("/patients", response_model=List[schemas.PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return AppointmentService.get_patients(db)

@app.post("/doctors", response_model=schemas.DoctorResponse, status_code=status.HTTP_201_CREATED)
def register_doctor(doctor: schemas.DoctorCreate, db: Session = Depends(get_db)):
    return AppointmentService.create_doctor(db, doctor)

@app.get("/doctors", response_model=List[schemas.DoctorResponse])
def get_doctors(db: Session = Depends(get_db)):
    return AppointmentService.get_doctors(db)

@app.post("/appointments", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
def schedule_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    return AppointmentService.create_appointment(db, appointment)

@app.get("/appointments", response_model=List[schemas.AppointmentResponse])
def get_appointments(db: Session = Depends(get_db)):
    return AppointmentService.get_appointments(db)

@app.get("/appointments/{id}", response_model=schemas.AppointmentResponse)
def get_appointment(id: int, db: Session = Depends(get_db)):
    return AppointmentService.get_appointment_by_id(db, id)

@app.patch("/appointments/{id}/status", response_model=schemas.AppointmentResponse)
def update_appointment_status(id: int, status_update: schemas.AppointmentStatusUpdate, db: Session = Depends(get_db)):
    return AppointmentService.update_status(db, id, status_update.status)

@app.delete("/appointments/{id}", response_model=schemas.AppointmentResponse)
def cancel_appointment(id: int, db: Session = Depends(get_db)):
    return AppointmentService.cancel_appointment(db, id)