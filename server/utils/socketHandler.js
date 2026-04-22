/**
 * Socket.io Event Handler
 * Manages real-time bidirectional communication
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

function socketHandler(io) {
  // ─── Auth Middleware for Sockets ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // ─── User joins their personal room ───────────────────────────────
    socket.join(`user:${socket.userId}`);

    // ─── Subscribe to counter updates ─────────────────────────────────
    socket.on('subscribe:counter', (counterId) => {
      socket.join(`counter:${counterId}`);
      logger.info(`Socket ${socket.id} subscribed to counter ${counterId}`);
    });

    socket.on('unsubscribe:counter', (counterId) => {
      socket.leave(`counter:${counterId}`);
    });

    // ─── Subscribe to queue live view ─────────────────────────────────
    socket.on('subscribe:live', () => {
      socket.join('live:queue');
    });

    // ─── Admin subscribes to all counters ─────────────────────────────
    socket.on('subscribe:admin', () => {
      socket.join('admin:dashboard');
      logger.info(`Admin socket ${socket.id} subscribed to dashboard`);
    });

    // ─── Disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for ${socket.id}: ${err.message}`);
    });
  });

  // ─── Broadcast helpers ────────────────────────────────────────────────
  io.broadcastQueueUpdate = (counterId, data) => {
    io.to(`counter:${counterId}`).emit('queue:update', data);
    io.to('live:queue').emit('queue:live-update', { counterId, ...data });
    io.to('admin:dashboard').emit('dashboard:update', data);
  };

  io.notifyUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  logger.info('✅ Socket.io handler initialized');
}

module.exports = socketHandler;
