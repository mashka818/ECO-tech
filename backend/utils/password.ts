import argon2 from 'argon2';

/**
 * Хэширование пароля с использованием Argon2
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 итерации
      parallelism: 4, // 4 потока
    });
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Проверка пароля с использованием Argon2
 */
export const verifyPassword = async (
  hashedPassword: string,
  plainPassword: string
): Promise<boolean> => {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch (error) {
    return false;
  }
};

