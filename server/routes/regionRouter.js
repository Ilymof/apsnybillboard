const Router = require('express')
const router = new Router()
const regionController = require('../controllers/regionController')
const checkRole = require('../middleware/checkRoleMiddleware');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/add',authMiddleware,checkRole, regionController.CreateRegion)
router.get('/', regionController.getAll)
router.delete('/delete',authMiddleware,checkRole,  regionController.clearRegionList)
router.post('/:id/update',authMiddleware,checkRole,regionController.RegionUpdate)

module.exports = router