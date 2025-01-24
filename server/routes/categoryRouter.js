const Router = require('express')
const router = new Router()
const categoryController = require('../controllers/categoryController')
const checkRole = require('../middleware/checkRoleMiddleware');
const authMiddleware = require('../middleware/authMiddleware')

router.post('/add', authMiddleware, checkRole, categoryController.CreateCategory)
router.get('/', categoryController.getAll)
router.delete('/delete',authMiddleware,checkRole, categoryController.clearCategoryList)
router.get('/:id/subcategory',categoryController.GetOneCategoryWithSub)
router.post('/:id/update',authMiddleware,checkRole,categoryController.сategoryUpdate)
module.exports = router