import { ProductModel } from '../models/product.model.js';
import mongoose from 'mongoose';

export class ProductManager {
  constructor() {
    // No longer relies on a physical file path
  }

  /**
   * Retrieves products. If pagination options are provided, returns paginated results.
   * Otherwise, returns a plain array of all products (for backwards compatibility/WebSockets).
   * 
   * @param {object} [filter={}] - Filter criteria (category, status, etc.)
   * @param {object} [options={}] - Pagination options (limit, page, sort)
   * @returns {Promise<object|Array<object>>} Paginated result or list of products
   */
  async getProducts(filter = {}, options = {}) {
    try {
      // If options.limit or options.page is defined, perform paginated search
      if (options.limit !== undefined || options.page !== undefined || options.sort !== undefined) {
        const paginateOptions = {
          page: parseInt(options.page, 10) || 1,
          limit: parseInt(options.limit, 10) || 10,
          lean: true // Returns plain JS objects for faster render and Handlebars compatibility
        };

        if (options.sort) {
          paginateOptions.sort = options.sort;
        }

        return await ProductModel.paginate(filter, paginateOptions);
      }

      // Default fallback: return all products as plain objects (useful for WebSockets)
      return await ProductModel.find(filter).lean();
    } catch (error) {
      throw new Error(`Error al obtener los productos: ${error.message}`);
    }
  }

  /**
   * Retrieves a product by its Mongoose ObjectId.
   * 
   * @param {string} id - Product ObjectId
   * @returns {Promise<object>} The matching product document
   * @throws {Error} If product is not found or ID is invalid
   */
  async getProductById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de producto '${id}' no válido.`);
      }

      const product = await ProductModel.findById(id).lean();
      if (!product) {
        throw new Error(`Producto con ID ${id} no encontrado.`);
      }
      return product;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al buscar producto por ID: ${error.message}`);
    }
  }

  /**
   * Validates and adds a new product to the database.
   * 
   * @param {object} productData - New product attributes
   * @returns {Promise<object>} The newly created product
   */
  async addProduct(productData) {
    try {
      const { title, description, code, price, status = true, stock, category, thumbnails = [] } = productData;

      // Validation: All fields are mandatory except thumbnails
      if (
        title === undefined || title === null || String(title).trim() === '' ||
        description === undefined || description === null || String(description).trim() === '' ||
        code === undefined || code === null || String(code).trim() === '' ||
        price === undefined || price === null || isNaN(Number(price)) ||
        stock === undefined || stock === null || isNaN(Number(stock)) ||
        category === undefined || category === null || String(category).trim() === ''
      ) {
        throw new Error('Todos los campos son obligatorios (title, description, code, price, stock, category).');
      }

      // Check unique code
      const codeExists = await ProductModel.findOne({ code: String(code).trim() });
      if (codeExists) {
        throw new Error(`El código de producto '${code}' ya está en uso.`);
      }

      const newProduct = await ProductModel.create({
        title: String(title).trim(),
        description: String(description).trim(),
        code: String(code).trim(),
        price: Number(price),
        status: Boolean(status),
        stock: Number(stock),
        category: String(category).trim(),
        thumbnails: Array.isArray(thumbnails) ? thumbnails : []
      });

      return newProduct.toObject();
    } catch (error) {
      if (error.message.includes('obligatorios') || error.message.includes('en uso')) {
        throw error;
      }
      throw new Error(`Error al agregar producto: ${error.message}`);
    }
  }

  /**
   * Updates fields of an existing product in the database.
   * 
   * @param {string} id - Product ObjectId
   * @param {object} updateData - Object with updated attributes
   * @returns {Promise<object>} The updated product details
   */
  async updateProduct(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de producto '${id}' no válido para actualizar.`);
      }

      // Check for code duplication if code is being updated
      if (updateData.code) {
        const duplicateProduct = await ProductModel.findOne({
          code: String(updateData.code).trim(),
          _id: { $ne: id }
        });
        if (duplicateProduct) {
          throw new Error(`El código '${updateData.code}' ya está en uso por otro producto.`);
        }
      }

      // Build safe update data, discarding any manual _id changes
      const safeUpdateData = { ...updateData };
      delete safeUpdateData._id;
      delete safeUpdateData.id;

      if (safeUpdateData.price !== undefined) safeUpdateData.price = Number(safeUpdateData.price);
      if (safeUpdateData.stock !== undefined) safeUpdateData.stock = Number(safeUpdateData.stock);
      if (safeUpdateData.status !== undefined) safeUpdateData.status = Boolean(safeUpdateData.status);

      const updatedProduct = await ProductModel.findByIdAndUpdate(
        id,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedProduct) {
        throw new Error(`Producto con ID ${id} no encontrado para actualizar.`);
      }

      return updatedProduct;
    } catch (error) {
      if (
        error.message.includes('no encontrado') || 
        error.message.includes('en uso') || 
        error.message.includes('no válido')
      ) {
        throw error;
      }
      throw new Error(`Error al actualizar el producto: ${error.message}`);
    }
  }

  /**
   * Deletes a product from the database.
   * 
   * @param {string} id - Product ObjectId
   * @returns {Promise<object>} The deleted product data
   */
  async deleteProduct(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de producto '${id}' no válido para eliminar.`);
      }

      const deletedProduct = await ProductModel.findByIdAndDelete(id).lean();
      if (!deletedProduct) {
        throw new Error(`Producto con ID ${id} no encontrado para eliminar.`);
      }

      return deletedProduct;
    } catch (error) {
      if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
        throw error;
      }
      throw new Error(`Error al eliminar el producto: ${error.message}`);
    }
  }
}
