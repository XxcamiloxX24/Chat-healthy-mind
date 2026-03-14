// src/middleware/chatAuth.js
const Conversation = require('../models/Conversation');
const { authMiddleware } = require('./auth');

/**
 * Requiere que el usuario autenticado sea Psicólogo.
 * Solo el psicólogo puede crear salas de chat.
 */
const requirePsychologist = (req, res, next) => {
  if (req.user?.role !== 'Psicologo') {
    return res.status(403).json({
      error: 'Solo los psicólogos pueden crear conversaciones'
    });
  }
  next();
};

/**
 * Verifica que el usuario autenticado sea participante del chat (psicólogo o aprendiz).
 */
const requireChatParticipant = async (req, res, next) => {
  const { appointmentId } = req.params;
  const userId = req.user?.id;
  const aptId = parseInt(appointmentId, 10);
  if (isNaN(aptId)) {
    return res.status(400).json({ error: 'appointmentId inválido' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no identificado' });
  }

  try {
    const conversation = await Conversation.findOne({ appointmentId: aptId });

    if (!conversation) {
      return res.status(404).json({ msg: 'No existe un chat para esta cita' });
    }

    const isParticipant =
      conversation.psychologistId === userId ||
      conversation.apprenticeId === userId;

    if (!isParticipant) {
      return res.status(403).json({ error: 'No tienes permiso para ver este historial' });
    }

    req.conversation = conversation;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requirePsychologist, requireChatParticipant };
