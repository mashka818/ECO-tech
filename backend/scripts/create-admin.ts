import { hashPassword } from '../utils/password';
import { prisma } from '../prisma/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Скрипт для создания/обновления админа
 * Использование: npm run create-admin
 */
async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'admin';
    
    console.log('Хэширование пароля...');
    const passwordHash = await hashPassword(password);
    
    console.log('Создание/обновление админа в БД...');
    const admin = await prisma.admin.upsert({
      where: { username },
      update: {
        passwordHash,
      },
      create: {
        username,
        passwordHash,
      },
    });
    
    console.log('✅ Админ успешно создан/обновлен!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Hash: ${passwordHash.substring(0, 50)}...`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();

