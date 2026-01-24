// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Definimos la ruta POST /api/chat/room
router.post('/room', chatController.createChatRoom);
// Ejemplo de uso: GET /api/chat/history/105
router.get('/history/:appointmentId', chatController.getChatHistory);

module.exports = router;