// src/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId, // Relación con la colección Conversations de Mongo
        ref: 'Conversation',
        required: true
    },
    senderId: {
        type: Number, // El 'apr_codigo' o 'psi_codigo' de quien envía
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'text' // 'text', 'image', 'file'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);