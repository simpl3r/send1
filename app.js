import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import { getReferralTag, submitReferral } from 'https://esm.sh/@divvi/referral-sdk';

// Notify Farcaster SDK that the app is ready
// Call ready() immediately after importing the SDK
(async function() {
    try {
        await sdk.actions.ready({ disableNativeGestures: true });
        console.log('Farcaster SDK ready called successfully (native gestures disabled)');
        
        // Automatically add the mini app on initialization
        try {
            await sdk.actions.addMiniApp();
            console.log('Mini app automatically added');
        } catch (error) {
            console.log('Mini app already added or error:', error.message);
        }
    } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
    }
})();



// CELO contract address
const CELO_CONTRACT_ADDRESS = '0xAc8f5e96f45600a9a67b33C5F6f060FFf48353d6';
// sendCelo function selector (0x3f4dbf04)
const TRANSFER_FUNCTION_SELECTOR = '0x3f4dbf04';

// Divvi consumer address (your Divvi Identifier)
const DIVVI_CONSUMER_ADDRESS = '0xA2c408956988672D64562A23bb0eD1d247a03B98';

// API configuration
let NEYNAR_API_KEY = "NEYNAR_API_DOCS"; // Private key for notifications
let NEYNAR_SEARCH_API_KEY = "NEYNAR_API_DOCS"; // Public key for search
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

// Load configuration from server
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        NEYNAR_API_KEY = config.NEYNAR_API_KEY; // For notifications
        NEYNAR_SEARCH_API_KEY = config.NEYNAR_SEARCH_API_KEY; // For search
        console.log('API keys loaded:', {
            notifications: NEYNAR_API_KEY ? 'private' : 'public',
            search: NEYNAR_SEARCH_API_KEY ? 'public' : 'fallback'
        });
    } catch (error) {
        console.warn('Error loading configuration, using public keys:', error);
    }
}

// DOM элементы
const transferForm = document.getElementById('transferForm');
const walletInfo = document.getElementById('walletInfo');
const profileName = document.getElementById('profileName');
const profileUsername = document.getElementById('profileUsername');
const profileAvatar = document.getElementById('profileAvatar');
const balanceAmount = document.getElementById('balanceAmount');
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
const shareButton = document.getElementById('shareButton');
// Slider elements for Send CELO
const transferSlider = document.getElementById('transferSlider');
const sliderThumb = document.getElementById('sliderThumb');
const sliderProgress = transferSlider ? transferSlider.querySelector('.slider-progress') : null;
const sliderText = transferSlider ? transferSlider.querySelector('.slider-text') : null;


// Autocomplete state
let searchTimeout = null;
let currentSearchResults = [];
let selectedIndex = -1;
let currentAbortController = null;
let searchCache = new Map();

// CELO network parameters
const CELO_NETWORK = {
    chainId: '0xa4ec', // 42220 in hex
    chainName: 'Celo Mainnet',
    nativeCurrency: {
        name: 'CELO',
        symbol: 'CELO',
        decimals: 18
    },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://explorer.celo.org']
};

// App state
let userAccount = null;
let provider = null;



// App initialization
async function initApp() {
    try {
        // Load API keys configuration
        await loadConfig();
        
        // Get Ethereum provider from Farcaster SDK
        provider = await sdk.wallet.getEthereumProvider();
        console.log('Farcaster Ethereum provider obtained');
        
        // Set up event listeners
        setupEventListeners();
        
        // Auto-connect wallet per Farcaster Mini Apps best practices
        await autoConnectWallet();
    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('Application initialization error', 'error');
    }
}

// Event listeners setup
function setupEventListeners() {
    if (transferButton) {
        transferButton.addEventListener('click', sendTransaction);
    }
    if (transferSlider) {
        setupSlider();
    }
    sendToMyselfButton.addEventListener('click', fillMyAddress);
    increaseButton.addEventListener('click', increaseAmount);
    decreaseButton.addEventListener('click', decreaseAmount);

    // Autocomplete event handlers
    usernameSearchInput.addEventListener('input', handleSearchInput);
    usernameSearchInput.addEventListener('keydown', handleKeyNavigation);
    usernameSearchInput.addEventListener('focus', handleSearchFocus);
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideAutocomplete();
        }
    });
    
    // New handler: share app
    if (shareButton) {
        shareButton.addEventListener('click', shareApp);
    }
}

