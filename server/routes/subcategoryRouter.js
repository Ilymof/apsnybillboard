const Router = require('express')
const router = new Router()
const subcategoryController = require('../controllers/subcategoryController')
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/',checkRole('ADMIN'),  subcategoryController.addSubcategory)
router.delete('/',checkRole('ADMIN'), subcategoryController.clearSubcategoryList)
router.get('/',subcategoryController.getSubcategories)
router.post('/:id/updatesub',checkRole('ADMIN'),subcategoryController.SubcategoryUpdate)

module.exports = router