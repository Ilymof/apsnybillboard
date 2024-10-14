const { Op } = require('sequelize'); 
const {Ad, Photo, Category, Subcategory,Region} = require('../models/models')
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Импорт UUID
const fs = require('fs').promises;
const { switchKeyboardLayout } = require('./helper'); 
const cron = require('node-cron');
const dayjs = require('dayjs');
const sequelize = require('../db')

cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const expiredAds = await Ad.findAll({
      where: {
        expirationDate: { [Op.lt]: now },
        isActive: true
      }
    });

    for (let ad of expiredAds) {
      await ad.update({ isActive: false });
      console.log(`Объявление с id ${ad.id} деактивировано`);
    }
  } catch (error) {
    console.error('Ошибка при удалении просроченных объявлений:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 1);

    const adsToDelete = await Ad.findAll({
      where: {
        expirationDate: { [Op.lt]: thirtyDaysAgo },
        isActive: false
      }
    });

    for (let ad of adsToDelete) {
      await ad.destroy();
      console.log(`Объявление с id ${ad.id} удалено`);
    }
  } catch (error) {
    console.error('Ошибка при удалении старых объявлений:', error);
  }
});


class AdController 
{
   
  async AdCreate(req, res) {
    try {
      
      const userId = req.user.id;
      let { adName, description, price, regionId, categoryId, subcategoryId, duration  } = req.body;
  
       // duration — количество дней, на которые активно объявление (от 7 до 180 дней)
      if (duration < 7 || duration > 180) {
        return res.status(400).json({ message: "Неверная продолжительность действия объявления" });
      }

      const now = dayjs();
      const expirationDate = now.add(duration, 'day');

      // Проверяем наличие изображений
      if (!req.files || !req.files.images || req.files.images.length === 0) {
        return res.status(400).json({ message: "Необходимо загрузить хотя бы одно изображение" });
      }
  
      // Проверяем наличие категории
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ message: "Категория не найдена" });
      }
  
      // Проверяем наличие подкатегории
      const subcategory = await Subcategory.findOne({ where: { id: subcategoryId, categoryId } });
      if (!subcategory) {
        return res.status(400).json({ message: "Подкатегория не найдена или не принадлежит выбранной категории" });
      }
  
      // Создаем объявление
      const ad = await Ad.create({ adName, description, price, regionId, categoryId, subcategoryId, userId, expirationDate });
  
      // Массив для изображений
      let images = req.files.images;
  
      // Если images - это не массив (если одно изображение), превращаем его в массив
      if (!Array.isArray(images)) {
        images = [images];
      }
  
      // Обрабатываем каждое изображение
      for (let image of images) {
        let fileName = uuidv4() + path.extname(image.name);
        const imagePath = path.resolve(__dirname, '..', 'static', fileName);
  
        // Перемещаем файл в директорию 'static'
        await image.mv(imagePath);
  
        // Сохраняем информацию о фото в базе данных и связываем его с объявлением
        await Photo.create({
          url: fileName,
          adId: ad.id
        });
      }
  
      // Возвращаем объявление с фотографиями
      const adWithPhotos = await Ad.findByPk(ad.id, {
        include: { model: Photo, as: 'photos' }
      });
  
      return res.status(201).json(adWithPhotos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Не удалось создать объявление", error: error.message });
    }
  }
   
  async GetAllAd(req, res) { 

      // Преобразуем запрос пользователя, введённый на английской раскладке, в русскую раскладку
      
    try {
      const { adName, categoryName,subcategoryName ,regionName, minPrice, maxPrice } = req.query;
      const switchedQuery = adName ? switchKeyboardLayout(adName) : '';
      const whereConditions = {};
  
      // Фильтрация по названию объявления (частичное совпадение)
      if (adName) {
        whereConditions.adName = {
            [Op.or]: [
                { [Op.iLike]: `%${adName}%` },         // Оригинальный запрос
                { [Op.iLike]: `%${switchedQuery}%` }  // Преобразованный запрос
            ]
        };
    }
  
      // Фильтрация по категории
      if (categoryName) {
        whereConditions['$category.categoryName$'] = categoryName;
      }
  
      // Фильтрация по региону
      if (regionName) {
        whereConditions['$region.regionName$'] = regionName;
      }
      // Фильтрация по подкатегориям
      if (subcategoryName) {
        whereConditions['$subcategory.subcategoryName$'] = subcategoryName;
      }
  
      // Фильтрация по минимальной и максимальной цене
      if (minPrice || maxPrice) {
        whereConditions.price = {};
        if (minPrice) {
          whereConditions.price[Op.gte] = minPrice; // Цена >= minPrice
        }
        if (maxPrice) {
          whereConditions.price[Op.lte] = maxPrice; // Цена <= maxPrice
        }
      }
  
      let ads = await Ad.findAll({
        where: whereConditions,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['categoryName'],
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['subcategoryName'],
          },
          {
            model: Region,
            as: 'region',
            attributes: ['regionName'],
          },
          {
            model: Photo,
            as: 'photos',
            attributes: ['url'],
          }
        ],
        attributes: ['adName', 'description', 'price']
      });
  
      if (!ads || !ads.length) {
        return res.status(204).json({ message: "Объявления не найдены" });
      }
  
      // Преобразование структуры данных
      const transformedAds = ads.map(ad => ({
        adName: ad.adName,
        description: ad.description,
        price: ad.price,
        category: ad.category.categoryName,
        subcategory: ad.subcategory.subcategoryName,
        region: ad.region.regionName,
        photos: ad.photos.map(photo => ({
          url: photo.url
        }))
      }));
  
      return res.status(200).json(transformedAds);
    } catch (error) {
      console.error('Ошибка при получении объявлений:', error);
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  }
    
  async getOne(req, res) {
    try {
      const { adId } = req.params;
  
      console.log('Получение объявления с ID:', adId);
  
      const ad = await Ad.findByPk(adId, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['categoryName'],
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['subcategoryName'],
          },
          {
            model: Region,
            as: 'region',
            attributes: ['regionName'],
          },
          {
            model: Photo,
            as: 'photos',
            attributes: ['url'],
          }
        ],
        attributes: ['adName', 'description', 'price']
      });
  
      if (!ad) {
        console.log('Объявление не найдено');
        return res.status(404).json({ message: "Объявление не найдено" });
      }
  
      // Форматируем данные для вывода
      const formattedAd = {
        adName: ad.adName,
        description: ad.description,
        price: ad.price,
        category: ad.category?.categoryName || null,
        subcategory: ad.subcategory?.subcategoryName || null,
        region: ad.region?.regionName || null,
        photos: ad.photos.map(photo => ({
          url: photo.url
        }))
      };
  
      return res.status(200).json(formattedAd);
    } catch (error) {
      console.error('Ошибка при получении объявления:', error);
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  }

  async clearAllAds(req, res) {
    const transaction = await sequelize.transaction(); // Начало транзакции

  try {
    console.log('Начало очистки всех объявлений и фотографий');

    // Находим все объявления с их фотографиями
    const ads = await Ad.findAll({
      include: { model: Photo, as: 'photos' },
      transaction
    });

    // Проверяем, есть ли объявления
    if (!ads || ads.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Объявления не найдены' });
    }

    // Собираем все URL фотографий из всех объявлений
    const allPhotoUrls = ads.flatMap(ad => ad.photos.map(photo => photo.url));

    // Создаём массив промисов для удаления файлов
    const deleteFilePromises = allPhotoUrls.map(async (url) => {
      const filePath = path.resolve(__dirname, '..', 'static', url);
      try {
        await fs.unlink(filePath);
        console.log(`Файл удалён: ${filePath}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Файл не найден, можно игнорировать
          console.log(`Файл не найден, пропуск: ${filePath}`);
        } else {
          // Другие ошибки
          console.error(`Ошибка при удалении файла ${filePath}:`, error);
          throw error; // Прекращаем выполнение при критической ошибке
        }
      }
    });

    // Ожидаем завершения всех операций удаления файлов
    await Promise.all(deleteFilePromises);

    // Удаляем все записи фотографий из базы данных и сбрасываем автоинкремент
    await Photo.truncate({ cascade: true, restartIdentity: true, transaction });
    console.log('Все записи фотографий удалены из базы данных и индексы сброшены');

    // Удаляем все объявления из базы данных и сбрасываем автоинкремент
    await Ad.truncate({ cascade: true, restartIdentity: true, transaction });
    console.log('Все объявления удалены из базы данных и индексы сброшены');

    // Фиксируем транзакцию
    await transaction.commit();

    // Отправляем успешный ответ клиенту
    return res.status(200).json({ message: 'Объявления и фотографии успешно удалены и индексы сброшены' });
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await transaction.rollback();
    console.error('Ошибка при удалении объявлений и фотографий:', error);
    return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
  }

  async delOneAd(req,res)
  {
    try {
      const { id } = req.params; // Получаем id объявления из запроса
  
      // Находим объявление
      const ad = await Ad.findByPk(id, {
        include: { model: Photo, as: 'photos' }
      });
  
      if (!ad) {
        return res.status(404).json({ message: 'Объявление не найдено' });
      }
  
      // Удаляем фотографии с файловой системы
      for (let photo of ad.photos) {
        const filePath = path.resolve(__dirname, '..', 'static', photo.url);
        
        // Проверяем, существует ли файл, и удаляем его
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Удаление файла
        }
      }
  
      // Удаляем фотографии из базы данных
      await Photo.destroy({ where: { adId: ad.id } });
  
      // Удаляем объявление
      await Ad.destroy({ where: { id: ad.id } });
  
      return res.status(200).json({ message: 'Объявление и фотографии удалены' });
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  async deleteAd(req, res) {
    try {
      const { id } = req.params; // Получаем id объявления из запроса
      const userId = req.user.id; // Получаем id пользователя из токена (authMiddleware уже добавляет req.user)
  
      // Находим объявление
      const ad = await Ad.findByPk(id, {
        include: { model: Photo, as: 'photos' }
      });
  
      if (!ad) {
        return res.status(404).json({ message: 'Объявление не найдено' });
      }
  
      // Проверяем, принадлежит ли объявление пользователю
      if (ad.userId !== userId) {
        return res.status(403).json({ message: 'Нет доступа. Вы можете удалять только свои объявления.' });
      }
  
      // Удаляем фотографии с файловой системы
      for (let photo of ad.photos) {
        const filePath = path.resolve(__dirname, '..', 'static', photo.url);
        
        // Проверяем, существует ли файл, и удаляем его
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Удаление файла
        }
      }
  
      // Удаляем фотографии из базы данных
      await Photo.destroy({ where: { adId: ad.id } });
  
      // Удаляем объявление
      await Ad.destroy({ where: { id: ad.id } });
  
      return res.status(200).json({ message: 'Объявление и фотографии удалены' });
    } catch (error) {
      console.error('Ошибка при удалении объявления:', error);
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
}
async extendAd(req, res) {
  try {
    const adId = req.params.id; // Получаем id из параметров URL
    const { extensionDays } = req.body; // Получаем количество дней для продления из тела запроса

    if (!extensionDays || extensionDays < 7 || extensionDays > 180) {
      return res.status(400).json({ message: "Неверное количество дней для продления (от 7 до 180)" });
    }

    const ad = await Ad.findByPk(adId);

    if (!ad) {
      return res.status(404).json({ message: "Объявление не найдено" });
    }

    // Проверяем, что пользователь является владельцем объявления
    if (ad.userId !== req.user.id) { // Предполагается, что authMiddleware добавляет `user` в `req`
      return res.status(403).json({ message: "У вас нет прав для продления этого объявления" });
    }

    const now = new Date();
    const daysLeft = Math.ceil((ad.expirationDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft > 3) {
      return res.status(400).json({ message: "Объявление можно продлить только если осталось менее 3 дней" });
    }

    // Продлеваем объявление
    ad.expirationDate = new Date(ad.expirationDate);
    ad.expirationDate.setDate(ad.expirationDate.getDate() + extensionDays);
    await ad.save();

    return res.status(200).json({ message: "Объявление продлено", newExpirationDate: ad.expirationDate });
  } catch (error) {
    console.error('Ошибка при продлении объявления:', error);
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
}
async AdUpdate(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params; // ID объявления для редактирования
    let { adName, description, price, regionId, categoryId, subcategoryId, duration } = req.body;

    // duration — количество дней, на которые активно объявление (от 7 до 180 дней)
    if (duration && (duration < 7 || duration > 180)) {
      return res.status(400).json({ message: "Неверная продолжительность действия объявления" });
    }

    // Ищем объявление по ID и проверяем, что оно принадлежит текущему пользователю
    const ad = await Ad.findOne({ where: { id, userId }, include: { model: Photo, as: 'photos' } });
    if (!ad) {
      return res.status(404).json({ message: "Объявление не найдено или доступ запрещен" });
    }

    // Проверяем наличие категории
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ message: "Категория не найдена" });
      }
    }

    // Проверяем наличие подкатегории
    if (subcategoryId) {
      const subcategory = await Subcategory.findOne({ where: { id: subcategoryId, categoryId } });
      if (!subcategory) {
        return res.status(400).json({ message: "Подкатегория не найдена или не принадлежит выбранной категории" });
      }
    }

    // Обновляем поля объявления
    ad.adName = adName || ad.adName;
    ad.description = description || ad.description;
    ad.price = price || ad.price;
    ad.regionId = regionId || ad.regionId;
    ad.categoryId = categoryId || ad.categoryId;
    ad.subcategoryId = subcategoryId || ad.subcategoryId;

    // Обновляем дату истечения действия, если передано новое значение
    if (duration) {
      const now = dayjs();
      ad.expirationDate = now.add(duration, 'day');
    }

    // Проверяем наличие новых изображений
    if (req.files && req.files.images && req.files.images.length > 0) {
      let images = req.files.images;

      // Если images — это не массив (если одно изображение), превращаем его в массив
      if (!Array.isArray(images)) {
        images = [images];
      }

      // Удаляем старые изображения
      for (let oldPhoto of ad.photos) {
        const oldImagePath = path.resolve(__dirname, '..', 'static', oldPhoto.url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Удаляем файл
        }
        await oldPhoto.destroy(); // Удаляем запись из базы данных
      }

      // Добавляем новые изображения
      for (let image of images) {
        let fileName = uuidv4() + path.extname(image.name);
        const imagePath = path.resolve(__dirname, '..', 'static', fileName);

        // Перемещаем файл в директорию 'static'
        await image.mv(imagePath);

        // Сохраняем информацию о фото в базе данных и связываем его с объявлением
        await Photo.create({
          url: fileName,
          adId: ad.id
        });
      }
    }

    // Сохраняем изменения объявления
    await ad.save();

    // Возвращаем обновленное объявление с новыми фотографиями
    const updatedAd = await Ad.findByPk(ad.id, {
      include: { model: Photo, as: 'photos' }
    });

    return res.status(200).json(updatedAd);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Не удалось обновить объявление", error: error.message });
  }
}
async GetUserAd(req, res) { 
  // Получаем userId из расшифрованного токена
  const userId = req.user.id;
  console.log('User ID from token:', userId);
  
  try {
    // Проверка наличия userId
    if (!userId) {
      return res.status(400).json({ message: "Некорректный идентификатор пользователя" });
    }

    let ads = await Ad.findAll({
      where: { userId }, // Используем userId из токена
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['categoryName'],
        },
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['subcategoryName'],
        },
        {
          model: Region,
          as: 'region',
          attributes: ['regionName'],
        },
        {
          model: Photo,
          as: 'photos',
          attributes: ['url'],
        }
      ],
      attributes: ['adName', 'description', 'price']
    });

    if (!ads || ads.length === 0) {
      return res.status(404).json({ message: "Объявления не найдены" });
    }

    // Преобразование структуры данных
    const transformedAds = ads.map(ad => ({
      adName: ad.adName,
      description: ad.description,
      price: ad.price,
      category: ad.category ? ad.category.categoryName : null,
      subcategory: ad.subcategory ? ad.subcategory.subcategoryName : null,
      region: ad.region ? ad.region.regionName : null,
      photos: ad.photos.map(photo => ({
        url: photo.url
      }))
    }));

    return res.status(200).json(transformedAds);
  } catch (error) {
    console.error('Ошибка при получении объявлений:', error);
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
}

}


module.exports = new AdController()