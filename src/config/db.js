import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductModel } from '../models/product.model.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';

/**
 * Connect to MongoDB Database using Mongoose
 */
export const connectDB = async () => {
  try {
    console.log('[Database] Intentando conectar a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] ¡Conexión exitosa a MongoDB!');
    
    // Seed products if database is empty
    await seedProducts();
  } catch (error) {
    console.error('[Database Error] Error al conectar a MongoDB:', error.message);
    
    // Fallback connection to local database in case Atlas URI is invalid or offline
    const localUri = 'mongodb://127.0.0.1:27017/ecommerce';
    if (MONGODB_URI !== localUri) {
      console.log('[Database] Intentando conectar a base de datos local de respaldo...');
      try {
        await mongoose.connect(localUri);
        console.log('[Database] ¡Conexión exitosa a MongoDB local de respaldo!');
        await seedProducts();
      } catch (localError) {
        console.error('[Database Error] Error crítico: No se pudo conectar a la DB local tampoco.', localError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

/**
 * Seed database with initial products if collection is empty
 */
async function seedProducts() {
  try {
    const count = await ProductModel.countDocuments();
    if (count === 0) {
      console.log('[Database] Colección de productos vacía. Insertando datos semilla...');
      const sampleProducts = [
        {
          title: "Teclado Mecánico RGB",
          description: "Teclado mecánico con switches cherry MX brown, retroiluminación RGB y layout en español.",
          code: "TEC-001",
          price: 12500,
          status: true,
          stock: 25,
          category: "Periféricos",
          thumbnails: []
        },
        {
          title: "Monitor Curvo 27\"",
          description: "Monitor curvo gaming de 27 pulgadas, resolución QHD 144Hz y tiempo de respuesta de 1ms.",
          code: "MON-002",
          price: 45000,
          status: true,
          stock: 10,
          category: "Pantallas",
          thumbnails: []
        },
        {
          title: "Auriculares Gamer Pro",
          description: "Auriculares con sonido envolvente 7.1 virtual, micrófono con cancelación de ruido y conexión USB.",
          code: "AUR-003",
          price: 8500,
          status: true,
          stock: 15,
          category: "Periféricos",
          thumbnails: []
        }
      ];
      await ProductModel.insertMany(sampleProducts);
      console.log('[Database] ¡Productos semilla insertados con éxito!');
    }
  } catch (error) {
    console.error('[Database Error] Error al sembrar productos:', error.message);
  }
}
