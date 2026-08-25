import passport from 'passport';
import { sendResponse } from '../utils/helpers.js';

/**
 * Reusable helper to execute a Passport strategy with custom error handling.
 * Avoids default Passport HTML responses and redirects, returning clean JSON instead.
 * 
 * @param {string} strategy - Passport strategy name
 * @returns {Function} Express middleware
 */
export const passportCall = (strategy) => {
  return (req, res, next) => {
    passport.authenticate(strategy, { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        const errorMsg = info && info.message ? info.message : 'Autenticación fallida.';
        return sendResponse(res, 401, 'error', errorMsg);
      }
      req.user = user;
      next();
    })(req, res, next);
  };
};

/**
 * Reusable middleware to authorize route access based on user role(s).
 * 
 * @param {...string} allowedRoles - List of roles permitted to access the route
 * @returns {Function} Express middleware
 */
export const authorization = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, 'error', 'No autenticado. Inicie sesión para continuar.');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, 'error', 'Acceso denegado. No posee los privilegios necesarios.');
    }
    
    next();
  };
};
