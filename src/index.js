// src/index.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const http = require('http'); // Necesario para unir Express con Socket.io
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const chatRoutes = require('./routes/chatRoutes');
const socketManager = require('./sockets/socketManager');

// Inicializar App
const app = express();
const server = http.createServer(app); // Creamos servidor HTTP

// Conectar a Base de Datos
connectDB();

// Middlewares
app.use(cors());          // Permitir conexiones externas
app.use(express.json());  // Permitir recibir JSON en el Body

// Rutas API 
app.use('/api/chat', chatRoutes);

const io = new Server(server, {
    cors: {
        origin: "*", // OJO: En producción, cambia esto por la URL de tu frontend (ej: "http://localhost:4200")
        methods: ["GET", "POST"]
    }
});

socketManager(io);

// Configuración básica para arrancar
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Servidor de Chat corriendo en puerto ${PORT}`);
});