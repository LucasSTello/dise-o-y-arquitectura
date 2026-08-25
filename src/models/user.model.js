import mongoose from 'mongoose';

const userCollection = 'users';

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: [true, 'El nombre es obligatorio.'],
    trim: true
  },
  last_name: {
    type: String,
    required: [true, 'El apellido es obligatorio.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio.'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  age: {
    type: Number,
    required: [true, 'La edad es obligatoria.'],
    min: [0, 'La edad no puede ser negativa.']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria.']
  },
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'carts',
    required: [true, 'El ID de carrito es obligatorio.']
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin'],
    trim: true
  }
}, {
  timestamps: true, // Track creation and updates
  versionKey: false // Exclude version key __v
});

export const UserModel = mongoose.model(userCollection, userSchema);
