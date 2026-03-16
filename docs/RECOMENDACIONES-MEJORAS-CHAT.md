# Recomendaciones para mejorar la API de mensajes (chat entre 2 personas)

Resumen de mejoras que encajan con un chat psicólogo–aprendiz en HealthyMind.

---

## 1. **Paginación del historial**

**Situación actual:** `GET /api/chat/history/:appointmentId` devuelve todos los mensajes de la conversación.

**Problema:** En conversaciones largas la respuesta puede ser muy pesada y lenta.

**Recomendación:**
- Añadir query params: `?limit=50&before=<timestamp o messageId>` (o `skip`).
- Devolver mensajes más antiguos que `before` (carga “hacia arriba” al hacer scroll).
- Incluir en la respuesta algo como `hasMore: true/false` para que el cliente sepa si hay más mensajes.

**Ejemplo:** `GET /api/chat/history/12345?limit=50&before=2024-03-01T12:00:00.000Z`

---

## 2. **Marcar mensajes como leídos**

**Situación actual:** El modelo `Message` tiene `isRead`, pero no hay endpoint ni evento en Socket.io que lo actualice.

**Recomendación:**
- **REST:** `PATCH /api/chat/conversations/:appointmentId/read` (o `POST .../mark-read`) que marque como leídos todos los mensajes de esa conversación donde `senderId !== userId` (los del otro participante).
- **Socket.io:** Emitir evento `messages_read` cuando un usuario abre el chat o hace scroll hasta los mensajes; el servidor actualiza `isRead` en BD y hace `io.to(roomName).emit('messages_read', { appointmentId, readBy: userId, upToTimestamp })` para que el otro vea “vistos” en tiempo real.

Así se puede mostrar “entregado” / “visto” en la UI.

---

## 3. **Indicador “está escribiendo…” (typing)**

**Situación actual:** No existe.

**Recomendación:**
- **Socket.io:** Eventos `typing_start` y `typing_stop` con `{ appointmentId }`.
- El servidor reenvía a la sala `cita_<appointmentId>` (excluyendo al emisor): `io.to(roomName).emit('user_typing', { appointmentId, userId, isTyping: true/false })`.
- En el cliente: debounce de 2–3 s (si deja de escribir, emitir `typing_stop`).

Mejora la sensación de conversación en vivo.

---

## 4. **Último mensaje y contador de no leídos en conversaciones**

**Situación actual:** `GET /api/chat/conversations` devuelve solo datos de la conversación (área, aprendiz, etc.), sin preview ni contador de no leídos.

**Recomendación:**
- Al listar conversaciones, agregar (vía agregación o población):
  - **lastMessage:** `{ content (o preview de 50 chars), timestamp, senderId }`.
  - **unreadCount:** cantidad de mensajes con `isRead: false` y `senderId !== userId`.
- Así en la lista se puede mostrar “Último mensaje: …” y un badge “3” sin abrir cada chat.

---

## 5. **Notificación de mensaje nuevo cuando no estás en ese chat**

**Situación actual:** Si el usuario está en la app pero en otra pantalla (otra conversación o “Inicio”), solo recibe el mensaje si está unido a la sala por Socket; no hay un aviso tipo “Tienes un mensaje nuevo en [Conversación X]”.

**Recomendación:**
- Al guardar un mensaje en `send_message`, además de `receive_message` a la sala, emitir a la sala **personal** del destinatario (`Psicologo_<id>` o `Aprendiz_<id>`):
  - `notification` con `type: 'NEW_MESSAGE'`, `appointmentId`, `senderId`, `contentPreview`, `timestamp`.
- El cliente, si no está en esa conversación, muestra toast/badge/notificación: “Mensaje nuevo de …” y opción de abrir ese chat.

---

## 6. **Confirmación de entrega (opcional)**

**Situación actual:** Solo existe `isRead` (leído).

**Recomendación (opcional):**
- Añadir en el modelo algo como `deliveredAt` (fecha en que el otro abrió la conversación o recibió el mensaje).
- O reutilizar “visto” como “entregado + leído” y no distinguir; para un chat de 2 personas suele ser suficiente.

---

## 7. **Editar / eliminar mensaje (opcional)**

**Situación actual:** No hay edición ni borrado.

**Recomendación (si lo necesitáis):**
- **Editar:** `contentEdited`, `editedAt` en el modelo; endpoint `PATCH /api/chat/messages/:id` (solo el autor) y evento Socket `message_edited`.
- **Eliminar:** borrado lógico (`deleted: true`, `deletedAt`) y que el cliente muestre “Mensaje eliminado” o oculte el contenido; evento `message_deleted`.

Útil si el usuario escribe algo por error.

---

## 8. **Límites y seguridad**

**Recomendación:**
- **Tamaño máximo de mensaje:** por ejemplo 2000–5000 caracteres; rechazar en backend y en Socket con mensaje claro.
- **Rate limiting:** límite por usuario (ej. X mensajes por minuto) para evitar spam y abusos.
- **Validar `appointmentId` en Socket:** en `send_message` y `join_chat`, comprobar que el usuario es participante de esa conversación (como en REST).

---

## 9. **Soporte para imágenes/archivos**

**Situación actual:** El modelo tiene `type: 'text' | 'image' | 'file'`, pero el flujo de subida no está definido.

**Recomendación:**
- Subir archivos con la **API de imágenes** (HealthyMind); obtener la URL.
- En el chat, enviar un mensaje con `type: 'image'` o `'file'` y `content: <url>` (o un objeto `{ url, fileName }`).
- El cliente muestra miniatura o enlace según el tipo.

---

## 10. **Resumen por prioridad**

| Prioridad | Mejora | Esfuerzo |
|-----------|--------|----------|
| Alta      | Paginación del historial | Bajo |
| Alta      | Marcar como leídos (REST + Socket) | Medio |
| Alta      | Último mensaje y unreadCount en lista | Medio |
| Media     | Indicador “está escribiendo” | Bajo |
| Media     | Notificación NEW_MESSAGE fuera del chat | Bajo |
| Media     | Límite de tamaño + rate limiting | Bajo |
| Baja      | Editar / eliminar mensaje | Medio |
| Baja      | Imágenes/archivos con API de imágenes | Medio |

Si quieres, se puede bajar al detalle de implementación (cambios en modelos, controladores y Socket) para una de estas mejoras en concreto.
