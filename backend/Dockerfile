# Используем официальный образ Node.js (Debian для лучшей совместимости с Prisma)
FROM node:18-slim

# Устанавливаем необходимые библиотеки для Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Устанавливаем зависимости
RUN npm install

# Генерируем Prisma Client
RUN npm run prisma:generate

# Копируем исходный код TypeScript
COPY . .

# Создаем директорию для uploads если её нет
RUN mkdir -p uploads

# Устанавливаем права на uploads
RUN chmod -R 755 uploads

# Компилируем TypeScript (должно быть после копирования всех файлов)
RUN npm run build

# Проверка, что dist создан
RUN ls -la dist/ || echo "WARNING: dist directory not found"

# Открываем порт
EXPOSE 3000

# Команда запуска приложения
CMD ["npm", "start"]

