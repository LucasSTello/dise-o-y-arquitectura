import { Router } from 'express';
import { ProductManager } from '../managers/ProductManager.js';
import { sendResponse } from '../utils/helpers.js';

const router = Router();
const productManager = new ProductManager();

/**
 * GET /api/products
 * Devuelve todos los productos paginados, filtrados y ordenados según los requerimientos.
 * Query params soportados:
 * - limit: número de elementos por página (default 10)
 * - page: número de página a recuperar (default 1)
 * - sort: ordenamiento por precio ('asc', 'desc', '1', '-1')
 * - query: filtro de búsqueda por categoría o estado de disponibilidad
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;

    // Parse options
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return sendResponse(res, 400, 'error', 'El parámetro limit debe ser un número entero positivo.');
    }
    if (isNaN(parsedPage) || parsedPage <= 0) {
      return sendResponse(res, 400, 'error', 'El parámetro page debe ser un número entero positivo.');
    }

    // Build filter query object
    let filter = {};
    if (query) {
      if (query === 'true' || query === 'false') {
        filter = { status: query === 'true' };
      } else {
        filter = { category: query };
      }
    }

    // Build sort options
    let sortOptions = null;
    if (sort) {
      if (sort === 'asc' || sort === '1') {
        sortOptions = { price: 1 };
      } else if (sort === 'desc' || sort === '-1') {
        sortOptions = { price: -1 };
      } else {
        return sendResponse(res, 400, 'error', "El parámetro sort debe ser 'asc', 'desc', '1' o '-1'.");
      }
    }

    // Execute paginated query using the manager
    const result = await productManager.getProducts(filter, {
      limit: parsedLimit,
      page: parsedPage,
      sort: sortOptions
    });

    // Build pagination links
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    
    const buildLink = (targetPage) => {
      let link = `${baseUrl}?page=${targetPage}&limit=${parsedLimit}`;
      if (sort) link += `&sort=${sort}`;
      if (query) link += `&query=${encodeURIComponent(query)}`;
      return link;
    };

    const prevLink = result.hasPrevPage ? buildLink(result.prevPage) : null;
    const nextLink = result.hasNextPage ? buildLink(result.nextPage) : null;

    // Return the response following the exact format requested
    return res.status(200).json({
      status: 'success',
      payload: result.docs,
      totalPages: result.totalPages,
      prevPage: result.prevPage,
      nextPage: result.nextPage,
      page: result.page,
      hasPrevPage: result.hasPrevPage,
      hasNextPage: result.hasNextPage,
      prevLink,
      nextLink
    });

  } catch (error) {
    return sendResponse(res, 500, 'error', `Error del servidor al obtener productos: ${error.message}`);
  }
});

/**
 * GET /api/products/:pid
 * Devuelve el producto cuyo ID (ObjectId de Mongoose) coincide con el parámetro pid
 */
router.get('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const product = await productManager.getProductById(pid);
    return sendResponse(res, 200, 'success', 'Producto encontrado con éxito.', product);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * POST /api/products
 * Crea un nuevo producto validando los campos obligatorios
 */
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = await productManager.addProduct(productData);
    return sendResponse(res, 201, 'success', 'Producto creado correctamente.', newProduct);
  } catch (error) {
    if (error.message.includes('obligatorios') || error.message.includes('en uso')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * PUT /api/products/:pid
 * Actualiza los campos provistos del producto con ID pid
 */
router.put('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const updateData = req.body;

    const updatedProduct = await productManager.updateProduct(pid, updateData);
    return sendResponse(res, 200, 'success', 'Producto actualizado correctamente.', updatedProduct);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    if (error.message.includes('en uso') || error.message.includes('debe ser')) {
      return sendResponse(res, 400, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

/**
 * DELETE /api/products/:pid
 * Elimina el producto con ID pid
 */
router.delete('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const deletedProduct = await productManager.deleteProduct(pid);
    return sendResponse(res, 200, 'success', 'Producto eliminado correctamente.', deletedProduct);
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('no válido')) {
      return sendResponse(res, 404, 'error', error.message);
    }
    return sendResponse(res, 500, 'error', `Error del servidor: ${error.message}`);
  }
});

export default router;
export { productManager };
