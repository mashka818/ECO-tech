/**
 * Транслитерация русского текста в латиницу
 * Конвертирует ФИО в формат для имени файла: "Иван Иванов Директор" -> "ivan-ivanov-director"
 */
export function transliterate(text: string): string {
  const transliterationMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .toLowerCase();
}

/**
 * Конвертирует ФИО и должность в имя файла
 * Пример: "Иван Иванов", "Директор" -> "ivan-ivanov-director"
 * 
 * Для изображений (с расширением):
 * generateFilename("Иван Иванов", ".jpg") -> "ivan-ivanov-<timestamp>.jpg"
 */
export function generateFilename(fullName: string, extension?: string | null): string {
  // Если передано расширение файла (начинается с точки), это запрос для файла изображения
  if (extension && extension.startsWith('.')) {
    const timestamp = Date.now();
    const namePart = transliterate(fullName.trim())
      .replace(/\s+/g, '-')  // Заменяем пробелы на дефисы
      .replace(/[^a-z0-9-]/g, '')  // Удаляем все кроме букв, цифр и дефисов
      .replace(/-+/g, '-')  // Убираем множественные дефисы
      .replace(/^-|-$/g, '');  // Убираем дефисы в начале и конце
    
    return `${namePart}-${timestamp}${extension}`;
  }

  // Старая логика для ФИО + должность (обратная совместимость)
  const position = extension; // второй параметр может быть должностью
  
  // Транслитерируем ФИО
  const namePart = transliterate(fullName.trim())
    .replace(/\s+/g, '-')  // Заменяем пробелы на дефисы
    .replace(/[^a-z0-9-]/g, '')  // Удаляем все кроме букв, цифр и дефисов
    .replace(/-+/g, '-')  // Убираем множественные дефисы
    .replace(/^-|-$/g, '');  // Убираем дефисы в начале и конце

  // Транслитерируем должность, если указана
  let positionPart = '';
  if (position && position.trim() && !position.startsWith('.')) {
    positionPart = '-' + transliterate(position.trim())
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  return `${namePart}${positionPart}`;
}

/**
 * Генерирует slug из текста
 * Пример: "Дом из клееного бруса «Истра»" -> "dom-iz-kleenogo-brusa-istra"
 */
export function generateSlug(text: string): string {
  return transliterate(text.trim())
    .replace(/[«»"']/g, '')  // Удаляем кавычки
    .replace(/\s+/g, '-')  // Заменяем пробелы на дефисы
    .replace(/[^a-z0-9-]/g, '')  // Удаляем все кроме букв, цифр и дефисов
    .replace(/-+/g, '-')  // Убираем множественные дефисы
    .replace(/^-|-$/g, '');  // Убираем дефисы в начале и конце
}

