import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { generateFilename } from '../utils/transliterate';

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
    // Получаем ФИО и должность из тела запроса
    const { fullName, position } = req.body;
    
    // Формируем имя файла: ivan-ivanov-director.jpg
    let filename = '';
    if (fullName && fullName.trim()) {
      const baseName = generateFilename(fullName, position);
      filename = `${baseName}${path.extname(file.originalname)}`;
    } else {
      // Если нет ФИО, используем timestamp
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
 *     summary: Получить всех сотрудников
 *     tags: [Staff]
 *     responses:
 *       200:
 *         description: Список сотрудников
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Staff'
 */
// Получить всех сотрудников
router.get('/', async (req: Request, res: Response) => {
  try {
    const staffPhotos = await prisma.staff.findMany({
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
 * /api/staff/{id}:
 *   get:
 *     summary: Получить сотрудника по ID
 *     tags: [Staff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные сотрудника
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPhoto'
 *       404:
 *         description: Сотрудник не найден
 */
// Получить одну фотографию персонала по ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffPhotoId = parseInt(id);
    
    const staffPhoto = await prisma.staff.findUnique({
      where: { id: staffPhotoId },
    });
    
    if (!staffPhoto) {
      res.status(404).json({ error: 'Staff photo not found' });
      return;
    }
    
    res.json(staffPhoto);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/staff:
 *   post:
 *     summary: Добавить сотрудника (только для админа)
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
 *               - fullName
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Фотография сотрудника
 *               fullName:
 *                 type: string
 *                 example: Иван Иванов
 *                 description: Полное ФИО сотрудника
 *               position:
 *                 type: string
 *                 example: Директор
 *                 description: Должность сотрудника
 *     responses:
 *       201:
 *         description: Сотрудник добавлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPhoto'
 *       400:
 *         description: Ошибка валидации
 */
// Добавить сотрудника
router.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    
    const { fullName, position } = req.body;
    
    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: 'fullName is required' });
      return;
    }
    
    const imageFilename = req.file.filename;
    
    // Получаем максимальный display_order
    const maxOrder = await prisma.staff.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    
    const staffPhoto = await prisma.staff.create({
      data: {
        fullName: fullName.trim(),
        position: position ? position.trim() : null,
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
 *     summary: Обновить данные сотрудника (только для админа)
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
 *                 description: Фотография сотрудника
 *               fullName:
 *                 type: string
 *                 example: Иван Иванов
 *                 description: Полное ФИО сотрудника
 *               position:
 *                 type: string
 *                 example: Директор
 *                 description: Должность сотрудника
 *               display_order:
 *                 type: integer
 *                 description: Порядок отображения
 *     responses:
 *       200:
 *         description: Данные сотрудника обновлены
 *       404:
 *         description: Сотрудник не найден
 */
// Обновить данные сотрудника
router.put('/:id', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffPhotoId = parseInt(id);
    const { fullName, position, display_order } = req.body;
    
    // Проверяем существование записи
    const existing = await prisma.staff.findUnique({
      where: { id: staffPhotoId },
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Staff photo not found' });
      return;
    }
    
    // Если загружено новое изображение, удаляем старое
    if (req.file) {
      const oldFile = path.join(__dirname, '../uploads/staff', existing.imageFilename);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }
    
    // Подготавливаем данные для обновления
    const updateData: {
      fullName?: string;
      position?: string | null;
      imageFilename?: string;
      displayOrder?: number;
    } = {};
    
    if (fullName !== undefined) {
      updateData.fullName = fullName.trim();
    }
    
    if (position !== undefined) {
      updateData.position = position ? position.trim() : null;
    }
    
    if (req.file) {
      updateData.imageFilename = req.file.filename;
    }
    
    if (display_order !== undefined) {
      updateData.displayOrder = parseInt(display_order);
    }
    
    // Обновляем запись
    const staffPhoto = await prisma.staff.update({
      where: { id: staffPhotoId },
      data: updateData,
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
 *     summary: Удалить сотрудника (только для админа)
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
 *         description: Сотрудник удален
 *       404:
 *         description: Сотрудник не найден
 */
// Удалить сотрудника
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffPhotoId = parseInt(id);
    
    // Получаем имя файла
    const staffPhoto = await prisma.staff.findUnique({
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
    await prisma.staff.delete({
      where: { id: staffPhotoId },
    });
    
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

