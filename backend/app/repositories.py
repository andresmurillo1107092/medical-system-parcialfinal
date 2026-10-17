from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Patient
from .schemas import PatientCreate


class PatientRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Patient]:
        return list(self.db.scalars(select(Patient).order_by(Patient.id)))

    def get(self, patient_id: int) -> Patient | None:
        return self.db.get(Patient, patient_id)

    def create(self, patient_data: PatientCreate) -> Patient:
        patient = Patient(**patient_data.model_dump())
        self.db.add(patient)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("Ya existe un paciente con ese correo.") from exc
        self.db.refresh(patient)
        return patient
