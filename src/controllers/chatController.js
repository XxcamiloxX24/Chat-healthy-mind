// src/controllers/chatController.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const socketInstance = require('../sockets/socketInstance');


exports.createChatRoom = async (req, res) => {
    try {
        // Desestructuramos los datos que nos enviará .NET
        const { appointmentId, psychologistId, apprenticeId, area } = req.body;

        // 1. Validar que lleguen los datos
        if (!appointmentId || !psychologistId || !apprenticeId || !area) {
            return res.status(400).json({ msg: 'Faltan datos obligatorios (IDs o Area)' });
        }

        // 2. Verificar si la sala YA existe (para no duplicarla)
        let conversation = await Conversation.findOne({ appointmentId });

        if (conversation) {
            return res.status(200).json({ 
                msg: 'La sala ya existía', 
                roomId: conversation._id 
            });
        }

        // 3. Crear la nueva sala si no existe
        conversation = new Conversation({
            appointmentId,    // cit_codigo
            psychologistId,   // psi_codigo
            apprenticeId,     // apr_codigo
            area
        });

        await conversation.save();

        const io = socketInstance.getIO();

        io.to(`psicologo_${psychologistId}`).emit('notification', {
            type: 'NEW_APPOINTMENT',
            title: 'Nueva solicitud de cita',
            message: 'Un aprendiz ha solicitado una cita',
            appointmentId: appointmentId,
            createdAt: new Date()
        });

        console.log('🔔 Notificación enviada al psicólogo:', psychologistId);

        res.status(201).json({
            msg: 'Sala de chat creada exitosamente',
            roomId: conversation._id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error en el servidor al crear sala' });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const { appointmentId } = req.params; // Lo recibiremos por URL

        // A. Buscamos primero cuál es el ID interno de la conversación
        const conversation = await Conversation.findOne({ appointmentId });

        if (!conversation) {
            return res.status(404).json({ msg: 'No existe un chat para esta cita' });
        }

        // B. Buscamos los mensajes que tengan ese conversationId
        const messages = await Message.find({ conversationId: conversation._id })
                                      .sort({ timestamp: 1 }); // 1 = Orden ascendente (más viejos primero)

        res.json(messages);

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener historial' });
    }
};