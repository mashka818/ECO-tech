import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки видео и превью
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB для видео
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = /mp4|webm|mov/;
    const allowedImageTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.fieldname === 'video') {
      if (allowedVideoTypes.test(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video field'));
      }
    } else if (file.fieldname === 'thumbnail') {
      if (allowedImageTypes.test(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnail field'));
      }
    } else {
      cb(null, true);
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: VideoCards
 *   description: Карточки с видео на главной странице
 */

/**
 * @swagger
 * /api/video-cards:
 *   get:
 *     summary: Получить все активные видео-карточки
 *     tags: [VideoCards]
 *     responses:
 *       200:
 *         description: Список активных видео-карточек
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const videoCards = await prisma.videoCard.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(videoCards);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch video cards', message: err.message });
  }
});

/**
 * @swagger
 * /api/video-cards/all:
 *   get:
 *     summary: Получить все видео-карточки (включая неактивные) - только для админов
 *     tags: [VideoCards]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Список всех видео-карточек
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/all', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoCards = await prisma.videoCard.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json(videoCards);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch video cards', message: err.message });
  }
});

/**
 * @swagger
 * /api/video-cards/{id}:
 *   get:
 *     summary: Получить видео-карточку по ID
 *     tags: [VideoCards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Видео-карточка найдена
 *       404:
 *         description: Видео-карточка не найдена
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const videoCard = await prisma.videoCard.findUnique({
      where: { id: parseInt(id) },
    });

    if (!videoCard) {
      res.status(404).json({ error: 'Video card not found' });
      return;
    }

    res.json(videoCard);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch video card', message: err.message });
  }
});

/**
 * @swagger
 * /api/video-cards:
 *   post:
 *     summary: Создать новую видео-карточку
 *     tags: [VideoCards]
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
 *               - video
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Видео-карточка создана
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, displayOrder, isActive } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.video || !files.video[0]) {
      res.status(400).json({ error: 'Video file is required' });
      return;
    }

    const videoPath = `/uploads/videos/${files.video[0].filename}`;
    let thumbnailPath = null;

    if (files.thumbnail && files.thumbnail[0]) {
      thumbnailPath = `/uploads/videos/${files.thumbnail[0].filename}`;
    }

    const videoCard = await prisma.videoCard.create({
      data: {
        title,
        description: description || null,
        videoUrl: videoPath,
        thumbnail: thumbnailPath,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive === 'true' || isActive === true,
      },
    });

    res.status(201).json(videoCard);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create video card', message: err.message });
  }
});

/**
 * @swagger
 * /api/video-cards/{id}:
 *   put:
 *     summary: Обновить видео-карточку
 *     tags: [VideoCards]
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
 *               video:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Видео-карточка обновлена
 *       404:
 *         description: Видео-карточка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', requireAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, displayOrder, isActive } = req.body;

    const existingCard = await prisma.videoCard.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCard) {
      res.status(404).json({ error: 'Video card not found' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let videoPath = existingCard.videoUrl;
    let thumbnailPath = existingCard.thumbnail;

    // Обновляем видео, если загружено новое
    if (files.video && files.video[0]) {
      // Удаляем старое видео
      const oldVideoPath = path.join(__dirname, '..', existingCard.videoUrl);
      if (fs.existsSync(oldVideoPath)) {
        fs.unlinkSync(oldVideoPath);
      }
      videoPath = `/uploads/videos/${files.video[0].filename}`;
    }

    // Обновляем превью, если загружено новое
    if (files.thumbnail && files.thumbnail[0]) {
      // Удаляем старое превью
      if (existingCard.thumbnail) {
        const oldThumbnailPath = path.join(__dirname, '..', existingCard.thumbnail);
        if (fs.existsSync(oldThumbnailPath)) {
          fs.unlinkSync(oldThumbnailPath);
        }
      }
      thumbnailPath = `/uploads/videos/${files.thumbnail[0].filename}`;
    }

    const videoCard = await prisma.videoCard.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(videoPath && { videoUrl: videoPath }),
        ...(thumbnailPath !== undefined && { thumbnail: thumbnailPath }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
      },
    });

    res.json(videoCard);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to update video card', message: err.message });
  }
});

/**
 * @swagger
 * /api/video-cards/{id}:
 *   delete:
 *     summary: Удалить видео-карточку
 *     tags: [VideoCards]
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
 *         description: Видео-карточка удалена
 *       404:
 *         description: Видео-карточка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const videoCard = await prisma.videoCard.findUnique({
      where: { id: parseInt(id) },
    });

    if (!videoCard) {
      res.status(404).json({ error: 'Video card not found' });
      return;
    }

    // Удаляем видео
    const videoPath = path.join(__dirname, '..', videoCard.videoUrl);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Удаляем превью, если есть
    if (videoCard.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', videoCard.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    await prisma.videoCard.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Video card deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete video card', message: err.message });
  }
});

export default router;

