const Router = require('express')
const router = new Router()
const categoryController = require('../controllers/categoryController')
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/', checkRole('ADMIN'), categoryController.CreateCategory)
router.get('/', categoryController.getAll)
router.delete('/',checkRole('ADMIN'), categoryController.clearCategoryList)
router.get('/:id',categoryController.GetOneCategoryWithSub)
router.delete('/:id', checkRole('ADMIN'),categoryController.delOneCategory)

module.exports = router