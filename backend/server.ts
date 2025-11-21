import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from './prisma/client';
import { swaggerSpec } from './config/swagger';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем только запросы с ecotechstroy-dev.ru (без www и IP)
    const allowedOrigins = [
      'https://ecotechstroy-dev.ru'  // Только HTTPS версия домена
    ];
    
    // В production разрешаем только указанные origin
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        // Запросы без origin (например, Postman) блокируем в production
        return callback(new Error('CORS: Origin is required in production'));
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} is not allowed. Only https://ecotechstroy-dev.ru is allowed.`));
      }
    } else {
      // В development разрешаем localhost
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('CORS: Not allowed'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Проверка здоровья сервера
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Сервер работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 database:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
    });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Информация о API
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Информация о сервере
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                 version:
 *                   type: string
 */
// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'ECO-tech Backend API',
    status: 'running',
    version: '1.0.0',
  });
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ECO-tech API Documentation',
  swaggerOptions: {
    url: '/docs/swagger.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    validatorUrl: null,
  }
}));

// Swagger JSON endpoint - всегда возвращает только HTTPS домен
app.get('/docs/swagger.json', (req: Request, res: Response) => {
  // Всегда используем только HTTPS домен, игнорируя любые другие значения
  const swaggerSpecWithServer = {
    ...swaggerSpec,
    servers: [
      {
        url: 'https://ecotechstroy-dev.ru',
        description: 'Production server (HTTPS only)',
      },
    ],
  };
  
  // Запрещаем кэширование, чтобы всегда получать актуальную версию
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(swaggerSpecWithServer);
});

// API routes
import adminRoutes from './routes/admin';
import projectsRoutes from './routes/projects';
import staffRoutes from './routes/staff';

app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/staff', staffRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Access: http://localhost:${PORT}`);
  console.log(`🌍 External: http://81.177.216.84:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

