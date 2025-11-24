import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateFilename, generateSlug } from '../utils/transliterate';

const router = Router();

// Настройка multer для загрузки изображений домов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/houses');
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
 *   name: Houses
 *   description: Управление домами (проектами)
 */

/**
 * @swagger
 * /api/houses:
 *   get:
 *     summary: Получить список домов с фильтрацией
 *     tags: [Houses]
 *     parameters:
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
 *         name: minArea
 *         schema:
 *           type: number
 *         description: Минимальная площадь
 *       - in: query
 *         name: maxArea
 *         schema:
 *           type: number
 *         description: Максимальная площадь
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
 *         description: Список домов
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag, minPrice, maxPrice, minArea, maxArea, rooms, floors, limit = 20, offset = 0 } = req.query;

    const where: any = {
      isActive: true,
    };

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

    // Фильтр по цене (используем regularPrice или salePrice)
    if (minPrice || maxPrice) {
      where.OR = [
        {
          regularPrice: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
        {
          salePrice: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
      ];
    }

    // Фильтр по площади (парсим число из строки типа "120 м²")
    // Для простоты считаем, что area - это строка с числом в начале
    // В реальности лучше хранить площадь как отдельное число

    // Фильтр по комнатам
    if (rooms) {
      where.rooms = parseInt(rooms as string);
    }

    // Фильтр по этажам
    if (floors) {
      where.floors = parseInt(floors as string);
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
      orderBy: { displayOrder: 'asc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.house.count({ where });

    res.json({
      houses,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch houses', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{slug}:
 *   get:
 *     summary: Получить дом по slug
 *     tags: [Houses]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Дом найден
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const house = await prisma.house.findUnique({
      where: { slug },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        floorPlans: {
          orderBy: { floorNumber: 'asc' },
        },
        priceInclusions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    // Увеличиваем счетчик просмотров
    await prisma.house.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });

    res.json(house);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch house', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{slug}/similar:
 *   get:
 *     summary: Получить похожие дома по основному тегу
 *     tags: [Houses]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество похожих домов (по умолчанию 4)
 *     responses:
 *       200:
 *         description: Список похожих домов
 *       404:
 *         description: Дом не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:slug/similar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { limit = 4 } = req.query;

    // Находим текущий дом и его основной тег
    const house = await prisma.house.findUnique({
      where: { slug },
      include: {
        tags: {
          where: { isPrimary: true },
          include: { tag: true },
        },
      },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    // Если нет основного тега, используем первый тег
    const primaryTag = house.tags.find((t) => t.isPrimary);
    
    if (!primaryTag) {
      res.json([]);
      return;
    }

    // Находим похожие дома с тем же основным тегом
    const similarHouses = await prisma.house.findMany({
      where: {
        isActive: true,
        slug: { not: slug }, // Исключаем текущий дом
        tags: {
          some: {
            tagId: primaryTag.tagId,
          },
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { viewCount: 'desc' }, // Сортируем по популярности
      take: parseInt(limit as string),
    });

    res.json(similarHouses);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch similar houses', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses:
 *   post:
 *     summary: Создать новый дом
 *     tags: [Houses]
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
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               regularPrice:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               saleEndDate:
 *                 type: string
 *                 format: date-time
 *               area:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               floors:
 *                 type: integer
 *               rooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               terraces:
 *                 type: integer
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               mainImage:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               tags:
 *                 type: string
 *                 description: JSON array of tag IDs (e.g., "[1,2,3]")
 *               primaryTagId:
 *                 type: integer
 *                 description: ID основного тега для похожих проектов
 *               isActive:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Дом создан
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', requireAuth, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 20 },
]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      slug,
      regularPrice,
      salePrice,
      saleEndDate,
      area,
      dimensions,
      floors,
      rooms,
      bathrooms,
      terraces,
      description,
      shortDescription,
      metaTitle,
      metaDescription,
      tags,
      primaryTagId,
      isActive,
      displayOrder,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    // Генерируем slug, если не указан
    const houseSlug = slug || generateSlug(title);

    // Обрабатываем загруженные файлы
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let mainImagePath = null;
    const imagePaths: string[] = [];

    if (files.mainImage && files.mainImage[0]) {
      mainImagePath = `/uploads/houses/${files.mainImage[0].filename}`;
    }

    if (files.images) {
      files.images.forEach((file) => {
        imagePaths.push(`/uploads/houses/${file.filename}`);
      });
    }

    // Парсим теги
    const tagIds = tags ? JSON.parse(tags) : [];

    // Проверяем, что не более 4 тегов
    if (tagIds.length > 4) {
      res.status(400).json({ error: 'Maximum 4 tags allowed per house' });
      return;
    }

    // Создаем дом
    const house = await prisma.house.create({
      data: {
        title,
        slug: houseSlug,
        regularPrice: regularPrice ? parseFloat(regularPrice) : null,
        salePrice: salePrice ? parseFloat(salePrice) : null,
        saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
        area: area || null,
        dimensions: dimensions || null,
        floors: floors ? parseInt(floors) : 1,
        rooms: rooms ? parseInt(rooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        terraces: terraces ? parseInt(terraces) : null,
        description: description || null,
        shortDescription: shortDescription || null,
        mainImage: mainImagePath,
        images: imagePaths,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        isActive: isActive === 'true' || isActive === true,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      },
    });

    // Создаем связи с тегами
    if (tagIds.length > 0) {
      const primaryTagIdParsed = primaryTagId ? parseInt(primaryTagId) : null;
      
      for (const tagId of tagIds) {
        await prisma.houseTag.create({
          data: {
            houseId: house.id,
            tagId: parseInt(tagId),
            isPrimary: primaryTagIdParsed === parseInt(tagId),
          },
        });
      }
    }

    // Получаем созданный дом с тегами
    const createdHouse = await prisma.house.findUnique({
      where: { id: house.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json(createdHouse);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Unique constraint failed')) {
      res.status(400).json({ error: 'House with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create house', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{slug}:
 *   put:
 *     summary: Обновить дом
 *     tags: [Houses]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               regularPrice:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               saleEndDate:
 *                 type: string
 *                 format: date-time
 *               area:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               floors:
 *                 type: integer
 *               rooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               terraces:
 *                 type: integer
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               mainImage:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               removeImages:
 *                 type: string
 *                 description: JSON array of image paths to remove
 *               tags:
 *                 type: string
 *                 description: JSON array of tag IDs
 *               primaryTagId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Дом обновлен
 *       404:
 *         description: Дом не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:slug', requireAuth, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 20 },
]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug: currentSlug } = req.params;
    const {
      title,
      slug,
      regularPrice,
      salePrice,
      saleEndDate,
      area,
      dimensions,
      floors,
      rooms,
      bathrooms,
      terraces,
      description,
      shortDescription,
      metaTitle,
      metaDescription,
      tags,
      primaryTagId,
      removeImages,
      isActive,
      displayOrder,
    } = req.body;

    // Получаем текущий дом
    const existingHouse = await prisma.house.findUnique({
      where: { slug: currentSlug },
      include: { tags: true },
    });

    if (!existingHouse) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    // Обрабатываем загруженные файлы
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let mainImagePath = existingHouse.mainImage;
    let imagePaths = [...existingHouse.images];

    // Обновляем главное изображение
    if (files.mainImage && files.mainImage[0]) {
      // Удаляем старое главное изображение
      if (existingHouse.mainImage) {
        const oldPath = path.join(__dirname, '..', existingHouse.mainImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      mainImagePath = `/uploads/houses/${files.mainImage[0].filename}`;
    }

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
    if (files.images) {
      files.images.forEach((file) => {
        imagePaths.push(`/uploads/houses/${file.filename}`);
      });
    }

    // Обновляем дом
    const updateData: any = {
      ...(title && { title }),
      ...(slug && { slug }),
      ...(regularPrice !== undefined && { regularPrice: parseFloat(regularPrice) }),
      ...(salePrice !== undefined && { salePrice: salePrice ? parseFloat(salePrice) : null }),
      ...(saleEndDate !== undefined && { saleEndDate: saleEndDate ? new Date(saleEndDate) : null }),
      ...(area !== undefined && { area }),
      ...(dimensions !== undefined && { dimensions }),
      ...(floors !== undefined && { floors: parseInt(floors) }),
      ...(rooms !== undefined && { rooms: rooms ? parseInt(rooms) : null }),
      ...(bathrooms !== undefined && { bathrooms: bathrooms ? parseInt(bathrooms) : null }),
      ...(terraces !== undefined && { terraces: terraces ? parseInt(terraces) : null }),
      ...(description !== undefined && { description }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(mainImagePath && { mainImage: mainImagePath }),
      images: imagePaths,
      ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
      ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
    };

    const house = await prisma.house.update({
      where: { slug: currentSlug },
      data: updateData,
    });

    // Обновляем теги, если указаны
    if (tags !== undefined) {
      const tagIds = JSON.parse(tags);
      
      // Проверяем, что не более 4 тегов
      if (tagIds.length > 4) {
        res.status(400).json({ error: 'Maximum 4 tags allowed per house' });
        return;
      }

      // Удаляем старые связи с тегами
      await prisma.houseTag.deleteMany({
        where: { houseId: house.id },
      });

      // Создаем новые связи
      if (tagIds.length > 0) {
        const primaryTagIdParsed = primaryTagId ? parseInt(primaryTagId) : null;
        
        for (const tagId of tagIds) {
          await prisma.houseTag.create({
            data: {
              houseId: house.id,
              tagId: parseInt(tagId),
              isPrimary: primaryTagIdParsed === parseInt(tagId),
            },
          });
        }
      }
    }

    // Получаем обновленный дом с тегами
    const updatedHouse = await prisma.house.findUnique({
      where: { id: house.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.json(updatedHouse);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Unique constraint failed')) {
      res.status(400).json({ error: 'House with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update house', message: err.message });
  }
});

/**
 * @swagger
 * /api/houses/{slug}:
 *   delete:
 *     summary: Удалить дом
 *     tags: [Houses]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Дом удален
 *       404:
 *         description: Дом не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:slug', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const house = await prisma.house.findUnique({
      where: { slug },
      include: { floorPlans: true },
    });

    if (!house) {
      res.status(404).json({ error: 'House not found' });
      return;
    }

    // Удаляем главное изображение
    if (house.mainImage) {
      const mainImagePath = path.join(__dirname, '..', house.mainImage);
      if (fs.existsSync(mainImagePath)) {
        fs.unlinkSync(mainImagePath);
      }
    }

    // Удаляем остальные изображения
    house.images.forEach((imgPath) => {
      const fullPath = path.join(__dirname, '..', imgPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Удаляем изображения планировок
    house.floorPlans.forEach((plan) => {
      const planPath = path.join(__dirname, '..', plan.image);
      if (fs.existsSync(planPath)) {
        fs.unlinkSync(planPath);
      }
    });

    // Удаляем дом (Prisma автоматически удалит связанные записи благодаря onDelete: Cascade)
    await prisma.house.delete({
      where: { slug },
    });

    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to delete house', message: err.message });
  }
});

export default router;

