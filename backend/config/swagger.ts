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
          url: 'https://ecotechstroy-dev.ru',
          description: 'Production server (HTTPS only)',
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
      description: 'Управление проектами домов (legacy)',
    },
    {
      name: 'Staff',
      description: 'Управление персоналом',
    },
    {
      name: 'HeaderPromos',
      description: 'Акции для шапки сайта (бегущая строка)',
    },
    {
      name: 'HomePagePromos',
      description: 'Акции и спецпредложения на главной странице',
    },
    {
      name: 'Tags',
      description: 'Теги для домов',
    },
    {
      name: 'Houses',
      description: 'Управление домами (проектами)',
    },
    {
      name: 'FloorPlans',
      description: 'Планировки этажей домов',
    },
    {
      name: 'PriceInclusions',
      description: 'Что включено в цену дома',
    },
    {
      name: 'HeroSections',
      description: 'Первая секция главной страницы (фото и видео)',
    },
    {
      name: 'VideoCards',
      description: 'Карточки с видео на главной странице',
    },
    {
      name: 'Testimonials',
      description: 'Отзывы клиентов',
    },
    {
      name: 'ContactRequests',
      description: 'Заявки с форм обратной связи',
    },
    {
      name: 'Search',
      description: 'Поиск по сайту',
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
          mainImage: { type: 'string', nullable: true, description: 'Главное изображение проекта' },
          images: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Массив путей к изображениям проекта',
            example: ['/uploads/projects/image1.jpg', '/uploads/projects/image2.jpg']
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Staff: {
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

