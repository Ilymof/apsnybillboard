const Router = require('express')
const router = new Router()
const regionController = require('../controllers/regionController')
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/',checkRole('ADMIN'), regionController.CreateRegion)
router.get('/', regionController.getAll)
router.delete('/',checkRole('ADMIN'),  regionController.clearRegionList)


module.exports = router