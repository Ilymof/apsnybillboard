const Router = require('express')
const router = new Router()
const authMiddleware = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController')

router.post('/', authMiddleware,chatController.createChat)
router.post('/:chatId/message', authMiddleware, chatController.sendMessage)
router.get('/:chatId/messages', authMiddleware,chatController.GetMessages)
router.put('/:chatId/messages/read', authMiddleware,chatController.ReadMessage)


module.exports = router