const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    firstName: {type: DataTypes.STRING, allowNull: false},
    lastName: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    password: {type: DataTypes.STRING,allowNull: false}, 
    phoneNumber:{type: DataTypes.BIGINT},
    telegram:{type: DataTypes.STRING},
    whatsapp:{type: DataTypes.STRING},
    role: {type: DataTypes.STRING, defaultValue: "user"},
    confirmationCode: {
        type: DataTypes.STRING},
    isConfirmed: {type: DataTypes.BOOLEAN,defaultValue: false}
})

const Ad = sequelize.define('ad', 
    {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        adName: {type: DataTypes.STRING, allowNull: false},
        description: {type: DataTypes.STRING, allowNull: false},
        price: {type: DataTypes.INTEGER, allowNull: false},
        expirationDate: {type: DataTypes.DATE, allowNull: false},
        isActive: {type: DataTypes.BOOLEAN,defaultValue: true}
    }
 )
 const Basket = sequelize.define('basket', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
})

const BasketAd = sequelize.define('basket_ad', {
  id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

 const Photo= sequelize.define('image', 
    {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        url: {type: DataTypes.STRING, allowNull: false}
    }
 )

 const Category = sequelize.define('category', 
    {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        categoryName: {type: DataTypes.STRING, unique: true},
        path:{type: DataTypes.STRING, unique:true},
        image: { type: DataTypes.STRING }
    }
 )

 const Region = sequelize.define('region', 
    {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        regionName: {type: DataTypes.STRING}
    }
 )
 const Subcategory = sequelize.define('subcategory', {
    id: {type: DataTypes.INTEGER,primaryKey: true,autoIncrement: true},
    subcategoryName: {type: DataTypes.STRING,allowNull: false},
    categoryId: {type: DataTypes.INTEGER,allowNull: false,references: {model: Category,key: 'id'}},
    path:{type: DataTypes.STRING, unique:true}
  });

  const Chat = sequelize.define('chat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  });
  
  const Message = sequelize.define('message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  });
  

  
User.hasMany(Ad, { foreignKey: 'userId', onDelete: 'CASCADE' });
Ad.belongsTo(User, { foreignKey: 'userId' });

 Ad.belongsTo(Category,{as:'category', foreignKey: 'categoryId'});
 Category.hasMany(Ad, { as: 'ads', foreignKey: 'categoryId' });

 Ad.belongsTo(Subcategory,{as:'subcategory', foreignKey: 'subcategoryId'});
 Subcategory.hasMany(Ad, { as: 'ads', foreignKey: 'subcategoryId' });

 Ad.belongsTo(Region,{as:'region', foreignKey: 'regionId'});
 Region.hasMany(Ad, { as: 'ads', foreignKey: 'regionId' });

 Ad.hasMany(Photo, { as: 'photos', foreignKey: 'adId' });
 Photo.belongsTo(Ad, { foreignKey: 'adId' });

 Category.hasMany(Subcategory, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
 Subcategory.belongsTo(Category, { foreignKey: 'categoryId' });

User.hasOne(Basket);
Basket.belongsTo(User);

Basket.belongsToMany(Ad, { through: BasketAd });
Ad.belongsToMany(Basket, { through: BasketAd });

Chat.belongsTo(User, { as: 'seller', foreignKey: 'sellerId', onDelete: 'CASCADE' });
Chat.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId', onDelete: 'CASCADE' });
Chat.belongsTo(Ad, { foreignKey: 'adId', onDelete: 'CASCADE' });

Message.belongsTo(Chat, { foreignKey: 'chatId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', onDelete: 'CASCADE' });

module.exports = 
{
    User,
    Photo,
    Category,
    Ad,
    Region,
    Basket,
    BasketAd,
    Subcategory,
    Chat,
    Message
}