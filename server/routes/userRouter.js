const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authenticate = require('../middleware/authMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/register', userController.registration);
router.post('/confirm', userController.confirmEmail); // Добавьте этот маршрут
router.post('/login', userController.login);
router.get('/check', authenticate, userController.check);
router.delete('/deluser/:userId',authMiddleware, checkRole('ADMIN'),userController.deleteUserData)
router.get('/getallusers',userController.getUsersCountAndIds)
router.post('/sendcode',userController.forgotPassword)
router.post('/changepassword',userController.resetPassword)


module.exports = router