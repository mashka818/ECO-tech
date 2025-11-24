import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: PriceInclusions
 *   description: Что включено в цену дома
 */

/**
 * @swagger
 * /api/houses/{houseSlug}/price-inclusions:
 *   get:
 *     summary: Получить список того, что включено в цену дома
 *     tags: [PriceInclusions]
 *     parameters:
 *       - in: path
 *         name: houseSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список включений
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/houses/:houseSlug/price-inclusions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseSlug } = req.params;

    const house = await prisma.house.findUnique({
      where: { slug: houseSlug },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    const inclusions = await prisma.priceInclusion.findMany({
      where: { houseId: house.id },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(inclusions);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch price inclusions', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{houseSlug}/price-inclusions:
 *   post:
 *     summary: Добавить пункт в список включений
 *     tags: [PriceInclusions]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item
 *             properties:
 *               item:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Пункт создан
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post('/houses/:houseSlug/price-inclusions', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { houseSlug } = req.params;
    const { item, displayOrder } = req.body;

    if (!item) {
      res.status(400).json({ error: 'Item is required' });
      return;
    }

    const house = await prisma.house.findUnique({
      where: { slug: houseSlug },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    const inclusion = await prisma.priceInclusion.create({
      data: {
        houseId: house.id,
        item,
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json(inclusion);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create price inclusion', message: err.message });
  }
});

/**
 * @swagger
 * /api/price-inclusions/{id}:
 *   put:
 *     summary: Обновить пункт включения
 *     tags: [PriceInclusions]
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
 *               item:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Пункт обновлен
 *       404:
 *         description: Пункт не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/price-inclusions/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { item, displayOrder } = req.body;

    const inclusion = await prisma.priceInclusion.update({
      where: { id: parseInt(id) },
      data: {
        ...(item && { item }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    res.json(inclusion);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Price inclusion not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update price inclusion', message: err.message });
  }
});

/**
 * @swagger
 * /api/price-inclusions/{id}:
 *   delete:
 *     summary: Удалить пункт включения
 *     tags: [PriceInclusions]
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
 *         description: Пункт удален
 *       404:
 *         description: Пункт не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/price-inclusions/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.priceInclusion.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Price inclusion deleted successfully' });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to delete does not exist')) {
      res.status(404).json({ error: 'Price inclusion not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete price inclusion', message: err.message });
  }
});

export default router;

