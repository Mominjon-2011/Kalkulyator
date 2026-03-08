// Global o'zgaruvchilar
let display = document.getElementById('display');
let currentInput = '';
let currentUSDrate = 12650.34; // Standart kurs (oxirgi real kurs)
let lastUpdate = null;
let updateCounter = 0;

// Kalkulyator funksiyalari
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
        
        // Valyuta tabiga o'tganda kursni yangilash
        updateExchangeRate();
        showUpdatingAnimation();
    }
}

// Yangilanayotgan animatsiyasi
function showUpdatingAnimation() {
    const rateInfo = document.getElementById('rateInfo');
    rateInfo.style.opacity = '0.7';
    rateInfo.classList.add('updating');
    setTimeout(() => {
        rateInfo.style.opacity = '1';
        rateInfo.classList.remove('updating');
    }, 1000);
}

// Keshga kursni saqlash
function saveRateToCache(rate, date) {
    try {
        localStorage.setItem('usdRate', rate.toString());
        localStorage.setItem('usdRateDate', date);
        localStorage.setItem('usdRateTimestamp', Date.now().toString());
    } catch (e) {
        console.log('Keshga saqlashda xatolik:', e);
    }
}

// Keshdan kursni olish
function getRateFromCache() {
    try {
        const rate = localStorage.getItem('usdRate');
        const date = localStorage.getItem('usdRateDate');
        const timestamp = localStorage.getItem('usdRateTimestamp');
        
        if (rate && date && timestamp) {
            const cacheAge = (Date.now() - parseInt(timestamp)) / (1000 * 60); // daqiqada
            return {
                rate: parseFloat(rate),
                date: date,
                age: cacheAge
            };
        }
    } catch (e) {
        console.log('Keshdan olishda xatolik:', e);
    }
    return null;
}

// VALYUTA KURSLARINI HAR 5 DAQIQA YANGILASH (6 xil API bilan)
async function updateExchangeRate() {
    const rateInfo = document.getElementById('rateInfo');
    const now = new Date();
    updateCounter++;
    
    // Toshkent vaqti
    const timeString = now.toLocaleString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Tashkent' 
    });
    
    const dateString = now.toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Tashkent'
    });
    
    // Keshdan tekshirish
    const cached = getRateFromCache();
    if (cached && cached.age < 5) {
        // Agar 5 daqiqadan kam bo'lsa, keshdan ishlat
        currentUSDrate = cached.rate;
        rateInfo.innerHTML = `📦 Kurs: 1 USD = ${currentUSDrate.toLocaleString()} UZS (Kesh - ${cached.date})`;
        convertCurrency();
        showNextUpdateTime();
        return;
    }
    
    // Yangilanayotgan belgisi
    rateInfo.innerHTML = `🔄 Yangilanmoqda (${updateCounter})...`;
    
    // 6 xil API ro'yxati (ishonchlilik uchun)
    const apis = [
        {
            name: 'Currency API',
            url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
            parser: (data) => data.usd?.uzs
        },
        {
            name: 'ExchangeRate-API',
            url: 'https://api.exchangerate-api.com/v4/latest/USD',
            parser: (data) => data.rates?.UZS
        },
        {
            name: 'Frankfurter',
            url: 'https://api.frankfurter.app/latest?from=USD&to=UZS',
            parser: (data) => data.rates?.UZS
        },
        {
            name: 'CurrencyBeacon',
            url: 'https://api.currencybeacon.com/v1/latest?api_key=free&base=USD&symbols=UZS',
            parser: (data) => data.rates?.UZS
        },
        {
            name: 'ExchangeRate-Host',
            url: 'https://api.exchangerate.host/latest?base=USD&symbols=UZS',
            parser: (data) => data.rates?.UZS
        },
        {
            name: 'Markaziy Bank (API)',
            url: 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/',
            parser: (data) => {
                // CBU dan USD kursini olish
                if (Array.isArray(data)) {
                    const usd = data.find(item => item.Ccy === 'USD');
                    return usd?.Rate;
                }
                return null;
            }
        }
    ];
    
    let success = false;
    
    // Har bir API ni ketma-ket sinab ko'rish
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        
        try {
            console.log(`🔄 Sinab ko'rilmoqda: ${api.name}`);
            
            // Timeout bilan fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 soniya timeout
            
            const response = await fetch(api.url, { 
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const rate = api.parser(data);
                
                if (rate && !isNaN(rate) && rate > 0) {
                    // Kursni saqlash (2 xonali kasr bilan)
                    currentUSDrate = Math.round(rate * 100) / 100;
                    lastUpdate = now;
                    
                    // Keshga saqlash
                    saveRateToCache(currentUSDrate, `${dateString} ${timeString}`);
                    
                    rateInfo.innerHTML = `✅ ${api.name}: 1 USD = ${currentUSDrate.toLocaleString()} UZS (${dateString} ${timeString})`;
                    convertCurrency();
                    showNextUpdateTime();
                    
                    success = true;
                    break; // Ishlasa, to'xtatamiz
                }
            }
        } catch (error) {
            console.log(`❌ ${api.name} ishlamadi:`, error.message);
            // Davom etamiz keyingi API ga
        }
    }
    
    // Agar hech qanday API ishlamasa
    if (!success) {
        console.log('⚠️ Barcha API lar ishlamadi');
        
        // Keshdan olish (agar bo'lsa)
        if (cached) {
            currentUSDrate = cached.rate;
            rateInfo.innerHTML = `⚠️ Kurs: 1 USD = ${currentUSDrate.toLocaleString()} UZS (Kesh - ${cached.date})`;
        } else {
            // Default kurs (eng so'nggi real kurs)
            currentUSDrate = 12650.34;
            rateInfo.innerHTML = `⚠️ Kurs: 1 USD = ${currentUSDrate.toLocaleString()} UZS (Standart - ${dateString})`;
        }
        
        convertCurrency();
        showNextUpdateTime();
    }
}

