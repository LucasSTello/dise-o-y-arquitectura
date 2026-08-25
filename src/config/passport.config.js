import passport from 'passport';
import local from 'passport-local';
import jwt from 'passport-jwt';
import { UserManager } from '../managers/UserManager.js';
import { isValidPassword } from '../utils/hash.js';
import dotenv from 'dotenv';

dotenv.config();

const LocalStrategy = local.Strategy;
const JWTStrategy = jwt.Strategy;
const ExtractJWT = jwt.ExtractJwt;

const userManager = new UserManager();

/**
 * Custom extractor to retrieve the JWT from cookies or headers
 * 
 * @param {object} req - Express request object
 * @returns {string|null} The token or null if not found
 */
const jwtExtractor = (req) => {
  let token = null;
  // 1. Try to extract from cookies
  if (req && req.cookies) {
    token = req.cookies['token'] || req.cookies['jwt'] || req.cookies['coderCookie'];
  }
  // 2. Fallback: try to extract from Authorization Bearer header
  if (!token && req && req.headers) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  return token;
};

export const initializePassport = () => {
  // --- Local Strategy for Login ---
  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        session: false // Do not use session
      },
      async (email, password, done) => {
        try {
          const user = await userManager.getUserByEmail(email, true); // Get user with password
          if (!user) {
            return done(null, false, { message: 'El usuario no existe.' });
          }

          // Compare hashes
          const isMatch = isValidPassword(user, password);
          if (!isMatch) {
            return done(null, false, { message: 'Contraseña incorrecta.' });
          }

          // Return user object (exclude password hash before returning)
          const safeUser = { ...user };
          delete safeUser.password;
          return done(null, safeUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // --- JWT Strategy for protecting routes ---
  passport.use(
    'jwt',
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJWT.fromExtractors([jwtExtractor]),
        secretOrKey: process.env.JWT_SECRET || 'coderSecretKey'
      },
      async (jwt_payload, done) => {
        try {
          // Identify user from payload
          const userId = jwt_payload.id || jwt_payload._id;
          if (!userId) {
            return done(null, false, { message: 'Token mal estructurado.' });
          }

          const user = await userManager.getUserById(userId);
          if (!user) {
            return done(null, false, { message: 'Usuario no encontrado.' });
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // --- Current Strategy specifically for /api/sessions/current ---
  passport.use(
    'current',
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJWT.fromExtractors([jwtExtractor]),
        secretOrKey: process.env.JWT_SECRET || 'coderSecretKey'
      },
      async (jwt_payload, done) => {
        try {
          const userId = jwt_payload.id || jwt_payload._id;
          if (!userId) {
            return done(null, false, { message: 'Token mal estructurado.' });
          }

          // Retrieve user details from database
          const user = await userManager.getUserById(userId);
          if (!user) {
            return done(null, false, { message: 'Usuario inexistente en la base de datos.' });
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
