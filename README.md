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

Crea un repositorio público `medical-system-parcialfinal` en Docker Hub. Las dos imágenes se publican allí como `backend` y `notification-service`, además de recibir una etiqueta con el SHA del commit. En el repositorio de GitHub, configura los Actions secrets `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` (un access token de Docker Hub). Cada push a `main` construye y publica ambas etiquetas; los pull requests solo construyen las imágenes y no requieren secretos.

## Publicar en GitHub

Crea un repositorio público vacío llamado `medical-system` en tu cuenta y sube esta carpeta con Git. No incluyas el archivo `.env`; el `.gitignore` ya lo excluye.

## Desplegar en Vercel

Importa el repositorio como un proyecto multi-servicio desde la raíz. `vercel.json` enruta `/notify` al servicio de notificaciones y el resto de rutas al backend; `/` redirige a `/docs`.

Sin `DATABASE_URL`, Vercel usa SQLite temporal en `/tmp` para demostraciones; sus datos no son persistentes. Para conservar pacientes y citas, configura `DATABASE_URL` con la URL de una base MySQL externa compatible. Las notificaciones externas se desactivan si `NOTIFICATION_SERVICE_URL` no está configurada.

## Interfaz web

La interfaz de gestión se sirve desde `/` en Vercel. En local se inicia junto con los servicios usando `docker compose up --build` y queda disponible en <http://localhost:5173>. Incluye agenda, búsqueda, disponibilidad por profesional y formularios conectados al backend.

## Seguridad

Esta base es para desarrollo. No uses datos médicos reales sin agregar autenticación, autorización, cifrado, auditoría, gestión de secretos y los controles regulatorios aplicables.