// Auto wallet connection per Farcaster Mini Apps best practices
async function autoConnectWallet() {
    try {
        showStatus('Connecting to wallet...', '');
        
        // Ensure provider is initialized
        if (!provider) {
            // Ignore wallet errors in local development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                showStatus('Local development mode - wallet not required', 'success');
                return;
            }
            showStatus('Wallet provider not available', 'error');
            return;
        }
        
        // In Farcaster Mini Apps the wallet is available automatically
        // First check existing connections
        let accounts = await provider.request({ method: 'eth_accounts' });
        
        // Request access if no connected accounts
        if (!accounts || accounts.length === 0) {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
        }
        
        if (accounts && accounts.length > 0) {
            userAccount = accounts[0];
            await switchToCeloNetwork();
            showStatus(`Wallet connected: ${shortenAddress(userAccount)}`, 'success');
            await updateBalanceDisplay();
        } else {
            showStatus('Wallet connection required', 'error');
        }
    } catch (error) {
        console.error('Auto wallet connection error');
        // Ignore wallet errors in local development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showStatus('Local development mode - wallet errors ignored', 'success');
            return;
        }
        showStatus('Wallet connection failed', 'error');
    }
}

// Connect wallet (manual fallback)
async function connectWallet() {
    try {
        await autoConnectWallet();
    } catch (error) {
        console.error('Wallet connection error:', error);
        showStatus('Failed to connect to wallet', 'error');
    }
}

// Switch to CELO network
async function switchToCeloNetwork() {
    try {
        // Attempt to switch to CELO network
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CELO_NETWORK.chainId }],
        });
    } catch (switchError) {
        // If network not found, add it
        if (switchError && switchError.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [CELO_NETWORK],
                });
            } catch (addError) {
                console.error('Error adding CELO network:', addError);
                showStatus('Failed to add CELO network', 'error');
            }
        } else {
            console.error('Error switching to CELO network:', switchError);
            showStatus('Failed to switch to CELO network', 'error');
        }
    }
}

// Fill with current user's address
function fillMyAddress() {
    if (userAccount) {
        recipientInput.value = userAccount;
        // Clear username search field
        usernameSearchInput.value = '';
        // Clear selected users
        selectedUsers = [];
        // Update selected users display
        updateSelectedUsersDisplay();
        // Hide autocomplete
        hideAutocomplete();
    }
}

// Increase amount
function increaseAmount() {
    try { if (sdk?.haptics?.selectionChanged) sdk.haptics.selectionChanged(); } catch (_) {}
    const currentValue = parseFloat(amountInput.value) || 0;
    const newValue = (currentValue + 0.001).toFixed(3);
    amountInput.value = newValue;
}

// Decrease amount
function decreaseAmount() {
    try { if (sdk?.haptics?.selectionChanged) sdk.haptics.selectionChanged(); } catch (_) {}
    const currentValue = parseFloat(amountInput.value) || 0;
    const newValue = Math.max(0.001, currentValue - 0.001).toFixed(3);
    amountInput.value = newValue;
}

// Estimate gas cost
async function estimateGasCost() {
    try {
        // Get current gas price
        const gasPrice = await provider.request({
            method: 'eth_gasPrice',
            params: []
        });
        
        // Use a fixed gas limit of 200,000
        const gasLimit = 200000;
        
        // Calculate gas cost in wei
        const gasCostWei = ethers.BigNumber.from(gasPrice).mul(gasLimit);
        
        // Convert to CELO
        const gasCostCelo = parseFloat(ethers.utils.formatEther(gasCostWei));
        
        return {
            gasCostWei,
            gasCostCelo,
            gasPrice,
            gasLimit
        };
    } catch (error) {
        console.error('Error estimating gas cost:', error);
        // Return a conservative estimate
        return {
            gasCostWei: ethers.utils.parseEther('0.001'), // 0.001 CELO
            gasCostCelo: 0.001,
            gasPrice: '0x3B9ACA00', // 1 Gwei
            gasLimit: 200000
        };
    }
}

