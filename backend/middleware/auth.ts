import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

export interface AuthRequest extends Request {
  adminId?: number;
  username?: string;
}

// Проверка сессии в базе данных
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получаем sessionId из заголовка или cookies
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (!sessionId) {
      res.status(401).json({ error: 'Unauthorized: Session ID is required' });
      return;
    }

    // Проверяем сессию в базе данных
    const session = await prisma.session.findUnique({
      where: { sessionId: String(sessionId) },
      include: { admin: true },
    });

    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid session' });
      return;
    }

    // Проверяем, не истекла ли сессия (24 часа)
    const now = new Date();
    if (session.expiresAt < now) {
      // Удаляем истекшую сессию
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ error: 'Unauthorized: Session expired' });
      return;
    }

    // Сохраняем информацию об админе в запросе
    req.adminId = session.adminId;
    req.username = session.admin.username;
    
    next();
  } catch (error) {
    const err = error as Error;
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

