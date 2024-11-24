module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log('Клиент подключился:', socket.id);
  
      socket.on('joinChat', (chatId) => {
        console.log(`Пользователь подключился к чату: ${chatId}`);
        socket.join(chatId);
      });
  
      socket.on('sendMessage', (message) => {
        console.log('Новое сообщение:', message);
        const { chatId, content, senderId } = message;
        io.to(chatId).emit('newMessage', { chatId, content, senderId });
      });
  
      socket.on('disconnect', () => {
        console.log('Клиент отключился:', socket.id);
      });
    });
  };