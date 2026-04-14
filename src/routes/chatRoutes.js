// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');
const { requirePsychologist, requireChatParticipant } = require('../middleware/chatAuth');
const socketInstance = require('../sockets/socketInstance');
const logger = require('../utils/logger');

/**
 * Llamada server-to-server desde la API .NET (p. ej. nueva solicitud de cita).
 * POST /api/chat/internal/notify
 * Header: X-Internal-Secret: <CHAT_INTERNAL_NOTIFY_SECRET>
 * Body: { psychologistId, type?, title?, message?, appointmentId? }
 */
router.post('/internal/notify', (req, res) => {
  const expected = (process.env.CHAT_INTERNAL_NOTIFY_SECRET || '').trim();
  const sent = (req.get('X-Internal-Secret') || req.get('x-internal-secret') || '').trim();
  if (!expected) {
    console.warn('[chat internal/notify] CHAT_INTERNAL_NOTIFY_SECRET no está definido en el servidor');
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (sent !== expected) {
    console.warn('[chat internal/notify] Secreto incorrecto (revisa que coincida con Chat:InternalNotifySecret de la API)');
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { psychologistId, type, title, message, appointmentId, seguimientoId, deepLink } = req.body || {};
  const pid = Number(psychologistId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return res.status(400).json({ error: 'psychologistId_invalido' });
  }

  try {
    const io = socketInstance.getIO();
    const room = `Psicologo_${pid}`;
    const inRoom = io.sockets.adapter.rooms.get(room);
    const clientCount = inRoom ? inRoom.size : 0;
    const payload = {
      type: type || 'GENERIC',
      title: title || 'Healthy Mind',
      message: message || '',
      appointmentId: appointmentId != null ? Number(appointmentId) : undefined,
    };
    if (seguimientoId != null) payload.seguimientoId = Number(seguimientoId);
    if (deepLink) payload.deepLink = String(deepLink);
    io.to(room).emit('notification', payload);
    // Siempre a stdout (Render logs) aunque NODE_ENV=production
    console.log(`[chat internal/notify] emit notification → room=${room} socketsEnSala=${clientCount} type=${type || 'GENERIC'}`);
    return res.json({ ok: true, room, socketsEnSala: clientCount });
  } catch (e) {
    logger.error('internal/notify socket error', e);
    return res.status(500).json({ error: 'socket_error' });
  }
});

// POST /room - Crear sala (solo psicólogo autenticado)
router.post('/room', authMiddleware, requirePsychologist, chatController.createChatRoom);

// GET /conversations - Listar conversaciones del usuario
router.get('/conversations', authMiddleware, chatController.getConversations);

// GET /stats/mensajes-por-mes — agregado mensual de mensajes (solo psicólogo)
router.get('/stats/mensajes-por-mes', authMiddleware, requirePsychologist, chatController.getMensajesPorMes);

// GET /history/:appointmentId - Historial (solo JWT, debe ser participante)
router.get('/history/:appointmentId', authMiddleware, requireChatParticipant, chatController.getChatHistory);

module.exports = router;
