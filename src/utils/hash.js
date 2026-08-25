import bcrypt from 'bcrypt';

/**
 * Encrypts a password string using bcrypt hashSync
 * 
 * @param {string} password - The plain-text password
 * @returns {string} The hashed password
 */
export const createHash = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

/**
 * Compares a plain-text password with the stored hash using bcrypt compareSync
 * 
 * @param {object} user - The user object containing the password hash
 * @param {string} password - The plain-text password to verify
 * @returns {boolean} True if password matches, false otherwise
 */
export const isValidPassword = (user, password) => {
  return bcrypt.compareSync(password, user.password);
};
