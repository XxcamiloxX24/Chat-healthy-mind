// src/middleware/errorHandler.js

/**
 * Middleware centralizado de errores.
 * Alineado con API Imágenes HM.
 */
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    msg: err.message || 'Error interno del servidor'
  });
};

module.exports = errorHandler;