// Send transaction
async function sendTransaction() {
    try {
        // Ensure all fields are filled
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

        showStatus('Checking balance and estimating fees...', '');
        
        // Get current balance
        const currentBalance = await getCeloBalance(userAccount);
        
        // Estimate gas cost
        const gasEstimate = await estimateGasCost();
        
        // Check sufficient funds for amount + fee
        const totalRequired = parseFloat(amount) + gasEstimate.gasCostCelo;
        
        if (currentBalance < totalRequired) {
            const shortfall = (totalRequired - currentBalance).toFixed(6);
            showStatus(`Insufficient balance. You need ${totalRequired.toFixed(6)} CELO (${amount} + ${gasEstimate.gasCostCelo.toFixed(6)} gas fee), but have only ${currentBalance.toFixed(6)} CELO. Missing: ${shortfall} CELO`, 'error');
            return;
        }
        
        showStatus('Preparing transaction...', '');
        
        // Convert amount to wei (18 decimals for CELO)
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        // Encode data to call sendCelo
        // sendCelo takes one parameter: recipient address
        const paddedAddress = recipient.slice(2).padStart(64, '0');
        let data = `${TRANSFER_FUNCTION_SELECTOR}${paddedAddress}`;
        
        // Generate referral tag for the user (Step 2 from example)
        try {
            const referralTag = getReferralTag({
                user: userAccount, // Address of the user making the transaction
                consumer: DIVVI_CONSUMER_ADDRESS, // Your Divvi Identifier
            });
            
            // Append referral tag to data for attribution tracking (Step 3)
            data = data + referralTag;
            
            console.log('=== DIVVI REFERRAL DEBUG ===');
            console.log('User address:', userAccount);
            console.log('Consumer address:', DIVVI_CONSUMER_ADDRESS);
            console.log('Referral tag:', referralTag);
            console.log('Final transaction data:', data);
            console.log('=== END DEBUG ===');
            
        } catch (error) {
            console.error('Error creating referral tag:', error);
            // Continue without referral tag if an error occurred
        }
        
        console.log('Amount:', amount);
        console.log('Amount in Wei:', amountInWei.toString());
        console.log('Transaction data:', data);
        
        // Create transaction with referral tag in data field
        const transactionParameters = {
            from: userAccount, // Use from for ethers.js
            to: CELO_CONTRACT_ADDRESS,
            data: data, // data already contains the referral tag
            value: `0x${amountInWei.toHexString().slice(2)}`, // Pass the amount in value for sendCelo
            gas: `0x${gasEstimate.gasLimit.toString(16)}`, // Use the estimated gas limit
            gasPrice: gasEstimate.gasPrice, // Use the current gas price
        };
        
        showStatus('Confirm transaction in your wallet...', '');
        
        // Send the transaction
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
        });
        
        const explorerUrl = `https://celoscan.io/tx/${txHash}`;
        const shortHash = `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 6)}`;
        const linkMessage = `Transaction sent! <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" onclick="window.open('${explorerUrl}', '_blank'); return false;" style="color: #00d4aa; text-decoration: underline;">${shortHash}</a>`;
        showStatus(linkMessage, 'success', true);
        try { if (sdk?.haptics?.notificationOccurred) sdk.haptics.notificationOccurred('success'); } catch (_) {}
        
        // Get the chain ID where the transaction was sent (Step 4)
        const chainId = 42220; // CELO mainnet chain ID
        
        // Submit transaction to Divvi for referral tracking (Step 5)
        try {
            await submitReferral({
                txHash,
                chainId,
            });
            console.log('Referral data sent to Divvi');
        } catch (divviError) {
            console.error('Error submitting referral data:', divviError);
            // Do not show error to user since the transaction already went through
        }
        
        // Update balance after successful transaction
        setTimeout(async () => {
            await updateBalanceDisplay();
        }, 2000); // Wait 2 seconds for confirmation

        // Wait for confirmation and give short haptic feedback
        (async () => {
            try {
                const timeoutMs = 30000; // max 30 seconds
                const intervalMs = 1500;
                const start = Date.now();
                let receipt = null;
                while (Date.now() - start < timeoutMs) {
                    receipt = await provider.request({
                        method: 'eth_getTransactionReceipt',
                        params: [txHash]
                    });
                    if (receipt && receipt.status === '0x1') break;
                    await new Promise(r => setTimeout(r, intervalMs));
                }
                if (receipt && receipt.status === '0x1') {
                    try { if (sdk?.haptics?.selectionChanged) sdk.haptics.selectionChanged(); } catch (_) {}
                }
            } catch (_) {}
        })();
    } catch (error) {
        console.error('Error sending transaction:', error);
        showStatus('Error sending transaction', 'error');
    }
}

