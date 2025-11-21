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
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json(projects);
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
    
    // Обрабатываем загруженные изображения
    const imagePaths: string[] = [];
    let mainImagePath: string | null = null;
    
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      imagePaths.push(...req.files.map(file => `/uploads/projects/${file.filename}`));
      mainImagePath = imagePaths[0] || null;
    }
    
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
        mainImage: mainImagePath,
        images: imagePaths,
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
    
    // Обрабатываем новые загруженные изображения
    const newImagePaths: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      newImagePaths.push(...req.files.map(file => `/uploads/projects/${file.filename}`));
    }
    
    // Объединяем существующие изображения с новыми (если есть)
    const existingImages: string[] = Array.isArray(existingProject.images) ? existingProject.images : [];
    const allImages = [...existingImages, ...newImagePaths];
    const mainImage = allImages.length > 0 ? allImages[0] : null;
    
    // Обновляем проект
    const updateData: any = {
      ...(title && { title }),
      ...(subtitle !== undefined && { subtitle: subtitle || null }),
      ...(area !== undefined && { area: area || null }),
      ...(dimensions !== undefined && { dimensions: dimensions || null }),
      ...(floors !== undefined && { floors: floors ? parseInt(floors) : 1 }),
      ...(rooms !== undefined && { rooms: rooms ? parseInt(rooms) : null }),
      ...(bathrooms !== undefined && { bathrooms: bathrooms ? parseInt(bathrooms) : null }),
      ...(terraces !== undefined && { terraces: terraces ? parseInt(terraces) : null }),
      ...(price !== undefined && { price: price ? parseFloat(price) : null }),
      ...(description !== undefined && { description: description || null }),
    };
    
    // Обновляем изображения только если загружены новые
    if (newImagePaths.length > 0) {
      updateData.images = allImages;
      updateData.mainImage = mainImage;
    }
    
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
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
    
    // Получаем проект с путями к изображениям
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { images: true, mainImage: true },
    });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Удаляем файлы изображений
    const projectImages: string[] = Array.isArray(project.images) ? project.images : [];
    const allImages = [...projectImages, project.mainImage].filter((img): img is string => typeof img === 'string');
    for (const imagePath of allImages) {
      if (imagePath) {
        const filePath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    // Удаляем проект
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

