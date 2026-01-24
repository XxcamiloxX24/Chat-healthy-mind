// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Conectado exitosamente');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        process.exit(1); // Detiene la app si no hay base de datos
    }
};

module.exports = connectDB;