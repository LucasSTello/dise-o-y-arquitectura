import mongoose from 'mongoose';

const cartCollection = 'carts';

const cartSchema = new mongoose.Schema({
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'products',
        required: [true, 'El ID del producto es obligatorio.']
      },
      quantity: {
        type: Number,
        required: [true, 'La cantidad de producto es obligatoria.'],
        min: [1, 'La cantidad mínima es 1.'],
        default: 1
      }
    }
  ]
}, {
  timestamps: true, // Automatically track creation and updates
  versionKey: false // Exclude version key __v
});

export const CartModel = mongoose.model(cartCollection, cartSchema);
