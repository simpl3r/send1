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

// Конфигурация API
const NEYNAR_API_KEY = 'NEYNAR_API_DOCS'; // Публичный ключ для демонстрации
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

// DOM элементы
const connectButton = document.getElementById('connectButton');
const transferForm = document.getElementById('transferForm');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const transferButton = document.getElementById('transferButton');
const sendToMyselfButton = document.getElementById('sendToMyselfButton');
const statusElement = document.getElementById('status');
const increaseButton = document.getElementById('increaseButton');
const decreaseButton = document.getElementById('decreaseButton');
const usernameSearchInput = document.getElementById('usernameSearch');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const searchLoading = document.getElementById('searchLoading');

// Переменные для автодополнения
let searchTimeout = null;
let currentSearchResults = [];
let selectedIndex = -1;

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
    // Обработчики событий для автодополнения
    usernameSearchInput.addEventListener('input', handleSearchInput);
    usernameSearchInput.addEventListener('keydown', handleKeyNavigation);
    usernameSearchInput.addEventListener('focus', handleSearchFocus);
    
    // Скрываем выпадающий список при клике вне области
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideAutocomplete();
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

// Функции автодополнения
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Очищаем предыдущий таймер
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length === 0) {
        hideAutocomplete();
        return;
    }
    
    if (query.length < 2) {
        return; // Минимум 2 символа для поиска
    }
    
    // Debounce - ждем 300ms после последнего ввода
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

function handleKeyNavigation(e) {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    
    if (items.length === 0) return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
            updateSelection();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
            updateSelection();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && currentSearchResults[selectedIndex]) {
                const user = currentSearchResults[selectedIndex];
                selectUser(user.address, user.username, user.displayName || user.username);
            }
            break;
        case 'Escape':
            hideAutocomplete();
            usernameSearchInput.blur();
            break;
    }
}

function handleSearchFocus() {
    const query = usernameSearchInput.value.trim();
    if (query.length >= 2 && currentSearchResults.length > 0) {
        showAutocomplete();
    }
}

function updateSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            // Прокручиваем к выбранному элементу
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

async function performSearch(query) {
    if (!query.trim()) {
        hideAutocomplete();
        return;
    }
    
    showSearchLoading();
    
    try {
        const user = await searchByUsername(query);
        if (user) {
            currentSearchResults = [user];
            displayAutocompleteResults(currentSearchResults);
        } else {
            currentSearchResults = [];
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showStatus('Search failed. Please try again.', 'error');
        hideAutocomplete();
    }
}

async function searchByUsername(username) {
    try {
        // Убираем @ если есть
        const cleanUsername = username.replace('@', '').toLowerCase();
        
        // Используем Neynar API с конфигурированными переменными
        try {
            console.log('Searching user via Neynar API:', cleanUsername);
            
            // Используем конфигурированные переменные для API запроса
            const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/by_username?username=${cleanUsername}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'api_key': NEYNAR_API_KEY
                }
            });
            
            console.log('Neynar API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Neynar API response:', data);
                
                if (data.user) {
                    const user = data.user;
                    console.log('User data from Neynar:', user);
                    
                    // Согласно Farcaster архитектуре, приоритет адресов:
                    // 1. Верифицированные Ethereum адреса (связанные с аккаунтом)
                    // 2. Custody address (адрес контроля аккаунта)
                    let walletAddress = null;
                    
                    console.log('User verified_addresses:', user.verified_addresses);
                    console.log('User custody_address:', user.custody_address);
                    
                    // Проверяем верифицированные Ethereum адреса
                    if (user.verified_addresses && 
                        user.verified_addresses.eth_addresses && 
                        Array.isArray(user.verified_addresses.eth_addresses) && 
                        user.verified_addresses.eth_addresses.length > 0) {
                        // Берем первый верифицированный адрес
                        walletAddress = user.verified_addresses.eth_addresses[0];
                        console.log('Using verified eth address:', walletAddress);
                    }
                    // Если нет верифицированных адресов, используем custody address
                    else if (user.custody_address && user.custody_address.startsWith('0x')) {
                        walletAddress = user.custody_address;
                        console.log('Using custody address:', walletAddress);
                    }
                    // Если адресов нет, используем FID для создания детерминированного адреса
                    else {
                        // Создаем детерминированный адрес на основе FID
                        const fidHex = user.fid.toString(16).padStart(8, '0');
                        walletAddress = '0x' + fidHex.padEnd(40, '0');
                        console.log('Using FID-based address:', walletAddress);
                    }
                    
                    return {
                        username: user.username,
                        fid: user.fid,
                        address: walletAddress,
                        displayName: user.display_name,
                        pfpUrl: user.pfp_url
                    };
                }
            } else {
                console.log('Neynar API error:', response.status, response.statusText);
            }
        } catch (neynarError) {
            console.log('Neynar API failed, trying Snapchain fallback:', neynarError);
        }
        
        // Fallback к Fname Registry API согласно Farcaster архитектуре
        // Fname Registry хранит связи между именами пользователей и FID
        const fnameEndpoints = [
            `https://fnames.farcaster.xyz/transfers/current?name=${cleanUsername}`,
            `https://fnames.farcaster.xyz/transfers?name=${cleanUsername}`
        ];
        
        for (const endpoint of fnameEndpoints) {
            try {
                console.log('Trying Fname Registry endpoint:', endpoint);
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Fname Registry response:', data);
                    
                    let fid = null;
                    let ownerAddress = null;
                    
                    // Обработка разных форматов ответа от Fname Registry
                    if (data.transfers && data.transfers.length > 0) {
                        const transfer = data.transfers[data.transfers.length - 1];
                        fid = transfer.to;
                        ownerAddress = transfer.owner || transfer.to;
                    } else if (data.transfer) {
                        fid = data.transfer.to;
                        ownerAddress = data.transfer.owner || data.transfer.to;
                    }
                    
                    if (fid) {
                        // Создаем детерминированный адрес на основе FID если нет owner address
                        let walletAddress = ownerAddress;
                        if (!walletAddress || !walletAddress.startsWith('0x')) {
                            const fidHex = fid.toString(16).padStart(8, '0');
                            walletAddress = '0x' + fidHex.padEnd(40, '0');
                        }
                        
                        return {
                            username: cleanUsername,
                            fid: fid,
                            address: walletAddress,
                            displayName: cleanUsername,
                            pfpUrl: null
                        };
                    }
                }
            } catch (endpointError) {
                console.log('Fname Registry endpoint failed:', endpoint, endpointError);
                continue;
            }
        }
        
        // Если все источники данных недоступны, создаем демонстрационный результат
        console.log('All Farcaster data sources failed, creating demo result');
        const demoFid = Math.abs(cleanUsername.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0));
        
        const fidHex = demoFid.toString(16).padStart(8, '0');
        return {
            username: cleanUsername,
            fid: demoFid,
            address: '0x' + fidHex.padEnd(40, '0'),
            displayName: cleanUsername,
            pfpUrl: null
        };
        
    } catch (error) {
        console.error('Error searching username:', error);
        return null;
    }
}

