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
const usernameSearchInput = document.getElementById('usernameSearch');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const transferButton = document.getElementById('transferButton');
const sendToMyselfButton = document.getElementById('sendToMyselfButton');
const increaseButton = document.getElementById('increaseButton');
const decreaseButton = document.getElementById('decreaseButton');
const statusElement = document.getElementById('status');

// Параметры сети CELO
const CELO_NETWORK = {
    chainId: '0xa4ec', // 42220 в hex
    chainName: 'Celo Mainnet',
    nativeCurrency: {
        name: 'CELO',
        symbol: 'CELO',
        decimals: 18
    },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://explorer.celo.org']
};

// Состояние приложения
let userAccount = null;
let provider = null;

// Инициализация приложения
async function initApp() {
    try {
        // Получаем Ethereum провайдер из Farcaster SDK
        provider = await sdk.wallet.getEthereumProvider();
        console.log('Farcaster Ethereum provider получен');
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Автоматически проверяем подключение кошелька
        await checkWalletConnection();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showStatus('Application initialization error', 'error');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    connectButton.addEventListener('click', connectWallet);
    transferButton.addEventListener('click', sendTransaction);
    sendToMyselfButton.addEventListener('click', fillMyAddress);
    increaseButton.addEventListener('click', increaseAmount);
    decreaseButton.addEventListener('click', decreaseAmount);
    searchButton.addEventListener('click', searchUsers);
    usernameSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
    usernameSearchInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            hideSearchResults();
        }
    });
}

// Проверка подключения кошелька
async function checkWalletConnection() {
    try {
        // Проверяем, есть ли уже подключенные аккаунты
        const accounts = await provider.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
            userAccount = accounts[0];
            await switchToCeloNetwork();
            showStatus(`Wallet connected: ${shortenAddress(userAccount)}`, 'success');
            connectButton.style.display = 'none';
            transferForm.style.display = 'block';
        } else {
            showStatus('Please connect your wallet', '');
        }
    } catch (error) {
        console.error('Ошибка проверки подключения кошелька:', error);
        showStatus('Please connect your wallet', '');
    }
}

// Подключение к кошельку
async function connectWallet() {
    try {
        showStatus('Connecting to wallet...', '');
        
        // Запрашиваем доступ к аккаунтам пользователя
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        // Автоматически переключаемся на сеть CELO
        await switchToCeloNetwork();
        
        showStatus(`Wallet connected: ${shortenAddress(userAccount)}`, 'success');
        
        // Показываем форму для отправки CELO
        connectButton.style.display = 'none';
        transferForm.style.display = 'block';
    } catch (error) {
        console.error('Ошибка подключения к кошельку:', error);
        showStatus('Failed to connect to wallet', 'error');
    }
}

// Переключение на сеть CELO
async function switchToCeloNetwork() {
    try {
        // Пытаемся переключиться на сеть CELO
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CELO_NETWORK.chainId }],
        });
    } catch (switchError) {
        // Если сеть не найдена, добавляем её
        if (switchError.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [CELO_NETWORK],
                });
            } catch (addError) {
                console.error('Ошибка добавления сети CELO:', addError);
                showStatus('Failed to add CELO network', 'error');
            }
        } else {
            console.error('Ошибка переключения на сеть CELO:', switchError);
            showStatus('Failed to switch to CELO network', 'error');
        }
    }
}

// Заполнение адреса текущего пользователя
function fillMyAddress() {
    if (userAccount) {
        recipientInput.value = userAccount;
    }
}

// Увеличение количества
function increaseAmount() {
    const currentValue = parseFloat(amountInput.value) || 0;
    const newValue = (currentValue + 0.001).toFixed(3);
    amountInput.value = newValue;
}

// Уменьшение количества
function decreaseAmount() {
    const currentValue = parseFloat(amountInput.value) || 0;
    const newValue = Math.max(0.001, currentValue - 0.001).toFixed(3);
    amountInput.value = newValue;
}

