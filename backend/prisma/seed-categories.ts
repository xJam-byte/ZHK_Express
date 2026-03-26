import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Создаём категории...');

  // 1. Создаём категории
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Молочные продукты' },
      update: {},
      create: { name: 'Молочные продукты', nameEn: 'Dairy', nameKk: 'Сүт өнімдері' },
    }),
    prisma.category.upsert({
      where: { name: 'Хлебобулочные изделия' },
      update: {},
      create: { name: 'Хлебобулочные изделия', nameEn: 'Bakery', nameKk: 'Нан өнімдері' },
    }),
    prisma.category.upsert({
      where: { name: 'Яйца' },
      update: {},
      create: { name: 'Яйца', nameEn: 'Eggs', nameKk: 'Жұмыртқа' },
    }),
    prisma.category.upsert({
      where: { name: 'Сыры' },
      update: {},
      create: { name: 'Сыры', nameEn: 'Cheese', nameKk: 'Ірімшік' },
    }),
    prisma.category.upsert({
      where: { name: 'Фрукты' },
      update: {},
      create: { name: 'Фрукты', nameEn: 'Fruits', nameKk: 'Жемістер' },
    }),
    prisma.category.upsert({
      where: { name: 'Овощи' },
      update: {},
      create: { name: 'Овощи', nameEn: 'Vegetables', nameKk: 'Көкөністер' },
    }),
  ]);

  const [dairy, bakery, eggs, cheese, fruits, vegetables] = categories;

  console.log(`✅ Создано/найдено ${categories.length} категорий:`);
  categories.forEach((c) => console.log(`   - ${c.name} (id: ${c.id})`));

  // 2. Привязываем продукты к категориям
  const productCategoryMap: Record<string, number> = {
    'Молоко 1л': dairy.id,
    'Кефир 1л': dairy.id,
    'Масло сливочное': dairy.id,
    'Хлеб белый': bakery.id,
    'Яйца 10шт': eggs.id,
    'Сыр Голландский': cheese.id,
    'Банан 1кг': fruits.id,
    'Помидоры 1кг': vegetables.id,
  };

  console.log('\n🔄 Привязываем продукты к категориям...');

  for (const [productName, categoryId] of Object.entries(productCategoryMap)) {
    const product = await prisma.product.findUnique({ where: { name: productName } });
    if (product) {
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId },
      });
      const cat = categories.find((c) => c.id === categoryId);
      console.log(`   ✅ ${productName} → ${cat?.name}`);
    } else {
      console.log(`   ⚠️  Продукт "${productName}" не найден в базе, пропускаем`);
    }
  }

  // 3. Проверяем результат
  console.log('\n📋 Итоговая таблица:');
  const allProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: { id: 'asc' },
  });

  for (const p of allProducts) {
    console.log(`   ${p.name} (${p.price}₸) → ${p.category?.name ?? '❌ Без категории'}`);
  }

  console.log('\n🎉 Готово!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
