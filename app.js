import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// Сообщаем Farcaster SDK, что приложение готово
// Вызываем ready() сразу после импорта SDK
(async function() {
    try {
        await sdk.actions.ready();
        console.log('Farcaster SDK ready called successfully');
    } catch (error) {
        console.error('Ошибка при вызове sdk.actions.ready():', error);
    }
})();

// Адрес контракта CELO
const CELO_CONTRACT_ADDRESS = '0x471EcE3750Da237f93B8E339c536989b8978a438';
// Селектор функции transfer (0xa9059cbb)
const TRANSFER_FUNCTION_SELECTOR = '0xa9059cbb';

// Элементы DOM
const connectButton = document.getElementById('connectButton');
const transferForm = document.getElementById('transferForm');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const transferButton = document.getElementById('transferButton');
const statusElement = document.getElementById('status');

// Состояние приложения
let userAccount = null;
let provider = null;

// Инициализация приложения
async function initApp() {
    try {
        // Проверяем, доступен ли ethereum провайдер
        if (window.ethereum) {
            provider = window.ethereum;
            console.log('Ethereum provider найден');
        } else {
            showStatus('Для работы приложения требуется MetaMask или другой Ethereum кошелек', 'error');
        }
        
        // Настраиваем обработчики событий
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showStatus('Ошибка инициализации приложения', 'error');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    connectButton.addEventListener('click', connectWallet);
    transferButton.addEventListener('click', sendTransaction);
}

// Подключение к кошельку
async function connectWallet() {
    try {
        showStatus('Подключение к кошельку...', '');
        
        // Запрашиваем доступ к аккаунтам пользователя
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        showStatus(`Кошелек подключен: ${shortenAddress(userAccount)}`, 'success');
        
        // Показываем форму для отправки CELO
        connectButton.style.display = 'none';
        transferForm.style.display = 'block';
    } catch (error) {
        console.error('Ошибка подключения к кошельку:', error);
        showStatus('Не удалось подключиться к кошельку', 'error');
    }
}

// Отправка транзакции
async function sendTransaction() {
    try {
        // Проверяем, что все поля заполнены
        const recipient = recipientInput.value.trim();
        const amount = amountInput.value.trim();
        
        if (!recipient || !amount) {
            showStatus('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        if (!recipient.startsWith('0x') || recipient.length !== 42) {
            showStatus('Неверный формат адреса получателя', 'error');
            return;
        }
        
        if (parseFloat(amount) <= 0) {
            showStatus('Сумма должна быть больше нуля', 'error');
            return;
        }
        
        showStatus('Подготовка транзакции...', '');
        
        // Конвертируем сумму в wei (18 десятичных знаков для CELO)
        const amountInWei = ethers.utils.parseUnits(amount, 18).toString();
        
        // Кодируем данные для вызова функции transfer
        // Функция transfer принимает два параметра: адрес получателя и сумму
        const paddedAddress = recipient.slice(2).padStart(64, '0');
        const paddedAmount = amountInWei.toString(16).padStart(64, '0');
        const data = `${TRANSFER_FUNCTION_SELECTOR}${paddedAddress}${paddedAmount}`;
        
        // Создаем транзакцию
        const transactionParameters = {
            to: CELO_CONTRACT_ADDRESS,
            from: userAccount,
            data: data,
            gas: '0x30D40', // 200,000 gas
        };
        
        showStatus('Подтвердите транзакцию в вашем кошельке...', '');
        
        // Отправляем транзакцию
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
        });
        
        showStatus(`Транзакция отправлена! Хэш: ${txHash}`, 'success');
    } catch (error) {
        console.error('Ошибка отправки транзакции:', error);
        showStatus('Ошибка отправки транзакции', 'error');
    }
}

// Вспомогательные функции
function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = 'status';
    if (type) {
        statusElement.classList.add(type);
    }
}

function shortenAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Загружаем ethers.js для работы с Ethereum из надежного CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
script.onload = initApp;
script.onerror = function() {
    console.error('Не удалось загрузить ethers.js');
    showStatus('Ошибка загрузки необходимых библиотек', 'error');
};
document.body.appendChild(script);

// Автоматически пытаемся подключить кошелек при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, доступен ли ethereum провайдер
    if (window.ethereum) {
        // Если доступен, автоматически запускаем подключение
        setTimeout(() => {
            connectButton.click();
        }, 1000); // Небольшая задержка для уверенности, что все инициализировано
    }
});