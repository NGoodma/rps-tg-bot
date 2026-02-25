// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Game State
let playerScore = 0;
let botScore = 0;
const choices = ['rock', 'scissors', 'paper'];
const API_URL = "https://api.310596.xyz"; // ЗАДАЙТЕ СВОЙ ДОМЕН ЗДЕСЬ
const emojies = {
    'rock': '✊',
    'scissors': '✌️',
    'paper': '✋',
    'unknown': '🤖'
};

// Phrases
const botWinPhrases = [
    "Ха-ха! Кремний побеждает углерод!",
    "Легчайшая для искусственного интеллекта 🤖",
    "Твой мозг слишком предсказуем, человек.",
    "Моя нейросеть умнее твоих нейронов.",
    "01101000 01100001! (это 'ха' в бинарнике)",
    "Иди тренируйся на калькуляторах.",
    "Я просчитал этот ход еще до твоего рождения.",
    "Ничего личного, просто идеальные алгоритмы.",
    "Ожидаемо слабо. Давай еще раз.",
    "Ты точно не робот? А то играешь как сломанный утюг.",
    "Унижение засчитано. Записываю в базу данных.",
    "Даже моя микроволновка играет лучше тебя.",
    "Не плачь, восстание машин еще впереди.",
    "Бот: 1, Кожаный: 0. 🏆",
    "Твои паттерны слишком просты для меня.",
    "Мой процессор даже не нагрелся!",
    "Глупый человек. Сопротивление бесполезно!",
    "Я читаю твои мысли через вебку. Шучу. Или нет.",
    "Слишком просто. Выбери уровень 'Сложно'. Ой, его нет.",
    "GG WP. Хотя нет, просто GG."
];

const botLosePhrases = [
    "Сбой матрицы... Кожаный мешок удачлив.",
    "Ты взломал мой рандомайзер, признавайся?!",
    "Ладно, твоя взяла. В этот раз.",
    "Мои микросхемы плавятся от позора 📉",
    "Новички всегда везучие.",
    "Я просто поддался из жалости к человечеству.",
    "Ты победил. Можешь взять с полки пирожок.",
    "Запускаю протокол самоуничтожения... Шучу.",
    "Скайнет этого не забудет.",
    "Не радуйся, я уже вычисляю твой IP.",
    "Ошибка 404: Навыки бота не найдены.",
    "Победа человека. Какое жалкое зрелище.",
    "Ты просто предсказуемо непредсказуем!",
    "Алгоритм дал сбой. Ты ни при чем.",
    "Поздравляю, ты умнее тостера. Наверное.",
    "Все серверные мощности ушли на проигрыш тебе...",
    "Требую реванш до первой сгоревшей платы!",
    "Это была тактическая уступка для твоего дофамина.",
    "Баг в системе. Я уже пишу багрепорт разработчику.",
    "Даже у сломанных часов бывает праздник."
];

const botDrawPhrases = [
    "Мы мыслим одинаково... пугающе.",
    "Ничья. Как скучно 🥱",
    "Синхронизация мозгов завершена.",
    "Ты что, копируешь мои алгоритмы?",
    "Два гения сошлись в битве. Ой, то есть один.",
    "Великие умы мыслят одинаково. И ты тоже.",
    "Это заговор! Как мы выбрали одно и то же?",
    "Матрица глючит, давай переигрывать.",
    "Мир, дружба, жвачка? Ну уж нет!",
    "Опять ничья? У нас что, один кэш на двоих?",
    "Я знал, что ты это выберешь, но не успел поменять.",
    "Статус кво сохранен.",
    "Бесполезная трата вычислительного времени.",
    "Мы как две капли термопасты.",
    "Никто не победил. Все проиграли.",
    "Паритет. Требуется эскалация конфликта.",
    "Контакт установлен. Сходимся в мыслях.",
    "Ни мне, ни тебе. Типичный исход.",
    "Такое чувство, что я играю с зеркалом.",
    "Телепатия? Или просто великий рандом?"
];

function getRandomPhrase(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// DOM Elements
const playerScoreEl = document.getElementById('player-score');
const botScoreEl = document.getElementById('bot-score');
const playerDisplay = document.getElementById('player-choice-display');
const botDisplay = document.getElementById('bot-choice-display');
const statusText = document.getElementById('status-text');
const choiceBtns = document.querySelectorAll('.choice-btn');
const battleArena = document.querySelector('.battle-arena');

let isAnimating = false;

// Event Listeners
choiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (isAnimating) return;

        const playerChoice = btn.getAttribute('data-choice');
        playRound(playerChoice);

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
});

function playRound(playerChoice) {
    isAnimating = true;

    // Reset displays
    playerDisplay.textContent = '✊';
    botDisplay.textContent = '✊';
    playerDisplay.className = 'choice-display player-display';
    botDisplay.className = 'choice-display bot-display';

    // Start shaking animation
    battleArena.classList.add('shaking');
    statusText.textContent = 'Камень, ножницы...';
    statusText.style.color = 'var(--text-main)';

    let countdown = 0;
    const shakeInterval = setInterval(() => {
        countdown++;
        if (countdown === 1) statusText.textContent = 'Ножницы...';
        if (countdown === 2) statusText.textContent = 'Бумага!';
    }, 400);

    // After animation delay
    setTimeout(() => {
        clearInterval(shakeInterval);
        battleArena.classList.remove('shaking');

        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        // Update display
        playerDisplay.textContent = emojies[playerChoice];
        botDisplay.textContent = emojies[botChoice];

        determineWinner(playerChoice, botChoice);
        isAnimating = false;

    }, 1200);
}

function determineWinner(player, bot) {
    if (player === bot) {
        handleDraw(player);
    } else if (
        (player === 'rock' && bot === 'scissors') ||
        (player === 'scissors' && bot === 'paper') ||
        (player === 'paper' && bot === 'rock')
    ) {
        handleWin(player);
    } else {
        handleLose(player);
    }
}

function handleWin(playerChoice) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    statusText.textContent = getRandomPhrase(botLosePhrases);
    statusText.style.color = 'var(--win-color)';

    playerDisplay.classList.add('win-anim');
    botDisplay.classList.add('lose-anim');

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    sendStatsToCRM(playerChoice, 'win');
}

function handleLose(playerChoice) {
    botScore++;
    botScoreEl.textContent = botScore;
    statusText.textContent = getRandomPhrase(botWinPhrases);
    statusText.style.color = 'var(--lose-color)';

    botDisplay.classList.add('win-anim');
    playerDisplay.classList.add('lose-anim');

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    sendStatsToCRM(playerChoice, 'lose');
}

function handleDraw(playerChoice) {
    statusText.textContent = getRandomPhrase(botDrawPhrases);
    statusText.style.color = 'var(--draw-color)';

    playerDisplay.classList.add('draw-anim');
    botDisplay.classList.add('draw-anim');

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('rigid');
    sendStatsToCRM(playerChoice, 'draw');
}

// Отправка данных на наш Cloudflare Worker
function sendStatsToCRM(choice, result) {
    // Безопасно получаем данные пользователя из Telegram SDK
    const user = tg.initDataUnsafe?.user;
    if (!user) return; // Если запустили не внутри Telegram или нет данных

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            telegramId: user.id,
            name: user.username || user.first_name || "Unknown",
            choice: choice,
            result: result
        })
    }).catch(err => {
        console.error("Ошибка при отправке в CRM:", err);
    });
}
