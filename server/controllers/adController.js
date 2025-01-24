const { Op } = require('sequelize'); 
const {Ad, User, Photo, Category, Subcategory,Region} = require('../models/models')
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

cron.schedule('0 0 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 1);

    const adsToDelete = await Ad.findAll({
      where: {
        expirationDate: { [Op.lt]: thirtyDaysAgo },
        isActive: false
      },
      include: { model: Photo, as: 'photos' } // Включаем фотографии для удаления
    });

    for (let ad of adsToDelete) {
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
      await ad.destroy();
      console.log(`Объявление с id ${ad.id} и его фотографии удалены`);
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
      const { adName , regionId, minPrice, maxPrice } = req.query;
      const{categoryPath, subcategoryPath} = req.params;
      const switchedQuery = adName ? switchKeyboardLayout(adName) : '';
      const whereConditions = {};
      
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 7;
      const offset = (page - 1) * limit;

      // Фильтрация по названию объявления
      if (adName) {
        whereConditions.adName = {
            [Op.or]: [
                { [Op.iLike]: `%${adName}%` },         
                { [Op.iLike]: `%${switchedQuery}%` }
            ]
        };
      }

      // Фильтрация по цене
      if (minPrice || maxPrice) {
        whereConditions.price = {};
        if (minPrice) {
          whereConditions.price[Op.gte] = minPrice;
        }
        if (maxPrice) {
          whereConditions.price[Op.lte] = maxPrice;
        }
      }
        // Считаем общее количество объявлений без пагинации
    const total = await Ad.count({
      where: whereConditions,
      include: [
        {
          model: Category,
          as: 'category',
          where: categoryPath ? { path: categoryPath } : {}, 
          required: !!categoryPath
        },
        {
          model: Subcategory,
          as: 'subcategory',
          where: subcategoryPath ? { path: subcategoryPath } : {}, 
          required: !!subcategoryPath
        },
        {
          model: Region,
          as: 'region',
          where: regionId ? { id: regionId } : {}, 
          required: !!regionId
        }
      ]
    });

      // Запрос с фильтрацией по категориям и регионам
      let ads = await Ad.findAll({
        where: whereConditions,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['categoryName'],
            where: categoryPath ? { path: categoryPath } : {}, 
            required: !!categoryPath 
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['subcategoryName'],
            where: subcategoryPath ? { path: subcategoryPath } : {}, 
            required: !!subcategoryPath
          },
          {
            model: Region,
            as: 'region',
            attributes: ['regionName'],
            where: regionId ? { id: regionId } : {},  
            required: !!regionId
          },
          {
            model: Photo,
            as: 'photos',
            attributes: ['url'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['firstName','lastName','telegram', 'whatsapp','phoneNumber'],
          }
        ],
        limit, // Пагинация
        offset, // Смещение
        attributes: ['id','adName', 'description', 'price', 'createdAt', 'updatedAt', ]
      });

      if (!ads || !ads.length) {
        return res.status(200).json({ ads: [] });
      }

      // Преобразование структуры данных
      const transformedAds = ads.map(ad => ({
        adId: ad.id,
        adName: ad.adName,
        description: ad.description,
        price: ad.price,
        category: ad.category?.categoryName,
        subcategory: ad.subcategory?.subcategoryName,
        region: ad.region?.regionName,
        dateOfPublication: ad.createdAt, 
        dateOfUpdate: ad.updatedAt,
        firstName: ad.user?.firstName,
        lastName: ad.user?.lastName,
        telegramlink: ad.user?.telegram ? `https://t.me/${ad.user.telegram.trim()}` : null, 
        whatsapplink: ad.user?.whatsapp ? `https://wa.me/${ad.user.whatsapp.replace(/[^0-9]/g, '')}` : null, 
        phonenumber: ad.user?.phoneNumber || null,
        photos: ad.photos.map(photo => ({
          url: photo.url
        }))
      }));

      return res.status(200).json({
        total, // Общее количество объявлений
        ads: transformedAds // Список объявлений
      });
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
          },
          {
            model: User,
            as: 'user',
            attributes: ['firstName','telegram', 'whatsapp','phoneNumber'],
          }
        ],
        attributes: ['id','adName', 'description', 'price']
      });
  
      if (!ad) {
      return res.status(200).json({ message: "Объявления не найдены" });
      }
  
      // Форматируем данные для вывода
      const formattedAd = {
        adId: ad.id,
        adName: ad.adName,
        description: ad.description,
        price: ad.price,
        category: ad.category?.categoryName || null,
        subcategory: ad.subcategory?.subcategoryName || null,
        dateOfPublication: ad.createdAt, 
        dateOfUpdate: ad.updatedAt,
        userName: ad.user?.firstName,
        region: ad.region?.regionName || null,
        telegramlink: ad.user?.telegram || null,
        whatsapplink: ad.user?.whatsapp || null,
        phonenumber: ad.user?.phoneNumber || null,
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
          await fs.access(filePath); // Проверяем, существует ли файл
          await fs.unlink(filePath); // Удаляем файл, если он существует
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

  async delOneAd(req, res) {
    try {
      const { id } = req.params; // Получаем id объявления из запроса
  
      // Находим объявление
      const ad = await Ad.findByPk(id, {
        include: { model: Photo, as: 'photos' }
      });
  
      if (!ad) {
        return res.status(404).json({ message: 'Объявление не найдено' });
      }
  
      // Удаляем фотографии с файловой системы, если они существуют
      for (let photo of ad.photos) {
        const filePath = path.resolve(__dirname, '..', 'static', photo.url);
  
        try {
          await fs.access(filePath); // Проверяем, существует ли файл
          await fs.unlink(filePath); // Удаляем файл, если он существует
        } catch (err) {
          if (err.code !== 'ENOENT') { // ENOENT означает, что файл не найден
            console.error('Ошибка при удалении файла:', err);
            return res.status(500).json({ message: 'Ошибка при удалении файла' });
          }
          // Если файл не существует, продолжаем выполнение
        }
      }
  
      // Удаляем фотографии из базы данных
      await Photo.destroy({ where: { adId: ad.id } });
  
      // Удаляем объявление
      await Ad.destroy({ where: { id: ad.id } });
  
      return res.status(200).json({ message: 'Объявление и фотографии удалены' });
    } catch (error) {
      console.error('Ошибка при удалении объявления:', error);
      return res.status(500).json({ message: error.message });
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
  
      // Удаляем фотографии с файловой системы, если они существуют
      for (let photo of ad.photos) {
        const filePath = path.resolve(__dirname, '..', 'static', photo.url);
        
        try {
          await fs.access(filePath); // Проверяем, существует ли файл
          await fs.unlink(filePath); // Удаляем файл, если он существует
        } catch (err) {
          if (err.code !== 'ENOENT') { // ENOENT означает, что файл не найден
            console.error('Ошибка при удалении файла:', err);
            return res.status(500).json({ message: 'Ошибка при удалении файла' });
          }
          // Если файл не существует, продолжаем выполнение
        }
      }
  
      // Удаляем фотографии из базы данных
      await Photo.destroy({ where: { adId: ad.id } });
  
      // Удаляем объявление
      await Ad.destroy({ where: { id: ad.id } });
  
      return res.status(200).json({ message: 'Объявление и фотографии удалены' });
    } catch (error) {
      console.error('Ошибка при удалении объявления:', error);
      return res.status(500).json({ message: error.message });
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
    if (ad.userId !== req.user.id) {
      return res.status(403).json({ message: "У вас нет прав для продления этого объявления" });
    }

    const now = dayjs(); // Текущее время
    const expirationDate = dayjs(ad.expirationDate); // Дата окончания объявления
    const daysLeft = expirationDate.diff(now, 'day'); // Количество оставшихся дней

    if (daysLeft > 3) {
      return res.status(400).json({ message: "Объявление можно продлить только если осталось менее 3 дней" });
    }

    // Продлеваем объявление на указанные дни
    ad.expirationDate = expirationDate.add(extensionDays, 'day').toDate();
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
    const { adName, description, price, regionId, categoryId, subcategoryId, duration } = req.body;

    // Проверка на корректность продолжительности действия объявления (от 7 до 180 дней)
    if (duration && (duration < 7 || duration > 180)) {
      return res.status(400).json({ message: "Неверная продолжительность действия объявления" });
    }

    // Поиск объявления по ID и проверка принадлежности пользователю
    const ad = await Ad.findOne({
      where: { id, userId },
      include: { model: Photo, as: 'photos' }
    });
    if (!ad) {
      return res.status(404).json({ message: "Объявление не найдено или доступ запрещен" });
    }

    // Проверка категории, если она передана
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ message: "Категория не найдена" });
      }
    }

    // Проверка подкатегории, если она передана
    if (subcategoryId) {
      const subcategory = await Subcategory.findOne({ where: { id: subcategoryId, categoryId } });
      if (!subcategory) {
        return res.status(400).json({ message: "Подкатегория не найдена или не принадлежит выбранной категории" });
      }
    }

    // Обновление полей объявления (только если данные переданы)
    ad.adName = adName !== undefined ? adName : ad.adName;
    ad.description = description !== undefined ? description : ad.description;
    ad.price = price !== undefined ? price : ad.price;
    ad.regionId = regionId !== undefined ? regionId : ad.regionId;
    ad.categoryId = categoryId !== undefined ? categoryId : ad.categoryId;
    ad.subcategoryId = subcategoryId !== undefined ? subcategoryId : ad.subcategoryId;

    // Обновление даты истечения объявления, если передано новое значение
    if (duration) {
      const now = dayjs();
      ad.expirationDate = now.add(duration, 'day').toDate();
    }

    // Проверка на наличие новых изображений и обновление их
    if (req.files && req.files.images && req.files.images.length > 0) {
      let images = req.files.images;

      // Преобразование в массив, если images — не массив
      if (!Array.isArray(images)) {
        images = [images];
      }

      // Удаление старых изображений
      for (const oldPhoto of ad.photos) {
        const oldImagePath = path.resolve(__dirname, '..', 'static', oldPhoto.url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Удаляем старый файл
        }
        await oldPhoto.destroy(); // Удаляем запись из базы данных
      }

      // Добавление новых изображений
      for (const image of images) {
        const fileName = uuidv4() + path.extname(image.name);
        const imagePath = path.resolve(__dirname, '..', 'static', fileName);

        // Перемещаем файл в директорию 'static'
        await image.mv(imagePath);

        // Сохранение нового фото в базе данных
        await Photo.create({
          url: fileName,
          adId: ad.id
        });
      }
    }

    // Сохранение изменений объявления
    await ad.save();

    // Возврат обновленного объявления с новыми фотографиями
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
  const userId = req.user.id;
  console.log('User ID from token:', userId);

  try {
    // Проверка наличия userId
    if (!userId) {
      return res.status(400).json({ message: "Некорректный идентификатор пользователя" });
    }

    let ads = await Ad.findAll({
      where: { userId },
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
      attributes: ['id','adName', 'description', 'price', 'expirationDate'] // Добавляем поле expirationDate
    });

    if (!ads || ads.length === 0) {
      return res.status(200).json({ ads: [] });
    }

    // Преобразование структуры данных
    const transformedAds = ads.map(ad => {
      const now = dayjs();
      const expirationDate = dayjs(ad.expirationDate);
      const daysRemaining = expirationDate.diff(now, 'day'); // Рассчитываем количество оставшихся дней

      return {
        adId: ad.id,
        adName: ad.adName,
        description: ad.description,
        price: ad.price,
        category: ad.category ? ad.category.categoryName : null,
        subcategory: ad.subcategory ? ad.subcategory.subcategoryName : null,
        region: ad.region ? ad.region.regionName : null,
        photos: ad.photos.map(photo => ({
          url: photo.url
        })),
        daysRemaining: daysRemaining >= 0 ? daysRemaining : 0 // Если срок истек, возвращаем 0
      };
    });

    return res.status(200).json(transformedAds);
  } catch (error) {
    console.error('Ошибка при получении объявлений:', error);
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
}
}


module.exports = new AdController()