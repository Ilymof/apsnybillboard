const { Op } = require('sequelize'); 
const {Ad, Photo, Category, Subcategory,Region} = require('../models/models')
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Импорт UUID
const fs = require('fs');
const { switchKeyboardLayout } = require('./helper'); 

class AdController 
{
   
  async AdCreate(req, res) {
    try {
      let { adName, description, price, regionId, categoryId, subcategoryId } = req.body;
  
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
      const ad = await Ad.create({ adName, description, price, regionId, categoryId, subcategoryId });
  
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
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
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
  
      if (!ads.length) {
        return res.status(404).json({ message: "Объявления не найдены" });
      }
  
      return res.status(200).json(ads);
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
  
      return res.status(200).json(ad);
    } catch (error) {
      console.error('Ошибка при получении объявления:', error);
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  }

  async clearAllAds(req,res) {
      try {
        await Ad.truncate({ cascade: true, restartIdentity: true });
      res.status(200).json({ message: 'Ad cleared and auto-increment reset.' });
    } catch (error) {
      res.status(400).json({ error: error.message });
      console.error('Failed to clear Ad:', error);
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


}


module.exports = new AdController()