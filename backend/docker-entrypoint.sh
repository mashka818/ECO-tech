#!/bin/sh
set -e

echo "🚀 Starting backend application..."

# Применяем миграции Prisma
echo "📦 Applying Prisma migrations..."
npx prisma migrate deploy || echo "⚠️  No migrations to apply or migration already applied"

# Генерируем Prisma Client (на случай если он не был сгенерирован)
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Запускаем приложение
echo "✅ Starting Node.js application..."
exec "$@"

