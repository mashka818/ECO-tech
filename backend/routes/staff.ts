import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';

const router = Router();

// Настройка multer для фотографий персонала
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/staff');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Получаем имя и фамилию из тела запроса
    const { firstName, lastName, position } = req.body;
    
    // Формируем имя файла: ivan-ivanov-director.jpg
    let filename = '';
    if (firstName && lastName) {
      const namePart = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
      const positionPart = position ? `-${position.toLowerCase().replace(/\s+/g, '-')}` : '';
      filename = `${namePart}${positionPart}${path.extname(file.originalname)}`;
    } else {
      // Если нет имени, используем timestamp
      filename = `staff-${Date.now()}${path.extname(file.originalname)}`;
    }
    
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * @swagger
 * /api/staff:
 *   get:
 *     summary: Получить все фотографии персонала
 *     tags: [Staff]
 *     responses:
 *       200:
 *         description: Список фотографий персонала
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StaffPhoto'
 */
// Получить все фотографии персонала
router.get('/', async (req: Request, res: Response) => {
  try {
    const staffPhotos = await prisma.staffPhoto.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    });
    
    res.json(staffPhotos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/staff:
 *   post:
 *     summary: Добавить фотографию персонала (только для админа)
 *     tags: [Staff]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *               - firstName
 *               - lastName
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               firstName:
 *                 type: string
 *                 example: Иван
 *               lastName:
 *                 type: string
 *                 example: Иванов
 *               position:
 *                 type: string
 *                 example: Директор
 *     responses:
 *       201:
 *         description: Фотография добавлена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPhoto'
 *       400:
 *         description: Ошибка валидации
 */
// Добавить фотографию персонала
router.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    
    const { firstName, lastName, position } = req.body;
    const name = `${firstName} ${lastName}`.trim();
    const imageFilename = req.file.filename;
    
    // Получаем максимальный display_order
    const maxOrder = await prisma.staffPhoto.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    
    const staffPhoto = await prisma.staffPhoto.create({
      data: {
        name,
        position: position || null,
        imageFilename,
        displayOrder,
      },
    });
    
    res.status(201).json(staffPhoto);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     summary: Обновить фотографию персонала (только для админа)
 *     tags: [Staff]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               position:
 *                 type: string
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Фотография обновлена
 *       404:
 *         description: Фотография не найдена
 */
// Обновить фотографию персонала
router.put('/:id', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffPhotoId = parseInt(id);
    const { firstName, lastName, position, display_order } = req.body;
    const name = firstName && lastName ? `${firstName} ${lastName}`.trim() : undefined;
    
    // Проверяем существование записи
    const existing = await prisma.staffPhoto.findUnique({
      where: { id: staffPhotoId },
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Staff photo not found' });
      return;
    }
    
    // Если загружено новое изображение
    if (req.file) {
      // Удаляем старое изображение
      const oldFile = path.join(__dirname, '../uploads/staff', existing.imageFilename);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }
    
    // Обновляем запись
    const staffPhoto = await prisma.staffPhoto.update({
      where: { id: staffPhotoId },
      data: {
        ...(name && { name }),
        ...(position !== undefined && { position: position || null }),
        ...(req.file && { imageFilename: req.file.filename }),
        ...(display_order !== undefined && { displayOrder: parseInt(display_order) }),
      },
    });
    
    res.json(staffPhoto);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   delete:
 *     summary: Удалить фотографию персонала (только для админа)
 *     tags: [Staff]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Фотография удалена
 *       404:
 *         description: Фотография не найдена
 */
// Удалить фотографию персонала
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffPhotoId = parseInt(id);
    
    // Получаем имя файла
    const staffPhoto = await prisma.staffPhoto.findUnique({
      where: { id: staffPhotoId },
      select: { imageFilename: true },
    });
    
    if (!staffPhoto) {
      res.status(404).json({ error: 'Staff photo not found' });
      return;
    }
    
    // Удаляем файл
    const filePath = path.join(__dirname, '../uploads/staff', staffPhoto.imageFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Удаляем запись из БД
    await prisma.staffPhoto.delete({
      where: { id: staffPhotoId },
    });
    
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

