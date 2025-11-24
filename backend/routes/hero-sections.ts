import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки медиа
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/hero');
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB для видео
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image|video/.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: HeroSections
 *   description: Первая секция главной страницы (фото и видео)
 */

/**
 * @swagger
 * /api/hero-sections:
 *   get:
 *     summary: Получить все элементы первой секции
 *     tags: [HeroSections]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [main_slider, video_small]
 *         description: Фильтр по типу (main_slider - до 5 фото, video_small - 2 видео)
 *     responses:
 *       200:
 *         description: Список элементов
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    const where: any = { isActive: true };
    if (type) {
      where.type = type;
    }

    const items = await prisma.heroSection.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    res.json(items);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch hero sections', message: err.message });
  }
});

/**
 * @swagger
 * /api/hero-sections/all:
 *   get:
 *     summary: Получить все элементы (включая неактивные) - только для админов
 *     tags: [HeroSections]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Список всех элементов
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/all', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.heroSection.findMany({
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }],
    });

    res.json(items);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch hero sections', message: err.message });
  }
});

/**
 * @swagger
 * /api/hero-sections/{id}:
 *   get:
 *     summary: Получить элемент по ID
 *     tags: [HeroSections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Элемент найден
 *       404:
 *         description: Элемент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.heroSection.findUnique({
      where: { id: parseInt(id) },
    });

    if (!item) {
      res.status(404).json({ error: 'Hero section not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch hero section', message: err.message });
  }
});

/**
 * @swagger
 * /api/hero-sections:
 *   post:
 *     summary: Создать новый элемент секции
 *     tags: [HeroSections]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - media
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [main_slider, video_small]
 *               media:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               link:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Элемент создан
 *       400:
 *         description: Неверные данные или превышен лимит
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, upload.single('media'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, title, description, link, displayOrder, isActive } = req.body;

    if (!type || !req.file) {
      res.status(400).json({ error: 'Type and media file are required' });
      return;
    }

    // Проверяем лимиты
    const count = await prisma.heroSection.count({
      where: { type, isActive: true },
    });

    if (type === 'main_slider' && count >= 5) {
      res.status(400).json({ error: 'Maximum 5 items allowed for main_slider type' });
      return;
    }

    if (type === 'video_small' && count >= 2) {
      res.status(400).json({ error: 'Maximum 2 items allowed for video_small type' });
      return;
    }

    const mediaPath = `/uploads/hero/${req.file.filename}`;

    const item = await prisma.heroSection.create({
      data: {
        type,
        mediaUrl: mediaPath,
        title: title || null,
        description: description || null,
        link: link || null,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive === 'true' || isActive === true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create hero section', message: err.message });
  }
});

/**
 * @swagger
 * /api/hero-sections/{id}:
 *   put:
 *     summary: Обновить элемент секции
 *     tags: [HeroSections]
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
 *               type:
 *                 type: string
 *                 enum: [main_slider, video_small]
 *               media:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               link:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Элемент обновлен
 *       404:
 *         description: Элемент не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', requireAuth, upload.single('media'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, title, description, link, displayOrder, isActive } = req.body;

    const existingItem = await prisma.heroSection.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Hero section not found' });
      return;
    }

    let mediaPath = existingItem.mediaUrl;

    // Если загружено новое медиа
    if (req.file) {
      // Удаляем старое медиа
      const oldPath = path.join(__dirname, '..', existingItem.mediaUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      mediaPath = `/uploads/hero/${req.file.filename}`;
    }

    const item = await prisma.heroSection.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type }),
        ...(mediaPath && { mediaUrl: mediaPath }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(link !== undefined && { link }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
      },
    });

    res.json(item);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to update hero section', message: err.message });
  }
});

/**
 * @swagger
 * /api/hero-sections/{id}:
 *   delete:
 *     summary: Удалить элемент секции
 *     tags: [HeroSections]
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
 *         description: Элемент удален
 *       404:
 *         description: Элемент не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.heroSection.findUnique({
      where: { id: parseInt(id) },
    });

    if (!item) {
      res.status(404).json({ error: 'Hero section not found' });
      return;
    }

    // Удаляем медиа файл
    const mediaPath = path.join(__dirname, '..', item.mediaUrl);
    if (fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath);
    }

    await prisma.heroSection.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Hero section deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete hero section', message: err.message });
  }
});

export default router;