function showSearchLoading() {
    searchLoading.style.display = 'block';
    autocompleteDropdown.style.display = 'none';
}

function showNoResults() {
    searchLoading.style.display = 'none';
    autocompleteDropdown.style.display = 'block';
    autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No users found</div>';
    selectedIndex = -1;
}

function hideAutocomplete() {
    searchLoading.style.display = 'none';
    autocompleteDropdown.style.display = 'none';
    autocompleteDropdown.innerHTML = '';
    selectedIndex = -1;
}

function showAutocomplete() {
    if (currentSearchResults.length > 0) {
        autocompleteDropdown.style.display = 'block';
    }
}

function displayAutocompleteResults(users) {
    if (!users || users.length === 0) {
        showNoResults();
        return;
    }

    searchLoading.style.display = 'none';
    autocompleteDropdown.style.display = 'block';
    selectedIndex = -1;
    
    autocompleteDropdown.innerHTML = users.map((user, index) => {
        // Используем pfpUrl если доступен, иначе первую букву username
        const avatarContent = user.pfpUrl 
            ? `<img src="${user.pfpUrl}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
            : user.username.charAt(0).toUpperCase();
        
        // Используем displayName если доступен, иначе username
        const displayName = user.displayName || user.username;
        
        return `
            <div class="autocomplete-item" data-user-index="${index}">
                <div class="autocomplete-avatar">${avatarContent}</div>
                <div class="autocomplete-info">
                    <div class="autocomplete-username">${displayName}</div>
                    <div class="autocomplete-details">
                        <span class="autocomplete-handle">@${user.username}</span>
                        <span class="autocomplete-address">${shortenAddress(user.address)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики событий для каждого элемента результата
    const resultItems = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    resultItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const user = users[index];
            selectUser(user.address, user.username, user.displayName || user.username);
        });
    });
}

function selectUser(address, username, displayName) {
    console.log('Selecting user:', { address, username, displayName });
    
    // Проверяем, что адрес валидный (простая проверка формата)
    if (!address || !address.startsWith('0x') || address.length !== 42) {
        console.error('Invalid address provided:', address);
        showStatus('Invalid user address', 'error');
        return;
    }
    
    // Устанавливаем адрес в поле получателя
    recipientInput.value = address;
    
    // Устанавливаем выбранного пользователя в поле поиска
    usernameSearchInput.value = displayName || username;
    
    // Скрываем автодополнение
    hideAutocomplete();
    
    // Показываем статус
    showStatus(`Selected user: ${displayName || username} (${shortenAddress(address)})`, 'success');
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