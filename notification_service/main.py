from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Servicio Independiente de Notificaciones")


@app.get("/health")
def health_check():
    return {"status": "ok"}


class NotificationPayload(BaseModel):
    email: str
    message: str

@app.post("/notify")
def send_notification(payload: NotificationPayload):
    # Simulación de envío de correo/SMS
    print(f"[NOTIFICACIÓN ENVIADA] a {payload.email}: {payload.message}")
    return {"status": "success", "recipient": payload.email}