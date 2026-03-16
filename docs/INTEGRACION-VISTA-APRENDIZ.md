# Integración Chat-HM en la vista del aprendiz (React Native)

Guía para conectar la vista del aprendiz con la API de Chat-HM usando **REST** (cargar datos) y **Socket.io** (tiempo real), de forma que funcione bien en móvil.

---

## 1. Resumen: REST + Socket

| Uso | Método | Cómo |
|-----|--------|------|
| Listar mis conversaciones | REST | `GET /api/chat/conversations` |
| Cargar mensajes al abrir un chat | REST | `GET /api/chat/history/:appointmentId` |
| Recibir notificación de nueva conversación | Socket | Escuchar evento `notification` (tipo `NEW_CHAT`) |
| Recibir mensajes nuevos en tiempo real | Socket | Escuchar evento `receive_message` |
| Enviar mensaje | Socket | Emitir `send_message` |
| Entrar/salir de una sala de chat | Socket | Emitir `join_chat` al abrir un chat |

El aprendiz **no** llama a `POST /api/chat/room`; esa ruta solo la usa el psicólogo.

---

## 2. Configuración base

### 2.1 URL de la API

Usa una variable de entorno (o config) para la URL base, **sin barra final**:

```txt
CHAT_API_URL=https://chat-healthy-mind.onrender.com
```

En React Native (por ejemplo con `react-native-dotenv` o `expo-constants`):

```javascript
const CHAT_API_URL = (process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
```

### 2.2 Token JWT

El token es el mismo que emite la API principal (.NET) al iniciar sesión. Debe enviarse en:

- **REST:** cabecera `Authorization: Bearer <token>`.
- **Socket:** en el handshake (ver más abajo).

---

## 3. Uso de REST en la vista del aprendiz

### 3.1 Listar conversaciones

Al abrir la pantalla de mensajes (o al hacer pull-to-refresh), llama a:

```http
GET {{CHAT_API_URL}}/api/chat/conversations
Authorization: Bearer <token>
```

- Respuesta: array de conversaciones (ordenadas por la más reciente).
- Cada item tiene `_id`, `appointmentId`, `psychologistId`, `apprenticeId`, `area`, `apprenticeName`, `ficha`, `createdAt`, etc.
- Usa `appointmentId` como identificador de la conversación en la UI y para abrir el historial.

### 3.2 Cargar historial al abrir un chat

Cuando el usuario toca una conversación, antes de mostrar el hilo de mensajes:

```http
GET {{CHAT_API_URL}}/api/chat/history/{{appointmentId}}
Authorization: Bearer <token>
```

- Respuesta: array de mensajes (orden ascendente por `timestamp`).
- Guarda estos mensajes en el estado (o en un contexto) de la pantalla de chat y luego conecta Socket para los nuevos.

**Recomendación:** hacer esta petición una sola vez al abrir la conversación; los mensajes nuevos llegarán por Socket.

---

## 4. Uso de Socket.io en la vista del aprendiz

### 4.1 Dependencia

En React Native usa el cliente oficial de Socket.io (funciona con el mismo servidor que la web):

```bash
npm install socket.io-client
```

### 4.2 Conectar con JWT

Conectar cuando el usuario esté autenticado (por ejemplo al montar la pantalla de Mensajes o al iniciar sesión, según tu flujo):

```javascript
import { io } from 'socket.io-client';

const token = getToken(); // tu función para leer el JWT
if (!token) return;

const socket = io(CHAT_API_URL, {
  auth: { token },
  transports: ['polling', 'websocket'], // polling primero suele ir mejor en móvil y con cold start
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});
```

- El servidor valida el token y asocia el socket al usuario (rol **Aprendiz** e `apprenticeId`).
- Internamente el servidor une al socket a la sala `Aprendiz_<userId>`; por ahí recibe la notificación de nueva conversación.

### 4.3 Unirse a la sala de un chat (recibir/enviar mensajes en tiempo real)

Cuando el usuario **abre una conversación**, emite `join_chat` con el `appointmentId` de esa conversación:

```javascript
socket.emit('join_chat', { appointmentId: appointmentId });
```

- El servidor une el socket a la sala `cita_<appointmentId>`.
- A partir de ahí, los mensajes que se envíen en esa sala (por el aprendiz o por el psicólogo) llegarán con el evento `receive_message`.

Cuando el usuario **sale de esa conversación** (cierra la pantalla de chat), no hace falta emitir “leave”; al cambiar de conversación basta con emitir de nuevo `join_chat` con el nuevo `appointmentId`. Opcionalmente puedes reutilizar el mismo socket para varias salas (el servidor permite estar en varias); en la práctica, emitir `join_chat` solo por la conversación abierta suele ser suficiente.

### 4.4 Escuchar notificación de nueva conversación

