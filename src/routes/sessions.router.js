import { Router } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { UserManager } from '../managers/UserManager.js';
import { CartManager } from '../managers/CartManager.js';
import { createHash } from '../utils/hash.js';
import { sendResponse } from '../utils/helpers.js';
import { passportCall } from '../middlewares/auth.middleware.js';

const router = Router();
const userManager = new UserManager();
const cartManager = new CartManager();

/**
 * Helper to sign a JWT token
 * 
 * @param {object} user - Safe user object
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'coderSecretKey',
    { expiresIn: '24h' }
  );
};

/**
 * POST /api/sessions/register
 * Registers a new user. Creates an empty cart and hashes the password using bcrypt.
 */
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, age, password } = req.body;

    // 1. Validation
    if (!first_name || !last_name || !email || !age || !password) {
      return sendResponse(res, 400, 'error', 'Faltan campos obligatorios: first_name, last_name, email, age, password.');
    }

    // 2. Check duplicate email
    const existingUser = await userManager.getUserByEmail(email);
    if (existingUser) {
      return sendResponse(res, 400, 'error', `El email '${email}' ya está registrado.`);
    }

    // 3. Create shopping cart
    const newCart = await cartManager.createCart();
    const cartId = newCart._id || newCart.id;

    // 4. Hash password
    const hashedPassword = createHash(password);

    // 5. Create user (defaults role to "user")
    const newUser = await userManager.createUser({
      first_name,
      last_name,
      email,
      age: Number(age),
      password: hashedPassword,
      cart: cartId,
      role: 'user'
    });

    return sendResponse(res, 201, 'success', 'Usuario registrado correctamente.', newUser);
  } catch (error) {
    if (error.message.includes('ya está registrado') || error.message.includes('obligatorios')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor al registrar: ${error.message}`);
  }
});

/**
 * POST /api/sessions/login
 * Log in using Passport Local strategy. Generates a signed JWT token.
 * Sets the token in a cookie and returns it in the JSON body.
 */
router.post('/login', (req, res, next) => {
  // Use Passport local strategy. Disable sessions.
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      const message = info && info.message ? info.message : 'Credenciales inválidas.';
      return sendResponse(res, 400, 'error', message);
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set token in HTTP-only cookie (expiring in 24 hours)
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production'
    });

    // Send JSON response with token
    return res.status(200).json({
      status: 'success',
      message: 'Login exitoso',
      token
    });
  })(req, res, next);
});

/**
 * GET /api/sessions/current
 * Returns the current authenticated user details using Passport 'current' strategy.
 * Does not expose the password hash.
 */
router.get(
  '/current',
  passportCall('current'),
  (req, res) => {
    // req.user has already been set by passportCall('current') after fetching from DB
    return res.status(200).json({
      status: 'success',
      payload: req.user
    });
  }
);

/**
 * POST /api/sessions/logout
 * Clears the login cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return sendResponse(res, 200, 'success', 'Sesión cerrada correctamente.');
});

export default router;
