import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { authenticate } from './shared/middleware/auth.middleware';
import { errorHandler } from './shared/middleware/error.middleware';

// Module routers
import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import ordersRoutes from './modules/orders/orders.routes';
import salesRoutes from './modules/sales/sales.routes';
import cashRoutes from './modules/cash/cash.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import customersRoutes from './modules/customers/customers.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global authentication extractor
app.use(authenticate);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'BrewDesk CaféPOS API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount API v1 modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/cash', cashRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`☕ BrewDesk API server running at http://localhost:${PORT}`);
  console.log(`📡 Healthcheck available at http://localhost:${PORT}/api/v1/health`);
});

export default app;
