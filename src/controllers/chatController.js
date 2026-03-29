// src/controllers/chatController.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const socketInstance = require('../sockets/socketInstance');
const logger = require('../utils/logger');

exports.createChatRoom = async (req, res, next) => {
    try {
        const psychologistId = req.user.id; // Del JWT (solo psicólogo puede crear)
        const { appointmentId: bodyAppointmentId, apprenticeId, area, apprenticeName, ficha } = req.body;

        if (!apprenticeId || !area) {
            return res.status(400).json({ msg: 'Faltan datos obligatorios (apprenticeId, area)' });
        }

        // appointmentId opcional: si no viene (chat directo), generamos uno único
        const appointmentId = bodyAppointmentId ?? (900000000 + Math.floor(Date.now() / 1000) % 100000000);

        let conversation = await Conversation.findOne({ appointmentId });

        if (conversation) {
            return res.status(200).json({
                msg: 'La sala ya existía',
                roomId: conversation._id,
                appointmentId: conversation.appointmentId
            });
        }

        conversation = new Conversation({
            appointmentId,
            psychologistId,
            apprenticeId: parseInt(apprenticeId, 10),
            area,
            ...(apprenticeName && { apprenticeName }),
            ...(ficha && { ficha })
        });

        await conversation.save();

        const io = socketInstance.getIO();

        // Notificar al aprendiz (si está conectado). No requiere que esté en línea.
        io.to(`Aprendiz_${apprenticeId}`).emit('notification', {
            type: 'NEW_CHAT',
            title: 'Nueva conversación',
            message: 'Tu psicólogo ha iniciado una conversación contigo',
            appointmentId,
            createdAt: new Date()
        });

        logger.info('Sala creada. Notificación enviada al aprendiz:', apprenticeId);

        res.status(201).json({
            msg: 'Sala de chat creada exitosamente',
            roomId: conversation._id,
            appointmentId
        });

    } catch (error) {
        next(error);
    }
};

exports.getConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const filter = role === 'Psicologo'
            ? { psychologistId: userId }
            : role === 'Aprendiz'
                ? { apprenticeId: userId }
                : null;

        if (!filter) {
            return res.status(403).json({ error: 'Solo psicólogos y aprendices pueden ver conversaciones' });
        }

        const conversations = await Conversation.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json(conversations);
    } catch (error) {
        next(error);
    }
};

exports.getChatHistory = async (req, res, next) => {
    try {
        // req.conversation ya viene del middleware requireChatParticipant
        const conversation = req.conversation;

        // Buscamos los mensajes que tengan ese conversationId
        const messages = await Message.find({ conversationId: conversation._id })
                                      .sort({ timestamp: 1 }); // 1 = Orden ascendente (más viejos primero)

        res.json(messages);

    } catch (error) {
        next(error);
    }
};

/**
 * GET /stats/mensajes-por-mes — conteo de mensajes por año/mes para las conversaciones del psicólogo (JWT).
 */
exports.getMensajesPorMes = async (req, res, next) => {
    try {
        const psychologistId = req.user.id;
        if (psychologistId == null || Number.isNaN(psychologistId)) {
            return res.status(401).json({ error: 'Usuario no identificado' });
        }

        let meses = parseInt(req.query.meses, 10);
        if (Number.isNaN(meses) || meses < 1) meses = 6;
        if (meses > 24) meses = 24;

        const convs = await Conversation.find({ psychologistId }).select('_id').lean();
        const convIds = convs.map((c) => c._id);
        if (convIds.length === 0) {
            return res.json([]);
        }

        const agg = await Message.aggregate([
            { $match: { conversationId: { $in: convIds } } },
            {
                $group: {
                    _id: { y: { $year: '$timestamp' }, m: { $month: '$timestamp' } },
                    total: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    año: '$_id.y',
                    mes: '$_id.m',
                    total: 1,
                },
            },
            { $sort: { año: 1, mes: 1 } },
        ]);

        res.json(agg);
    } catch (error) {
        next(error);
    }
};
