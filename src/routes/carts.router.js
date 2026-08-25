import { Router } from 'express';
import { CartManager } from '../managers/CartManager.js';
import { productManager } from './products.router.js';
import { sendResponse } from '../utils/helpers.js';

const router = Router();
const cartManager = new CartManager();

/**
 * POST /api/carts
 * Crea un nuevo carrito vacío en la base de datos
 */
router.post('/', async (req, res) => {
  try {
    const newCart = await cartManager.createCart();
    return sendResponse(res, 201, 'success', 'Carrito creado correctamente.', newCart);
  } catch (error) {
    return sendResponse(res, 500, 'error', `Error del servidor al crear el carrito: ${error.message}`);
  }
});

/**
 * GET /api/carts/:cid
 * Devuelve todos los productos del carrito con ID cid, con detalles completos de cada producto (mediante populate)
 */
router.get('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    // We pass true to populate products info
    const cart = await cartManager.getCartById(cid, true);
    return sendResponse(res, 200, 'success', 'Carrito obtenido con éxito.', cart);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * POST /api/carts/:cid/product/:pid
 * Agrega un producto pid al carrito cid.
 * Si el producto ya existe en el carrito, incrementa la cantidad en 1.
 * Si no existe, lo agrega con cantidad 1.
 */
router.post('/:cid/product/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const updatedCart = await cartManager.addProductToCart(cid, pid, productManager);
    return sendResponse(res, 200, 'success', 'Producto agregado al carrito con éxito.', updatedCart);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * DELETE /api/carts/:cid/products/:pid
 * Elimina un producto específico del carrito
 */
router.delete('/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const updatedCart = await cartManager.deleteProductFromCart(cid, pid);
    return sendResponse(res, 200, 'success', 'Producto eliminado del carrito correctamente.', updatedCart);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * PUT /api/carts/:cid
 * Actualiza el carrito completo con un arreglo de productos provisto en el cuerpo
 */
router.put('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const productsArray = req.body.products || req.body;
    const updatedCart = await cartManager.updateCartProducts(cid, productsArray);
    return sendResponse(res, 200, 'success', 'Carrito actualizado correctamente.', updatedCart);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    if (error.message.includes('debe ser') || error.message.includes('no es un')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * PUT /api/carts/:cid/products/:pid
 * Actualiza únicamente la cantidad de ejemplares del producto por cualquier cantidad, pasada desde el req.body
 */
router.put('/:cid/products/:pid', async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const { quantity } = req.body;
    const updatedCart = await cartManager.updateProductQuantity(cid, pid, quantity);
    return sendResponse(res, 200, 'success', 'Cantidad de producto actualizada correctamente.', updatedCart);
  } catch (error) {
    if (error.message.includes('no válido') || error.message.includes('No se encontró')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    if (error.message.includes('debe ser')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * DELETE /api/carts/:cid
 * Elimina todos los productos del carrito (vaciado del carrito)
 */
router.delete('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const clearedCart = await cartManager.clearCart(cid);
    return sendResponse(res, 200, 'success', 'Todos los productos fueron removidos del carrito.', clearedCart);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

export default router;
export { cartManager };
