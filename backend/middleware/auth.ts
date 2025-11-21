import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  adminId?: number;
  username?: string;
}

// Простая проверка сессии (можно улучшить с JWT)
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Проверка сессии (простая версия - можно улучшить)
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (!sessionId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // В реальном приложении здесь должна быть проверка сессии в БД
    // Для простоты проверяем наличие заголовка
    // TODO: Реализовать проверку сессии в БД
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

