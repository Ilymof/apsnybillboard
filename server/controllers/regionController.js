const {Ad, Region } = require('../models/models'); // Подключаем модель
const sequelize = require('../db')
class RegionController {

  async CreateRegion(req,res)
  {
    try{
      const{ regionName} = req.body;
      const region = await Region.create({ regionName})        
      res.status(201).json(region);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }

    }  
    catch (error) {
      res.status(400).json({ message:'Ошибка при добавлении региона:'});
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
  }
   
    

module.exports = new RegionController()