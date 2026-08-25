import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import supertest from 'supertest';
import app from '../src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const request = supertest(app);

test.describe('Pruebas de Autenticación y Autorización', () => {
  let userToken = '';
  let userId = '';
  let cartId = '';
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // Before running tests, make sure Mongoose is connected
  test.before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
        console.log('  [Test Setup] Conectado a MongoDB para pruebas.');
      }
    } catch (err) {
      console.error('  [Test Error] No se pudo conectar a MongoDB. Asegúrese de tener MongoDB levantado.');
      throw err;
    }
  });

  // After running tests, disconnect Mongoose
  test.after(async () => {
    await mongoose.connection.close();
    console.log('  [Test Teardown] Conexión a MongoDB cerrada.');
  });

  test('POST /api/sessions/register - Debe registrar un nuevo usuario con carrito y contraseña hasheada', async () => {
    const res = await request
      .post('/api/sessions/register')
      .send({
        first_name: 'Test',
        last_name: 'User',
        email: testEmail,
        age: 25,
        password: testPassword
      });

    assert.strictEqual(res.status, 201, 'Código de estado de registro incorrecto');
    assert.strictEqual(res.body.status, 'success', 'Estatus de respuesta incorrecto');
    assert.ok(res.body.data._id, 'Debe retornar un ID de usuario');
    assert.strictEqual(res.body.data.email, testEmail.toLowerCase(), 'El email no coincide');
    assert.ok(res.body.data.cart, 'Debe tener un carrito asociado');
    assert.strictEqual(res.body.data.role, 'user', 'El rol por defecto debe ser "user"');
    assert.strictEqual(res.body.data.password, undefined, 'La contraseña no debe exponerse');

    userId = res.body.data._id;
    cartId = res.body.data.cart;
  });

  test('POST /api/sessions/register - Debe rechazar emails duplicados', async () => {
    const res = await request
      .post('/api/sessions/register')
      .send({
        first_name: 'Duplicate',
        last_name: 'User',
        email: testEmail,
        age: 30,
        password: testPassword
      });

    assert.strictEqual(res.status, 400, 'Debe retornar código 400');
    assert.strictEqual(res.body.status, 'error', 'Estatus debe ser "error"');
  });

  test('POST /api/sessions/login - Debe autenticar al usuario y retornar un token JWT', async () => {
    const res = await request
      .post('/api/sessions/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    assert.strictEqual(res.status, 200, 'Código de estado de login incorrecto');
    assert.strictEqual(res.body.status, 'success', 'Estatus de respuesta incorrecto');
    assert.ok(res.body.token, 'Debe retornar un token');
    
    // Check cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies.some(c => c.includes('token=')), 'Debe setear la cookie "token"');

    userToken = res.body.token;
  });

  test('GET /api/sessions/current - Debe rechazar peticiones sin token', async () => {
    const res = await request.get('/api/sessions/current');
    assert.strictEqual(res.status, 401, 'Debe retornar código 401');
    assert.strictEqual(res.body.status, 'error', 'Estatus debe ser "error"');
  });

  test('GET /api/sessions/current - Debe aceptar peticiones con token JWT válido y no retornar la contraseña', async () => {
    const res = await request
      .get('/api/sessions/current')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200, 'Código de estado incorrecto');
    assert.strictEqual(res.body.status, 'success', 'Estatus incorrecto');
    assert.strictEqual(res.body.payload.email, testEmail.toLowerCase(), 'El email del payload no coincide');
    assert.strictEqual(res.body.payload.password, undefined, 'La contraseña no debe exponerse en current');
  });

  test('GET /api/users - Debe restringir acceso a usuarios sin rol de admin', async () => {
    const res = await request
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 403, 'Debe retornar código 403');
    assert.strictEqual(res.body.status, 'error', 'Estatus debe ser "error"');
  });

  test('DELETE /api/users/:uid - Debe permitir eliminar al usuario y su carrito', async () => {
    const res = await request
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200, 'Código de estado incorrecto');
    assert.strictEqual(res.body.status, 'success', 'Estatus incorrecto');

    // Verify user is deleted
    const { UserModel } = await import('../src/models/user.model.js');
    const dbUser = await UserModel.findById(userId);
    assert.strictEqual(dbUser, null, 'El usuario no fue eliminado de la base de datos');

    // Verify cart is deleted
    const { CartModel } = await import('../src/models/cart.model.js');
    const dbCart = await CartModel.findById(cartId);
    assert.strictEqual(dbCart, null, 'El carrito asociado no fue eliminado');
  });
});
