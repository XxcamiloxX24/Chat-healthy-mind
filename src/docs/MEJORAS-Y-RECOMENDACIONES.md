# Mejoras y Recomendaciones para la API de Chat

Este documento describe en detalle los cambios que se realizaron temporalmente para fortalecer la API de chat, junto con las recomendaciones de implementación para que puedas aplicarlos cuando lo consideres oportuno.

---

## Tabla de contenidos

1. [Resumen del análisis inicial](#1-resumen-del-análisis-inicial)
2. [Cambios realizados (revertidos)](#2-cambios-realizados-revertidos)
3. [Recomendaciones detalladas](#3-recomendaciones-detalladas)
4. [Dependencias necesarias](#4-dependencias-necesarias)

---

## 1. Resumen del análisis inicial

### Estado original del proyecto

El proyecto Chat-HM es una API de chat en tiempo real para psicólogos y aprendices (contexto SENA). Utiliza:

- **Express 5** como framework HTTP
- **Socket.io** para mensajería en tiempo real
- **MongoDB + Mongoose** como base de datos
- **JWT** solo para la autenticación de WebSockets

### Problemas identificados

| Área | Problema |
|------|----------|
| **Seguridad** | Rutas REST (`POST /room`, `GET /history/:id`) sin autenticación; cualquiera puede crear salas o ver historiales |
| **Seguridad** | CORS con `origin: "*"` permite cualquier origen |
| **Seguridad** | Sin validación ni sanitización de entradas |
| **Seguridad** | Sin rate limiting; riesgo de abuso y ataques de fuerza bruta |
| **Código** | `require()` dentro de handlers en lugar de imports al inicio |
| **Código** | `console.log` de depuración en producción |
| **Código** | Sin middleware centralizado de errores |
| **Base de datos** | Sin índices explícitos para consultas frecuentes |
| **General** | Sin tests unitarios ni de integración |

---

## 2. Cambios realizados (revertidos)

A continuación se describen todos los cambios que se implementaron y posteriormente se revirtieron.

### 2.1. Autenticación en rutas REST

**Qué se hizo:** Se creó un middleware de autenticación que acepta dos formas de identificación:

1. **API Key** (header `X-API-Key`): Para llamadas server-to-server, por ejemplo desde .NET al crear una cita.
2. **JWT** (header `Authorization: Bearer <token>`): Para llamadas desde el frontend con usuario autenticado.

**Archivo creado:** `src/middlewares/authMiddleware.js`

```javascript
// Lógica: si viene X-API-Key y coincide con process.env.API_KEY → permitir
// Si no, intentar JWT. Si es válido → permitir
// Si ninguno → 401
```

**Middleware adicional:** `requireChatParticipant` para `GET /history/:appointmentId`. Verifica que el usuario autenticado (cuando usa JWT) sea el psicólogo o el aprendiz de esa conversación, evitando que un usuario lea chats ajenos.

**Variables de entorno necesarias:**
- `API_KEY`: Clave secreta para que .NET u otros servicios autentiquen sus llamadas.

---

### 2.2. Validación de entradas

**Qué se hizo:** Validación con `express-validator` para:

- **POST /api/chat/room**: `appointmentId`, `psychologistId`, `apprenticeId` como enteros positivos; `area` como string no vacío (1-100 caracteres).
- **GET /api/chat/history/:appointmentId**: `appointmentId` como entero positivo.

**Archivo creado:** `src/validators/chatValidators.js`

**Beneficio:** Evita datos malformados, inyecciones y errores por tipos incorrectos.

---

### 2.3. Manejo centralizado de errores

**Qué se hizo:** Middleware de errores que:

- Captura errores no manejados
- Devuelve respuestas con formato estándar `{ success: false, msg: "..." }`
- Incluye stack trace solo en desarrollo

**Archivo creado:** `src/middlewares/errorHandler.js`

**Función auxiliar:** `asyncHandler(fn)` para envolver controladores async y evitar `try/catch` repetitivo; los errores se pasan automáticamente al middleware de errores.

---

### 2.4. Configuración de CORS

**Qué se hizo:** CORS restrictivo según variable de entorno:

- Variable `CORS_ORIGIN`: orígenes permitidos separados por coma (ej: `http://localhost:4200,https://miapp.com`).
- Valores por defecto si no se define: `http://localhost:4200`, `http://localhost:3000`.

**Beneficio:** Evita que sitios no autorizados consuman la API.

---

### 2.5. Rate limiting

**Qué se hizo:** Límite de 100 peticiones por minuto por IP en `/api/`.

**Paquete:** `express-rate-limit`

**Beneficio:** Reduce el riesgo de abuso, ataques DoS y fuerza bruta.

---

### 2.6. Logger configurable

**Qué se hizo:** Utilidad de logging que solo muestra mensajes en desarrollo.

**Archivo creado:** `src/utils/logger.js`

- `logger.info()`, `logger.debug()`: solo en desarrollo
- `logger.error()`: siempre activo

**Beneficio:** Menos ruido en producción y posibilidad de cambiar la implementación sin tocar el código.

---

### 2.7. Limpieza en socketManager.js

**Qué se hizo:**

- Mover `require('../models/Conversation')` al inicio del archivo (fuera del handler).
- Reemplazar `console.log` por el logger.
- Eliminar logs de depuración detallados.

**Beneficio:** Código más limpio y mejor rendimiento al evitar imports repetidos.

---

### 2.8. Índices en MongoDB

**Qué se hizo:** Índices explícitos en los schemas de Mongoose:

**Conversation:**
- `{ psychologistId: 1, createdAt: -1 }` para listar chats por psicólogo.
- `{ apprenticeId: 1, createdAt: -1 }` para listar chats por aprendiz.

**Message:**
- `{ conversationId: 1, timestamp: 1 }` para el historial ordenado por conversación.

**Beneficio:** Consultas más rápidas a medida que crece el volumen de datos.

---

### 2.9. Estructura de carpetas añadida

```
src/
├── middlewares/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── validators/
│   └── chatValidators.js
├── utils/
│   └── logger.js
└── docs/
    └── MEJORAS-Y-RECOMENDACIONES.md  (este archivo)
```

---

## 3. Recomendaciones detalladas

### 3.1. Seguridad (prioridad alta)

| Recomendación | Descripción | Esfuerzo |
|---------------|-------------|----------|
| Autenticar rutas REST | Proteger `POST /room` y `GET /history/:id` con JWT o API Key | Medio |
| Restringir CORS | Sustituir `origin: "*"` por orígenes concretos en producción | Bajo |
| Validar entradas | Usar express-validator o similar en todos los endpoints | Medio |
| Rate limiting | Limitar peticiones por IP para reducir abuso | Bajo |
| Verificar permisos | En historial, comprobar que el usuario sea participante del chat | Medio |

### 3.2. Calidad de código (prioridad media)

| Recomendación | Descripción | Esfuerzo |
|---------------|-------------|----------|
| Middleware de errores | Centralizar el manejo de errores y respuestas | Bajo |
| Logger | Reemplazar `console.log` por un logger configurable | Bajo |
| Imports al inicio | Evitar `require()` dentro de handlers | Bajo |
| asyncHandler | Envolver controladores async para capturar errores | Bajo |

### 3.3. Base de datos (prioridad media)

| Recomendación | Descripción | Esfuerzo |
|---------------|-------------|----------|
| Índices | Definir índices en campos usados en búsquedas y filtros | Bajo |

### 3.4. Testing (prioridad media-baja)

| Recomendación | Descripción | Esfuerzo |
|---------------|-------------|----------|
| Tests unitarios | Probar controladores y lógica de negocio | Alto |
| Tests de integración | Probar rutas y flujos completos | Alto |

### 3.5. Otros

| Recomendación | Descripción | Esfuerzo |
|---------------|-------------|----------|
| ESLint + Prettier | Linter y formateador para consistencia | Bajo |
| Variables de entorno | Usar `.env.example` como plantilla (sin secretos reales) | Bajo |
| Rotar credenciales | Si `.env` llegó a versionarse, rotar JWT_SECRET y credenciales de MongoDB | - |

---

## 4. Dependencias necesarias

Para implementar las mejoras de forma similar a lo realizado:

```bash
npm install express-validator express-rate-limit
```

| Paquete | Versión sugerida | Uso |
|---------|------------------|-----|
| express-validator | ^7.x | Validación de `body`, `params`, `query` |
| express-rate-limit | ^8.x | Límite de peticiones por IP |

---

## 5. Orden sugerido de implementación

1. **CORS**: Cambiar `origin: "*"` por orígenes concretos.
2. **Rate limiting**: Instalar y configurar `express-rate-limit`.
3. **Logger**: Crear `src/utils/logger.js` y sustituir `console.log`.
4. **Error handler**: Crear middleware centralizado de errores.
5. **Validación**: Añadir `express-validator` y validaciones en rutas.
6. **Autenticación**: Implementar `authMiddleware` y `requireChatParticipant`.
7. **Índices**: Añadir índices en los modelos de Mongoose.

---

*Documento generado a partir del análisis y mejora temporal del proyecto Chat-HM. Las modificaciones descritas fueron revertidas para mantener el código en su estado original.*