// Helper functions
function showStatus(message, type, isHTML = false) {
    // Hide wallet-connection status messages
    const walletStatusMessages = [
        'Wallet connected:',
        'Wallet connection failed',
        'Wallet connection required',
        'Local development mode - wallet errors ignored'
    ];
    
    // Check if message is a wallet status
    const isWalletStatus = walletStatusMessages.some(walletMsg => 
        message.includes(walletMsg)
    );
    
    if (isWalletStatus) {
        // Hide status element for wallet messages
        statusElement.style.display = 'none';
        return;
    }
    
    // Show status element for other messages
    statusElement.style.display = 'block';
    
    if (isHTML) {
        statusElement.innerHTML = message;
    } else {
        statusElement.textContent = message;
    }


}

function shortenAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Get CELO balance
async function getCeloBalance(address) {
    try {
        const balance = await provider.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        });
        
        // Convert from wei to CELO (18 decimals)
        const balanceInCelo = parseFloat(ethers.utils.formatEther(balance));
        return balanceInCelo;
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

// Update balance display
async function updateFarcasterProfile() {
    try {
        const context = await sdk.context;
        if (context && context.user) {
            const user = context.user;
            
            // Show display name or username
            profileName.textContent = user.displayName || user.username || 'Farcaster User';
            
            // Show username with @
            if (user.username) {
                profileUsername.textContent = `@${user.username}`;
                profileUsername.style.display = 'block';
            } else {
                profileUsername.style.display = 'none';
            }
            
            // Show avatar
            if (user.pfpUrl) {
                profileAvatar.src = user.pfpUrl;
                profileAvatar.style.display = 'block';
            } else {
                profileAvatar.style.display = 'none';
            }
            
            console.log('Farcaster profile loaded:', user);
        } else {
            // If Farcaster user data is missing
            profileName.textContent = 'Not connected';
            profileUsername.style.display = 'none';
            profileAvatar.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading Farcaster profile:', error);
        profileName.textContent = 'Profile unavailable';
        profileUsername.style.display = 'none';
        profileAvatar.style.display = 'none';
    }
}

function updateWalletDisplay() {
    updateFarcasterProfile();
}

async function updateBalanceDisplay() {
    updateWalletDisplay();
    
    if (!userAccount) {
        balanceAmount.textContent = '-';
        return;
    }
    
    try {
        balanceAmount.textContent = 'Loading...';
        const balance = await getCeloBalance(userAccount);
        balanceAmount.textContent = `${balance.toFixed(4)} CELO`;
    } catch (error) {
        console.error('Error updating balance:', error);
        balanceAmount.textContent = 'Error loading balance';
    }
}

// Autocomplete functions
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Clear previous timer
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Cancel previous request
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    
    if (query.length === 0) {
        hideAutocomplete();
        return;
    }
    
    if (query.length < 3) {
        return; // Minimum 3 characters for search (per Neynar docs)
    }
    
    // Check cache
    if (searchCache.has(query)) {
        const cachedResults = searchCache.get(query);
        if (cachedResults.length > 0) {
            currentSearchResults = cachedResults;
            displayAutocompleteResults(currentSearchResults);
        } else {
            currentSearchResults = [];
            showNoResults();
        }
        return;
    }
    
    // Debounce - wait 300ms after last input
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
    if (query.length >= 3 && currentSearchResults.length > 0) {
        showAutocomplete();
    }
}

function updateSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            // Scroll to the selected item
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
    
    // Create a new AbortController for this request
    currentAbortController = new AbortController();
    
    try {
        const users = await searchMultipleUsers(query, currentAbortController.signal);
        
        // Cache the results
        searchCache.set(query, users || []);
        
        if (users && users.length > 0) {
            currentSearchResults = users;
            displayAutocompleteResults(currentSearchResults);
        } else {
            currentSearchResults = [];
            showNoResults();
        }
    } catch (error) {
        // Ignore request abort errors
        if (error.name === 'AbortError') {
            console.log('Search request was aborted');
            return;
        }
        
        console.error('Search error:', error);
        showStatus('Search failed. Please try again.', 'error');
        hideAutocomplete();
    } finally {
        currentAbortController = null;
    }
}



// New function to search multiple users
async function searchMultipleUsers(query, signal) {
    try {
        // Remove @ if present
        const cleanQuery = query.replace('@', '').toLowerCase();
        
        console.log('Searching multiple users via Neynar API:', cleanQuery);
        
        // Get viewer FID from SDK (if available)
        let viewerFid = null;
        try {
            const context = await sdk.context;
            if (context && context.user && context.user.fid) {
                viewerFid = context.user.fid;
            }
        } catch (e) {
            console.log('Could not get viewer FID from SDK:', e.message);
        }
        
        // Build URL with parameters
        let searchUrl = `${NEYNAR_BASE_URL}/farcaster/user/search?q=${encodeURIComponent(cleanQuery)}&limit=10`;
        if (viewerFid) {
            searchUrl += `&viewer_fid=${viewerFid}`;
            console.log('Using viewer_fid:', viewerFid);
        }
        
        // Use Neynar API search endpoint for multiple results
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api_key': NEYNAR_SEARCH_API_KEY
            },
            signal: signal
        });
        
        console.log('Neynar search API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Neynar search API response:', data);
            
            if (data.result && data.result.users && data.result.users.length > 0) {
                const users = data.result.users.map(user => {
                    console.log('Processing user from search:', user);
                    
                    // Address priority for Primary Farcaster Wallet:
                    let walletAddress = null;
                    
                    // Priority 1: verified_addresses.primary.eth_address - Primary Farcaster Wallet
                    if (user.verified_addresses && 
                        user.verified_addresses.primary && 
                        user.verified_addresses.primary.eth_address) {
                        walletAddress = user.verified_addresses.primary.eth_address;
                        console.log('Using primary verified eth address:', walletAddress);
                    }
                    // Priority 2: First address from verified_addresses.eth_addresses as fallback
                    else if (user.verified_addresses && 
                            user.verified_addresses.eth_addresses && 
                            user.verified_addresses.eth_addresses.length > 0) {
                        walletAddress = user.verified_addresses.eth_addresses[0];
                        console.log('Using first verified eth address as fallback:', walletAddress);
                    }
                    // Priority 3: Custody address as additional fallback
                    else if (user.custody_address && user.custody_address.startsWith('0x')) {
                        walletAddress = user.custody_address;
                        console.log('Using custody address as fallback:', walletAddress);
                    }
                    // Priority 4: FID-based address as last fallback
                    else {
                        const fidHex = user.fid.toString(16).padStart(8, '0');
                        walletAddress = '0x' + fidHex.padEnd(40, '0');
                        console.log('Using FID-based address as last fallback:', walletAddress);
                    }
                    
                    return {
                        username: user.username,
                        fid: user.fid,
                        address: walletAddress,
                        displayName: user.display_name,
                        pfpUrl: user.pfp_url,
                        // Add metrics for sorting
                        neynarScore: user.experimental?.neynar_user_score || 0,
                        followerCount: user.follower_count || 0,
                        powerBadge: user.power_badge || false,
                        verifiedAddresses: user.verified_addresses?.eth_addresses?.length || 0
                    };
                });
                
                // Sort results by user quality
                users.sort((a, b) => {
                    // Priority 1: Power Badge
                    if (a.powerBadge !== b.powerBadge) {
                        return b.powerBadge - a.powerBadge;
                    }
                    
                    // Priority 2: Neynar Score (user quality)
                    if (Math.abs(a.neynarScore - b.neynarScore) > 0.1) {
                        return b.neynarScore - a.neynarScore;
                    }
                    
                    // Priority 3: Number of verified addresses
                    if (a.verifiedAddresses !== b.verifiedAddresses) {
                        return b.verifiedAddresses - a.verifiedAddresses;
                    }
                    
                    // Priority 4: Follower count
                    return b.followerCount - a.followerCount;
                });
                
                console.log('Processed and sorted users:', users);
                return users;
            }
        } else {
            console.log('Neynar search API failed with status:', response.status);
            const errorText = await response.text().catch(() => 'Unknown error');
            console.log('Error response:', errorText);
        }
        
        // Return empty array if Neynar API returned no results
        console.log('No results from Neynar API');
        return [];
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Search request was aborted');
            return [];
        }
        
        console.error('Error in searchMultipleUsers:', error);
        
        // Inspect error type for better diagnostics
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.log('Network error detected with Neynar API');
        } else if (error.message.includes('API key')) {
            console.error('API key issue detected');
        }
        
        // Return empty array on Neynar API error
        return [];
    }
}

