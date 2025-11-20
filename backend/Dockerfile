# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код TypeScript
COPY . .

# Создаем директорию для uploads если её нет
RUN mkdir -p uploads

# Устанавливаем права на uploads
RUN chmod -R 755 uploads

# Компилируем TypeScript
RUN npm run build

# Открываем порт
EXPOSE 3000

# Команда запуска приложения
CMD ["npm", "start"]

