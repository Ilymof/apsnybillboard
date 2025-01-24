require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const models = require('./models/models');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const router = require('./routes/index');
const errorHandler = require('./middleware/ErrorHandlingMiddleware');
const path = require('path');
const http = require('http'); // Модуль HTTP
const { Server } = require('socket.io'); // Socket.IO

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app); // Создаём HTTP-сервер
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Импортируем файл с логикой WebSocket и передаём io
const websocket = require('./websocket');
websocket(io);

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'static')));
app.use(fileUpload({}));
app.get('/', (req, res) => {
  res.send('Hello from ApsnyBillboard!');
});
app.use('/api', router);

// Обработка ошибок, последний Middleware
app.use(errorHandler);

const start = async () => {
  try {
    await sequelize.authenticate()
            .then(() => console.log('Connection has been established successfully.'))
            .catch(err => console.error('Unable to connect to the database:', err));
    await sequelize.sync({ alter: true })
        .then(() => console.log('Database synchronized'))
        .catch(err => console.error('Unable to synchronize database:', err));   
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
};

start();
