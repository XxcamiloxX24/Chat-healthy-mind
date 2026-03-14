// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const chatRoutes = require('./routes/chatRoutes');
const socketManager = require('./sockets/socketManager');
const socketInstance = require('./sockets/socketInstance');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

connectDB();

// CORS - Orígenes concretos (alineado con API Imágenes HM)
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'];

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-hm' });
});

app.use('/api/chat', chatRoutes);

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST']
  }
});
socketInstance.init(io);
socketManager(io);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor de Chat corriendo en ${HOST}:${PORT}`);
});
