const API_BASE_URL = window.location.origin;

const passwordInput = document.getElementById('passwordInput');
const checkButton = document.getElementById('checkButton');
const togglePassword = document.getElementById('togglePassword');
const results = document.getElementById('results');
const resultContent = document.getElementById('resultContent');

function censorPassword(password) {
    if (!password || password.length === 0) {
        return '';
    }
    
    if (password.length <= 2) {
        return '•'.repeat(password.length);
    }
    
    const firstChar = password[0];
    const lastChar = password[password.length - 1];
    const middleLength = password.length - 2;
    
    return firstChar + '•'.repeat(middleLength) + lastChar;
}

function formatNumber(num) {
    return num.toLocaleString();
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

async function checkPassword(password) {
    if (!password) {
        showError('Please enter a password');
        return;
    }
    
    checkButton.disabled = true;
    checkButton.textContent = 'Checking...';
    
    try {
        const hash = sha1(password);
        const hashPrefix = hash.substring(0, 5);
        const hashSuffix = hash.substring(5);
        
        const response = await fetch(`${API_BASE_URL}/api/range/${hashPrefix}`);
        
        if (!response.ok) {
            throw new Error('Failed to check password');
        }
        
        const data = await response.json();
        
        let found = false;
        let breachCount = 0;
        
        for (const match of data.matches) {
            if (match.suffix === hashSuffix) {
                found = true;
                breachCount = match.count;
                break;
            }
        }
        
        displayResult(password, found, breachCount);
        
    } catch (error) {
        showError('An error occurred while checking the password: ' + error.message);
    } finally {
        checkButton.disabled = false;
        checkButton.textContent = 'Check Password';
    }
}

function displayResult(password, isCompromised, breachCount) {
    const censoredPassword = censorPassword(password);
    
    results.classList.remove('hidden', 'result-safe', 'result-danger');
    
    if (isCompromised) {
        results.classList.add('result-danger');
        resultContent.innerHTML = `
            <div class="result-icon">⚠️</div>
            <div class="result-title">Password Compromised!</div>
            <div class="result-message">
                This password has been found in data breaches and should NOT be used.
            </div>
            <div class="password-display censored">
                Password: <span class="censored">${censoredPassword}</span>
            </div>
            <div class="breach-count">
                <strong>${formatNumber(breachCount)}</strong>
                times in known breaches
            </div>
            <div class="result-message" style="margin-top: 15px;">
                <strong>Recommendation:</strong> Change this password immediately on all accounts where you use it.
            </div>
        `;
    } else {
        results.classList.add('result-safe');
        resultContent.innerHTML = `
            <div class="result-icon">✅</div>
            <div class="result-title">Password Not Found</div>
            <div class="result-message">
                Good news! This password was not found in our database of known breaches.
            </div>
            <div class="password-display censored">
                Password: <span class="censored">${censoredPassword}</span>
            </div>
            <div class="result-message" style="margin-top: 15px;">
                <strong>Note:</strong> While not found in breaches, always use strong, unique passwords for each account.
            </div>
        `;
    }
}

function showError(message) {
    results.classList.remove('hidden', 'result-safe', 'result-danger');
    results.classList.add('result-danger');
    resultContent.innerHTML = `
        <div class="result-icon">❌</div>
        <div class="result-title">Error</div>
        <div class="result-message">${message}</div>
    `;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        const data = await response.json();
        
        document.getElementById('totalPasswords').textContent = formatNumber(data.total_passwords);
        document.getElementById('totalBreaches').textContent = formatNumber(data.total_breaches);
        document.getElementById('lastUpdated').textContent = formatDate(data.last_updated);
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('totalPasswords').textContent = 'Error';
        document.getElementById('totalBreaches').textContent = 'Error';
        document.getElementById('lastUpdated').textContent = 'Error';
    }
}

checkButton.addEventListener('click', () => {
    const password = passwordInput.value;
    checkPassword(password);
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const password = passwordInput.value;
        checkPassword(password);
    }
});

togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

loadStats();

console.log('Password Leak Checker initialized');
console.log('Privacy notice: Your password is hashed locally and never sent to the server in plain text.');
