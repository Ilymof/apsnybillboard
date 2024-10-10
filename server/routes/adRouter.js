const Router = require('express')
const router = new Router()
const adController = require('../controllers/adController')
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/', authMiddleware,adController.AdCreate)
router.get('/', adController.GetAllAd)
router.get('/:adId', adController.getOne);
router.delete('/deleteallads',checkRole('ADMIN'), adController.clearAllAds)
router.delete('/addelete/:id',authMiddleware,checkRole('ADMIN'),  adController.delOneAd)
router.delete('/:id',authMiddleware,adController.deleteAd)
router.post('/:id/extend', authMiddleware,adController.extendAd)


module.exports = router