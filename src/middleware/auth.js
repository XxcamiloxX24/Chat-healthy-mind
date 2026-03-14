// src/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el JWT emitido por la API principal (ASP.NET).
 * Extrae nameid (id usuario) y role (Psicologo, Aprendiz, Administrador).
 * Mismo comportamiento que API Imágenes HM.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = req.headers.token;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : tokenFromHeader;

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: No se envió token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userIdString = decoded.nameid || decoded.sub;
    const userId = userIdString ? parseInt(userIdString, 10) : null;

    req.user = {
      nameid: userIdString,
      role: decoded.role || 'Usuario',
      id: isNaN(userId) ? null : userId
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { authMiddleware };
