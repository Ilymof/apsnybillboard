const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Basket, Ad, BasketAd }  = require('../models/models');
const nodemailer = require('nodemailer');
const sequelize = require('../db');
require('dotenv').config();

function generateShortConfirmationCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

const generateJwt = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    );
};

class UserController {
    async registration(req, res, next) {
        try {
            const { email, password, phoneNumber, firstName, lastName,telegram,whatsapp, role } = req.body;
            
    
            if (!email || !password) {
                return next(ApiError.badRequest('Некорректный email или password'));
            }

            if (!phoneNumber && !telegram && !whatsapp) {
                return res.status(400).json({ 
                    message: 'Добавьте как минимум один из видов связи: номер телефона, Telegram или WhatsApp.' 
                });
            }
    
            const candidate = await User.findOne({ where: { email } });
            if (candidate) {
                return next(ApiError.badRequest('Пользователь с таким email уже существует'));
            }
            const confirmationCode = generateShortConfirmationCode(); // 5-символьный код

            const hashPassword = await bcrypt.hash(password, 10);
            const user = await User.create({ email, phoneNumber, firstName, lastName, role, telegram, whatsapp, password: hashPassword, confirmationCode });
            const basket = await Basket.create({ userId: user.id });
    
            const transporter = nodemailer.createTransport({
                host: "smtp.mail.ru",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
    
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Подтверждение регистрации',
                text: `Ваш код подтверждения: ${confirmationCode}`
            };
    
            await transporter.sendMail(mailOptions);
            console.log('Письмо отправлено на почту:', user.email);
            return res.status(200).json({ message: 'Пользователь зарегистрирован. Проверьте email для подтверждения.' });
        } catch (error) {
            console.error('Ошибка при регистрации пользователя:', error);
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
            // Получаем всех пользователей с атрибутами id и email
            const users = await User.findAll({
                attributes: ['id', 'email'], 
            });
    
            // Считаем количество пользователей
            const userCount = await User.count();
    
            // Создаем массив id пользователей
            const userIds = users.map(user => user.id);
    
            // Создаем массив email пользователей
            const userEmails = users.map(user => user.email);
    
            return res.status(200).json({
                userCount,
                userIds,
                userEmails // Возвращаем массив email
            });
        } catch (error) {
            console.error(error);
            return next(ApiError.internal('Ошибка при получении данных пользователей'));
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ where: { email } });
    
            if (!user) {
                return next(ApiError.badRequest('Пользователь с таким email не найден'));
            }
    
            const resetCode = generateShortConfirmationCode();
            user.confirmationCode = resetCode;
            await user.save();
    
            const transporter = nodemailer.createTransport({
                host: "smtp.mail.ru",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
    
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Восстановление пароля',
                text: `Ваш код для восстановления пароля: ${resetCode}`
            };
    
            await transporter.sendMail(mailOptions);
            return res.status(200).json({ message: 'Код восстановления пароля отправлен на почту.' });
        } catch (error) {
            console.error('Ошибка при восстановлении пароля:', error);
            return next(ApiError.internal('Ошибка при восстановлении пароля'));
        }
    }
    async resetPassword(req, res, next) {
        try {
            const { email, confirmationCode, newPassword } = req.body;
    
            if (!email || !confirmationCode || !newPassword) {
                return next(ApiError.badRequest('Пожалуйста, предоставьте email, код подтверждения и новый пароль.'));
            }
    
            // Поиск пользователя по email
            const user = await User.findOne({ where: { email } });
    
            if (!user) {
                return next(ApiError.badRequest('Пользователь с таким email не найден.'));
            }
    
            // Проверка кода подтверждения
            if (user.confirmationCode !== confirmationCode) {
                return next(ApiError.badRequest('Неверный код подтверждения.'));
            }
    
            // Хеширование нового пароля
            const hashPassword = await bcrypt.hash(newPassword, 10);
    
            // Обновление пароля и очистка кода подтверждения
            user.password = hashPassword;
            user.confirmationCode = null; // Можно сбросить код подтверждения после успешного изменения пароля
            await user.save();
    
            return res.status(200).json({ message: 'Пароль успешно изменён.' });
        } catch (error) {
            console.error('Ошибка при смене пароля:', error);
            return next(ApiError.internal('Ошибка при смене пароля.'));
        }
    }
    async changeContacts(req,res,next)
    {
        try {
            const userId = req.user.id;
            const { telegramChanged, whatsappChanged, phoneNumberChanged } = req.body;
    
            // Проверка на наличие пользователя
            if (!userId) {
                return res.status(401).json({ message: "Не авторизован" });
            }
    
            // Поиск пользователя по ID
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ message: "Пользователь не найден" });
            }
    
            // Обновление полей контактов, только если данные переданы
            user.telegram = telegramChanged !== undefined ? telegramChanged : user.telegram;
            user.whatsapp = whatsappChanged !== undefined ? whatsappChanged : user.whatsapp;
            user.phoneNumber = phoneNumberChanged !== undefined ? phoneNumberChanged : user.phoneNumber;
    
            // Сохранение изменений
            await user.save();
    
            // Возврат обновленных данных пользователя
            const updatedUser = await User.findByPk(user.id, {
                attributes: ['telegram', 'whatsapp', 'phoneNumber']
            });
    
            return res.status(200).json(updatedUser);
        } catch (error) {
            console.error("Ошибка при изменении контактов:", error);
            return res.status(500).json({ message: "Не удалось обновить контакты", error: error.message });
        }

    }
    async getUserProfile(req, res, next) {
        try {
            // Извлекаем токен из заголовков
            const token = req.headers.authorization?.split(' ')[1]; // Пример: Bearer <token>
            
            if (!token) {
                return next(ApiError.unauthorized('Не авторизован'));
            }

            // Декодируем токен
            const decoded = jwt.verify(token, SECRET_KEY); // Где JWT_SECRET - ваш секретный ключ для подписи токенов

            // Извлекаем userId из декодированного токена
            const userId = decoded.id;

            // Ищем пользователя по ID
            const user = await User.findOne({
                where: { id: userId },
                attributes: { exclude: ['id','password', 'confirmationCode', 'role', 'isConfirmed'] } // Исключаем не нужные данные
            });

            if (!user) {
                return next(ApiError.notFound('Пользователь не найден'));
            }
            return res.status(200).json(user);
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            return next(ApiError.internal('Ошибка при получении данных пользователя'));
        }
    }
    }

module.exports = new UserController();