Cuando un **psicólogo** crea una sala con este aprendiz, el servidor envía a la sala `Aprendiz_<apprenticeId>` un evento `notification`:

```javascript
socket.on('notification', (payload) => {
  if (payload.type === 'NEW_CHAT') {
    // Opción 1: refrescar la lista de conversaciones por REST
    fetchConversations();
    // Opción 2: mostrar notificación local / navegar al nuevo chat
    // payload.appointmentId, payload.title, payload.message, payload.createdAt
  }
});
```

- Conviene **refrescar la lista** con `GET /api/chat/conversations` para que aparezca la nueva conversación.
- Si quieres, también puedes mostrar una notificación local (push o in-app) y/o navegar al chat con `payload.appointmentId`.

### 4.5 Escuchar mensajes nuevos (tiempo real)

Cualquier mensaje enviado en una sala donde el aprendiz está unido (por él o por el psicólogo) llega con:

```javascript
socket.on('receive_message', (msg) => {
  // msg: _id, conversationId, senderId, content, type, timestamp, appointmentId
  const appointmentId = msg.appointmentId;
  const newMessage = {
    id: msg._id,
    text: msg.content,
    sender: msg.senderId === apprenticeUserId ? 'me' : 'psychologist',
    timestamp: msg.timestamp,
  };
  // Añadir al estado de mensajes del chat correspondiente (por appointmentId)
  appendMessage(appointmentId, newMessage);
  // Si quieres, actualizar última mensaje en la lista de conversaciones
  updateLastMessageInList(appointmentId, msg.content, msg.timestamp);
});
```

- Usa `appointmentId` para saber a qué conversación pertenece el mensaje y actualizar la pantalla correcta (y la lista si está visible).

### 4.6 Enviar un mensaje

Cuando el usuario escribe y envía un mensaje en la conversación abierta:

```javascript
socket.emit('send_message', {
  appointmentId: appointmentId, // de la conversación actual
  content: text.trim(),
  type: 'text',
});
```

- El servidor guarda el mensaje en base de datos y hace `emit('receive_message', ...)` a la sala `cita_<appointmentId>`, así que el mismo mensaje llegará por `receive_message` a este cliente (y al psicólogo). Puedes añadirlo al listado en cuanto lo emitas (optimistic update) y/o cuando llegue por `receive_message`.

---

## 5. Flujo recomendado en la vista del aprendiz

1. **Al entrar a la pantalla de Mensajes**
   - Llamar a `GET /api/chat/conversations` y guardar la lista.
   - Conectar Socket (si no está ya conectado) con el JWT.
   - Registrar listeners: `notification`, `receive_message`.

2. **Al tocar una conversación**
   - Llamar a `GET /api/chat/history/:appointmentId` y mostrar el historial.
   - Emitir `join_chat`, por ejemplo: `socket.emit('join_chat', { appointmentId })`.

3. **Al recibir `notification` con type `NEW_CHAT`**
   - Refrescar la lista con `GET /api/chat/conversations`.
   - Opcional: notificación local y/o navegar al chat con `payload.appointmentId`.

4. **Al recibir `receive_message`**
   - Añadir el mensaje al estado del chat que corresponda por `appointmentId`.
   - Actualizar “último mensaje” en la lista si la pantalla de lista está visible.

5. **Al enviar un mensaje**
   - Emitir `send_message` con `appointmentId`, `content` y `type: 'text'`.
   - Opcional: mostrar el mensaje en la UI de inmediato (optimistic update).

6. **Al salir de la pantalla de Mensajes**
   - Desconectar el socket (`socket.disconnect()`) o mantenerlo si quieres seguir recibiendo notificaciones en segundo plano; depende de si tu app mantiene la pantalla de mensajes “viva” o no.

---

## 6. Buenas prácticas (React Native)

- **URL base:** sin barra final y normalizada en código para evitar `//` en las peticiones.
- **Transports:** usar `['polling', 'websocket']` para mejor compatibilidad en móvil y con cold start del servidor (ej. Render).
- **Reconexión:** dejar `reconnection: true` y unos intentos razonables; en móvil la red puede cambiar.
- **Token:** renovar el JWT cuando caduque; si el socket falla por 401, reconectar con el nuevo token.
- **Un solo socket:** una única instancia de Socket.io por usuario (por ejemplo en un contexto o servicio) y reutilizarla en la pantalla de mensajes y en el detalle del chat.
- **App en segundo plano:** definir si quieres mantener el socket conectado para notificaciones o desconectar y refrescar por REST al volver; en cualquier caso, al volver a primer plano puedes volver a llamar a `GET /api/chat/conversations` para tener la lista actualizada.

Con esta combinación de REST (listado + historial) y Socket (notificaciones, mensajes en vivo y envío), la vista del aprendiz queda integrada con Chat-HM de forma consistente con el servidor y con la vista del psicólogo.
