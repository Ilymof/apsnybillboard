const Router = require('express')
const router = new Router()
const categoryController = require('../controllers/categoryController')


router.post('/', categoryController.CreateCategory)
router.get('/', categoryController.getAll)
router.delete('/', categoryController.clearCategoryList)
router.get('/:id',categoryController.GetOneCategoryWithSub)
router.delete('/:id', categoryController.delOneCategory)

module.exports = router