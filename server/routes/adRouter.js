const Router = require('express');
const router = new Router();
const adController = require('../controllers/adController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.get('/userads', authMiddleware, checkRole, adController.GetUserAd); // User
router.delete('/deleteallads', authMiddleware, checkRole, adController.clearAllAds); // Admin
router.delete('/addelete/:id', authMiddleware, checkRole, adController.delOneAd); // Admin
router.get('/getone/:adId', adController.getOne); // Public
router.get('/:categoryPath/:subcategoryPath?', adController.GetAllAd); // Public
router.post('/:id/extend', authMiddleware, checkRole, adController.extendAd); // User
router.post('/:id/updatead', authMiddleware, checkRole, adController.AdUpdate); // User
router.post('/create', authMiddleware, checkRole, adController.AdCreate); // User
router.get('/', adController.GetAllAd); // Public
router.delete('/:id', authMiddleware, checkRole, adController.deleteAd); // User

module.exports = router;