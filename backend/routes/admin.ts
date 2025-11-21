import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { verifyPassword } from '../utils/password';

const router = Router();

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Вход администратора
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Логин админа
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Получаем админа из БД
    const admin = await prisma.admin.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Проверяем пароль с помощью Argon2
    const isValid = await verifyPassword(admin.passwordHash, password);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Создаем сессию и сохраняем в БД
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Сессия действительна 24 часа
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Сохраняем сессию в БД
    await prisma.session.create({
      data: {
        sessionId,
        adminId: admin.id,
        expiresAt,
      },
    });
    
    res.json({
      success: true,
      sessionId,
      message: 'Login successful'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/admin/check:
 *   get:
 *     summary: Проверка авторизации
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Статус авторизации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *       401:
 *         description: Не авторизован
 */
// Проверка авторизации
router.get('/check', async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (!sessionId) {
      res.status(401).json({ authenticated: false });
      return;
    }

    // Проверяем сессию в БД
    const session = await prisma.session.findUnique({
      where: { sessionId: String(sessionId) },
    });

    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }

    // Проверяем, не истекла ли сессия
    const now = new Date();
    if (session.expiresAt < now) {
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

export default router;

