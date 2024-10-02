require('dotenv').config()
const express = require('express')
const sequelize = require('./db')
const models = require('./models/models')
const cors = require('cors')
const fileUpload = require('express-fileupload')
const router = require('./routes/index')
const errorHandler = require('./middleware/ErrorHandlingMiddleware')
const path = require('path')

const PORT = process.env.PORT || 5000

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.resolve(__dirname, 'static')))
app.use(fileUpload({}))
app.use('/api', router)

// Обработка ошибок, последний Middleware
app.use(errorHandler)

const start = async () => {
    try{
        await sequelize.authenticate()
            .then(() => console.log('Connection has been established successfully.'))
            .catch(err => console.error('Unable to connect to the database:', err));
        await  sequelize.sync({ alter: true })
            .then(() => console.log('Database synchronized'))
            .catch(err => console.error('Unable to synchronize database:', err));
      
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
          });
         
    }
    catch(e) {
        console.log(e);    
    }
}

start()