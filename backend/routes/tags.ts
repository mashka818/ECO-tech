import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateSlug } from '../utils/transliterate';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Теги для домов
 */

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Получить все теги
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: Список всех тегов
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(tags);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch tags', message: err.message });
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Получить тег по ID
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Тег найден
 *       404:
 *         description: Тег не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tag = await prisma.tag.findUnique({
      where: { id: parseInt(id) },
      include: {
        houses: {
          include: {
            house: true,
          },
        },
      },
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(tag);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch tag', message: err.message });
  }
});

/**
 * @swagger
 * /api/tags/slug/{slug}:
 *   get:
 *     summary: Получить тег по slug
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Тег найден
 *       404:
 *         description: Тег не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/slug/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        houses: {
          include: {
            house: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(tag);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch tag', message: err.message });
  }
});

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Создать новый тег
 *     tags: [Tags]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Тег создан
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, color } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const tagSlug = slug || generateSlug(name);

    const tag = await prisma.tag.create({
      data: {
        name,
        slug: tagSlug,
        color: color || null,
      },
    });

    res.status(201).json(tag);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Unique constraint failed')) {
      res.status(400).json({ error: 'Tag with this name or slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create tag', message: err.message });
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Обновить тег
 *     tags: [Tags]
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
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Тег обновлен
 *       404:
 *         description: Тег не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, slug, color } = req.body;

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(color !== undefined && { color }),
      },
    });

    res.json(tag);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    if (err.message.includes('Unique constraint failed')) {
      res.status(400).json({ error: 'Tag with this name or slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update tag', message: err.message });
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Удалить тег
 *     tags: [Tags]
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
 *         description: Тег удален
 *       404:
 *         description: Тег не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.tag.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Record to delete does not exist')) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete tag', message: err.message });
  }
});

export default router;

