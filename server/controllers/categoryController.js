const {Category,Subcategory } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CategoryController {

async CreateCategory(req, res) {
    try {
        const { categoryName, path: categoryPath } = req.body;

        const image = req.files.image;

        // Генерируем уникальное имя файла
        const fileName = uuidv4() + path.extname(image.name);
        const imagePath = path.resolve(__dirname, '..', 'static','categories', fileName);

        // Перемещаем файл в директорию 'static/categories'
        await image.mv(imagePath);

        // Создаём категорию и сохраняем путь к изображению
        const category = await Category.create({
            categoryName,
            path: categoryPath,
            image: `${fileName}`, // Сохраняем путь к файлу
        });

        res.status(201).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не удалось создать категорию", error: error.message });
    }
}
async clearCategoryList(req, res) {
    const t = await sequelize.transaction(); // Открываем транзакцию

    try {
        // Получаем все категории с изображениями
        const categories = await Category.findAll({ attributes: ['image'], transaction: t });

        // Удаляем файлы изображений категорий
        for (const category of categories) {
            if (category.image) {
                const imagePath = path.resolve(__dirname, '..', 'static', category.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath); // Удаляем файл
                }
            }
        }

        // Удаляем все подкатегории и категории
        await Subcategory.destroy({ where: {}, truncate: true, cascade: true }, { transaction: t });
        await Category.destroy({ where: {}, truncate: true, cascade: true }, { transaction: t });

        // Сбрасываем последовательности для таблиц categories и subcategories
        await sequelize.query("ALTER SEQUENCE categories_id_seq RESTART WITH 1;", { transaction: t });
        await sequelize.query("ALTER SEQUENCE subcategories_id_seq RESTART WITH 1;", { transaction: t });

        // Если всё успешно, коммитим транзакцию
        await t.commit();

        res.status(200).json({ message: 'Categories, subcategories, and images deleted, IDs reset' });
    } catch (error) {
        // В случае ошибки откатываем транзакцию
        await t.rollback();
        console.error('Error deleting categories, subcategories, or images:', error);
        res.status(500).json({ message: 'Failed to delete categories, subcategories, or images' });
    }
}
async getAll(req, res) {
    try {
      const categories = await Category.findAll({
          attributes: ['id', 'categoryName', 'path', 'image'], // Добавляем поле image
          include: [
              {
                  model: Subcategory,
                  as: 'subcategories',
                  attributes: ['id', 'subcategoryName', 'path'], // Подкатегории без image
              }
          ]
      });

      // Преобразуем категории и подкатегории
      const result = categories.map(category => ({
          id: category.id,
          categoryName: category.categoryName,
          path: category.path,
          image: category.image || null, // Возвращаем название файла изображения или null
          subcategories: category.subcategories.map(sub => ({
              id: sub.id,
              subcategoryName: sub.subcategoryName,
              path: sub.path,
          }))
      }));

      res.status(200).json(result);
  } catch (error) {
      console.error('Error fetching categories and subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch categories and subcategories' });
  }
}
async GetOneCategoryWithSub (req, res) {
        const { id } = req.params; // Получаем ID из параметров запроса

      try {
        const category = await Category.findOne({
          where: { id }, // Фильтруем по ID категории
          attributes: ['id', 'categoryName', 'path', 'image'], // Включаем изображение категории
          include: [
            {
              model: Subcategory,
              as: 'subcategories',
              attributes: ['id', 'subcategoryName', 'path'], // Данные подкатегорий
            },
          ],
        });

        if (!category) {
          return res.status(404).json({ message: 'Категория не найдена' });
        }

        // Преобразуем данные категории и её подкатегорий
        const result = {
          id: category.id,
          categoryName: category.categoryName,
          path: category.path,
          image: category.image ? category.image : null, // Обработка изображения категории
          subcategories: category.subcategories.map(sub => ({
            id: sub.id,
            subcategoryName: sub.subcategoryName,
            path: sub.path,
          })),
        };

        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching category by ID:', error);
        res.status(500).json({ message: 'Ошибка при получении категории', error: error.message });
      }
}
 async сategoryUpdate(req, res) {
  const { id } = req.params;
  const { categoryName, path } = req.body; // Поля для обновления
  const newImage = req.file; // Новое изображение (если загружено)

  try {
    // Поиск категории по ID
    const category = await Category.findOne({ where: { id } });
    if (!category) {
      return res.status(404).json({ message: "Категория не найдена или доступ запрещен" });
    }

    // Обновление полей категории (если они переданы)
    if (categoryName !== undefined) {
      category.categoryName = categoryName;
    }
    if (path !== undefined) {
      category.path = path;
    }

    // Обработка изображения, если оно передано
    if (newImage) {
      const oldImagePath = path.resolve(__dirname, '..', 'static', category.image);
      
      // Удаляем старое изображение, если оно существует
      if (category.image && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }

      // Сохраняем новое изображение
      const newFileName = `${uuidv4()}${path.extname(newImage.originalname)}`;
      const newImagePath = path.resolve(__dirname, '..', 'static', newFileName);
      fs.writeFileSync(newImagePath, newImage.buffer); // Записываем новый файл
      category.image = newFileName; // Сохраняем имя файла в базу
    }

    // Сохраняем изменения
    await category.save();

    // Возвращаем обновлённую категорию
    return res.status(200).json({
      message: "Категория успешно обновлена",
      category: {
        id: category.id,
        categoryName: category.categoryName,
        path: category.path,
        image: category.image
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении категории:', error);
    return res.status(500).json({ message: "Не удалось обновить категорию", error: error.message });
  }
}
}

module.exports = new CategoryController()