async function searchByUsername(username) {
    try {
        // Remove @ if present
        const cleanUsername = username.replace('@', '').toLowerCase();
        
        console.log('Searching user via Neynar API:', cleanUsername);
        
        // Use only Neynar API per documentation
        const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/by_username?username=${cleanUsername}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api_key': NEYNAR_SEARCH_API_KEY
            }
        });
        
        console.log('Neynar API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Neynar API response:', data);
            
            if (data.user) {
                const user = data.user;
                console.log('User data from Neynar:', user);
                
                // Per Neynar API, address priority for Primary Farcaster Wallet:
                // 1. verified_addresses.primary.eth_address - Primary Farcaster Wallet
                // 2. First address from verified_addresses.eth_addresses - as fallback
                // 3. Custody address - as additional fallback
                // 4. FID-based address - as last fallback
                let walletAddress = null;
                
                console.log('User custody_address:', user.custody_address);
                console.log('User verified_addresses:', user.verified_addresses);
                
                // Priority 1: Primary Farcaster Wallet from verified_addresses.primary.eth_address
                if (user.verified_addresses && 
                    user.verified_addresses.primary && 
                    user.verified_addresses.primary.eth_address && 
                    user.verified_addresses.primary.eth_address.startsWith('0x')) {
                    walletAddress = user.verified_addresses.primary.eth_address;
                    console.log('Using Primary Farcaster Wallet:', walletAddress);
                }
                // Priority 2: First verified Ethereum address as fallback
                else if (user.verified_addresses && 
                    user.verified_addresses.eth_addresses && 
                    Array.isArray(user.verified_addresses.eth_addresses) && 
                    user.verified_addresses.eth_addresses.length > 0) {
                    walletAddress = user.verified_addresses.eth_addresses[0];
                    console.log('Using first verified eth address as fallback:', walletAddress);
                }
                // Priority 3: Custody address as additional fallback
                else if (user.custody_address && user.custody_address.startsWith('0x')) {
                    walletAddress = user.custody_address;
                    console.log('Using custody address as fallback:', walletAddress);
                }
                // Priority 4: FID-based address as last fallback
                else {
                    // Create deterministic address based on FID
                    const fidHex = user.fid.toString(16).padStart(8, '0');
                    walletAddress = '0x' + fidHex.padEnd(40, '0');
                    console.log('Using FID-based address as last fallback:', walletAddress);
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
        
        console.log('Neynar API returned no results for user:', cleanUsername);
        return null;
        
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
        // Use pfpUrl if available, otherwise first username letter
        const avatarContent = user.pfpUrl 
            ? `<img src="${user.pfpUrl}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
            : user.username.charAt(0).toUpperCase();
        
        // Use displayName if available, otherwise username
        const displayName = user.displayName || user.username;
        
        // Create badges for user
        const badges = [];
        if (user.power_badge) {
            badges.push('<span class="badge badge-power">⚡ Power</span>');
        }
        if (user.verified_addresses && user.verified_addresses.eth_addresses && user.verified_addresses.eth_addresses.length > 0) {
            badges.push('<span class="badge badge-verified">✓ Verified</span>');
        }
        if (user.follower_count && user.follower_count > 1000) {
            const followerText = user.follower_count > 1000000 
                ? `${(user.follower_count / 1000000).toFixed(1)}M` 
                : `${(user.follower_count / 1000).toFixed(1)}K`;
            badges.push(`<span class="badge badge-follower-count">👥 ${followerText}</span>`);
        }
        
        const badgesHtml = badges.length > 0 ? `<div class="user-badges">${badges.join('')}</div>` : '';
        
        // Show Neynar User Score if available
        const userScore = user.neynar_user_score ? `<div class="user-score">${user.neynar_user_score}</div>` : '';
        
        return `
            <div class="autocomplete-item" data-user-index="${index}">
                ${userScore}
                <div class="autocomplete-avatar">${avatarContent}</div>
                <div class="autocomplete-info">
                    <div class="autocomplete-username">${displayName}</div>
                    <div class="autocomplete-details">
                        <span class="autocomplete-handle">@${user.username}</span>
                        <span class="autocomplete-address">${shortenAddress(user.address)}</span>
                    </div>
                    ${badgesHtml}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event handlers for each result item
    const resultItems = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    resultItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const user = users[index];
            selectUser(user.address, user.username, user.displayName || user.username, user.pfpUrl);
        });
    });
}

