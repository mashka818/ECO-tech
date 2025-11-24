import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ContactRequests
 *   description: Заявки с форм обратной связи
 */

/**
 * @swagger
 * /api/contact-requests:
 *   get:
 *     summary: Получить все заявки - только для админов
 *     tags: [ContactRequests]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: isProcessed
 *         schema:
 *           type: boolean
 *         description: Фильтр по обработанным/необработанным заявкам
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество результатов (по умолчанию 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Сдвиг для пагинации
 *     responses:
 *       200:
 *         description: Список заявок
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isProcessed, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (isProcessed !== undefined) {
      where.isProcessed = isProcessed === 'true';
    }

    const requests = await prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.contactRequest.count({ where });

    res.json({
      requests,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch contact requests', message: err.message });
  }
});

/**
 * @swagger
 * /api/contact-requests/{id}:
 *   get:
 *     summary: Получить заявку по ID - только для админов
 *     tags: [ContactRequests]
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
 *         description: Заявка найдена
 *       404:
 *         description: Заявка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await prisma.contactRequest.findUnique({
      where: { id: parseInt(id) },
    });

    if (!request) {
      res.status(404).json({ error: 'Contact request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch contact request', message: err.message });
  }
});

/**
 * @swagger
 * /api/contact-requests:
 *   post:
 *     summary: Создать новую заявку (публичный эндпоинт)
 *     tags: [ContactRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               message:
 *                 type: string
 *               source:
 *                 type: string
 *                 description: Источник заявки (например, "Главная форма", "Страница каталога")
 *     responses:
 *       201:
 *         description: Заявка создана
 *       400:
 *         description: Неверные данные
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, message, source } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required' });
      return;
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        name,
        phone,
        message: message || null,
        source: source || null,
      },
    });

    res.status(201).json({ 
      success: true,
      message: 'Your request has been received. We will contact you soon.',
      id: contactRequest.id,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to create contact request', message: err.message });
  }
});

/**
 * @swagger
 * /api/contact-requests/{id}/process:
 *   patch:
 *     summary: Отметить заявку как обработанную - только для админов
 *     tags: [ContactRequests]
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
 *             required:
 *               - isProcessed
 *             properties:
 *               isProcessed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Статус заявки обновлен
 *       404:
 *         description: Заявка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.patch('/:id/process', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isProcessed } = req.body;

    if (isProcessed === undefined) {
      res.status(400).json({ error: 'isProcessed field is required' });
      return;
    }

    const request = await prisma.contactRequest.update({
      where: { id: parseInt(id) },
      data: { isProcessed },
    });

    res.json(request);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Contact request not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update contact request', message: err.message });
  }
});

/**
 * @swagger
 * /api/contact-requests/{id}:
 *   delete:
 *     summary: Удалить заявку - только для админов
 *     tags: [ContactRequests]
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
 *         description: Заявка удалена
 *       404:
 *         description: Заявка не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.contactRequest.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Contact request deleted successfully' });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to delete does not exist')) {
      res.status(404).json({ error: 'Contact request not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete contact request', message: err.message });
  }
});

export default router;

