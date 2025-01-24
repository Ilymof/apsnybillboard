const Router = require('express');
const router = new Router();
const getRulesPattern = require('../controllers/rulesPatternController')

router.get('/', getRulesPattern)

module.exports = router;