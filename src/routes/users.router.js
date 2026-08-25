import { Router } from 'express';
import { UserManager } from '../managers/UserManager.js';
import { CartManager } from '../managers/CartManager.js';
import { createHash } from '../utils/hash.js';
import { sendResponse } from '../utils/helpers.js';
import { passportCall, authorization } from '../middlewares/auth.middleware.js';

const router = Router();
const userManager = new UserManager();
const cartManager = new CartManager();

/**
 * GET /api/users
 * Returns list of all users. Protected: Admin only.
 */
router.get('/', passportCall('jwt'), authorization('admin'), async (req, res) => {
  try {
    const users = await userManager.getUsers();
    return sendResponse(res, 200, 'success', 'Usuarios obtenidos con éxito.', users);
  } catch (error) {
    return sendResponse(res, 500, 'error', `Error al obtener usuarios: ${error.message}`);
  }
});

/**
 * GET /api/users/:uid
 * Returns detailed info of a single user.
 */
router.get('/:uid', passportCall('jwt'), async (req, res) => {
  try {
    const { uid } = req.params;
    // Users can see their own info, admins can see anyone's
    if (req.user.role !== 'admin' && req.user._id.toString() !== uid) {
      return sendResponse(res, 403, 'error', 'No tiene permisos para ver la información de este usuario.');
    }

    const user = await userManager.getUserById(uid);
    return sendResponse(res, 200, 'success', 'Usuario obtenido con éxito.', user);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error al obtener usuario: ${error.message}`);
  }
});

/**
 * POST /api/users
 * Creates a new user (admin or standard registration).
 */
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, age, password, role } = req.body;

    // 1. Validation
    if (!first_name || !last_name || !email || !age || !password) {
      return sendResponse(res, 400, 'error', 'Faltan campos obligatorios: first_name, last_name, email, age, password.');
    }

    // 2. Check if email exists
    const existingUser = await userManager.getUserByEmail(email);
    if (existingUser) {
      return sendResponse(res, 400, 'error', `El email '${email}' ya está registrado.`);
    }

    // 3. Create shopping cart for user
    const newCart = await cartManager.createCart();
    const cartId = newCart._id || newCart.id;

    // 4. Encrypt password using bcrypt.hashSync
    const hashedPassword = createHash(password);

    // 5. Create user object
    const newUser = await userManager.createUser({
      first_name,
      last_name,
      email,
      age: Number(age),
      password: hashedPassword,
      cart: cartId,
      role: role || 'user'
    });

    return sendResponse(res, 201, 'success', 'Usuario registrado correctamente.', newUser);
  } catch (error) {
    if (error.message.includes('ya está registrado') || error.message.includes('obligatorios')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor al registrar usuario: ${error.message}`);
  }
});

/**
 * PUT /api/users/:uid
 * Updates user information.
 */
router.put('/:uid', passportCall('jwt'), async (req, res) => {
  try {
    const { uid } = req.params;

    // Users can only update themselves, admins can update anyone
    if (req.user.role !== 'admin' && req.user._id.toString() !== uid) {
      return sendResponse(res, 403, 'error', 'No tiene permisos para modificar la información de este usuario.');
    }

    const updatedUser = await userManager.updateUser(uid, req.body);
    return sendResponse(res, 200, 'success', 'Usuario actualizado correctamente.', updatedUser);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    if (error.message.includes('ya registrado')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error al actualizar usuario: ${error.message}`);
  }
});

/**
 * DELETE /api/users/:uid
 * Deletes user and their associated cart.
 */
router.delete('/:uid', passportCall('jwt'), async (req, res) => {
  try {
    const { uid } = req.params;

    // Only admin can delete users, or users can delete their own accounts
    if (req.user.role !== 'admin' && req.user._id.toString() !== uid) {
      return sendResponse(res, 403, 'error', 'No posee los privilegios para eliminar esta cuenta.');
    }

    // Retrieve user first to get their cart ID
    const user = await userManager.getUserById(uid);
    
    // Delete user
    const deletedUser = await userManager.deleteUser(uid);

    // Maintain cart consistency: delete associated cart as well
    if (user.cart) {
      try {
        // Delete or clear cart
        // The base CartManager doesn't have a deleteCart method, let's see.
        // It has getCarts, getCartById, createCart, addProductToCart, deleteProductFromCart, updateCartProducts, updateProductQuantity, clearCart.
        // So we will just call clearCart to empty it, or we can use Mongoose CartModel directly to delete it.
        // Let's delete the cart document directly from database for clean storage.
        const { CartModel } = await import('../models/cart.model.js');
        await CartModel.findByIdAndDelete(user.cart);
      } catch (cartError) {
        console.error(`[Warning] No se pudo eliminar el carrito ${user.cart} al eliminar el usuario: ${cartError.message}`);
      }
    }

    return sendResponse(res, 200, 'success', 'Usuario y su carrito asociado eliminados con éxito.', deletedUser);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error al eliminar usuario: ${error.message}`);
  }
});

export default router;
