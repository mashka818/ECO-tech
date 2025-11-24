import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки изображений акций
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/promos');
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
 *   name: HomePagePromos
 *   description: Акции и спецпредложения на главной странице
 */

/**
 * @swagger
 * /api/homepage-promos:
 *   get:
 *     summary: Получить все активные акции на главной
 *     tags: [HomePagePromos]
 *     responses:
 *       200:
 *         description: Список активных акций (максимум 3)
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const promos = await prisma.homePagePromo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      take: 3, // Показываем максимум 3 акции
    });

    res.json(promos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch homepage promos', message: err.message });
  }
});

/**
 * @swagger
 * /api/homepage-promos/all:
 *   get:
 *     summary: Получить все акции (включая неактивные) - только для админов
 *     tags: [HomePagePromos]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Список всех акций
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/all', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const promos = await prisma.homePagePromo.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json(promos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch homepage promos', message: err.message });
  }
});

/**
 * @swagger
 * /api/homepage-promos/{id}:
 *   get:
 *     summary: Получить акцию по ID
 *     tags: [HomePagePromos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Акция найдена
 *       404:
 *         description: Акция не найдена
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const promo = await prisma.homePagePromo.findUnique({
      where: { id: parseInt(id) },
    });

    if (!promo) {
      res.status(404).json({ error: 'Homepage promo not found' });
      return;
    }

    res.json(promo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch homepage promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/homepage-promos:
 *   post:
 *     summary: Создать новую акцию для главной
 *     tags: [HomePagePromos]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - tag
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tag:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               link:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Акция создана
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, tag, link, isActive, displayOrder } = req.body;

    if (!title || !description || !tag) {
      res.status(400).json({ error: 'Title, description and tag are required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }

    const imagePath = `/uploads/promos/${req.file.filename}`;

    const promo = await prisma.homePagePromo.create({
      data: {
        title,
        description,
        tag,
        image: imagePath,
        link: link || null,
        isActive: isActive === 'true' || isActive === true,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      },
    });

    res.status(201).json(promo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create homepage promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/homepage-promos/{id}:
 *   put:
 *     summary: Обновить акцию
 *     tags: [HomePagePromos]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tag:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               link:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Акция обновлена
 *       404:
 *         description: Акция не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', requireAuth, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, tag, link, isActive, displayOrder } = req.body;

    // Получаем текущую акцию
    const existingPromo = await prisma.homePagePromo.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPromo) {
      res.status(404).json({ error: 'Homepage promo not found' });
      return;
    }

    let imagePath = existingPromo.image;

    // Если загружено новое изображение
    if (req.file) {
      // Удаляем старое изображение
      if (existingPromo.image) {
        const oldImagePath = path.join(__dirname, '..', existingPromo.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `/uploads/promos/${req.file.filename}`;
    }

    const promo = await prisma.homePagePromo.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(tag && { tag }),
        ...(imagePath && { image: imagePath }),
        ...(link !== undefined && { link }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
      },
    });

    res.json(promo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to update homepage promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/homepage-promos/{id}:
 *   delete:
 *     summary: Удалить акцию
 *     tags: [HomePagePromos]
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
 *         description: Акция удалена
 *       404:
 *         description: Акция не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const promo = await prisma.homePagePromo.findUnique({
      where: { id: parseInt(id) },
    });

    if (!promo) {
      res.status(404).json({ error: 'Homepage promo not found' });
      return;
    }

    // Удаляем изображение
    if (promo.image) {
      const imagePath = path.join(__dirname, '..', promo.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await prisma.homePagePromo.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Homepage promo deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete homepage promo', message: err.message });
  }
});

export default router;

