const rulesPattern = {
    "public": [
        '/api/user/register',               // Регистрация доступна всем
        '/api/user/confirm',                // Подтверждение почты
        '/api/user/login',                  // Вход в систему
        '/api/user/sendcode',               // Запрос на восстановление пароля
        '/api/user/changepassword',         // Сброс пароля
        '/api/ad/getone/:adId',            // Просмотр информации об одном объявлении
        '/api/ad/:categoryPath/:subcategoryPath?', // Список объявлений по категории/подкатегории
        '/api/ad',                         // Общий список объявлений без фильтрации
        '/api/category',                    // Получение всех категорий
        '/api/category/:id/subcategory',    // Получение категории с подкатегориями
        '/api/region/'

    ],
    "user": [
        '/api/user/check',                  // Проверка токена
        '/api/user/changecontacts',         // Изменение контактных данных
        '/api/user/userprofile',            //профиль пользователя
        '/api/ad/userads',                     // Получение объявлений авторизованного пользователя
        '/api/ad/:id/extend',              // Продление срока объявления
        '/api/ad/:id/updatead',            // Обновление информации объявления
        '/api/ad/create',                         // Создание объявления (POST)
        '/api/ad/:id',                     // Удаление собственного объявления
        '/api/basket/add',                  // Добавление в корзину
        '/api/basket/:userId',              // Получение корзины
        '/api/basket/removeAd',             // Удаление объявления из корзины
        '/api/chat',                        // Создание чата
        '/api/chat/:chatId/message',        // Отправка сообщения
        '/api/chat/:chatId/messages',       // Получение сообщений
        '/api/chat/:chatId/messages/read'   // Чтение сообщений
      
    ],
    "admin": [
        '/api/user/deluser/:userId',    // Удаление пользователя
        '/api/user/getallusers',        // Получение списка всех пользователей 
        '/api/ad/deleteallads',        // Удаление всех объявлений
        '/api/ad/addelete/:id',        // Удаление любого объявления
        '/api/category/add',            // Создание новой категории
        '/api/category/:id/update',     // Обновление категории
        '/api/category/delete',         // Очистка всех категорий
        '/api/region/add',              // Создание региона
        '/api/region/delete',           // Удаление всех регионов
        '/api/region/:id/change',       // Изменение региона
        '/api/subcategory/add',         // Добавление подкатегорий
        '/api/subcategory/:id/update',  // Обновление подкатегории
        '/api/subcategory/delete',      // Удаление всех подкатегорий
        //все те же права что и у пользователя
        '/api/user/changecontacts',         // Изменение контактных данных
        '/api/user/userprofile',            //профиль пользователя
        '/api/ad/userads',                  // Получение объявлений авторизованного пользователя
        '/api/ad/:id/extend',              // Продление срока объявления
        '/api/ad/:id/updatead',            // Обновление информации объявления
        '/api/ad/create',                   // Создание объявления (POST)
        '/api/ad/:id',                     // Удаление собственного объявления
        '/api/basket/add',                  // Добавление в корзину
        '/api/basket/:userId',              // Получение корзины
        '/api/basket/removeAd',             // Удаление объявления из корзины
        '/api/chat',                        // Создание чата
        '/api/chat/:chatId/message',        // Отправка сообщения
        '/api/chat/:chatId/messages',       // Получение сообщений
        '/api/chat/:chatId/messages/read'   // Чтение сообщений
    ]
  };
  
  module.exports = rulesPattern;