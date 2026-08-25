import { UserModel } from '../models/user.model.js';
import mongoose from 'mongoose';

export class UserManager {
  constructor() {
    // No longer relies on physical file storage
  }

  /**
   * Retrieves all users from the database, excluding passwords by default.
   * 
   * @param {boolean} [includePassword=false] - Whether to include the password hash
   * @returns {Promise<Array<object>>} List of users
   */
  async getUsers(includePassword = false) {
    try {
      let query = UserModel.find();
      if (!includePassword) {
        query = query.select('-password');
      }
      return await query.lean();
    } catch (error) {
      throw new Error(`Error al obtener los usuarios: ${error.message}`);
    }
  }

  /**
   * Retrieves a user by their Mongoose ObjectId.
   * 
   * @param {string} id - User ObjectId
   * @param {boolean} [includePassword=false] - Whether to include the password hash
   * @returns {Promise<object>} The matching user document
   * @throws {Error} If user is not found or ID is invalid
   */
  async getUserById(id, includePassword = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de usuario '${id}' no válido.`);
      }

      let query = UserModel.findById(id);
      if (!includePassword) {
        query = query.select('-password');
      }
      
      const user = await query.lean();
      if (!user) {
        throw new Error(`Usuario con ID ${id} no encontrado.`);
      }
      return user;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al buscar usuario por ID: ${error.message}`);
    }
  }

  /**
   * Retrieves a user by their email address.
   * 
   * @param {string} email - Email address
   * @param {boolean} [includePassword=false] - Whether to include the password hash
   * @returns {Promise<object|null>} The matching user document or null if not found
   */
  async getUserByEmail(email, includePassword = false) {
    try {
      if (!email) {
        throw new Error('El email es requerido para buscar un usuario.');
      }
      let query = UserModel.findOne({ email: String(email).trim().toLowerCase() });
      if (includePassword) {
        // Mongoose select can include password if it was excluded, but here we select everything or filter
        // default Mongoose schema does not exclude password, so it's included by default unless specified
      } else {
        query = query.select('-password');
      }
      return await query.lean();
    } catch (error) {
      throw new Error(`Error al buscar usuario por email: ${error.message}`);
    }
  }

  /**
   * Creates a new user in the database.
   * 
   * @param {object} userData - New user attributes
   * @returns {Promise<object>} The newly created user (excluding password)
   */
  async createUser(userData) {
    try {
      const { first_name, last_name, email, age, password, cart, role = 'user' } = userData;

      if (!first_name || !last_name || !email || !age || !password || !cart) {
        throw new Error('Todos los campos son obligatorios (first_name, last_name, email, age, password, cart).');
      }

      // Check for duplicate email
      const emailExists = await UserModel.findOne({ email: String(email).trim().toLowerCase() });
      if (emailExists) {
        throw new Error(`El email '${email}' ya está registrado.`);
      }

      const newUser = await UserModel.create({
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        email: String(email).trim().toLowerCase(),
        age: Number(age),
        password: String(password), // Must be pre-hashed before calling this manager!
        cart: cart,
        role: String(role).trim()
      });

      const userObject = newUser.toObject();
      delete userObject.password;
      return userObject;
    } catch (error) {
      if (error.message.includes('obligatorios') || error.message.includes('ya está registrado')) {
        throw error;
      }
      throw new Error(`Error al crear el usuario: ${error.message}`);
    }
  }

  /**
   * Updates an existing user's data.
   * 
   * @param {string} id - User ObjectId
   * @param {object} updateData - Fields to update
   * @returns {Promise<object>} The updated user (excluding password)
   */
  async updateUser(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de usuario '${id}' no válido para actualizar.`);
      }

      // Safeguard: do not allow modifying password or cart through generic update
      const safeUpdateData = { ...updateData };
      delete safeUpdateData.password;
      delete safeUpdateData._id;
      delete safeUpdateData.id;
      // cart could be updated but we restrict it by default
      delete safeUpdateData.cart;

      if (safeUpdateData.email) {
        safeUpdateData.email = String(safeUpdateData.email).trim().toLowerCase();
        const emailExists = await UserModel.findOne({ email: safeUpdateData.email, _id: { $ne: id } });
        if (emailExists) {
          throw new Error(`El email '${safeUpdateData.email}' ya está registrado por otro usuario.`);
        }
      }

      if (safeUpdateData.age !== undefined) {
        safeUpdateData.age = Number(safeUpdateData.age);
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        id,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).select('-password').lean();

      if (!updatedUser) {
        throw new Error(`Usuario con ID ${id} no encontrado para actualizar.`);
      }

      return updatedUser;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('ya está registrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al actualizar el usuario: ${error.message}`);
    }
  }

  /**
   * Deletes a user by their ID.
   * 
   * @param {string} id - User ObjectId
   * @returns {Promise<object>} The deleted user details (excluding password)
   */
  async deleteUser(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de usuario '${id}' no válido para eliminar.`);
      }

      const deletedUser = await UserModel.findByIdAndDelete(id).select('-password').lean();
      if (!deletedUser) {
        throw new Error(`Usuario con ID ${id} no encontrado para eliminar.`);
      }

      return deletedUser;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al eliminar el usuario: ${error.message}`);
    }
  }
}
