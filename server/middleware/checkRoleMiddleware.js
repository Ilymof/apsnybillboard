const rulesPattern = require('../utils/accessRules');

module.exports = (req, res, next) => {
  try {
    // Получаем роль пользователя (если не авторизован, назначаем "public")
    const role = req.user?.role || 'public';

    // Доступные маршруты для роли
    const allowedRoutes = rulesPattern[role] || [];

    console.log('Роль пользователя:', role);
    console.log('Разрешённые маршруты для роли:', allowedRoutes);
    console.log('Текущий путь запроса:', req.originalUrl); // Используем originalUrl для полного пути

    // Проверка доступа с учетом полного пути
    const isAuthorized = allowedRoutes.some((routePattern) => {
      const routeRegex = new RegExp(
        `^${routePattern.replace(':userId', '\\d+').replace('*', '.*')}$`
      );
      return routeRegex.test(req.originalUrl); // Проверяем полный путь запроса
    });

    if (!isAuthorized) {
      console.log('Доступ запрещён');
      return res.status(403).json({ message: 'Нет доступа' });
    }

    console.log('Доступ разрешён');
    next();
  } catch (error) {
    console.error('Ошибка в checkRoleMiddleware:', error);
    res.status(500).json({ message: 'Ошибка сервера при проверке роли' });
  }
};