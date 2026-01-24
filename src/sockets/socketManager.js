// src/sockets/socketManager.js
const jwt = require('jsonwebtoken');
const Message = require('../models/Message'); // Importamos el modelo para guardar mensajes

module.exports = (io) => {
    
    // ==========================================
    // 1. MIDDLEWARE DE AUTENTICACIÓN (DEBUG)
    // ==========================================
    io.use((socket, next) => {
        // Imprimimos qué llega para depurar
        console.log("--- INTENTO DE CONEXIÓN ---");
        console.log("Headers recibidos:", socket.handshake.headers['token'] ? "SI" : "NO");
        console.log("Auth recibido:", socket.handshake.auth);

        // Buscamos el token en Auth (Frontend real) o Headers (Postman)
        const token = socket.handshake.auth.token || socket.handshake.headers.token;

        if (!token) {
            console.log("❌ Fallo: Token no encontrado");
            return next(new Error("Acceso denegado: No se envió token"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            
            // CORRECCIÓN: Convertir el ID a número (Tu token trae "15" string)
            // Asegúrate de usar la propiedad correcta del token (nameid, sub, id)
            // Según tu ejemplo es "nameid"
            const userIdString = socket.user.nameid || socket.user.sub; 
            socket.user.id = parseInt(userIdString); 

            console.log("✅ Token válido. Usuario ID:", socket.user.id);
            next();
        } catch (err) {
            console.error("❌ Token inválido:", err.message);
            next(new Error("Token inválido o expirado"));
        }
    });

    // ==========================================
    // 2. GESTIÓN DE EVENTOS DE CONEXIÓN
    // ==========================================
    io.on('connection', (socket) => {
        console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

        // EVENTO: Unirse a un Chat
        // El frontend envía: { appointmentId: 105 }
        socket.on('join_chat', (data) => {
            const { appointmentId } = data;
            
            if(!appointmentId) return;

            // Creamos una sala única llamada "cita_105"
            const roomName = `cita_${appointmentId}`;
            socket.join(roomName);
            
            console.log(`Usuario se unió a la sala: ${roomName}`);
        });

        // EVENTO: Enviar Mensaje
        // El frontend envía: { appointmentId: 105, content: "Hola", type: "text" }
        socket.on('send_message', async (data) => {
            const { appointmentId, content, type } = data;
            const roomName = `cita_${appointmentId}`;

            try {
                // A. Guardar en MongoDB
                // NOTA: Aquí necesitamos el ID de la Conversación. 
                // Para optimizar, podrías enviarlo desde el front, 
                // pero por seguridad lo buscamos o usamos el appointmentId si ajustamos el modelo.
                // Por ahora, asumimos que tienes el conversationId o lo buscamos rápido:
                const Conversation = require('../models/Conversation');
                const chat = await Conversation.findOne({ appointmentId });
                
                if (!chat) return; // Si no existe el chat, no hacemos nada

                // Obtenemos el ID del usuario desde el Token decodificado
                const userIdString = socket.user.nameid; 
                const userId = parseInt(userIdString); // Convertimos "15" a 15 (Entero)

                if (isNaN(userId)) {
                    console.error("Error: El ID del token no es un número válido");
                    return;
                }

                const newMessage = new Message({
                    conversationId: chat._id,
                    senderId: userId, // Guardamos quién lo envió (apr_codigo o psi_codigo)
                    content: content,
                    type: type || 'text'
                });

                const savedMessage = await newMessage.save();

                // B. Enviar a todos en la sala (incluyendo al que envió para confirmar)
                io.to(roomName).emit('receive_message', savedMessage);
                
            } catch (error) {
                console.error("Error guardando mensaje:", error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado');
        });
    });
};