import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const productCollection = 'products';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título del producto es obligatorio.'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción del producto es obligatoria.'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'El código del producto es obligatorio.'],
    unique: true,
    trim: true,
    index: true
  },
  price: {
    type: Number,
    required: [true, 'El precio del producto es obligatorio.'],
    min: [0, 'El precio no puede ser negativo.']
  },
  status: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    required: [true, 'El stock del producto es obligatorio.'],
    min: [0, 'El stock no puede ser negativo.']
  },
  category: {
    type: String,
    required: [true, 'La categoría del producto es obligatoria.'],
    trim: true,
    index: true
  },
  thumbnails: {
    type: [String],
    default: []
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  versionKey: false // Removes __v field from documents
});

// Plug in the mongoose-paginate-v2 plugin
productSchema.plugin(mongoosePaginate);

export const ProductModel = mongoose.model(productCollection, productSchema);
