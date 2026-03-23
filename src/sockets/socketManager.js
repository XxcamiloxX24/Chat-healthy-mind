// src/sockets/socketManager.js
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;

    if (!token) {
      return next(new Error('Acceso denegado: No se envió token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;

      const userIdString = socket.user.nameid || socket.user.sub;
      socket.user.id = parseInt(userIdString, 10);

      logger.debug('Token válido. Usuario ID:', socket.user.id);
      next();
    } catch (err) {
      logger.error('Token inválido:', err.message);
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;
    const personalRoom = `${role}_${userId}`;
    socket.join(personalRoom);

    logger.debug('Usuario unido a sala:', personalRoom);

    socket.on('join_chat', (data) => {
      const { appointmentId } = data;
      if (!appointmentId) return;

      const roomName = `cita_${appointmentId}`;
      socket.join(roomName);
      logger.debug('Usuario se unió a sala:', roomName);
    });

    socket.on('send_message', async (data) => {
      const { appointmentId, content, type } = data;
      const roomName = `cita_${appointmentId}`;

      try {
        const chat = await Conversation.findOne({ appointmentId });
        if (!chat) return;

        const userIdString = socket.user.nameid;
        const userId = parseInt(userIdString, 10);

        if (isNaN(userId)) {
          logger.error('El ID del token no es un número válido');
          return;
        }

        const newMessage = new Message({
          conversationId: chat._id,
          senderId: userId,
          content,
          type: type || 'text'
        });

        const savedMessage = await newMessage.save();
        const payload = savedMessage.toObject ? savedMessage.toObject() : savedMessage;
        io.to(roomName).emit('receive_message', { ...payload, appointmentId });

        // Notificar al destinatario en su sala personal (para badge/toast cuando no está en el chat)
        const recipientId = userId === chat.psychologistId ? chat.apprenticeId : chat.psychologistId;
        const recipientRole = userId === chat.psychologistId ? 'Aprendiz' : 'Psicologo';
        const preview = content.length > 50 ? content.slice(0, 50) + '...' : content;
        io.to(`${recipientRole}_${recipientId}`).emit('notification', {
          type: 'NEW_MESSAGE',
          title: 'Nuevo mensaje',
          message: preview,
          appointmentId,
          createdAt: new Date()
        });
      } catch (error) {
        logger.error('Error guardando mensaje:', error);
      }
    });

    socket.on('typing_start', (data) => {
      const { appointmentId } = data || {};
      if (!appointmentId) return;
      const roomName = `cita_${appointmentId}`;
      socket.to(roomName).emit('user_typing', {
        appointmentId,
        userId: socket.user.id,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { appointmentId } = data || {};
      if (!appointmentId) return;
      const roomName = `cita_${appointmentId}`;
      socket.to(roomName).emit('user_typing', {
        appointmentId,
        userId: socket.user.id,
        isTyping: false
      });
    });

    socket.on('disconnect', () => {
      logger.debug('Cliente desconectado');
    });
  });
};
