# Medical System

API de gestión de pacientes, médicos y citas, con un servicio independiente para notificaciones.

## Ejecutar con Docker Compose

Requiere Docker Desktop activo y Docker Compose v2. Copia `.env.example` como `.env`, cambia la contraseña por una larga y única y, desde esta carpeta, ejecuta:

```bash
Copy-Item .env.example .env
docker compose up --build
```

Compose inicia MySQL y espera a que esté saludable antes de iniciar la API. Direcciones:

- API: <http://localhost:8000>
- Documentación interactiva: <http://localhost:8000/docs>
- Servicio de notificaciones: <http://localhost:8001>

## Ejecutar localmente

La API usa SQLite si no se define `DB_HOST`; dentro de Compose usa MySQL. Instala los requisitos y ejecuta cada servicio desde su carpeta:

```bash
python -m pip install -r backend/requirements.txt
python -m pip install -r notification_service/requirements.txt
```

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

En otra terminal:

```bash
cd notification_service
python -m uvicorn main:app --reload --port 8001
```

## Endpoints principales

- API: `GET /health`, `POST/GET /patients`, `POST/GET /doctors`, `POST/GET /appointments`, `GET /appointments/{id}`, `PATCH /appointments/{id}/status` y `DELETE /appointments/{id}`.
- Notificaciones: `GET /health` y `POST /notify` con `email` y `message`.

El servicio de notificaciones simula el envío; registra el mensaje, pero no contacta un proveedor externo.

## Publicar imágenes en Docker Hub

Crea dos repositorios públicos en Docker Hub: `medical-backend` y `notification-service`. En el repositorio de GitHub, configura los Actions secrets `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` (un access token de Docker Hub). Cada push a `main` construye y publica ambas imágenes con etiquetas `latest` y el SHA del commit. Los pull requests solo construyen las imágenes y no requieren secretos.

## Publicar en GitHub

Crea un repositorio público vacío llamado `medical-system` en tu cuenta y sube esta carpeta con Git. No incluyas el archivo `.env`; el `.gitignore` ya lo excluye.

## Seguridad

Esta base es para desarrollo. No uses datos médicos reales sin agregar autenticación, autorización, cifrado, auditoría, gestión de secretos y los controles regulatorios aplicables.
