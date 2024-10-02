const Router = require('express')
const router = new Router()
const subcategoryController = require('../controllers/subcategoryController')


router.post('/', subcategoryController.addSubcategory)
router.delete('/',subcategoryController.clearSubcategoryList)
router.get('/',subcategoryController.getSubcategories)

module.exports = router