// Keyingi yangilanish vaqtini ko'rsatish
function showNextUpdateTime() {
    const rateInfo = document.getElementById('rateInfo');
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 5 * 60000); // 5 daqiqa keyin
    const nextTimeString = nextUpdate.toLocaleString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Tashkent' 
    });
    
    rateInfo.title = `Keyingi yangilanish: ${nextTimeString}`;
}

// Valyuta konvertatsiya qilish (aniq kurs bilan)
function convertCurrency() {
    const usdInput = document.getElementById('usdInput');
    let usd = usdInput.value;
    
    if (usd === '' || isNaN(usd)) {
        document.getElementById('resultText').innerText = '0 UZS';
        return;
    }
    
    usd = parseFloat(usd);
    const uzs = usd * currentUSDrate;
    
    // 2 xonalikgacha aniqlikda formatlash
    const formattedUZS = uzs.toLocaleString('uz-UZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    document.getElementById('resultText').innerHTML = `${formattedUZS} UZS`;
}

// Kursni qo'lda tahrirlash
function setManualRate() {
    const currentValue = currentUSDrate;
    const manualRate = prompt("USD kursini kiriting (so'mda):", currentValue);
    
    if (manualRate && !isNaN(manualRate)) {
        currentUSDrate = parseFloat(manualRate);
        const now = new Date();
        const dateString = now.toLocaleString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Tashkent'
        });
        
        const timeString = now.toLocaleString('uz-UZ', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Tashkent' 
        });
        
        // Qo'lda kiritilgan kursni ham keshga saqlaymiz
        saveRateToCache(currentUSDrate, `${dateString} ${timeString} (qo'lda)`);
        
        document.getElementById('rateInfo').innerHTML = `✏️ Qo'lda: 1 USD = ${currentUSDrate.toLocaleString()} UZS (${dateString} ${timeString})`;
        convertCurrency();
    }
}

// Kursni majburiy yangilash
function forceUpdate() {
    updateExchangeRate();
    showUpdatingAnimation();
}

// Sahifa yuklanganda
window.onload = function() {
    // Dastlab kalkulyator ko'rinadi
    document.getElementById('calculator').style.display = 'block';
    document.getElementById('converter').style.display = 'none';
    
    // Keshdan kursni olish (agar bo'lsa)
    const cached = getRateFromCache();
    if (cached) {
        currentUSDrate = cached.rate;
        console.log(`📦 Keshdan kurs olindi: ${currentUSDrate} (${cached.age.toFixed(1)} daqiqa eski)`);
    }
    
    // Valyuta kursini yuklash
    setTimeout(updateExchangeRate, 500);
    
    // HAR 5 DAQIQA yangilash (300000 ms = 5 daqiqa)
    setInterval(updateExchangeRate, 300000);
    
    // Kurs matniga click bo'lsa, qo'lda o'zgartirish
    const rateInfo = document.getElementById('rateInfo');
    rateInfo.style.cursor = 'pointer';
    rateInfo.addEventListener('click', setManualRate);
    
    // Double-click bo'lsa, majburiy yangilash
    rateInfo.addEventListener('dblclick', forceUpdate);
    
    // Hover effektlari
    rateInfo.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#3b3b58';
        this.style.padding = '5px';
        this.style.borderRadius = '5px';
        this.style.transition = '0.3s';
    });
    
    rateInfo.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.padding = '0';
    });
};

// JSONP backup (CORS muammosi uchun)
function handleBackupData(data) {
    if (data.rates && data.rates.UZS) {
        currentUSDrate = Math.round(data.rates.UZS * 100) / 100;
        const now = new Date();
        const dateString = now.toLocaleString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Tashkent'
        });
        
        const timeString = now.toLocaleString('uz-UZ', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Tashkent' 
        });
        
        saveRateToCache(currentUSDrate, `${dateString} ${timeString}`);
        document.getElementById('rateInfo').innerHTML = `✅ Backup: 1 USD = ${currentUSDrate.toLocaleString()} UZS (${dateString} ${timeString})`;
        convertCurrency();
    }
}