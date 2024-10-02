const Router = require('express')
const router = new Router()
const basketController = require('../controllers/basketController')

router.post('/add',basketController.addToBasket)
router.get('/:userId',basketController.getBasket)
router.delete('/removeAd',basketController.removeFromBasket)


module.exports = router