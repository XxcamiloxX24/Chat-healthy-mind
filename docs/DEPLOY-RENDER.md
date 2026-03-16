# Despliegue de Chat-HM en Render

## 1. Crear el servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. **New** → **Web Service**
3. Conecta tu repositorio (o sube el código de `Chat-HM`)
4. Configura:
   - **Name:** `chat-hm` (o el que prefieras)
   - **Root Directory:** `Chat-HM` (si el repo tiene múltiples carpetas) o deja vacío si solo es Chat-HM
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

## 2. Variables de entorno en Render

En **Environment** → **Add Environment Variable**, añade:

| Variable      | Valor                                                                 | Notas                                                |
|---------------|-----------------------------------------------------------------------|------------------------------------------------------|
| `PORT`        | *(Render lo asigna automáticamente)*                                  | Opcional: Render usa `PORT` por defecto              |
| `MONGO_URI`   | `mongodb+srv://usuario:contraseña@cluster...`                         | La misma URI de MongoDB Atlas que usas localmente    |
| `JWT_SECRET`  | *(mismo que en appsettings.json de la API principal .NET)*            | **Debe coincidir** con la API principal              |
| `CORS_ORIGINS`| `https://healthymind-psic.netlify.app,https://tu-dominio.com`         | URLs del frontend, **sin barra final**, separadas por coma |

### Ejemplo de CORS_ORIGINS

```
https://healthymind-psic.netlify.app,https://tudominio.com,http://localhost:5173
```

- Sin espacios entre URLs
- Sin `/` al final
- Incluye todas las URLs desde las que se usará el chat (Netlify, dominio propio, localhost para desarrollo)

## 3. Configurar el frontend (Vista psicólogo)

Tras desplegar, Render te dará una URL tipo `https://chat-hm-xxxx.onrender.com`.

En el proyecto **Vista psicologo** (Netlify o donde esté desplegado):

1. Añade o edita la variable de entorno de **build**:
   - `VITE_CHAT_API_URL` = `https://chat-hm-xxxx.onrender.com`

2. Reconstruye y vuelve a desplegar el frontend.

## 4. Otros detalles

### Socket.io / WebSockets

Render soporta WebSockets. No requiere configuración extra si usas la URL de Render para conectar.

### MongoDB Atlas

- En MongoDB Atlas → Network Access, permite conexiones desde `0.0.0.0/0` (o usa la IP de Render si la conoces).
- Asegúrate de que el usuario tenga permisos de lectura/escritura en la base de datos.

### NODE_ENV

Render suele definir `NODE_ENV=production`. No hace falta que lo añadas manualmente.

### Plan gratuito

En el plan gratuito, el servicio puede dormirse tras ~15 min sin actividad. La primera petición después de eso puede tardar 30–60 segundos en responder (cold start). El cliente Socket.io está configurado para reintentar hasta 10 veces con delays crecientes.

---

## 5. Resolución de problemas

### Error "websocket is closed before the connection is established"
- **CORS_ORIGINS**: Verifica que incluya exactamente `https://healthymind-psic.netlify.app` (sin `/` al final).
- **Cold start**: Si el servicio estaba dormido, espera 30–60 s y recarga la página; el cliente reintentará la conexión.

### Error 404 en /api/chat/...
- Revisa que `VITE_CHAT_API_URL` en Netlify sea `https://chat-healthy-mind.onrender.com` (sin `/` al final, sin `/api`).
- Tras cambiar variables de entorno en Netlify, haz un **nuevo deploy** para que se apliquen en el build.

### "Error al crear la conversación"
- Si es 401: el JWT puede estar expirado; cierra sesión y vuelve a iniciar.
- Si es CORS: asegúrate de que la URL de Netlify esté en `CORS_ORIGINS` en Render.
