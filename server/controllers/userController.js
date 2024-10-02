const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Basket, Ad, BasketAd }  = require('../models/models');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const sequelize = require('../db');
const util = require('util');

const generateJwt = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    );
};

function generateConfirmationCode() {
    return uuidv4();
}

class UserController {
    async registration(req, res, next) {
        try {
            const { email, password, phoneNumber, firstName, lastName, role } = req.body;
            const confirmationCode = generateConfirmationCode();

            if (!email || !password) {
                return next(ApiError.badRequest('Некорректный email или password'));
            }

            const candidate = await User.findOne({ where: { email } });
            if (candidate) {
                return next(ApiError.badRequest('Пользователь с таким email уже существует'));
            }

            const hashPassword = await bcrypt.hash(password, 10); // Увеличьте количество соли, если необходимо
            const user = await User.create({ email, phoneNumber, firstName, lastName, role, password: hashPassword, confirmationCode });
            const basket = await Basket.create({ userId: user.id });

            // Настройка Nodemailer
            const transporter = nodemailer.createTransport({
                host: "smtp.mail.ru",
                port: 465,
                secure: true, // true для порта 465 (SSL)
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER, // Можно добавить имя отправителя, как показано ранее
                to: user.email,
                subject: 'Подтверждение регистрации',
                text: `Ваш код подтверждения: ${confirmationCode}`
            };

            // Отправка письма
            await transporter.sendMail(mailOptions);
            console.log('Письмо отправлено на почту:', user.email);

            return res.status(200).json({ message: 'Пользователь зарегистрирован. Проверьте email для подтверждения.' });
        } catch (error) {
            console.error('Ошибка при регистрации пользователя:', error);

            // Проверка, была ли ошибка связана с отправкой письма
            if (error.response && error.response.includes('EAUTH')) {
                return next(ApiError.internal('Ошибка аутентификации при отправке email'));
            }

            return next(ApiError.internal('Ошибка при регистрации пользователя'));
        }
    }

    async confirmEmail(req, res, next) {
        try {
            const { email, confirmationCode } = req.body;

            if (!email || !confirmationCode) {
                return next(ApiError.badRequest('Некорректные данные для подтверждения'));
            }

            const user = await User.findOne({ where: { email } });
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            if (user.isConfirmed) {
                return res.status(400).json({ message: 'Email уже подтвержден' });
            }

            if (user.confirmationCode !== confirmationCode) {
                return next(ApiError.badRequest('Неверный код подтверждения'));
            }

            user.isConfirmed = true;
            user.confirmationCode = null; // Сброс кода после подтверждения
            await user.save();

            const token = generateJwt(user.id, user.email, user.role);
            return res.json({ message: 'Email успешно подтвержден', token });
        } catch (error) {
            console.error(error);
            return next(ApiError.internal('Ошибка при подтверждении email'));
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return next(ApiError.internal('Пользователь не найден'));
            }

            const comparePassword = await bcrypt.compare(password, user.password);
            if (!comparePassword) {
                return next(ApiError.internal('Указан неверный пароль'));
            }

            if (!user.isConfirmed) {
                return next(ApiError.forbidden('Пожалуйста, подтвердите свой email'));
            }

            const token = generateJwt(user.id, user.email, user.role);
            return res.json({ token });
        } catch (error) {
            console.error(error);
            return next(ApiError.internal('Ошибка при входе в систему'));
        }
    }

    async check(req, res, next) {
        try {
            const token = generateJwt(req.user.id, req.user.email, req.user.role);
            return res.json({ token });
        } catch (error) {
            console.error(error);
            return next(ApiError.internal('Ошибка при проверке токена'));
        }
    }
    async deleteUserData(req, res, next) {
        const { userId } = req.params;

        // Начинаем транзакцию для атомарного удаления всех данных
        const transaction = await sequelize.transaction();

        try {
            // Найдем пользователя по ID
            const user = await User.findOne({ where: { id: userId } });
            if (!user) {
                return next(ApiError.badRequest('Пользователь не найден'));
            }

            // Найдем корзину пользователя
            const basket = await Basket.findOne({ where: { userId: user.id } });
            
            // Удаляем все записи из BasketAd, если корзина существует
            if (basket) {
                await BasketAd.destroy({ where: { basketId: basket.id }, transaction });
                // Удаляем корзину
                await Basket.destroy({ where: { id: basket.id }, transaction });
            }

            // Удаляем все объявления пользователя
            await Ad.destroy({ where: { userId: user.id }, transaction });

            // Удаляем самого пользователя
            await User.destroy({ where: { id: user.id }, transaction });

            // Подтверждаем транзакцию
            await transaction.commit();

            return res.status(200).json({ message: 'Пользователь и все связанные данные успешно удалены' });
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting user data:', error);
            return next(ApiError.internal(`Произошла ошибка при удалении данных пользователя: ${error.message}`));
        }
    }
    async getUsersCountAndIds(req, res, next) {
        try {
            // Получаем всех пользователей
            const users = await User.findAll({
                attributes: ['id'], // Указываем, что хотим получить только поле id
            });

            // Считаем количество пользователей
            const userCount = await User.count();

            // Получаем массив id пользователей
            const userIds = users.map(user => user.id);

            return res.status(200).json({
                userCount,
                userIds
            });
        } catch (error) {
            console.error(error);
            return next(ApiError.internal('Ошибка при получении данных пользователей'));
        }
    }
}

module.exports = new UserController();