// Скрипт для создания первого пользователя
import { createUser } from './src/services/authService.js';

const createFirstUser = async () => {
    const email = 'pmobile78@gmail.com';
    const password = '1Qwert7y';
    
    try {
        console.log('Создаем пользователя:', email);
        const result = await createUser(email, password, 'Admin');
        
        if (result.success) {
            console.log('✅ Пользователь создан успешно!');
            console.log('Email:', email);
            console.log('Password:', password);
            console.log('User ID:', result.user.uid);
        } else {
            console.error('❌ Ошибка создания пользователя:', result.error);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
};

createFirstUser();
