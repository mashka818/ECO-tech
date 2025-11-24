import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Поиск по сайту
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Поиск по всему содержимому сайта
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Поисковый запрос
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, houses, promos, testimonials]
 *         description: Тип контента для поиска (по умолчанию all)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество результатов (по умолчанию 20)
 *     responses:
 *       200:
 *         description: Результаты поиска
 *       400:
 *         description: Не указан поисковый запрос
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const searchQuery = q.toLowerCase().trim();
    const results: any = {
      query: searchQuery,
      houses: [],
      promos: [],
      testimonials: [],
    };

    // Поиск по домам
    if (type === 'all' || type === 'houses') {
      const houses = await prisma.house.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { shortDescription: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        take: parseInt(limit as string),
      });
      results.houses = houses;
    }

    // Поиск по акциям
    if (type === 'all' || type === 'promos') {
      const promos = await prisma.homePagePromo.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { tag: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: parseInt(limit as string),
      });
      results.promos = promos;
    }

    // Поиск по отзывам
    if (type === 'all' || type === 'testimonials') {
      const testimonials = await prisma.testimonial.findMany({
        where: {
          isActive: true,
          OR: [
            { projectName: { contains: searchQuery, mode: 'insensitive' } },
            { clientName: { contains: searchQuery, mode: 'insensitive' } },
            { testimonial: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: parseInt(limit as string),
      });
      results.testimonials = testimonials;
    }

    // Подсчитываем общее количество результатов
    const totalResults =
      results.houses.length +
      results.promos.length +
      results.testimonials.length;

    res.json({
      ...results,
      total: totalResults,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

/**
 * @swagger
 * /api/search/houses:
 *   get:
 *     summary: Расширенный поиск и фильтрация домов
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Поисковый запрос
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Фильтр по slug тега
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Минимальная цена
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Максимальная цена
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *         description: Количество комнат
 *       - in: query
 *         name: floors
 *         schema:
 *           type: integer
 *         description: Количество этажей
 *       - in: query
 *         name: onSale
 *         schema:
 *           type: boolean
 *         description: Только дома по акции
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, popular, newest]
 *         description: Сортировка (по умолчанию по displayOrder)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество результатов (по умолчанию 20)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Сдвиг для пагинации
 *     responses:
 *       200:
 *         description: Результаты поиска/фильтрации
 *       500:
 *         description: Ошибка сервера
 */
router.get('/houses', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      tag,
      minPrice,
      maxPrice,
      rooms,
      floors,
      onSale,
      sortBy = 'default',
      limit = 20,
      offset = 0,
    } = req.query;

    const where: any = {
      isActive: true,
    };

    // Поиск по тексту
    if (q && typeof q === 'string') {
      const searchQuery = q.toLowerCase().trim();
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { shortDescription: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Фильтр по тегу
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag as string,
          },
        },
      };
    }

    // Фильтр по цене
    if (minPrice || maxPrice) {
      where.OR = where.OR || [];
      const priceFilter: any = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice as string);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice as string);

      where.OR.push(
        { regularPrice: priceFilter },
        { salePrice: priceFilter }
      );
    }

    // Фильтр по комнатам
    if (rooms) {
      where.rooms = parseInt(rooms as string);
    }

    // Фильтр по этажам
    if (floors) {
      where.floors = parseInt(floors as string);
    }

    // Фильтр по акциям
    if (onSale === 'true') {
      where.salePrice = { not: null };
      where.saleEndDate = { gte: new Date() };
    }

    // Сортировка
    let orderBy: any = { displayOrder: 'asc' };
    if (sortBy === 'price_asc') {
      orderBy = { regularPrice: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { regularPrice: 'desc' };
    } else if (sortBy === 'popular') {
      orderBy = { viewCount: 'desc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const houses = await prisma.house.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.house.count({ where });

    res.json({
      houses,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      filters: {
        q: q || null,
        tag: tag || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        rooms: rooms || null,
        floors: floors || null,
        onSale: onSale === 'true',
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

export default router;

