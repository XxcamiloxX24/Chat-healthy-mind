# Análisis comparativo: Chat-HM vs API Imágenes HM

Este documento presenta un análisis a fondo de ambas carpetas del ecosistema HealthyMind para alinear Chat-HM con los estándares ya establecidos en API Imágenes HM y con las recomendaciones de `MEJORAS-Y-RECOMENDACIONES.md`.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Comparativa por área](#2-comparativa-por-área)
3. [JWT y claims (comportamiento de la API principal)](#3-jwt-y-claims-comportamiento-de-la-api-principal)
4. [Plan de alineación detallado](#4-plan-de-alineación-detallado)
5. [Elementos a evitar (según MEJORAS-Y-RECOMENDACIONES)](#5-elementos-a-evitar-según-mejoras-y-recomendaciones)
6. [Elementos a adoptar](#6-elementos-a-adoptar)

---

## 1. Resumen ejecutivo

| Aspecto | API Imágenes HM | Chat-HM (actual) | Acción |
|---------|-----------------|------------------|--------|
| **Auth en rutas REST** | ✅ Todas protegidas con JWT | ❌ Ninguna protegida | Implementar |
| **CORS** | ✅ Orígenes concretos (CORS_ORIGINS) | ❌ `origin: "*"` | Restringir |
| **Middleware de errores** | ✅ Centralizado | ❌ No existe | Crear |
| **Estructura auth** | `middleware/auth.js` con nameid, role, id | JWT solo en WebSockets | Reutilizar patrón |
| **Envío de token** | `Authorization: Bearer` o `token` | Solo en sockets | Documentar igual |
| **require dentro de handlers** | ❌ No lo usa | ✅ En socketManager (Conversation) | Mover al inicio |
| **console.log** | Solo en error handler | En todo el código | Sustituir por logger opcional |
| **.env.example** | ✅ Existe | ❌ No existe | Crear |
| **Health check** | ✅ `GET /health` | ❌ No existe | Añadir (opcional) |

---

## 2. Comparativa por área

### 2.1 Autenticación

#### API Imágenes HM

```
src/middleware/auth.js
├── Lee token de: Authorization: Bearer <token> o header "token"
├── Verifica con jwt.verify(token, JWT_SECRET)
├── Extrae: nameid → userId, role (Psicologo, Aprendiz, Administrador)
└── Asigna req.user = { nameid, role, id }
```

**Uso:** `router.use(authMiddleware)` — todas las rutas requieren token.

#### Chat-HM (actual)

- **Rutas REST:** Sin autenticación. Cualquiera puede:
  - `POST /api/chat/room` → crear salas
  - `GET /api/chat/history/:appointmentId` → ver historial de cualquier cita
- **WebSockets:** JWT verificado en `socketManager.js` con la misma lógica (nameid, role, id).

**Problema:** Las rutas REST son públicas. Un atacante podría crear salas o leer historiales ajenos.

---

### 2.2 CORS

| Proyecto | Configuración |
|----------|---------------|
| API Imágenes HM | `cors({ origin: corsOrigins })` — CORS_ORIGINS desde .env |
| Chat-HM | `cors()` y Socket.io `origin: "*"` — acepta cualquier origen |

---

### 2.3 Manejo de errores

| Proyecto | Comportamiento |
|----------|----------------|
| API Imágenes HM | `app.use((err, req, res, next) => { ... })` — captura errores no manejados |
| Chat-HM | `try/catch` manual en cada controlador; sin middleware global |

---

### 2.4 Estructura de carpetas

**API Imágenes HM:**
```
src/
├── config/
├── middleware/   ← auth.js, upload.js
├── models/
├── controllers/
├── routes/
└── docs/
```

**Chat-HM:**
```
src/
├── config/
├── models/
├── controllers/
├── routes/
├── sockets/
└── docs/
```

Chat-HM no tiene carpeta `middleware/`. El auth de sockets está embebido en `socketManager.js`.

---

## 3. JWT y claims (comportamiento de la API principal)

Según la documentación de API Imágenes HM y el uso en socketManager de Chat-HM:

| Claim | Descripción |
|-------|-------------|
| `nameid` | ID del usuario (psi_codigo, apr_codigo, etc.) |
| `role` | Rol: Psicologo, Aprendiz, Administrador |
| `nbf`, `exp`, `iat` | Timestamps estándar JWT |

**Formas de enviar el token (alinear en ambos proyectos):**
1. `Authorization: Bearer <token>`
2. `token: <token>` (alternativo)

Ambos proyectos deben usar el mismo `JWT_SECRET` que la API principal ASP.NET.

---

## 4. Plan de alineación detallado

### 4.1 Caso especial: POST /room

Esta ruta es llamada por la **API principal .NET** cuando se crea una cita, no por el frontend con usuario logueado. Por tanto:

| Opción | Descripción |
|--------|-------------|
| **A) API Key** | Header `X-API-Key` para llamadas server-to-server (.NET). Si coincide con `API_KEY` en .env → permitir. |
| **B) JWT de servicio** | Si .NET puede emitir un token de servicio para esta llamada. |
| **C) Ambas** | API Key o JWT: si viene API Key válida → OK; si no, intentar JWT (frontend). |

**Recomendación (MEJORAS-Y-RECOMENDACIONES):** Usar **API Key + JWT** dual:
- `.NET` usa `X-API-Key` al crear la cita.
- Frontend u otros servicios usan JWT.

### 4.2 GET /history/:appointmentId

Llamada desde el frontend con usuario autenticado. Debe:
1. Requerir JWT.
2. Verificar que el usuario sea **psicólogo o aprendiz** de esa conversación (`requireChatParticipant`).

### 4.3 Orden sugerido de implementación

1. **CORS** — Cambiar `origin: "*"` por orígenes desde `CORS_ORIGINS`.
2. **Middleware de errores** — Crear handler centralizado como en API Imágenes.
3. **auth.js** — Crear `middleware/auth.js` reutilizando la lógica de API Imágenes (mismo JWT, mismo formato de `req.user`).
4. **authMiddleware dual** — Para `POST /room`: aceptar API Key o JWT. Para `GET /history`: solo JWT + `requireChatParticipant`.
5. **Limpieza socketManager** — Mover `require(Conversation)` al inicio del archivo.
6. **Logger opcional** — Sustituir `console.log` por un logger que en producción no muestre debug (según MEJORAS-Y-RECOMENDACIONES).
7. **Índices MongoDB** — Añadir índices en Conversation y Message.
8. **.env.example** — Crear plantilla sin secretos.

---

## 5. Elementos a evitar (según MEJORAS-Y-RECOMENDACIONES)

| Evitar | Motivo |
|--------|--------|
| `origin: "*"` en CORS | Permite que cualquier sitio consuma la API |
| Rutas REST sin autenticación | Cualquiera puede crear salas o ver historiales |
| `require()` dentro de handlers | Peor rendimiento, código poco claro |
| `console.log` de depuración en producción | Ruido en logs, posible fuga de información |
| Sin validación de entradas | Riesgo de datos malformados o inyecciones |
| Sin verificación de participante en historial | Un usuario podría ver chats ajenos |

---

## 6. Elementos a adoptar

| Adoptar | Referencia | Beneficio |
|---------|------------|-----------|
| `authMiddleware` tipo API Imágenes | `API imagenes HM/src/middleware/auth.js` | Mismo patrón JWT en todo el ecosistema |
| CORS con `CORS_ORIGINS` | API Imágenes HM index.js | Seguridad y alineación |
| Middleware de errores centralizado | API Imágenes HM index.js | Respuestas consistentes |
| API Key para server-to-server | MEJORAS-Y-RECOMENDACIONES | Proteger POST /room desde .NET |
| `requireChatParticipant` | MEJORAS-Y-RECOMENDACIONES | Solo ver historial si eres participante |
| Imports al inicio | MEJORAS-Y-RECOMENDACIONES | Código más limpio |
| Logger configurable | MEJORAS-Y-RECOMENDACIONES | Menos ruido en producción |
| Índices en modelos | MEJORAS-Y-RECOMENDACIONES | Mejor rendimiento |
| `.env.example` | API Imágenes HM | Documentación de variables |

---

## Resumen de archivos a crear/modificar en Chat-HM

| Acción | Archivo |
|--------|---------|
| Crear | `src/middleware/auth.js` — JWT como API Imágenes |
| Crear | `src/middleware/chatAuth.js` — Dual API Key + JWT, requireChatParticipant |
| Crear | `src/middleware/errorHandler.js` — Handler centralizado |
| Crear | `src/utils/logger.js` — Logger configurable (opcional) |
| Crear | `.env.example` — Plantilla de variables |
| Modificar | `src/index.js` — CORS, error handler, health |
| Modificar | `src/routes/chatRoutes.js` — Aplicar middlewares de auth |
| Modificar | `src/sockets/socketManager.js` — Import Conversation al inicio, quitar console.log |
| Modificar | `src/models/Conversation.js` — Índices |
| Modificar | `src/models/Message.js` — Índices |

---

---

## 7. Integración con .NET (POST /room)

Para que la API principal ASP.NET pueda crear salas de chat al registrar una cita:

1. **Añadir `API_KEY`** en el `.env` de Chat-HM (genera una clave segura).
2. **En la API .NET**, al llamar a `POST /api/chat/room`, incluir el header:
   ```
   X-API-Key: <misma_clave_que_API_KEY_en_env>
   ```
3. Si prefieres usar JWT desde .NET en lugar de API Key, asegúrate de enviar `Authorization: Bearer <token>` con un token válido.

---

## 8. Cambios implementados (resumen)

| Cambio | Estado |
|--------|--------|
| `middleware/auth.js` (JWT como API Imágenes) | ✅ |
| `middleware/chatAuth.js` (dual API Key + JWT, requireChatParticipant) | ✅ |
| `middleware/errorHandler.js` | ✅ |
| `utils/logger.js` | ✅ |
| CORS restrictivo | ✅ |
| Health check `GET /health` | ✅ |
| Rutas protegidas (POST /room, GET /history) | ✅ |
| Índices en Conversation y Message | ✅ |
| `.env.example` | ✅ |
| Limpieza socketManager (import al inicio, logger) | ✅ |

---

*Documento generado a partir del análisis de Chat-HM, API Imágenes HM y MEJORAS-Y-RECOMENDACIONES.md.*
