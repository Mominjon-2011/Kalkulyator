let display = document.getElementById('display');
let currentInput = '';

function append(value) {
    if (currentInput === '' && value === '/') return;
    currentInput += value;
    display.innerText = currentInput;
}

function clearDisplay() {
    currentInput = '';
    display.innerText = '0';
}

function deleteChar() {
    currentInput = currentInput.slice(0, -1);
    display.innerText = currentInput || '0';
}

function calculate() {
    try {
        currentInput = eval(currentInput).toString();
        display.innerText = currentInput;
    } catch {
        display.innerText = 'Xato';
        currentInput = '';
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (tab === 'calc') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('calculator').style.display = 'block';
        document.getElementById('converter').style.display = 'none';
    } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('calculator').style.display = 'none';
        document.getElementById('converter').style.display = 'flex';
    }
}

function convertCurrency() {
    const usd = document.getElementById('usdInput').value;
    const rate = 12600; // Kursni o'zgartirishingiz mumkin
    const uzs = (usd * rate).toLocaleString();
    document.getElementById('resultText').innerText = `${uzs} UZS`;
}