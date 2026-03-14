let io = null;

module.exports = {
  init: (ioInstance) => {
    io = ioInstance;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.IO no inicializado');
    }
    return io;
  }
};
