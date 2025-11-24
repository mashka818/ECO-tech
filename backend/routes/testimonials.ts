import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки изображений отзывов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/testimonials');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    const filename = generateFilename(originalName, ext);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: Testimonials
 *   description: Отзывы клиентов
 */

/**
 * @swagger
 * /api/testimonials:
 *   get:
 *     summary: Получить все активные отзывы
 *     tags: [Testimonials]
 *     responses:
 *       200:
 *         description: Список активных отзывов
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(testimonials);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch testimonials', message: err.message });
  }
});

/**
 * @swagger
 * /api/testimonials/all:
 *   get:
 *     summary: Получить все отзывы (включая неактивные) - только для админов
 *     tags: [Testimonials]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Список всех отзывов
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/all', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json(testimonials);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch testimonials', message: err.message });
  }
});

/**
 * @swagger
 * /api/testimonials/{id}:
 *   get:
 *     summary: Получить отзыв по ID
 *     tags: [Testimonials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Отзыв найден
 *       404:
 *         description: Отзыв не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });

    if (!testimonial) {
      res.status(404).json({ error: 'Testimonial not found' });
      return;
    }

    res.json(testimonial);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch testimonial', message: err.message });
  }
});

/**
 * @swagger
 * /api/testimonials:
 *   post:
 *     summary: Создать новый отзыв
 *     tags: [Testimonials]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - clientName
 *               - testimonial
 *             properties:
 *               projectName:
 *                 type: string
 *               clientName:
 *                 type: string
 *               testimonial:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Отзыв создан
 *       400:
 *         description: Неверные данные или превышен лимит изображений
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, upload.array('images', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectName, clientName, testimonial, displayOrder, isActive } = req.body;

    if (!projectName || !clientName || !testimonial) {
      res.status(400).json({ error: 'Project name, client name and testimonial are required' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    
    // Проверяем лимит изображений (до 10)
    if (files && files.length > 10) {
      res.status(400).json({ error: 'Maximum 10 images allowed per testimonial' });
      return;
    }

    const imagePaths: string[] = [];
    if (files && files.length > 0) {
      files.forEach((file) => {
        imagePaths.push(`/uploads/testimonials/${file.filename}`);
      });
    }

    const newTestimonial = await prisma.testimonial.create({
      data: {
        projectName,
        clientName,
        testimonial,
        images: imagePaths,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive === 'true' || isActive === true,
      },
    });

    res.status(201).json(newTestimonial);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create testimonial', message: err.message });
  }
});

/**
 * @swagger
 * /api/testimonials/{id}:
 *   put:
 *     summary: Обновить отзыв
 *     tags: [Testimonials]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               clientName:
 *                 type: string
 *               testimonial:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               removeImages:
 *                 type: string
 *                 description: JSON array of image paths to remove
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Отзыв обновлен
 *       404:
 *         description: Отзыв не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', requireAuth, upload.array('images', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { projectName, clientName, testimonial, removeImages, displayOrder, isActive } = req.body;

    const existingTestimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTestimonial) {
      res.status(404).json({ error: 'Testimonial not found' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    let imagePaths = [...existingTestimonial.images];

    // Удаляем указанные изображения
    if (removeImages) {
      const imagesToRemove = JSON.parse(removeImages);
      imagesToRemove.forEach((imgPath: string) => {
        const fullPath = path.join(__dirname, '..', imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        imagePaths = imagePaths.filter((p) => p !== imgPath);
      });
    }

    // Добавляем новые изображения
    if (files && files.length > 0) {
      files.forEach((file) => {
        imagePaths.push(`/uploads/testimonials/${file.filename}`);
      });
    }

    // Проверяем лимит изображений
    if (imagePaths.length > 10) {
      res.status(400).json({ error: 'Maximum 10 images allowed per testimonial' });
      return;
    }

    const updatedTestimonial = await prisma.testimonial.update({
      where: { id: parseInt(id) },
      data: {
        ...(projectName && { projectName }),
        ...(clientName && { clientName }),
        ...(testimonial && { testimonial }),
        images: imagePaths,
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
      },
    });

    res.json(updatedTestimonial);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to update testimonial', message: err.message });
  }
});

/**
 * @swagger
 * /api/testimonials/{id}:
 *   delete:
 *     summary: Удалить отзыв
 *     tags: [Testimonials]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Отзыв удален
 *       404:
 *         description: Отзыв не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const testimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });

    if (!testimonial) {
      res.status(404).json({ error: 'Testimonial not found' });
      return;
    }

    // Удаляем все изображения
    testimonial.images.forEach((imgPath) => {
      const fullPath = path.join(__dirname, '..', imgPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    await prisma.testimonial.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete testimonial', message: err.message });
  }
});

export default router;

