// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');
const { requirePsychologist, requireChatParticipant } = require('../middleware/chatAuth');

// POST /room - Crear sala (solo psicólogo autenticado)
router.post('/room', authMiddleware, requirePsychologist, chatController.createChatRoom);

// GET /conversations - Listar conversaciones del usuario
router.get('/conversations', authMiddleware, chatController.getConversations);

// GET /history/:appointmentId - Historial (solo JWT, debe ser participante)
router.get('/history/:appointmentId', authMiddleware, requireChatParticipant, chatController.getChatHistory);

module.exports = router;
