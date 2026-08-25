import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ProductManager } from './managers/ProductManager.js';
import dotenv from 'dotenv';

// Load environmental configurations
dotenv.config();

const PORT = process.env.PORT || 8080;

// Connect to MongoDB Atlas/Local
await connectDB();

// Create HTTP server wrapping the Express app
const httpServer = createServer(app);

// Initialize Socket.io server wrapping the HTTP server
const io = new Server(httpServer);

// Instantiate ProductManager (MongoDB backed)
const productManager = new ProductManager();

// Store the manager instance globally in the app context for routes to reuse
app.set('productManager', productManager);

// --- Socket.io Handlers ---
io.on('connection', async (socket) => {
  console.log(`[Socket] Nuevo cliente conectado: ${socket.id}`);

  // Instantly send the current products list from MongoDB to the newly connected client
  try {
    const products = await productManager.getProducts();
    socket.emit('updateProducts', products);
  } catch (error) {
    console.error('[Socket Error] Error al enviar catálogo inicial:', error.message);
  }

  // addProduct: Listen for new product creation request from a client
  socket.on('addProduct', async (productData, callback) => {
    try {
      console.log(`[Socket] Solicitud addProduct recibida de ${socket.id}`);
      
      // Save product to MongoDB
      const newProduct = await productManager.addProduct(productData);
      console.log(`[Socket] Producto creado con éxito en DB con ID: ${newProduct._id}`);

      // Retrieve updated list of products from MongoDB
      const updatedProducts = await productManager.getProducts();

      // Emit update to all connected clients
      io.emit('updateProducts', updatedProducts);

      // Return successful acknowledgment
      if (callback) callback({ status: 'success' });
    } catch (error) {
      console.error(`[Socket Error] Error al agregar producto: ${error.message}`);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // deleteProduct: Listen for product deletion request from a client
  socket.on('deleteProduct', async (id, callback) => {
    try {
      console.log(`[Socket] Solicitud deleteProduct recibida de ${socket.id} para ID: ${id}`);
      
      // Remove product from MongoDB
      await productManager.deleteProduct(id);
      console.log(`[Socket] Producto con ID: ${id} eliminado de la DB.`);

      // Retrieve updated list of products
      const updatedProducts = await productManager.getProducts();

      // Notify all active clients of the deletion and update
      io.emit('updateProducts', updatedProducts);

      // Return successful acknowledgment
      if (callback) callback({ status: 'success' });
    } catch (error) {
      console.error(`[Socket Error] Error al eliminar producto: ${error.message}`);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // disconnect: Triggered when a client closes the connection
  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

// Start HTTP + Socket.io Server listening on PORT
httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Servidor Express escuchando en puerto ${PORT}`);
  console.log(`  Inicio (estático): http://localhost:${PORT}/`);
  console.log(`  Catálogo Paginado: http://localhost:${PORT}/products`);
  console.log(`  Panel Real-Time:   http://localhost:${PORT}/realtimeproducts`);
  console.log(`==================================================`);
});
