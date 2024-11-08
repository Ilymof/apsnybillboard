const {Subcategory, Category } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')
class SubcategoryController {
async addSubcategory(req, res) {
  const { categoryName, subcategories, path, pathSubcategory } = req.body; // pathSubcategory - массив путей для подкатегорий
  try {
    // Проверяем, существует ли уже категория
    let category = await Category.findOne({ where: { categoryName } });

    if (!category) {
      // Создаём новую категорию
      category = await Category.create({ categoryName, path });
    }

    // Создаём подкатегории, если они переданы и являются массивом
    if (Array.isArray(subcategories) && subcategories.length > 0) {
      for (let i = 0; i < subcategories.length; i++) {
        const subcategoryName = subcategories[i];
        const subcategoryPath = pathSubcategory[i]; // Берём соответствующий путь для подкатегории

        // Проверяем, существует ли подкатегория для этой категории
        let subcategory = await Subcategory.findOne({
          where: {
            subcategoryName,
            categoryId: category.id,
          }
        });

        if (!subcategory) {
          // Создаём новую подкатегорию
          subcategory = await Subcategory.create({
            subcategoryName,
            categoryId: category.id,
            path: subcategoryPath // Обновлено: правильно присваиваем путь подкатегории
          });
          console.log(`Создана: ${subcategoryName} в категории: ${categoryName}`);
        } else {
          console.log(`Подкатегория уже существует: ${subcategoryName} в категории: ${categoryName}`);
        }
      }
    }

    res.status(201).json({ message: 'Категория и подкатегории созданы успешно' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании категории или подкатегории:', error: error.message });
  }
 
   }

async getSubcategories(req, res) {
  try {
    const subcategory = await Subcategory.findAll({attributes: { exclude: ['createdAt', 'updatedAt'] }});

  res.status(200).json(subcategory);
} catch (error) {
  res.status(400).json({ error: error.message });
  console.error('Ошибка при получении подкатегорий:', error);
}
}

async clearSubcategoryList(req, res) {
  try {
    await Subcategory.truncate({ cascade: true, restartIdentity: true });
  res.status(200).json({ message: 'Subcategory cleared and auto-increment reset.' });
} catch (error) {
  res.status(400).json({ error: error.message });
  console.error('Failed to clear Ad:', error);
}
}
async SubcategoryUpdate(req, res) {
  const { id } = req.params;
  const { subcategoryName, path } = req.body; // Добавьте другие атрибуты, которые хотите обновлять

  try {
    // Поиск подкатегории по ID
    const subcategory = await Subcategory.findOne({ where: { id } });

    if (!subcategory) {
      return res.status(404).json({ message: "Подкатегория не найдена или доступ запрещен" });
    }

    // Обновляем только те поля, которые переданы
    if (subcategoryName !== undefined) {
      subcategory.subcategoryName = subcategoryName;
    }

    if (path !== undefined) {
      subcategory.path = path;
    }

    // Сохранение изменений
    await subcategory.save();

    // Возврат обновлённой подкатегории
    return res.status(200).json({
      message: "Подкатегория успешно обновлена",
      subcategory: {
        id: subcategory.id,
        subcategoryName: subcategory.subcategoryName,
        path: subcategory.path, // Возвращаем обновлённые данные
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении подкатегории:', error);
    return res.status(500).json({ message: "Не удалось обновить подкатегорию", error: error.message });
  }
}
}

  module.exports = new SubcategoryController()