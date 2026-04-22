/**
 * Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login    - Login
 * GET  /api/auth/me       - Get current user
 * POST /api/auth/logout   - Logout
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Validation Rules ─────────────────────────────────────────────────────
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation errors or email already exists
 */
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => e.msg) });
  }

  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = new User({ name, email, password, phone });
    await user.save();

    const token = generateToken(user._id);
    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => e.msg) });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/admin/create - Create admin (protected: only existing admins)
 */
router.post('/admin/create', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create other admins' });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password required' });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const admin = new User({ name, email, password, role: 'admin' });
  await admin.save();

  res.status(201).json({ message: 'Admin created', user: admin.toPublicJSON() });
});

/**
 * GET /api/auth/users - Get all users (Admin only)
 */
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/auth/users/:id/role - Update user role (Admin only)
 */
router.put('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user or admin' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `Role updated to ${role}`, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
