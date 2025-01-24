const {Chat, Message } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')


class ChatController{
async createChat (req, res)
 {
    const { adId, sellerId } = req.body; // ID объявления и продавца
    const buyerId = req.user.id; // ID покупателя из токена
  
    try {
      let chat = await Chat.findOne({ where: { adId, sellerId, buyerId } });
      if (!chat) {
        chat = await Chat.create({ adId, sellerId, buyerId });
      }
  
      return res.json(chat);
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка создания чата', error: err.message });
    }
  };
  async sendMessage (req, res) 
  {
    const { chatId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;
  
    try {
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Чат не найден' });
      }
  
      const message = await Message.create({ chatId, content, senderId });
      return res.json(message);
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка отправки сообщения', error: err.message });
    }
  };


  async GetMessages (req, res) {
    const { chatId } = req.params;
  
    try {
      const messages = await Message.findAll({
        where: { chatId },
        order: [['createdAt', 'ASC']],
      });
  
      return res.json(messages);
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка получения сообщений', error: err.message });
    }
  };
  async ReadMessage (req, res)
   {
    const { chatId } = req.params;
  
    try {
      await Message.update({ isRead: true }, { where: { chatId } });
      return res.json({ message: 'Сообщения помечены как прочитанные' });
    } catch (err) {
      return res.status(500).json({ message: 'Ошибка обновления статуса сообщений', error: err.message });
    }
  }
}

module.exports = new ChatController()