// Отправка транзакции
async function sendTransaction() {
    try {
        // Проверяем, что все поля заполнены
        const recipient = recipientInput.value.trim();
        const amount = amountInput.value.trim();
        
        if (!recipient || !amount) {
            showStatus('Please fill in all fields', 'error');
            return;
        }
        
        if (!recipient.startsWith('0x') || recipient.length !== 42) {
            showStatus('Invalid recipient address format', 'error');
            return;
        }
        
        if (parseFloat(amount) <= 0) {
            showStatus('Amount must be greater than zero', 'error');
            return;
        }
        
        showStatus('Preparing transaction...', '');
        
        // Конвертируем сумму в wei (18 десятичных знаков для CELO)
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        // Кодируем данные для вызова функции transfer
        // Функция transfer принимает два параметра: адрес получателя и сумму
        const paddedAddress = recipient.slice(2).padStart(64, '0');
        const paddedAmount = amountInWei.toHexString().slice(2).padStart(64, '0');
        const data = `${TRANSFER_FUNCTION_SELECTOR}${paddedAddress}${paddedAmount}`;
        
        console.log('Amount:', amount);
        console.log('Amount in Wei:', amountInWei.toString());
        console.log('Padded Amount:', paddedAmount);
        console.log('Transaction data:', data);
        
        // Создаем транзакцию
        const transactionParameters = {
            to: CELO_CONTRACT_ADDRESS,
            from: userAccount,
            data: data,
            gas: '0x30D40', // 200,000 gas
        };
        
        showStatus('Confirm transaction in your wallet...', '');
        
        // Отправляем транзакцию
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
        });
        
        showStatus(`Transaction sent! Hash: ${txHash}`, 'success');
    } catch (error) {
        console.error('Ошибка отправки транзакции:', error);
        showStatus('Error sending transaction', 'error');
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

// Функции поиска пользователей
async function searchUsers() {
    const username = usernameSearchInput.value.trim();
    if (!username) {
        showStatus('Please enter a username to search', 'error');
        return;
    }

    showSearchLoading();
    
    try {
        // Поиск через Fname Registry
        const userInfo = await searchByUsername(username);
        if (userInfo) {
            displaySearchResults([userInfo]);
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showStatus('Error searching for users', 'error');
        hideSearchResults();
    }
}

async function searchByUsername(username) {
    try {
        // Убираем @ если есть
        const cleanUsername = username.replace('@', '').toLowerCase();
        
        // Поиск через Fname Registry API
        const response = await fetch(`https://fnames.farcaster.xyz/transfers?name=${cleanUsername}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('API response not ok:', response.status, response.statusText);
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response data:', data);
        
        if (data.transfers && data.transfers.length > 0) {
            // Берем последний (самый актуальный) трансфер
            const transfer = data.transfers[data.transfers.length - 1];
            return {
                username: cleanUsername,
                fid: transfer.to,
                address: transfer.owner || transfer.to
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error searching username:', error);
        return null;
    }
}

function showSearchLoading() {
    searchResults.style.display = 'block';
    searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
}

function showNoResults() {
    searchResults.style.display = 'block';
    searchResults.innerHTML = '<div class="search-no-results">No users found</div>';
}

function hideSearchResults() {
    searchResults.style.display = 'none';
    searchResults.innerHTML = '';
}

function displaySearchResults(users) {
    if (!users || users.length === 0) {
        showNoResults();
        return;
    }

    searchResults.style.display = 'block';
    searchResults.innerHTML = users.map(user => {
        const avatar = user.username.charAt(0).toUpperCase();
        return `
            <div class="search-result-item" onclick="selectUser('${user.address}', '${user.username}')">
                <div class="search-result-avatar">${avatar}</div>
                <div class="search-result-info">
                    <div class="search-result-username">@${user.username}</div>
                    <div class="search-result-address">${shortenAddress(user.address)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function selectUser(address, username) {
    recipientInput.value = address;
    hideSearchResults();
    usernameSearchInput.value = '';
    showStatus(`Selected @${username} (${shortenAddress(address)})`, 'success');
}

// Загружаем ethers.js для работы с Ethereum из надежного CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
script.onload = initApp;
script.onerror = function() {
    console.error('Не удалось загрузить ethers.js');
    showStatus('Error loading required libraries', 'error');
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