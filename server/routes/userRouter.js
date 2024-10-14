const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authenticate = require('../middleware/authMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', userController.registration);
router.post('/confirm', userController.confirmEmail); // Добавьте этот маршрут
router.post('/login', userController.login);
router.get('/check', authenticate, userController.check);
router.delete('/deluser/:userId',authMiddleware,checkRole('ADMIN'),userController.deleteUserData)
router.get('/getallusers',userController.getUsersCountAndIds)


module.exports = router