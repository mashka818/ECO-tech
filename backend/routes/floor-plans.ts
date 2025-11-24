import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки планировок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/floor-plans');
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
 *   name: FloorPlans
 *   description: Планировки этажей домов
 */

/**
 * @swagger
 * /api/houses/{houseSlug}/floor-plans:
 *   get:
 *     summary: Получить планировки для дома
 *     tags: [FloorPlans]
 *     parameters:
 *       - in: path
 *         name: houseSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список планировок
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/houses/:houseSlug/floor-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseSlug } = req.params;

    const house = await prisma.house.findUnique({
      where: { slug: houseSlug },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    const floorPlans = await prisma.floorPlan.findMany({
      where: { houseId: house.id },
      orderBy: { floorNumber: 'asc' },
    });

    res.json(floorPlans);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch floor plans', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{houseSlug}/floor-plans:
 *   post:
 *     summary: Добавить планировку этажа
 *     tags: [FloorPlans]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: houseSlug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - floorNumber
 *               - image
 *             properties:
 *               floorNumber:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Планировка создана
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post('/houses/:houseSlug/floor-plans', requireAuth, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { houseSlug } = req.params;
    const { floorNumber, title, description } = req.body;

    if (!floorNumber) {
      res.status(400).json({ error: 'Floor number is required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }

    const house = await prisma.house.findUnique({
      where: { slug: houseSlug },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    const imagePath = `/uploads/floor-plans/${req.file.filename}`;

    const floorPlan = await prisma.floorPlan.create({
      data: {
        houseId: house.id,
        floorNumber: parseInt(floorNumber),
        image: imagePath,
        title: title || null,
        description: description || null,
      },
    });

    res.status(201).json(floorPlan);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create floor plan', message: err.message });
  }
});

/**
 * @swagger
 * /api/floor-plans/{id}:
 *   put:
 *     summary: Обновить планировку
 *     tags: [FloorPlans]
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
 *               floorNumber:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Планировка обновлена
 *       404:
 *         description: Планировка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/floor-plans/:id', requireAuth, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { floorNumber, title, description } = req.body;

    const existingPlan = await prisma.floorPlan.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPlan) {
      res.status(404).json({ error: 'Floor plan not found' });
      return;
    }

    let imagePath = existingPlan.image;

    // Если загружено новое изображение
    if (req.file) {
      // Удаляем старое изображение
      const oldImagePath = path.join(__dirname, '..', existingPlan.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      imagePath = `/uploads/floor-plans/${req.file.filename}`;
    }

    const floorPlan = await prisma.floorPlan.update({
      where: { id: parseInt(id) },
      data: {
        ...(floorNumber && { floorNumber: parseInt(floorNumber) }),
        ...(imagePath && { image: imagePath }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    res.json(floorPlan);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to update floor plan', message: err.message });
  }
});

/**
 * @swagger
 * /api/floor-plans/{id}:
 *   delete:
 *     summary: Удалить планировку
 *     tags: [FloorPlans]
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
 *         description: Планировка удалена
 *       404:
 *         description: Планировка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/floor-plans/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id: parseInt(id) },
    });

    if (!floorPlan) {
      res.status(404).json({ error: 'Floor plan not found' });
      return;
    }

    // Удаляем изображение
    const imagePath = path.join(__dirname, '..', floorPlan.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await prisma.floorPlan.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Floor plan deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete floor plan', message: err.message });
  }
});

export default router;

