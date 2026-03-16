# Descripción de endpoints - Chat-HM API

Documentación de cada endpoint de la API de Chat para usar con la colección de Postman.

---

## 1. GET `/health`

**Para qué sirve:** Comprobar que el servicio Chat-HM está en ejecución y responde.

**Cuándo usarlo:** Para monitoreo, despliegue o verificar que la URL base es correcta antes de probar el resto de rutas.

**Autenticación:** No requiere.

**Respuesta exitosa (200):**
```json
{
  "status": "ok",
  "service": "chat-hm"
}
```

---

## 2. POST `/api/chat/room`

**Para qué sirve:** Crear una nueva sala de chat entre un psicólogo y un aprendiz.

**Cuándo usarlo:** Cuando el psicólogo inicia una conversación con un aprendiz desde la vista (por ejemplo al hacer clic en "Nueva Conversación" y elegir aprendiz). Solo el rol **Psicologo** puede crear salas.

**Autenticación:** JWT obligatorio (cabecera `Authorization: Bearer <token>`). El token debe corresponder a un usuario con rol **Psicologo**.

**Body (JSON):**

| Campo           | Tipo   | Obligatorio | Descripción |
|----------------|--------|-------------|-------------|
| `apprenticeId` | number | Sí          | ID del aprendiz con el que se crea el chat. |
| `area`         | string | Sí          | Área o contexto (ej: "General", "Seguimiento"). |
| `appointmentId`| number | No          | ID de cita si ya existe. Si no se envía, se genera uno automáticamente. |
| `apprenticeName` | string | No        | Nombre del aprendiz (para mostrar en la UI). |
| `ficha`        | string | No          | Ficha del aprendiz (para mostrar en la UI). |

**Ejemplo de body:**
```json
{
  "apprenticeId": 1,
  "area": "General",
  "appointmentId": 12345,
  "apprenticeName": "Nombre Aprendiz",
  "ficha": "2558937"
}
```

**Respuestas:**
- **201 Created** – Sala creada. Incluye `roomId` y `appointmentId`.
- **200 OK** – La sala ya existía para ese `appointmentId`. Devuelve el mismo `roomId` y `appointmentId`.
- **400** – Faltan `apprenticeId` o `area`.
- **401** – Token ausente o inválido.
- **403** – Usuario no es psicólogo.

**Nota:** Al crear la sala, si el aprendiz tiene Socket.io conectado, recibe un evento `notification` de tipo `NEW_CHAT`.

---

## 3. GET `/api/chat/conversations`

**Para qué sirve:** Obtener la lista de conversaciones del usuario que hace la petición (psicólogo o aprendiz).

**Cuándo usarlo:** Para cargar el listado de chats en la pantalla de Mensajes: el psicólogo ve sus conversaciones con aprendices y el aprendiz las suyas con psicólogos.

**Autenticación:** JWT obligatorio. El resultado depende del rol del usuario:
- **Psicologo:** conversaciones donde él es el psicólogo.
- **Aprendiz:** conversaciones donde él es el aprendiz.

**Parámetros:** Ninguno.

**Respuesta exitosa (200):** Array de conversaciones, ordenadas por la más reciente primero. Cada elemento incluye campos como `_id`, `appointmentId`, `psychologistId`, `apprenticeId`, `area`, `apprenticeName`, `ficha`, `isActive`, `createdAt`.

**Errores:**
- **401** – Token ausente o inválido.
- **403** – Usuario no es ni Psicologo ni Aprendiz (por ejemplo Administrador sin lógica de conversaciones).

---

## 4. GET `/api/chat/history/:appointmentId`

**Para qué sirve:** Obtener el historial de mensajes de una conversación concreta.

**Cuándo usarlo:** Cuando el usuario abre un chat en la vista de Mensajes: se usa el `appointmentId` de esa conversación para cargar los mensajes ya guardados antes de mostrar el hilo y conectar Socket.io para los nuevos.

**Autenticación:** JWT obligatorio. Además, el usuario debe ser **participante** de esa conversación (el psicólogo o el aprendiz de esa sala). Si no, responde 403.

**Parámetros de ruta:**

| Parámetro       | Tipo   | Descripción |
|-----------------|--------|-------------|
| `appointmentId` | number | ID de la conversación (cita). Se obtiene de la lista de conversaciones. |

**Ejemplo:** `GET /api/chat/history/12345`

**Respuesta exitosa (200):** Array de mensajes ordenados de más antiguo a más reciente. Cada mensaje incluye `_id`, `conversationId`, `senderId`, `content`, `type`, `timestamp`, etc.

**Errores:**
- **401** – Token ausente o inválido.
- **403** – El usuario no es participante de esa conversación.
- **404** – No existe conversación con ese `appointmentId`.

---

## Resumen rápido (Postman)

| Método | Ruta | Para qué |
|--------|------|----------|
| GET | `/health` | Ver si el servicio está vivo. |
| POST | `/api/chat/room` | Crear una conversación (solo psicólogo). |
| GET | `/api/chat/conversations` | Listar mis conversaciones. |
| GET | `/api/chat/history/:appointmentId` | Ver mensajes de una conversación. |

Los mensajes en tiempo real (enviar/recibir) se hacen por **Socket.io**, no por REST; la colección de Postman solo cubre los endpoints REST anteriores.
