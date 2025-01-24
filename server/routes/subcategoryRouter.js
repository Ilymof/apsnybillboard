const Router = require('express')
const router = new Router()
const subcategoryController = require('../controllers/subcategoryController')
const checkRole = require('../middleware/checkRoleMiddleware');
const authMiddleware = require('../middleware/authMiddleware')

router.post('/add',authMiddleware,checkRole,  subcategoryController.addSubcategory)
router.delete('/delete',authMiddleware,checkRole, subcategoryController.clearSubcategoryList)
router.get('/',subcategoryController.getSubcategories)
router.post('/:id/update',authMiddleware,checkRole,subcategoryController.SubcategoryUpdate)

module.exports = router