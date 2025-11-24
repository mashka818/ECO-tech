import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: HeaderPromos
 *   description: Акции для шапки сайта (бегущая строка)
 */

/**
 * @swagger
 * /api/header-promos:
 *   get:
 *     summary: Получить все активные акции для шапки
 *     tags: [HeaderPromos]
 *     responses:
 *       200:
 *         description: Список активных акций
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const promos = await prisma.headerPromo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(promos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch header promos', message: err.message });
  }
});

/**
 * @swagger
 * /api/header-promos/all:
 *   get:
 *     summary: Получить все акции (включая неактивные) - только для админов
 *     tags: [HeaderPromos]
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
    const promos = await prisma.headerPromo.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json(promos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch header promos', message: err.message });
  }
});

/**
 * @swagger
 * /api/header-promos/{id}:
 *   get:
 *     summary: Получить акцию по ID
 *     tags: [HeaderPromos]
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
    const promo = await prisma.headerPromo.findUnique({
      where: { id: parseInt(id) },
    });

    if (!promo) {
      res.status(404).json({ error: 'Header promo not found' });
      return;
    }

    res.json(promo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch header promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/header-promos:
 *   post:
 *     summary: Создать новую акцию для шапки
 *     tags: [HeaderPromos]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
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
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, link, isActive, displayOrder } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const promo = await prisma.headerPromo.create({
      data: {
        text,
        link: link || null,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json(promo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create header promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/header-promos/{id}:
 *   put:
 *     summary: Обновить акцию
 *     tags: [HeaderPromos]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
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
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text, link, isActive, displayOrder } = req.body;

    const promo = await prisma.headerPromo.update({
      where: { id: parseInt(id) },
      data: {
        ...(text && { text }),
        ...(link !== undefined && { link }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    res.json(promo);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Header promo not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update header promo', message: err.message });
  }
});

/**
 * @swagger
 * /api/header-promos/{id}:
 *   delete:
 *     summary: Удалить акцию
 *     tags: [HeaderPromos]
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

    await prisma.headerPromo.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Header promo deleted successfully' });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to delete does not exist')) {
      res.status(404).json({ error: 'Header promo not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete header promo', message: err.message });
  }
});

export default router;

