import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';

const router = Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/projects');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Получить все проекты
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Список проектов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
// Получить все проекты
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        images: {
          where: { isMain: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const projectsWithMainImage = projects.map(project => ({
      ...project,
      main_image: project.images[0]?.imagePath || null,
      images: undefined, // Убираем images из ответа, оставляем только main_image
    }));
    
    res.json(projectsWithMainImage);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/projects/{slug}:
 *   get:
 *     summary: Получить проект по slug
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug проекта
 *     responses:
 *       200:
 *         description: Проект с изображениями
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Проект не найден
 */
// Получить проект по slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: [
            { displayOrder: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json(project);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Создать проект (только для админа)
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               area:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               floors:
 *                 type: integer
 *               rooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               terraces:
 *                 type: integer
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Проект создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Ошибка валидации
 */
// Создать проект (только для админа)
router.post('/', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      area,
      dimensions,
      floors,
      rooms,
      bathrooms,
      terraces,
      price,
      description
    } = req.body;
    
    // Генерируем slug из title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Создаем проект с изображениями
    const project = await prisma.project.create({
      data: {
        title,
        slug,
        subtitle: subtitle || null,
        area: area || null,
        dimensions: dimensions || null,
        floors: floors ? parseInt(floors) : 1,
        rooms: rooms ? parseInt(rooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        terraces: terraces ? parseInt(terraces) : null,
        price: price ? parseFloat(price) : null,
        description: description || null,
        images: {
          create: req.files && Array.isArray(req.files) && req.files.length > 0
            ? req.files.map((file, i) => ({
                imagePath: `/uploads/projects/${file.filename}`,
                isMain: i === 0,
                displayOrder: i,
              }))
            : [],
        },
      },
      include: {
        images: true,
      },
    });
    
    res.status(201).json(project);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Обновить проект (только для админа)
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               area:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               floors:
 *                 type: integer
 *               rooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               terraces:
 *                 type: integer
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Проект обновлен
 *       404:
 *         description: Проект не найден
 */
// Обновить проект
router.put('/:id', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);
    const {
      title,
      subtitle,
      area,
      dimensions,
      floors,
      rooms,
      bathrooms,
      terraces,
      price,
      description
    } = req.body;
    
    // Проверяем существование проекта
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Получаем максимальный display_order для новых изображений
    const maxOrder = await prisma.projectImage.aggregate({
      where: { projectId },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    
    // Обновляем проект
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        subtitle: subtitle || null,
        area: area || null,
        dimensions: dimensions || null,
        floors: floors ? parseInt(floors) : undefined,
        rooms: rooms ? parseInt(rooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        terraces: terraces ? parseInt(terraces) : null,
        price: price ? parseFloat(price) : null,
        description: description || null,
        ...(req.files && Array.isArray(req.files) && req.files.length > 0 && {
          images: {
            create: req.files.map((file, i) => ({
              imagePath: `/uploads/projects/${file.filename}`,
              isMain: false,
              displayOrder: nextOrder + i,
            })),
          },
        }),
      },
      include: {
        images: true,
      },
    });
    
    res.json(project);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Удалить проект (только для админа)
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Проект удален
 *       404:
 *         description: Проект не найден
 */
// Удалить проект
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);
    
    // Получаем пути к изображениям для удаления
    const images = await prisma.projectImage.findMany({
      where: { projectId },
      select: { imagePath: true },
    });
    
    // Удаляем файлы
    for (const img of images) {
      const filePath = path.join(__dirname, '..', img.imagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Удаляем проект (изображения удалятся каскадно)
    await prisma.project.delete({
      where: { id: projectId },
    });
    
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

