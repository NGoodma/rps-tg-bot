// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Game State
let playerScore = 0;
let botScore = 0;
const choices = ['rock', 'scissors', 'paper'];
const emojies = {
    'rock': '✊',
    'scissors': '✌️',
    'paper': '✋',
    'unknown': '🤖'
};

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
        handleDraw();
    } else if (
        (player === 'rock' && bot === 'scissors') ||
        (player === 'scissors' && bot === 'paper') ||
        (player === 'paper' && bot === 'rock')
    ) {
        handleWin();
    } else {
        handleLose();
    }
}

function handleWin() {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    statusText.textContent = 'Вы победили! 🎉';
    statusText.style.color = 'var(--win-color)';
    
    playerDisplay.classList.add('win-anim');
    botDisplay.classList.add('lose-anim');
    
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function handleLose() {
    botScore++;
    botScoreEl.textContent = botScore;
    statusText.textContent = 'Бот победил 😢';
    statusText.style.color = 'var(--lose-color)';
    
    botDisplay.classList.add('win-anim');
    playerDisplay.classList.add('lose-anim');
    
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
}

function handleDraw() {
    statusText.textContent = 'Ничья! 🤝';
    statusText.style.color = 'var(--draw-color)';
    
    playerDisplay.classList.add('draw-anim');
    botDisplay.classList.add('draw-anim');
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('rigid');
}
