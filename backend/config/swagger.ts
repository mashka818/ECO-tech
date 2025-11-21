import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ECO-tech Backend API',
    version: '1.0.0',
    description: 'API для сайта строительной компании ECO-tech',
    contact: {
      name: 'ECO-tech',
    },
  },
  servers: [
    {
      url: 'http://81.177.216.84',
      description: 'Production server (HTTP)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Info',
      description: 'Информационные endpoints',
    },
    {
      name: 'Admin',
      description: 'Административные endpoints',
    },
    {
      name: 'Projects',
      description: 'Управление проектами домов',
    },
    {
      name: 'Staff',
      description: 'Управление фотографиями персонала',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-session-id',
        description: 'Session ID для авторизации админа',
      },
    },
    schemas: {
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Дом из клееного бруса «Краснодар»' },
          slug: { type: 'string', example: 'dom-iz-kleenogo-brusa-krasnodar' },
          subtitle: { type: 'string', example: 'Одноэтажный дом из клееного бруса с террасой' },
          area: { type: 'string', example: '90 м²' },
          dimensions: { type: 'string', example: '9х10 м' },
          floors: { type: 'integer', example: 1 },
          rooms: { type: 'integer', example: 3 },
          bathrooms: { type: 'integer', example: 1 },
          terraces: { type: 'integer', example: 1 },
          price: { type: 'number', example: 5111715 },
          description: { type: 'string' },
          mainImage: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProjectImage: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          projectId: { type: 'integer' },
          imagePath: { type: 'string' },
          isMain: { type: 'boolean' },
          displayOrder: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      StaffPhoto: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          fullName: { type: 'string', example: 'Иван Иванов', description: 'Полное ФИО сотрудника' },
          position: { type: 'string', example: 'Директор', nullable: true },
          imageFilename: { type: 'string', example: 'ivan-ivanov-director.jpg' },
          displayOrder: { type: 'integer', example: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'admin' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          sessionId: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.ts', './server.ts'], // Пути к файлам с аннотациями
};

export const swaggerSpec = swaggerJsdoc(options);

