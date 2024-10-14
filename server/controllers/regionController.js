const {Ad, Region } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')
class RegionController {

  async CreateRegion(req,res)
  {
    try{
      const{ regionName} = req.body;
      const region = await Region.create({ regionName})        
      res.status(201).json(region);
    }  
    catch (error) {
      res.status(400).json({ message:'Ошибка при добавлении региона:'});
    }
  }
  async clearRegionList(req, res) {
    try {
    
      await Ad.destroy({ where: {} });  
      await Region.truncate({ cascade: true, restartIdentity: true });
      res.status(200).json({ message: 'Регеоны очищены и автоинкремент перезапущен' });
    } catch (error) {
      res.status(400).json({ message:'Ошибка при очистки регионов:'});
    }
  }
async getAll (req, res) {
    try {
      const region = await Region.findAll();
      res.json(region);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  async RegionUpdate(req, res) {
    const { id } = req.params;
    const { regionName } = req.body;
  
    try {
      // Проверка наличия regionName
      if (!regionName) {
        return res.status(400).json({ message: "Поле regionName обязательно для обновления" });
      }
  
      // Поиск региона по ID
      const region = await Region.findOne({ where: { id } });
  
      if (!region) {
        return res.status(404).json({ message: "Регион не найден или доступ запрещен" });
      }
  
      // Обновление имени региона
      region.regionName = regionName;
  
      // Сохранение изменений
      await region.save();
  
      // Возврат обновленного региона
      return res.status(200).json({
        message: "Регион успешно обновлен",
        region: {
          id: region.id,
          regionName: region.regionName,
        },
      });
    } catch (error) {
      console.error('Ошибка при обновлении региона:', error);
      return res.status(500).json({ message: "Не удалось обновить регион", error: error.message });
    }
  }
  }
   
    

module.exports = new RegionController()