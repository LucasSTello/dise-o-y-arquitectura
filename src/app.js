import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { initializePassport } from './config/passport.config.js';

// Routers
import productsRouter from './routes/products.router.js';
import cartsRouter from './routes/carts.router.js';
import viewsRouter from './routes/views.router.js';
import usersRouter from './routes/users.router.js';
import sessionsRouter from './routes/sessions.router.js';

// Setup file paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express App
const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Passport Configuration ---
initializePassport();
app.use(passport.initialize());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Handlebars Engine Configuration ---
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  helpers: {
    // Custom logical equality helper needed for filters select elements
    eq: (a, b) => String(a) === String(b)
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// --- Mounting API & View Routers ---
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/', viewsRouter);

// Fallback for undefined API/Web routes
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ status: 'error', message: `Endpoint no encontrado: ${req.originalUrl}` });
  }
  res.status(404).render('home', { title: '404 - No Encontrado', error: 'La página solicitada no existe.' });
});

export default app;
