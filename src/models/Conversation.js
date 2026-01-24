// src/models/Conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    appointmentId: {
        type: Number, // Es tu 'cit_codigo' (INT)
        required: true,
        unique: true  // Solo una sala de chat por cita
    },
    psychologistId: {
        type: Number, // Es tu 'psi_codigo' (INT)
        required: true
    },
    apprenticeId: {
        type: Number, // Es tu 'apr_codigo' (INT)
        required: true
    },
    area: {
        type: String, // Ejemplo: 'Sistemas', 'Confección'
        required: true
    },
    isActive: {
        type: Boolean,
        default: true // El chat nace activo
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Conversation', ConversationSchema);