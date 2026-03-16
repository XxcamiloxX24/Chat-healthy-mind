# Colección Postman - Chat-HM API

## Archivos

- **`Chat-HM-API.postman_collection.json`** – Importar en Postman (File → Import).
- **`ENDPOINTS-CHAT-HM.md`** – Descripción detallada de cada endpoint (para qué sirve, cuándo usarlo, body, respuestas y errores).
- **`INTEGRACION-VISTA-APRENDIZ.md`** – Cómo integrar REST y Socket.io en la vista del aprendiz (React Native): tiempo real, notificaciones y flujo recomendado.

## Variables de la colección

| Variable       | Descripción |
|----------------|-------------|
| `baseUrl`      | URL base del API (ej: `http://localhost:3000` o `https://chat-healthy-mind.onrender.com`) |
| `token`        | JWT emitido por la API principal (.NET). Obtenerlo tras iniciar sesión en la vista. |
| `appointmentId`| ID de cita para la petición "Historial de chat". |

## Endpoints incluidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/health` | Estado del servicio (sin auth) |
| POST   | `/api/chat/room` | Crear sala (solo psicólogo) |
| GET    | `/api/chat/conversations` | Listar conversaciones del usuario |
| GET    | `/api/chat/history/:appointmentId` | Historial de mensajes de una conversación |

## Autenticación

Todas las rutas excepto `/health` requieren JWT en cabecera:

- `Authorization: Bearer {{token}}`

El token debe ser el mismo que emite la API principal HealthyMind (ASP.NET) al iniciar sesión.
