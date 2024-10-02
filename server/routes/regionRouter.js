const Router = require('express')
const router = new Router()
const regionController = require('../controllers/regionController')


router.post('/', regionController.CreateRegion)
router.get('/', regionController.getAll)
router.delete('/', regionController.clearRegionList)


module.exports = router