// 主逻辑 & 导航
let currentGame = null;
let gameTimer = null;

// 屏幕切换
function navTo(name) {
    stopGame();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(name + 'Screen');
    if (target) {
        target.classList.add('active');
        if (name === 'draw') initDraw();
    }
}

// 返回按钮绑定
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('backDrawBtn').addEventListener('click', () => navTo('main'));
    document.getElementById('gameBackBtn').addEventListener('click', () => {
        stopGame();
        navTo('gameMenu');
    });

    // 生成游戏列表
    buildGameList();
});

function stopGame() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    currentGame = null;
    // 清理键盘事件
    document.onkeydown = null;
}

// 游戏列表数据
const gameList = [
    { id: 'gomoku', icon: '♟️', name: '五子棋' },
    { id: 'snake', icon: '🐍', name: '贪吃蛇' },
    { id: 'tetris', icon: '🧊', name: '俄罗斯方块' },
    { id: 'minesweeper', icon: '💣', name: '扫雷' },
    { id: 'game2048', icon: '🔢', name: '2048' },
    { id: 'breakout', icon: '🧱', name: '打砖块' },
    { id: 'memory', icon: '🧠', name: '记忆翻牌' },
    { id: 'reaction', icon: '⚡', name: '反应测试' },
    { id: 'flappy', icon: '🐦', name: '像素小鸟' },
    { id: 'pong', icon: '🏓', name: '乒乓球' },
    { id: 'tictactoe', icon: '⭕', name: '井字棋' },
    { id: 'match3', icon: '💎', name: '消消乐' },
    { id: 'maze', icon: '🏃', name: '迷宫' },
    { id: 'typing', icon: '⌨️', name: '打字竞速' },
    { id: 'dice', icon: '🎲', name: '骰子比大小' },
];

function buildGameList() {
    const container = document.getElementById('gameList');
    container.innerHTML = gameList.map(g => `
        <div class="card" onclick="startGame('${g.id}')">
            <span class="card-icon">${g.icon}</span>
            <span class="card-title">${g.name}</span>
        </div>
    `).join('');
}

function startGame(id) {
    stopGame();
    navTo('game');
    const game = gameList.find(g => g.id === id);
    document.getElementById('gameTitle').textContent = game.icon + ' ' + game.name;
    document.getElementById('gameScore').textContent = '';
    document.getElementById('gameArea').innerHTML = '';
    document.getElementById('gameCtrls').innerHTML = '';

    currentGame = id;
    if (typeof window['init_' + id] === 'function') {
        window['init_' + id]();
    }
}

function updateScore(text) {
    document.getElementById('gameScore').textContent = text;
}

function setControls(html) {
    document.getElementById('gameCtrls').innerHTML = html;
}

// 毕业寄语
function showAbout() {
    showModal('💌 毕业寄语', {
        html: `<p style="color:#ccc;line-height:2;text-align:center;font-size:15px">
            亲爱的同桌：<br><br>
            这些年谢谢你的陪伴。<br>
            这个小小的APP，<br>
            是我送给你的毕业礼物。<br>
            里面有画板，你可以继续画画；<br>
            有小游戏，无聊时可以玩。<br><br>
            愿你永远开心，前程似锦！<br><br>
            —— 你最好的同桌 ❤️
            联系方式：
            QQ 3906250221 微信 yizhikulipa2014
        </p>`,
        autoClose: 8000
    });
}

// 全局暴露
window.navTo = navTo;
window.startGame = startGame;
window.stopGame = stopGame;
window.showAbout = showAbout;
window.updateScore = updateScore;
window.setControls = setControls;
window.showToast = showToast;
window.showModal = showModal;