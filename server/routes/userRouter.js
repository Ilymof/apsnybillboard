const Router = require('express')
const router = new Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/register', userController.registration); // Public
router.post('/confirm', userController.confirmEmail);  // Public
router.post('/login', userController.login);           // Public
router.get('/check', authenticate, checkRole, userController.check); // User
router.delete('/deluser/:userId', authenticate, checkRole, userController.deleteUserData); // Admin
router.get('/getallusers', authenticate, checkRole, userController.getUsersCountAndIds); // Admin
router.post('/sendcode', userController.forgotPassword); // Public
router.post('/changepassword', userController.resetPassword); // Public
router.post('/changecontacts', authenticate, checkRole, userController.changeContacts); // User
router.get('/userprofile',authenticate,checkRole, userController.getUserProfile)//User

module.exports = router