// Array to store selected users
let selectedUsers = [];

function selectUser(address, username, displayName, pfpUrl) {
    console.log('Selecting user:', { address, username, displayName, pfpUrl });
    
    // Validate address format (simple check)
    if (!address || !address.startsWith('0x') || address.length !== 42) {
        console.error('Invalid address provided:', address);
        showStatus('Invalid user address', 'error');
        return;
    }
    
    // Replace current selected user with new one (single selection)
    const user = {
        address,
        username,
        displayName: displayName || username,
        pfpUrl
    };
    selectedUsers = [user];
    
    // Set address to recipient input
    recipientInput.value = address;
    
    // Clear search field
    usernameSearchInput.value = '';
    
    // Hide autocomplete
    hideAutocomplete();
    
    // Update selected user display
    updateSelectedUsersDisplay();
    
    // On mobile, blur to collapse keyboard
    if (window.innerWidth <= 768) {
        usernameSearchInput.blur();
        // Additionally hide keyboard with a small delay
        setTimeout(() => {
            document.activeElement.blur();
        }, 100);
    } else {
        // On desktop, focus back to search for convenience
        usernameSearchInput.focus();
    }
    
    // Show status
    showStatus(`Selected user: ${displayName || username}`, 'success');
}

function updateSelectedUsersDisplay() {
    const container = document.getElementById('selectedUsers');
    
    if (selectedUsers.length === 0) {
        container.innerHTML = '';
        // Update placeholder when no user is selected
        usernameSearchInput.placeholder = 'Search Farcaster user...';
        return;
    }
    
    // Update placeholder when a user is selected
    usernameSearchInput.placeholder = 'Change user...';
    
    const user = selectedUsers[0]; // Single user only
    const avatarSrc = user.pfpUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=f1f5f9&color=334155&size=24`;
    
    container.innerHTML = `
        <div class="user-chip" data-user-index="0">
             <img src="${avatarSrc}" alt="${user.username}" class="user-chip-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=f1f5f9&color=334155&size=24'">
             <span class="user-chip-name">${user.displayName}</span>
             <button class="user-chip-remove" onclick="removeSelectedUser(0)" title="Remove user">×</button>
         </div>
    `;
}

function removeSelectedUser(index) {
    selectedUsers.splice(index, 1);
    updateSelectedUsersDisplay();
    
    // If there are selected users, set the last one to recipient input
    if (selectedUsers.length > 0) {
        recipientInput.value = selectedUsers[selectedUsers.length - 1].address;
    } else {
        recipientInput.value = '';
    }
    
    showStatus('User removed', 'success');
}



// Make function globally available for onclick
window.removeSelectedUser = removeSelectedUser;

// Load ethers.js from a reliable CDN for Ethereum
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
script.onload = initApp;
script.onerror = function() {
    console.error('Failed to load ethers.js');
    showStatus('Error loading required libraries', 'error');
};
document.body.appendChild(script);



function shareApp() {
    try {
        const origin = window.location.origin;
        const shareUrl = origin + '/';
        const shareText = '🚀 CELO Sender — send CELO to friends in one click! Builded by @s1mpl3r';

        // Prefer official SDK method: open composer with text and embed
        if (sdk?.actions?.composeCast) {
            sdk.actions.composeCast({
                text: shareText,
                embeds: [shareUrl],
            })
            .then((result) => {
                if (result?.cast) {
                    showStatus('Post composed', 'success');
                } else {
                    showStatus('Share cancelled', '');
                }
            })
            .catch((err) => {
                console.warn('composeCast failed, falling back to web share or composer URL', err);
                fallbackShare();
            });
            return;
        }

        // Fallbacks if composeCast is unavailable
        fallbackShare();

        function fallbackShare() {
            // Use Warpcast domain for composer
            const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
            const isWarpcast = /Warpcast/i.test(navigator.userAgent) || /Farcaster/i.test(navigator.userAgent);

            if (navigator.share && !isWarpcast) {
                navigator.share({ title: 'CELO Sender', text: shareText, url: shareUrl })
                    .then(() => showStatus('Shared successfully', 'success'))
                    .catch((err) => {
                        console.warn('Share failed, falling back to compose link', err);
                        window.open(composeUrl, '_blank');
                    });
            } else {
                window.open(composeUrl, '_blank');
            }
        }
    } catch (error) {
        console.error('Share error:', error);
        showStatus('Failed to initiate share', 'error');
    }
}

// Slider interactions to send CELO on successful slide
function setupSlider() {
    if (!transferSlider || !sliderThumb || !sliderProgress) return;
    let trackRect = null;
    const threshold = 0.85; // 85% of track width to confirm

    // rAF-driven rendering for smoother updates
    let rafId = null;
    let isDragging = false;
    let pendingX = 0;
    let lastHapticStep = -1;

    function render() {
        if (!isDragging || !trackRect) return;
        const clamped = Math.max(0, Math.min(pendingX, trackRect.width));
        const percent = (clamped / trackRect.width) * 100;
        // GPU-friendly transform
        sliderProgress.style.width = `${percent}%`;
        sliderThumb.style.transform = `translate3d(${clamped}px, -50%, 0)`;
        try {
            if (sdk?.haptics?.selectionChanged && isDragging) {
                const step = Math.floor(percent / 5);
                if (step !== lastHapticStep) {
                    sdk.haptics.selectionChanged();
                    lastHapticStep = step;
                }
            }
        } catch (_) {}
        rafId = requestAnimationFrame(render);
    }

    function startLoop() {
        if (rafId == null) rafId = requestAnimationFrame(render);
    }

    function stopLoop() {
        if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function onMove(e) {
        pendingX = e.clientX - trackRect.left;
    }

    async function onUp(e) {
        isDragging = false;
        stopLoop();
        lastHapticStep = -1;
        transferSlider.classList.remove('dragging');
        transferSlider.removeEventListener('pointermove', onMove);
        const finalX = e.clientX - trackRect.left;
        const confirmed = finalX >= trackRect.width * threshold;
        if (confirmed) {
            transferSlider.classList.add('success');
            sliderProgress.style.width = '100%';
            try { if (sdk?.haptics?.impactOccurred) sdk.haptics.impactOccurred('heavy'); } catch (_) {}

            try {
                await sendTransaction();
            } finally {
                setTimeout(() => {
                    transferSlider.classList.remove('success');
                    sliderProgress.style.width = '0%';
                    sliderThumb.style.transform = 'translate3d(0px, -50%, 0)';
                }, 800);
            }
        } else {
            sliderProgress.style.width = '0%';
            sliderThumb.style.transform = 'translate3d(0px, -50%, 0)';
        }
    }

    transferSlider.addEventListener('pointerdown', (e) => {
        transferSlider.classList.add('dragging');
        try { if (sdk?.haptics?.impactOccurred) sdk.haptics.impactOccurred('medium'); } catch (_) {}
        // Prevent default gestures and ensure continuous events
        transferSlider.setPointerCapture(e.pointerId);
        trackRect = transferSlider.getBoundingClientRect();
        isDragging = true;
        pendingX = e.clientX - trackRect.left;
        transferSlider.addEventListener('pointermove', onMove);
        transferSlider.addEventListener('pointerup', onUp, { once: true });
        transferSlider.addEventListener('pointercancel', onUp, { once: true });
        startLoop();
    });

}
