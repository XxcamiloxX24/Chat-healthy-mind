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
    apprenticeName: { type: String }, // Para mostrar en lista (opcional)
    ficha: { type: String }, // Número de ficha (opcional)
    isActive: {
        type: Boolean,
        default: true // El chat nace activo
    },
    archivedByPsychologist: {
        type: Boolean,
        default: false // True cuando el psicólogo "quita el chat" de su lista; el aprendiz lo sigue viendo
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ConversationSchema.index({ psychologistId: 1, createdAt: -1 });
ConversationSchema.index({ apprenticeId: 1, createdAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
