import { CartModel } from '../models/cart.model.js';
import mongoose from 'mongoose';

export class CartManager {
  constructor() {
    // No longer relies on a physical file path
  }

  /**
   * Retrieves all carts from database.
   * 
   * @returns {Promise<Array<object>>} List of carts
   */
  async getCarts() {
    try {
      return await CartModel.find().lean();
    } catch (error) {
      throw new Error(`Error al obtener los carritos: ${error.message}`);
    }
  }

  /**
   * Retrieves a cart by its ID. Can optionally populate product details.
   * 
   * @param {string} id - Cart ObjectId
   * @param {boolean} [populate=false] - Whether to populate products info
   * @returns {Promise<object>} The matching cart
   * @throws {Error} If cart is not found or ID is invalid
   */
  async getCartById(id, populate = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de carrito '${id}' no válido.`);
      }

      let query = CartModel.findById(id);
      
      if (populate) {
        // Populate references to get full product info
        query = query.populate('products.product');
      }

      const cart = await query.lean();

      if (!cart) {
        throw new Error(`Carrito con ID ${id} no encontrado.`);
      }

      return cart;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al obtener el carrito por ID: ${error.message}`);
    }
  }

  /**
   * Creates a new empty shopping cart.
   * 
   * @returns {Promise<object>} The newly created cart
   */
  async createCart() {
    try {
      const newCart = await CartModel.create({ products: [] });
      return newCart.toObject();
    } catch (error) {
      throw new Error(`Error al crear el carrito: ${error.message}`);
    }
  }

  /**
   * Adds a product to a cart. Increments quantity if it already exists.
   * Validates existence of both cart and product.
   * 
   * @param {string} cid - Cart ObjectId
   * @param {string} pid - Product ObjectId
   * @param {ProductManager} productManager - Instance of ProductManager to check product existence
   * @returns {Promise<object>} The updated cart
   */
  async addProductToCart(cid, pid, productManager) {
    try {
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new Error(`ID de carrito '${cid}' no válido.`);
      }
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        throw new Error(`ID de producto '${pid}' no válido.`);
      }

      // 1. Verify product exists
      await productManager.getProductById(pid);

      // 2. Find target cart
      const cart = await CartModel.findById(cid);
      if (!cart) {
        throw new Error(`Carrito con ID ${cid} no encontrado para agregar producto.`);
      }

      // 3. Find if product is already in cart
      const productIndex = cart.products.findIndex(p => p.product.toString() === pid);

      if (productIndex !== -1) {
        cart.products[productIndex].quantity += 1;
      } else {
        cart.products.push({
          product: pid,
          quantity: 1
        });
      }

      await cart.save();
      return cart.toObject();
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al agregar producto al carrito: ${error.message}`);
    }
  }

  /**
   * Deletes a specific product from a cart.
   * 
   * @param {string} cid - Cart ObjectId
   * @param {string} pid - Product ObjectId
   * @returns {Promise<object>} The updated cart
   */
  async deleteProductFromCart(cid, pid) {
    try {
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new Error(`ID de carrito '${cid}' no válido.`);
      }
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        throw new Error(`ID de producto '${pid}' no válido.`);
      }

      const updatedCart = await CartModel.findByIdAndUpdate(
        cid,
        { $pull: { products: { product: pid } } },
        { new: true }
      ).lean();

      if (!updatedCart) {
        throw new Error(`Carrito con ID ${cid} no encontrado para eliminar producto.`);
      }

      return updatedCart;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al eliminar producto del carrito: ${error.message}`);
    }
  }

  /**
   * Replaces all products in a cart with a new products array.
   * 
   * @param {string} cid - Cart ObjectId
   * @param {Array<object>} productsArray - Array of products with format [{ product: pid, quantity: q }]
   * @returns {Promise<object>} The updated cart
   */
  async updateCartProducts(cid, productsArray) {
    try {
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new Error(`ID de carrito '${cid}' no válido.`);
      }

      // Basic validation of the input array format
      if (!Array.isArray(productsArray)) {
        throw new Error('El listado de productos debe ser un arreglo.');
      }

      for (const item of productsArray) {
        if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
          throw new Error(`El producto referenciado '${item.product}' no es un ObjectId válido.`);
        }
        if (item.quantity === undefined || isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
          throw new Error(`La cantidad para el producto '${item.product}' debe ser un número entero mayor o igual a 1.`);
        }
      }

      const updatedCart = await CartModel.findByIdAndUpdate(
        cid,
        { $set: { products: productsArray } },
        { new: true }
      ).lean();

      if (!updatedCart) {
        throw new Error(`Carrito con ID ${cid} no encontrado.`);
      }

      return updatedCart;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido') || error.message.includes('debe ser')) {
        throw error;
      }
      throw new Error(`Error al actualizar productos del carrito: ${error.message}`);
    }
  }

  /**
   * Updates only the quantity of a product inside a cart.
   * 
   * @param {string} cid - Cart ObjectId
   * @param {string} pid - Product ObjectId
   * @param {number} quantity - New quantity
   * @returns {Promise<object>} The updated cart
   */
  async updateProductQuantity(cid, pid, quantity) {
    try {
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new Error(`ID de carrito '${cid}' no válido.`);
      }
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        throw new Error(`ID de producto '${pid}' no válido.`);
      }
      if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) < 1) {
        throw new Error('La cantidad debe ser un número entero positivo mayor o igual a 1.');
      }

      // Check if cart contains the product
      const updatedCart = await CartModel.findOneAndUpdate(
        { _id: cid, 'products.product': pid },
        { $set: { 'products.$.quantity': Number(quantity) } },
        { new: true }
      ).lean();

      if (!updatedCart) {
        throw new Error(`No se encontró el carrito con ID ${cid} o el producto con ID ${pid} no está en dicho carrito.`);
      }

      return updatedCart;
    } catch (error) {
      if (error.message.includes('no válido') || error.message.includes('debe ser') || error.message.includes('No se encontró')) {
        throw error;
      }
      throw new Error(`Error al actualizar la cantidad del producto en el carrito: ${error.message}`);
    }
  }

  /**
   * Clears all products from a cart (empties it).
   * 
   * @param {string} cid - Cart ObjectId
   * @returns {Promise<object>} The updated cart
   */
  async clearCart(cid) {
    try {
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        throw new Error(`ID de carrito '${cid}' no válido.`);
      }

      const updatedCart = await CartModel.findByIdAndUpdate(
        cid,
        { $set: { products: [] } },
        { new: true }
      ).lean();

      if (!updatedCart) {
        throw new Error(`Carrito con ID ${cid} no encontrado.`);
      }

      return updatedCart;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al vaciar el carrito: ${error.message}`);
    }
  }
}
