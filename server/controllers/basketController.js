const {Basket,User,Ad } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')


class BasketController
{
    async getBasket(req, res, next) {
        try {
            const { userId } = req.params;
    
            // Проверка, чтобы убедиться, что userId корректно передано
            console.log(`Fetching basket for user ID: ${userId}`);
    
            // Ищем пользователя и корзину
            const user = await User.findByPk(userId, {
                include: {
                    model: Basket,
                    include: [Ad]
                }
            });
    
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
    
            // Проверка, была ли создана корзина
            if (!user.basket) {
                return res.status(404).json({ message: 'Корзина не найдена для данного пользователя' });
            }
    
            // Если все успешно, возвращаем объявления
            res.json(user.basket.ads);
    
        } catch (error) {
            next(error);
        }
    }

    async  addToBasket(req,res,next) {
        try {
            const { userId, adId } = req.body;
        
            // Находим пользователя и его корзину
            const user = await User.findByPk(userId, {
              include: { model: Basket, include: [Ad] }
            });
        
            if (!user || !user.basket) {
              return res.status(404).json({ message: 'User or Basket not found' });
            }
        
            // Находим объявление
            const ad = await Ad.findByPk(adId);
            if (!ad) {
              return res.status(404).json({ message: 'Ad not found' });
            }
        
            // Добавляем объявление в корзину
            await user.basket.addAd(ad);
        
            res.json({ message: 'Ad added to basket' });
          } catch (error) {
            next(error);
          }
    }
    async  removeFromBasket(req,res,next) {
      try {
        const { userId, adId } = req.body;

        // Находим пользователя и его корзину
        const user = await User.findByPk(userId, {
            include: {
                model: Basket,
                include: [Ad]
            }
        });

        // Проверяем, существует ли пользователь и его корзина
        if (!user || !user.basket) {
            return res.status(404).json({ message: 'Корзина или пользователь не найдены' });
        }

        // Находим объявление по adId
        const ad = await Ad.findByPk(adId);

        // Проверяем, существует ли объявление
        if (!ad) {
            return res.status(404).json({ message: 'Объявление не найдено' });
        }

        // Удаляем объявление из корзины
        await user.basket.removeAd(ad);

        // Возвращаем успешный ответ
        return res.status(200).json({ message: 'Объявление успешно удалено из корзины' });

    } catch (error) {
        next(error);
    }
  }
}

module.exports = new BasketController()