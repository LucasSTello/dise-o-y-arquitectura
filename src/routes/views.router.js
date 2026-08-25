import { Router } from 'express';
import { ProductManager } from '../managers/ProductManager.js';
import { CartManager } from '../managers/CartManager.js';

const router = Router();
const productManager = new ProductManager();
const cartManager = new CartManager();

// GET / - Renders static home view
router.get('/', async (req, res) => {
  try {
    // Return all products for the static home catalog
    const products = await productManager.getProducts();
    res.render('home', {
      products,
      title: 'Inicio - Antigravity Store'
    });
  } catch (error) {
    console.error('Error rendering home view:', error);
    res.status(500).render('home', {
      error: 'Error al obtener los productos de la base de datos.',
      title: 'Error - Inicio'
    });
  }
});

// GET /products - Renders paginated products catalog
router.get('/products', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;

    // Build filter
    let filter = {};
    if (query) {
      if (query === 'true' || query === 'false') {
        filter = { status: query === 'true' };
      } else {
        filter = { category: query };
      }
    }

    // Build sort
    let sortOptions = null;
    if (sort) {
      sortOptions = { price: (sort === 'asc' || sort === '1') ? 1 : -1 };
    }

    // Retrieve paginated products
    const result = await productManager.getProducts(filter, {
      limit: parsedLimit,
      page: parsedPage,
      sort: sortOptions
    });

    // Build pagination links for views
    const buildViewLink = (targetPage) => {
      let link = `/products?page=${targetPage}&limit=${parsedLimit}`;
      if (sort) link += `&sort=${sort}`;
      if (query) link += `&query=${encodeURIComponent(query)}`;
      return link;
    };

    const prevLink = result.hasPrevPage ? buildViewLink(result.prevPage) : null;
    const nextLink = result.hasNextPage ? buildViewLink(result.nextPage) : null;

    res.render('products', {
      products: result.docs,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevLink,
        nextLink
      },
      filters: {
        sort,
        query,
        limit: parsedLimit
      },
      title: 'Catálogo de Productos - Antigravity Store'
    });
  } catch (error) {
    console.error('Error rendering products view:', error);
    res.status(500).render('products', {
      error: `Error al renderizar el catálogo: ${error.message}`,
      title: 'Error - Catálogo'
    });
  }
});

// GET /carts/:cid - Renders detailed shopping cart view
router.get('/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    // Retrieve populated cart details
    const cart = await cartManager.getCartById(cid, true);

    // Calculate total price and subtotals for nice UI
    const productsInCart = cart.products.map(item => {
      const p = item.product;
      const subtotal = p ? (p.price * item.quantity) : 0;
      return {
        ...item,
        subtotal
      };
    });

    const totalCartPrice = productsInCart.reduce((sum, item) => sum + item.subtotal, 0);

    res.render('cart', {
      cartId: cid,
      products: productsInCart,
      total: totalCartPrice,
      hasProducts: productsInCart.length > 0,
      title: 'Tu Carrito - Antigravity Store'
    });
  } catch (error) {
    console.error('Error rendering cart view:', error);
    res.status(500).render('cart', {
      error: `No se pudo cargar el carrito: ${error.message}`,
      title: 'Error - Carrito'
    });
  }
});

// GET /realtimeproducts - Renders real-time product management view
router.get('/realtimeproducts', async (req, res) => {
  try {
    const products = await productManager.getProducts();
    res.render('realTimeProducts', {
      products,
      title: 'Panel en Tiempo Real'
    });
  } catch (error) {
    console.error('Error rendering realTimeProducts view:', error);
    res.status(500).render('realTimeProducts', {
      error: 'Error al obtener los productos en tiempo real.',
      title: 'Error - Panel Real-Time'
    });
  }
});

export default router;
