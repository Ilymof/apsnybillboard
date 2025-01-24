const Router = require('express');
const router = new Router();
const basketController = require('../controllers/basketController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/add', authMiddleware, checkRole, basketController.addToBasket); // User
router.get('/:userId', authMiddleware, checkRole, basketController.getBasket); // User
router.delete('/removeAd', authMiddleware, checkRole, basketController.removeFromBasket); // User

module.exports = router;