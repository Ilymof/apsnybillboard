const Router = require('express')
const router = new Router()
const userRouter = require('./userRouter')
const adRouter = require('./adRouter')
const categoryRouter = require('../routes/categoryRouter')
const regionRouter = require('../routes/regionRouter')
const subcategoryRouter = require('../routes/subcategoryRouter')
const baskerRouter = require('../routes/basketRouter')
router.use('/user', userRouter)
router.use('/ad', adRouter)
router.use('/category', categoryRouter)
router.use('/region', regionRouter)
router.use('/subcategory', subcategoryRouter)
router.use('/basket', baskerRouter)


module.exports = router