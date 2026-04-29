// ========== 1. 五子棋（AI对决） ==========
function init_gomoku() {
    const SIZE = 15;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 420;
    canvas.style.maxWidth = '100%';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const cell = canvas.width / (SIZE + 1);
    let board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    let over = false;
    let playerColor = 'black';  // 玩家执黑
    let aiColor = 'white';      // AI执白
    let isPlayerTurn = true;    // 黑棋先手
    let lastMove = null;

    // 棋型评分表
    const scoreTable = {
        five: 1000000,      // 五连
        liveFour: 100000,   // 活四
        rushFour: 10000,    // 冲四
        liveThree: 5000,    // 活三
        sleepThree: 500,    // 眠三
        liveTwo: 200,       // 活二
        sleepTwo: 50,       // 眠二
        liveOne: 10,        // 活一
    };

    function draw() {
        ctx.fillStyle = '#deb887';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let i = 0; i < SIZE; i++) {
            const p = cell * (i + 0.5) + cell * 0.5;
            ctx.beginPath(); ctx.moveTo(cell, p); ctx.lineTo(cell * SIZE, p); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p, cell); ctx.lineTo(p, cell * SIZE); ctx.stroke();
        }
        // 天元和星位标记
        const stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
        stars.forEach(([r,c]) => {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(c * cell + cell, r * cell + cell, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) {
                    // 棋子阴影
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.beginPath();
                    ctx.arc(c * cell + cell + 1.5, r * cell + cell + 1.5, cell * 0.42, 0, Math.PI * 2);
                    ctx.fill();
                    // 棋子本体
                    const gradient = ctx.createRadialGradient(
                        c * cell + cell - 3, r * cell + cell - 3, 2,
                        c * cell + cell, r * cell + cell, cell * 0.42
                    );
                    if (board[r][c] === 'black') {
                        gradient.addColorStop(0, '#555');
                        gradient.addColorStop(1, '#111');
                    } else {
                        gradient.addColorStop(0, '#fff');
                        gradient.addColorStop(1, '#ccc');
                    }
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(c * cell + cell, r * cell + cell, cell * 0.42, 0, Math.PI * 2);
                    ctx.fill();
                    if (board[r][c] === 'white') {
                        ctx.strokeStyle = '#999';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }
        // 最后一手标记
        if (lastMove) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(lastMove.c * cell + cell, lastMove.r * cell + cell, cell * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function checkWin(r, c, color) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dx, dy] of dirs) {
            let cnt = 1;
            for (let i = 1; i < 5; i++) {
                const nr = r + dx * i, nc = c + dy * i;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === color) cnt++;
                else break;
            }
            for (let i = 1; i < 5; i++) {
                const nr = r - dx * i, nc = c - dy * i;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === color) cnt++;
                else break;
            }
            if (cnt >= 5) return true;
        }
        return false;
    }

    function isDraw() {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (!board[r][c]) return false;
        return true;
    }

    // ========== AI 核心 ==========
    function aiMove() {
        let bestScore = -Infinity;
        let bestMoves = [];

        // 搜索范围：已有棋子周围2格
        const candidateSet = new Set();
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) {
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) {
                                candidateSet.add(nr * SIZE + nc);
                            }
                        }
                    }
                }
            }
        }
        // 如果棋盘为空，下天元
        if (candidateSet.size === 0) {
            candidateSet.add(7 * SIZE + 7);
        }

        const candidates = Array.from(candidateSet).map(v => ({ r: Math.floor(v / SIZE), c: v % SIZE }));

        for (const { r, c } of candidates) {
            // 攻击分（AI自己下这里）
            board[r][c] = aiColor;
            const attackScore = evaluatePosition(r, c, aiColor);
            board[r][c] = null;

            // 防守分（假设玩家下这里）
            board[r][c] = playerColor;
            const defenseScore = evaluatePosition(r, c, playerColor);
            board[r][c] = null;

            // 综合评分：攻击 + 防守，攻击权重略高
            const totalScore = attackScore * 1.1 + defenseScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMoves = [{ r, c }];
            } else if (totalScore === bestScore) {
                bestMoves.push({ r, c });
            }
        }

        // 从最佳位置中随机选一个（增加变化）
        const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        return move;
    }

    function evaluatePosition(r, c, color) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        let totalScore = 0;

        for (const [dx, dy] of dirs) {
            const line = countLine(r, c, dx, dy, color);
            const reverseLine = countLine(r, c, -dx, -dy, color);
            const total = line.count + reverseLine.count + 1;
            const openEnds = (line.open ? 1 : 0) + (reverseLine.open ? 1 : 0);

            totalScore += getPatternScore(total, openEnds);
        }

        // 中心位置加成
        const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
        totalScore += Math.max(0, 20 - centerDist) * 5;

        return totalScore;
    }

    function countLine(r, c, dx, dy, color) {
        let count = 0;
        let open = false;
        let nr = r + dx, nc = c + dy;

        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === color) {
            count++;
            nr += dx;
            nc += dy;
        }
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) {
            open = true;
        }

        return { count, open };
    }

    function getPatternScore(count, openEnds) {
        if (count >= 5) return scoreTable.five;
        if (count === 4) {
            if (openEnds === 2) return scoreTable.liveFour;
            if (openEnds === 1) return scoreTable.rushFour;
            return 0;
        }
        if (count === 3) {
            if (openEnds === 2) return scoreTable.liveThree;
            if (openEnds === 1) return scoreTable.sleepThree;
            return 0;
        }
        if (count === 2) {
            if (openEnds === 2) return scoreTable.liveTwo;
            if (openEnds === 1) return scoreTable.sleepTwo;
            return 0;
        }
        if (count === 1) {
            if (openEnds === 2) return scoreTable.liveOne;
            return 0;
        }
        return 0;
    }

    // ========== 玩家点击 ==========
    canvas.onclick = function (e) {
        if (over) return;
        if (!isPlayerTurn) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const c = Math.round(x / cell - 1);
        const r = Math.round(y / cell - 1);

        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r][c]) return;

        // 玩家落子
        board[r][c] = playerColor;
        lastMove = { r, c };
        draw();

        if (checkWin(r, c, playerColor)) {
            over = true;
            updateScore('🎉 你赢了！不愧是五子棋高手！');
            return;
        }
        if (isDraw()) {
            over = true;
            updateScore('🤝 平局！');
            return;
        }

        // 轮到AI
        isPlayerTurn = false;
        updateScore('🤖 AI思考中...');

        // 延迟一下，让AI看起来在"思考"
        setTimeout(() => {
            const move = aiMove();
            board[move.r][move.c] = aiColor;
            lastMove = move;
            draw();

            if (checkWin(move.r, move.c, aiColor)) {
                over = true;
                updateScore('😢 AI赢了！再来一局吧！');
                return;
            }
            if (isDraw()) {
                over = true;
                updateScore('🤝 平局！');
                return;
            }

            isPlayerTurn = true;
            updateScore('轮到你了 ⚫');
        }, 300);
    };

    // ========== 难度选择 ==========
    function setDifficulty(level) {
        if (level === 'easy') {
            // 简单模式：降低AI评分精度
            scoreTable.liveFour = 50000;
            scoreTable.rushFour = 5000;
            scoreTable.liveThree = 2000;
        } else if (level === 'hard') {
            // 困难模式：提高评分
            scoreTable.liveFour = 200000;
            scoreTable.rushFour = 20000;
            scoreTable.liveThree = 10000;
        } else {
            // 普通模式（默认）
            scoreTable.liveFour = 100000;
            scoreTable.rushFour = 10000;
            scoreTable.liveThree = 5000;
        }
        // 重新开始
        board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
        over = false;
        isPlayerTurn = true;
        lastMove = null;
        updateScore('轮到你了 ⚫');
        draw();
    }

    window._setGomokuDifficulty = setDifficulty;

    draw();
    updateScore('轮到你了 ⚫ (黑棋先手)');
    setControls(`
        <button onclick="window._setGomokuDifficulty('easy')" style="background:#2ed573">😊 简单</button>
        <button onclick="window._setGomokuDifficulty('normal')" style="background:#f0c060">😐 普通</button>
        <button onclick="window._setGomokuDifficulty('hard')" style="background:#ff4757">😈 困难</button>
        <button onclick="startGame('gomoku')">🔄 重新开始</button>
    `);
}

    // ========== 虚拟方向键 ==========
    let dirInterval = null;
    let dirTimeout = null;

    function startDir(dir) {
        changeDirection(dir);
        // 持续按压：先等200ms，然后每60ms发送一次
        dirTimeout = setTimeout(() => {
            dirInterval = setInterval(() => changeDirection(dir), 60);
        }, 200);
    }

    function stopDir() {
        if (dirTimeout) { clearTimeout(dirTimeout); dirTimeout = null; }
        if (dirInterval) { clearInterval(dirInterval); dirInterval = null; }
    }

    window._snakeDirDown = function(dir) {
        startDir(dir);
    };
    window._snakeDirUp = function() {
        stopDir();
    };

    // ========== 启动 ==========
    function start(botNum) {
        botCount = botNum;
        over = false;
        paused = false;
        score = 0;
        particles = [];
        spawnPlayer();
        bots = [];
        for (let i = 0; i < botCount; i++) {
            bots.push(spawnBot(i));
        }
        spawnFoods();
        if (gameTimer) clearInterval(gameTimer);
        gameTimer = setInterval(tick, speed);
        updateScore('🐍 0 | 🤖 ' + botCount);
        draw();
    }

    window._startSnake = start;
    window._snakePause = function() {
        paused = !paused;
        draw();
    };

    start(botCount);

    setControls(`
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%">
            <div style="display:flex;gap:6px;align-items:center">
                <span style="color:#999;font-size:12px;min-width:50px;text-align:center">Bots:</span>
                <button onpointerdown="window._startSnake(2)" style="background:#2ed573;padding:8px 14px">2</button>
                <button onpointerdown="window._startSnake(3)" style="background:#f0c060;padding:8px 14px">3</button>
                <button onpointerdown="window._startSnake(4)" style="background:#ff9f43;padding:8px 14px">4</button>
                <button onpointerdown="window._startSnake(5)" style="background:#ff4757;padding:8px 14px">5</button>
            </div>
            <div style="display:grid;grid-template-columns:70px 70px 70px;grid-template-rows:55px 55px 55px;gap:5px">
                <div></div>
                <button 
                    onpointerdown="window._snakeDirDown('up')" 
                    onpointerup="window._snakeDirUp()" 
                    onpointerleave="window._snakeDirUp()"
                    style="padding:0;border:none;background:#2a2a4a;color:#fff;font-size:26px;border-radius:12px;cursor:pointer;user-select:none;touch-action:manipulation"
                >▲</button>
                <div></div>
                <button 
                    onpointerdown="window._snakeDirDown('left')" 
                    onpointerup="window._snakeDirUp()" 
                    onpointerleave="window._snakeDirUp()"
                    style="padding:0;border:none;background:#2a2a4a;color:#fff;font-size:26px;border-radius:12px;cursor:pointer;user-select:none;touch-action:manipulation"
                >◀</button>
                <button 
                    onpointerdown="window._snakePause()"
                    style="padding:0;border:none;background:#e94560;color:#fff;font-size:18px;border-radius:12px;cursor:pointer;user-select:none;touch-action:manipulation"
                >⏯</button>
                <button 
                    onpointerdown="window._snakeDirDown('right')" 
                    onpointerup="window._snakeDirUp()" 
                    onpointerleave="window._snakeDirUp()"
                    style="padding:0;border:none;background:#2a2a4a;color:#fff;font-size:26px;border-radius:12px;cursor:pointer;user-select:none;touch-action:manipulation"
                >▶</button>
                <div></div>
                <button 
                    onpointerdown="window._snakeDirDown('down')" 
                    onpointerup="window._snakeDirUp()" 
                    onpointerleave="window._snakeDirUp()"
                    style="padding:0;border:none;background:#2a2a4a;color:#fff;font-size:26px;border-radius:12px;cursor:pointer;user-select:none;touch-action:manipulation"
                >▼</button>
                <div></div>
            </div>
        </div>
    `);
// ========== 2. 贪吃蛇（大地图 + AI机器人 + 虚拟方向键） ==========
function init_snake() {
    // 先清理旧状态
    if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    canvas.style.background = '#0d1117';
    canvas.style.maxWidth = '100%';
    canvas.style.borderRadius = '12px';
    canvas.style.touchAction = 'none';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const GRID = 40;
    const CELL = canvas.width / GRID;
    let player = null;
    let bots = [];
    let foods = [];
    let particles = [];
    let over = false;
    let paused = false;
    let score = 0;
    let botCount = 3;
    let speed = 80;
    let dirInterval = null;
    let dirTimeout = null;

    const playerColors = { head: '#00e5ff', body: '#0091ea', glow: '#00e5ff' };
    const botColors = [
        { head: '#ff5252', body: '#d32f2f', glow: '#ff5252' },
        { head: '#ffab40', body: '#f57c00', glow: '#ffab40' },
        { head: '#69f0ae', body: '#2e7d32', glow: '#69f0ae' },
        { head: '#ff80ab', body: '#c2185b', glow: '#ff80ab' },
        { head: '#b388ff', body: '#7c4dff', glow: '#b388ff' },
    ];

    function createSnake(x, y, length, dir) {
        const body = [];
        for (let i = 0; i < length; i++) {
            if (dir === 'right') body.push({ x: x - i, y });
            if (dir === 'left') body.push({ x: x + i, y });
            if (dir === 'up') body.push({ x, y: y + i });
            if (dir === 'down') body.push({ x, y: y - i });
        }
        return { body, dir, nextDir: dir, alive: true, growing: 0 };
    }

    function spawnPlayer() {
        player = createSnake(Math.floor(GRID * 0.25), Math.floor(GRID / 2), 4, 'right');
    }

    function spawnBot(index) {
        const starts = [
            { x: Math.floor(GRID * 0.75), y: Math.floor(GRID * 0.3), dir: 'left' },
            { x: Math.floor(GRID * 0.75), y: Math.floor(GRID * 0.6), dir: 'left' },
            { x: Math.floor(GRID * 0.3), y: Math.floor(GRID * 0.75), dir: 'up' },
            { x: Math.floor(GRID * 0.6), y: Math.floor(GRID * 0.75), dir: 'up' },
            { x: Math.floor(GRID * 0.4), y: Math.floor(GRID * 0.2), dir: 'down' },
        ];
        const s = starts[index % starts.length];
        const bot = createSnake(s.x, s.y, 4 + Math.floor(Math.random() * 3), s.dir);
        bot.color = botColors[index % botColors.length];
        return bot;
    }

    function spawnFood() {
        const types = [
            { value: 1, color: '#ff5252', size: 0.35 },
            { value: 1, color: '#ff5252', size: 0.35 },
            { value: 3, color: '#ffd740', size: 0.45 },
            { value: 5, color: '#b388ff', size: 0.5 },
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        let pos;
        let tries = 0;
        do {
            pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            tries++;
        } while (isOccupied(pos.x, pos.y) && tries < 1000);
        return { ...pos, ...type, pulse: 0 };
    }

    function isOccupied(x, y) {
        if (player && player.body.some(s => s.x === x && s.y === y)) return true;
        for (const bot of bots) {
            if (bot.alive && bot.body.some(s => s.x === x && s.y === y)) return true;
        }
        for (const f of foods) {
            if (f.x === x && f.y === y) return true;
        }
        return false;
    }

    function spawnFoods() {
        foods = [];
        const count = 15 + botCount * 3;
        for (let i = 0; i < count; i++) {
            foods.push(spawnFood());
        }
    }

    function addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x * CELL + CELL / 2,
                y: y * CELL + CELL / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                decay: 0.02 + Math.random() * 0.04,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }

    function aiDecide(bot) {
        if (!bot.alive) return;
        const head = bot.body[0];
        const dirs = ['up', 'down', 'left', 'right'];
        const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };

        const safeDirs = dirs.filter(d => {
            if (d === opposite[bot.dir]) return false;
            const nx = head.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
            const ny = head.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0);
            if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return false;
            if (bot.body.some(s => s.x === nx && s.y === ny)) return false;
            if (player && player.alive && player.body.some(s => s.x === nx && s.y === ny)) return false;
            for (const other of bots) {
                if (other !== bot && other.alive && other.body.some(s => s.x === nx && s.y === ny)) return false;
            }
            return true;
        });

        if (safeDirs.length === 0) return;

        let bestDir = safeDirs[0];
        let bestDist = Infinity;

        for (const d of safeDirs) {
            const nx = head.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
            const ny = head.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0);

            for (const f of foods) {
                const dist = Math.abs(f.x - nx) + Math.abs(f.y - ny);
                const weightedDist = dist - f.value * 2;
                if (weightedDist < bestDist) {
                    bestDist = weightedDist;
                    bestDir = d;
                }
            }

            const allHeads = [];
            if (player && player.alive) allHeads.push(player.body[0]);
            for (const other of bots) {
                if (other !== bot && other.alive) allHeads.push(other.body[0]);
            }
            for (const h of allHeads) {
                const dist = Math.abs(h.x - nx) + Math.abs(h.y - ny);
                if (dist < 4) bestDist += (4 - dist) * 20;
            }
        }

        bot.nextDir = bestDir;
    }

    function tick() {
        if (over || paused) return;

        for (const bot of bots) {
            if (bot.alive) aiDecide(bot);
        }

        if (player && player.alive) {
            player.dir = player.nextDir;
            const head = { ...player.body[0] };
            if (player.dir === 'right') head.x++;
            if (player.dir === 'left') head.x--;
            if (player.dir === 'down') head.y++;
            if (player.dir === 'up') head.y--;

            if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
                killPlayer();
            } else {
                player.body.unshift(head);
                if (player.growing > 0) {
                    player.growing--;
                } else {
                    player.body.pop();
                }
                if (player.body.slice(1).some(s => s.x === head.x && s.y === head.y)) killPlayer();
                for (const bot of bots) {
                    if (bot.alive && bot.body.some(s => s.x === head.x && s.y === head.y)) killPlayer();
                }
                if (player.alive) {
                    for (let i = foods.length - 1; i >= 0; i--) {
                        const f = foods[i];
                        if (head.x === f.x && head.y === f.y) {
                            score += f.value;
                            player.growing += f.value;
                            addParticles(f.x, f.y, f.color, 8);
                            foods.splice(i, 1);
                            foods.push(spawnFood());
                        }
                    }
                }
            }
        }

        for (const bot of bots) {
            if (!bot.alive) continue;
            bot.dir = bot.nextDir;
            const head = { ...bot.body[0] };
            if (bot.dir === 'right') head.x++;
            if (bot.dir === 'left') head.x--;
            if (bot.dir === 'down') head.y++;
            if (bot.dir === 'up') head.y--;

            if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
                killBot(bot); continue;
            }

            bot.body.unshift(head);
            if (bot.growing > 0) { bot.growing--; } else { bot.body.pop(); }

            if (bot.body.slice(1).some(s => s.x === head.x && s.y === head.y)) {
                killBot(bot); continue;
            }

            if (player && player.alive && player.body.some(s => s.x === head.x && s.y === head.y)) {
                killBot(bot);
                if (head.x === player.body[0].x && head.y === player.body[0].y) {
                    killPlayer();
                }
            }

            for (const other of bots) {
                if (other !== bot && other.alive && other.body.some(s => s.x === head.x && s.y === head.y)) {
                    killBot(bot); break;
                }
            }

            if (bot.alive) {
                for (let i = foods.length - 1; i >= 0; i--) {
                    const f = foods[i];
                    if (head.x === f.x && head.y === f.y) {
                        bot.growing += f.value;
                        addParticles(f.x, f.y, f.color, 6);
                        foods.splice(i, 1);
                        foods.push(spawnFood());
                    }
                }
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }

        const aliveBots = bots.filter(b => b.alive).length;
        if (player && !player.alive) {
            over = true;
            updateScore('💀 Game Over! Score: ' + score);
        }
        if (player && player.alive && aliveBots === 0) {
            over = true;
            updateScore('🏆 You Win! Score: ' + score);
        }
        if (!over) updateScore('🐍 ' + score + ' | 🤖 ' + aliveBots);

        draw();
    }

    function killPlayer() {
        if (!player || !player.alive) return;
        addParticles(player.body[0].x, player.body[0].y, playerColors.glow, 20);
        for (const seg of player.body) {
            foods.push({ x: seg.x, y: seg.y, value: 1, color: '#00e5ff', size: 0.3, pulse: 0 });
        }
        player.alive = false;
    }

    function killBot(bot) {
        if (!bot.alive) return;
        addParticles(bot.body[0].x, bot.body[0].y, bot.color.glow, 15);
        for (const seg of bot.body) {
            foods.push({ x: seg.x, y: seg.y, value: 1, color: bot.color.head, size: 0.3, pulse: 0 });
        }
        bot.alive = false;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
        }

        for (const f of foods) {
            const cx = f.x * CELL + CELL / 2;
            const cy = f.y * CELL + CELL / 2;
            const r = CELL * f.size;
            const pulse = Math.sin(Date.now() / 300 + f.x + f.y) * 0.1 + 1;
            const actualR = r * pulse;
            ctx.fillStyle = f.color + '44';
            ctx.beginPath(); ctx.arc(cx, cy, actualR + 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(cx, cy, actualR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(cx - actualR * 0.3, cy - actualR * 0.3, actualR * 0.35, 0, Math.PI * 2); ctx.fill();
        }

        function drawSnake(snake, colors, isPlayer) {
            if (!snake || !snake.alive || snake.body.length === 0) return;
            const body = snake.body;
            for (let i = body.length - 1; i >= 0; i--) {
                const seg = body[i];
                const ratio = 1 - (i / body.length) * 0.5;
                const alpha = 1 - (i / body.length) * 0.6;
                ctx.fillStyle = i === 0 ? colors.head : colors.body;
                ctx.globalAlpha = alpha;
                const size = CELL * (0.7 + ratio * 0.3);
                const offset = (CELL - size) / 2;
                ctx.beginPath();
                ctx.roundRect(seg.x * CELL + offset, seg.y * CELL + offset, size, size, size * 0.4);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            const head = body[0];
            ctx.fillStyle = colors.glow + '33';
            ctx.beginPath(); ctx.arc(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, CELL * 0.8, 0, Math.PI * 2); ctx.fill();

            const eyeOffset = CELL * 0.22;
            const eyeR = CELL * 0.14;
            ctx.fillStyle = '#fff';
            const hx = head.x * CELL + CELL / 2;
            const hy = head.y * CELL + CELL / 2;
            if (snake.dir === 'right' || snake.dir === 'left') {
                ctx.beginPath(); ctx.arc(hx, hy - eyeOffset, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(hx, hy + eyeOffset, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111';
                const poff = snake.dir === 'right' ? eyeR * 0.4 : -eyeR * 0.4;
                ctx.beginPath(); ctx.arc(hx + poff, hy - eyeOffset, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(hx + poff, hy + eyeOffset, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(hx - eyeOffset, hy, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(hx + eyeOffset, hy, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111';
                const poff = snake.dir === 'down' ? eyeR * 0.4 : -eyeR * 0.4;
                ctx.beginPath(); ctx.arc(hx - eyeOffset, hy + poff, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(hx + eyeOffset, hy + poff, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
            }
        }

        for (const bot of bots) {
            if (bot.alive) drawSnake(bot, bot.color, false);
        }
        if (player && player.alive) drawSnake(player, playerColors, true);

        for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (paused && !over) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }

    function changeDirection(dir) {
        if (!player || !player.alive) return;
        const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (dir !== opposite[player.dir]) {
            player.nextDir = dir;
        }
    }

    // 滑动控制
    let touchStartX, touchStartY;
    canvas.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
            paused = !paused;
            draw();
            return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
            changeDirection(dx > 0 ? 'right' : 'left');
        } else {
            changeDirection(dy > 0 ? 'down' : 'up');
        }
    }, { passive: false });

    // 键盘
    document.onkeydown = function(e) {
        if (e.key === 'ArrowUp' || e.key === 'w') changeDirection('up');
        if (e.key === 'ArrowDown' || e.key === 's') changeDirection('down');
        if (e.key === 'ArrowLeft' || e.key === 'a') changeDirection('left');
        if (e.key === 'ArrowRight' || e.key === 'd') changeDirection('right');
        if (e.key === ' ' || e.key === 'p') { e.preventDefault(); paused = !paused; draw(); }
    };

    // 虚拟按键函数
    window._snakeDirStart = function(dir) {
        changeDirection(dir);
        if (dirTimeout) clearTimeout(dirTimeout);
        if (dirInterval) clearInterval(dirInterval);
        dirTimeout = setTimeout(function() {
            dirInterval = setInterval(function() { changeDirection(dir); }, 60);
        }, 200);
    };
    window._snakeDirStop = function() {
        if (dirTimeout) { clearTimeout(dirTimeout); dirTimeout = null; }
        if (dirInterval) { clearInterval(dirInterval); dirInterval = null; }
    };
    window._snakePauseToggle = function() {
        paused = !paused;
        draw();
    };
    window._restartSnake = function(num) {
        window._snakeDirStop();
        if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
        botCount = num;
        over = false;
        paused = false;
        score = 0;
        particles = [];
        foods = [];
        spawnPlayer();
        bots = [];
        for (let i = 0; i < botCount; i++) {
            bots.push(spawnBot(i));
        }
        spawnFoods();
        gameTimer = setInterval(tick, speed);
        updateScore('🐍 0 | 🤖 ' + botCount);
        draw();
    };

    // 启动
    botCount = 3;
    spawnPlayer();
    for (let i = 0; i < botCount; i++) bots.push(spawnBot(i));
    spawnFoods();
    gameTimer = setInterval(tick, speed);
    updateScore('🐍 0 | 🤖 ' + botCount);
    draw();

    setControls(`
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%">
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
                <span style="color:#aaa;font-size:12px;line-height:32px">Bots:</span>
                <button onclick="window._restartSnake(2)" style="background:#2ed573;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer">2</button>
                <button onclick="window._restartSnake(3)" style="background:#f0c060;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer">3</button>
                <button onclick="window._restartSnake(4)" style="background:#ff9f43;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer">4</button>
                <button onclick="window._restartSnake(5)" style="background:#ff4757;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer">5</button>
            </div>
            <div style="display:grid;grid-template-columns:60px 60px 60px;grid-template-rows:50px 50px 50px;gap:5px">
                <div></div>
                <button onpointerdown="window._snakeDirStart('up')" onpointerup="window._snakeDirStop()" onpointerleave="window._snakeDirStop()" 
                    style="background:#2a2a4a;color:#fff;border:none;font-size:24px;border-radius:12px;cursor:pointer;touch-action:manipulation;user-select:none">▲</button>
                <div></div>
                <button onpointerdown="window._snakeDirStart('left')" onpointerup="window._snakeDirStop()" onpointerleave="window._snakeDirStop()"
                    style="background:#2a2a4a;color:#fff;border:none;font-size:24px;border-radius:12px;cursor:pointer;touch-action:manipulation;user-select:none">◀</button>
                <button onclick="window._snakePauseToggle()"
                    style="background:#e94560;color:#fff;border:none;font-size:18px;border-radius:12px;cursor:pointer;touch-action:manipulation;user-select:none">⏯</button>
                <button onpointerdown="window._snakeDirStart('right')" onpointerup="window._snakeDirStop()" onpointerleave="window._snakeDirStop()"
                    style="background:#2a2a4a;color:#fff;border:none;font-size:24px;border-radius:12px;cursor:pointer;touch-action:manipulation;user-select:none">▶</button>
                <div></div>
                <button onpointerdown="window._snakeDirStart('down')" onpointerup="window._snakeDirStop()" onpointerleave="window._snakeDirStop()"
                    style="background:#2a2a4a;color:#fff;border:none;font-size:24px;border-radius:12px;cursor:pointer;touch-action:manipulation;user-select:none">▼</button>
                <div></div>
            </div>
        </div>
    `);
}

// ========== 3. 俄罗斯方块（像素风手机版·修复版） ==========
function init_tetris() {
    if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }

    const canvas = document.createElement('canvas');
    const BLOCK = 28; // 每格28px
    const COLS = 10;
    const ROWS = 20;
    canvas.width = COLS * BLOCK + 100; // 右侧留空间给预览
    canvas.height = ROWS * BLOCK;
    canvas.style.background = '#0a0a1e';
    canvas.style.borderRadius = '12px';
    canvas.style.maxWidth = '100%';
    canvas.style.touchAction = 'none';
    canvas.style.imageRendering = 'pixelated';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    let piece = null;
    let pieceX = 0;
    let pieceY = 0;
    let pieceColor = '';
    let nextPiece = null;
    let nextColor = '';
    let score = 0;
    let level = 1;
    let lines = 0;
    let over = false;
    let paused = false;
    let dropInterval = 600;
    let lastDrop = 0;
    let animationId = null;
    let clearingRows = [];
    let clearAnimTimer = 0;
    let particles = [];

    const shapes = [
        { shape: [[1,1,1,1]], color: '#00f2fe', name: 'I' },
        { shape: [[1,1],[1,1]], color: '#feca57', name: 'O' },
        { shape: [[0,1,0],[1,1,1]], color: '#a29bfe', name: 'T' },
        { shape: [[1,0,0],[1,1,1]], color: '#fd79a8', name: 'L' },
        { shape: [[0,0,1],[1,1,1]], color: '#ff9f43', name: 'J' },
        { shape: [[0,1,1],[1,1,0]], color: '#2ed573', name: 'S' },
        { shape: [[1,1,0],[0,1,1]], color: '#ff6b81', name: 'Z' },
    ];

    function randomPiece() {
        const s = shapes[Math.floor(Math.random() * shapes.length)];
        return { shape: s.shape.map(r => [...r]), color: s.color };
    }

    function spawnPiece() {
        if (nextPiece) {
            piece = nextPiece.shape;
            pieceColor = nextPiece.color;
        } else {
            const s = randomPiece();
            piece = s.shape;
            pieceColor = s.color;
        }
        nextPiece = randomPiece();
        pieceX = Math.floor((COLS - piece[0].length) / 2);
        pieceY = 0;
        if (!valid(pieceX, pieceY, piece)) {
            over = true;
        }
    }

    function valid(x, y, p) {
        for (let r = 0; r < p.length; r++) {
            for (let c = 0; c < p[r].length; c++) {
                if (p[r][c]) {
                    const nx = x + c;
                    const ny = y + r;
                    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
                    if (ny >= 0 && board[ny][nx]) return false;
                }
            }
        }
        return true;
    }

    function lock() {
        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[r].length; c++) {
                if (piece[r][c]) {
                    const ny = pieceY + r;
                    if (ny < 0) { over = true; return; }
                    board[ny][pieceX + c] = pieceColor;
                }
            }
        }

        clearingRows = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== 0)) {
                clearingRows.push(r);
            }
        }

        if (clearingRows.length > 0) {
            clearAnimTimer = 10;
            for (const r of clearingRows) {
                for (let c = 0; c < COLS; c++) {
                    for (let i = 0; i < 3; i++) {
                        particles.push({
                            x: c * BLOCK + BLOCK / 2,
                            y: r * BLOCK + BLOCK / 2,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5 - 3,
                            life: 1,
                            decay: 0.04 + Math.random() * 0.06,
                            color: board[r][c],
                            size: 2 + Math.random() * 3
                        });
                    }
                }
            }
            const scoreTable = [0, 100, 300, 500, 800];
            const cleared = clearingRows.length;
            score += scoreTable[cleared] * level;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(50, 600 - (level - 1) * 45);
            setTimeout(() => {
                for (const r of clearingRows.sort((a, b) => b - a)) {
                    board.splice(r, 1);
                    board.unshift(Array(COLS).fill(0));
                }
                clearingRows = [];
                spawnPiece();
            }, 200);
        } else {
            spawnPiece();
        }
    }

    function move(dx) {
        if (over || clearingRows.length > 0) return;
        if (valid(pieceX + dx, pieceY, piece)) {
            pieceX += dx;
        }
    }

    function drop() {
        if (over || clearingRows.length > 0) return;
        if (valid(pieceX, pieceY + 1, piece)) {
            pieceY++;
            score += 1;
        } else {
            lock();
        }
        lastDrop = performance.now();
    }

    function hardDrop() {
        if (over || clearingRows.length > 0) return;
        let dropDist = 0;
        while (valid(pieceX, pieceY + 1, piece)) {
            pieceY++;
            dropDist++;
        }
        score += dropDist * 2;
        lock();
        lastDrop = performance.now();
    }

    function rotate() {
        if (over || clearingRows.length > 0) return;
        const rotated = piece[0].map((_, i) => piece.map(row => row[i]).reverse());
        if (valid(pieceX, pieceY, rotated)) {
            piece = rotated;
        } else if (valid(pieceX - 1, pieceY, rotated)) {
            piece = rotated; pieceX--;
        } else if (valid(pieceX + 1, pieceY, rotated)) {
            piece = rotated; pieceX++;
        } else if (valid(pieceX, pieceY - 1, rotated)) {
            piece = rotated; pieceY--;
        }
    }

    function getGhostY() {
        let gy = pieceY;
        while (valid(pieceX, gy + 1, piece)) gy++;
        return gy;
    }

    function darken(hex, amt) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amt);
        const g = Math.max(0, ((num >> 8) & 0xFF) - amt);
        const b = Math.max(0, (num & 0xFF) - amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    function lighten(hex, amt) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, ((num >> 8) & 0xFF) + amt);
        const b = Math.min(255, (num & 0xFF) + amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    function drawPixelBlock(x, y, size, color) {
        const g = 2; // 像素间隙
        const inner = size - g * 2;
        // 主体
        ctx.fillStyle = color;
        ctx.fillRect(x + g, y + g, inner, inner);
        // 上边高光
        ctx.fillStyle = lighten(color, 55);
        ctx.fillRect(x + g, y + g, inner, 2);
        // 左边高光
        ctx.fillRect(x + g, y + g, 2, inner);
        // 下边阴影
        ctx.fillStyle = darken(color, 65);
        ctx.fillRect(x + g, y + size - g - 2, inner, 2);
        // 右边阴影
        ctx.fillRect(x + size - g - 2, y + g, 2, inner);
        // 高光点
        ctx.fillStyle = lighten(color, 90);
        ctx.fillRect(x + g + 2, y + g + 2, 4, 4);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 棋盘
        const boardW = COLS * BLOCK;
        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(0, 0, boardW, canvas.height);

        // 像素点阵背景
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                ctx.fillRect(c * BLOCK + BLOCK/2 - 0.5, r * BLOCK + BLOCK/2 - 0.5, 1, 1);
            }
        }

        // 右侧预览区背景
        ctx.fillStyle = '#0d0d24';
        ctx.fillRect(boardW, 0, canvas.width - boardW, canvas.height);

        // 已锁定方块
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    const isClearing = clearingRows.includes(r);
                    if (isClearing) {
                        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(clearAnimTimer * 1.8)) * 0.75;
                    }
                    drawPixelBlock(c * BLOCK, r * BLOCK, BLOCK, board[r][c]);
                    ctx.globalAlpha = 1;
                }
            }
        }

        // 幽灵方块（落点预览）—— 限制在棋盘内
        if (piece && clearingRows.length === 0 && !over) {
            const ghostY = getGhostY();
            if (ghostY !== pieceY || !valid(pieceX, pieceY, piece)) {
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                for (let r = 0; r < piece.length; r++) {
                    for (let c = 0; c < piece[r].length; c++) {
                        if (piece[r][c]) {
                            const gx = pieceX + c;
                            const gy = ghostY + r;
                            // 确保不超出棋盘
                            if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
                                ctx.fillRect(gx * BLOCK + 3, gy * BLOCK + 3, BLOCK - 6, BLOCK - 6);
                            }
                        }
                    }
                }
            }
        }

        // 当前方块
        if (piece && clearingRows.length === 0 && !over) {
            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c]) {
                        const px = pieceX + c;
                        const py = pieceY + r;
                        if (px >= 0 && px < COLS && py >= 0 && py < ROWS) {
                            drawPixelBlock(px * BLOCK, py * BLOCK, BLOCK, pieceColor);
                        }
                    }
                }
            }
        }

        // 粒子
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= p.decay;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // 下一个方块预览
        if (nextPiece) {
            const px = boardW + 16;
            const py = 20;
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('下一个', px, py);
            const pSize = 16;
            for (let r = 0; r < nextPiece.shape.length; r++) {
                for (let c = 0; c < nextPiece.shape[r].length; c++) {
                    if (nextPiece.shape[r][c]) {
                        const bx = px + c * pSize;
                        const by = py + 10 + r * pSize;
                        ctx.fillStyle = nextPiece.color;
                        ctx.fillRect(bx + 1, by + 1, pSize - 2, pSize - 2);
                        ctx.fillStyle = lighten(nextPiece.color, 50);
                        ctx.fillRect(bx + 1, by + 1, pSize - 2, 2);
                        ctx.fillRect(bx + 1, by + 1, 2, pSize - 2);
                        ctx.fillStyle = darken(nextPiece.color, 50);
                        ctx.fillRect(bx + 1, by + pSize - 3, pSize - 2, 2);
                        ctx.fillRect(bx + pSize - 3, by + 1, 2, pSize - 2);
                    }
                }
            }
        }

        // 暂停
        if (paused && !over) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, boardW, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 26px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('暂停', boardW / 2, canvas.height / 2);
        }

        // 结束
        if (over) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, boardW, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', boardW / 2, canvas.height / 2 - 10);
            ctx.fillStyle = '#f0c060';
            ctx.font = '14px monospace';
            ctx.fillText('得分: ' + score, boardW / 2, canvas.height / 2 + 25);
            ctx.fillText('消行: ' + lines, boardW / 2, canvas.height / 2 + 45);
        }
    }

    function update(timestamp) {
        if (!over && !paused && clearingRows.length === 0 && timestamp) {
            if (timestamp - lastDrop > dropInterval) {
                drop();
            }
        }
        if (clearingRows.length > 0) {
            clearAnimTimer--;
            if (clearAnimTimer <= 0) clearingRows = [];
        }
        draw();
        updateScore('🧊 ' + score + ' | Lv.' + level + ' | ' + lines + '行');
        animationId = requestAnimationFrame(update);
    }

    // 触摸
    let tsX = 0, tsY = 0, tsT = 0, moved = false;
    canvas.addEventListener('touchstart', function(e) {
        if (over || paused) return;
        tsX = e.touches[0].clientX; tsY = e.touches[0].clientY;
        tsT = Date.now(); moved = false;
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
        if (over || paused) return;
        const dx = e.touches[0].clientX - tsX;
        const dy = e.touches[0].clientY - tsY;
        if (Math.abs(dx) > BLOCK * 0.7) {
            move(dx > 0 ? 1 : -1);
            tsX = e.touches[0].clientX;
            moved = true;
        }
        if (dy > BLOCK * 0.8) {
            drop();
            tsY = e.touches[0].clientY;
            moved = true;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
        if (over) return;
        if (!moved && Date.now() - tsT < 200 &&
            Math.abs(e.changedTouches[0].clientX - tsX) < 10 &&
            Math.abs(e.changedTouches[0].clientY - tsY) < 10) {
            rotate();
        }
    });

    // 键盘
    document.onkeydown = function(e) {
        if (over) return;
        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowDown') drop();
        if (e.key === 'ArrowUp') rotate();
        if (e.key === ' ') { e.preventDefault(); hardDrop(); }
        if (e.key === 'p' || e.key === 'P') paused = !paused;
    };

    // 按钮
    window._tetrisMove = function(dir) {
        if (over) return;
        if (dir === 'left') move(-1);
        if (dir === 'right') move(1);
        if (dir === 'down') drop();
        if (dir === 'rotate') rotate();
        if (dir === 'hard') hardDrop();
    };
    window._tetrisPause = function() { paused = !paused; };
    window._restartTetris = function() {
        if (animationId) cancelAnimationFrame(animationId);
        board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        score = 0; level = 1; lines = 0;
        over = false; paused = false;
        clearingRows = []; particles = [];
        dropInterval = 600;
        lastDrop = performance.now();
        piece = null; nextPiece = null;
        spawnPiece();
        updateScore('🧊 0 | Lv.1 | 0行');
        animationId = requestAnimationFrame(update);
    };

    // 启动
    spawnPiece();
    lastDrop = performance.now();
    updateScore('🧊 0 | Lv.1 | 0行');
    animationId = requestAnimationFrame(update);

    setControls(`
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%">
            <div style="display:flex;gap:6px">
                <button onclick="window._restartTetris()" style="background:#e94560;color:#fff;border:none;padding:8px 18px;border-radius:20px;font-size:13px;cursor:pointer">🔄 重来</button>
                <button onclick="window._tetrisPause()" style="background:#f0c060;color:#111;border:none;padding:8px 18px;border-radius:20px;font-size:13px;cursor:pointer">⏯ 暂停</button>
            </div>
            <div style="display:grid;grid-template-columns:60px 60px 60px;grid-template-rows:50px 50px 50px;gap:4px">
                <div></div>
                <button onpointerdown="window._tetrisMove('rotate')"
                    style="background:#7c4dff;color:#fff;border:none;font-size:20px;border-radius:10px;cursor:pointer;touch-action:manipulation;user-select:none">↻</button>
                <div></div>
                <button onpointerdown="window._tetrisMove('left')"
                    style="background:#2a2a5a;color:#fff;border:none;font-size:22px;border-radius:10px;cursor:pointer;touch-action:manipulation;user-select:none">◀</button>
                <button onpointerdown="window._tetrisMove('hard')"
                    style="background:#e94560;color:#fff;border:none;font-size:16px;border-radius:10px;cursor:pointer;touch-action:manipulation;user-select:none">⏬</button>
                <button onpointerdown="window._tetrisMove('right')"
                    style="background:#2a2a5a;color:#fff;border:none;font-size:22px;border-radius:10px;cursor:pointer;touch-action:manipulation;user-select:none">▶</button>
                <div></div>
                <button onpointerdown="window._tetrisMove('down')"
                    style="background:#2a2a5a;color:#fff;border:none;font-size:22px;border-radius:10px;cursor:pointer;touch-action:manipulation;user-select:none">▼</button>
                <div></div>
            </div>
            <div style="color:#777;font-size:10px">点击画面=旋转 | 滑动=移动 | 双击=硬降</div>
        </div>
    `);
}

// ========== 4. 扫雷 ==========
function init_minesweeper() {
    const ROWS = 8, COLS = 8, MINES = 10;
    const canvas = document.createElement('canvas');
    const cell = 44;
    canvas.width = COLS * cell; canvas.height = ROWS * cell;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let board = [], revealed = [], flagged = [], over = false;

    function init() {
        board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        revealed = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
        flagged = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
        over = false;
        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
            if (board[r][c] !== 'M') {
                board[r][c] = 'M'; placed++;
                for (let dr = -1; dr <= 1; dr++)
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] !== 'M')
                            board[nr][nc]++;
                    }
            }
        }
    }

    function reveal(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || revealed[r][c] || flagged[r][c]) return;
        revealed[r][c] = true;
        if (board[r][c] === 0)
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++)
                    reveal(r + dr, c + dc);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) {
                const x = c * cell, y = r * cell;
                ctx.fillStyle = revealed[r][c] ? '#ddd' : '#999';
                ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
                ctx.strokeStyle = '#555'; ctx.strokeRect(x, y, cell, cell);
                ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
                if (revealed[r][c] && board[r][c] === 'M') ctx.fillText('💣', x + cell / 2, y + cell / 2 + 6);
                else if (revealed[r][c] && board[r][c] > 0) {
                    ctx.fillStyle = '#333'; ctx.fillText(board[r][c], x + cell / 2, y + cell / 2 + 6);
                }
                if (flagged[r][c]) ctx.fillText('🚩', x + cell / 2, y + cell / 2 + 6);
            }
    }

    canvas.onclick = function (e) {
        if (over) return;
        const rect = canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / cell);
        const r = Math.floor((e.clientY - rect.top) / cell);
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        if (board[r][c] === 'M') {
            over = true;
            for (let rr = 0; rr < ROWS; rr++)
                for (let cc = 0; cc < COLS; cc++)
                    if (board[rr][cc] === 'M') revealed[rr][cc] = true;
            updateScore('💥 踩雷了！');
        } else {
            reveal(r, c);
            if (revealed.flat().filter(Boolean).length === ROWS * COLS - MINES) {
                over = true;
                updateScore('🎉 你赢了！');
            }
        }
        draw();
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
        if (over) return;
        const rect = canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / cell);
        const r = Math.floor((e.clientY - rect.top) / cell);
        if (!revealed[r][c]) flagged[r][c] = !flagged[r][c];
        draw();
    };

    init(); draw();
    setControls('<button onclick="startGame(\'minesweeper\')">🔄 重新开始</button>');
}

// ========== 5. 2048 ==========
function init_game2048() {
    const SZ = 4, cell = 78;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SZ * cell + 20;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let grid = Array(SZ).fill(null).map(() => Array(SZ).fill(0));
    let score = 0;

    function add() {
        const empty = [];
        for (let r = 0; r < SZ; r++)
            for (let c = 0; c < SZ; c++)
                if (!grid[r][c]) empty.push({ r, c });
        if (empty.length) {
            const { r, c } = empty[Math.floor(Math.random() * empty.length)];
            grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    function slide(row) {
        let arr = row.filter(v => v);
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2; score += arr[i]; arr[i + 1] = 0;
            }
        }
        arr = arr.filter(v => v);
        while (arr.length < SZ) arr.push(0);
        return arr;
    }

    function move(dir) {
        const old = grid.map(r => [...r]);
        for (let i = 0; i < SZ; i++) {
            if (dir === 'left') grid[i] = slide(grid[i]);
            if (dir === 'right') grid[i] = slide(grid[i].reverse()).reverse();
            if (dir === 'up') { const col = slide(grid.map(r => r[i])); for (let r = 0; r < SZ; r++) grid[r][i] = col[r]; }
            if (dir === 'down') { const col = slide(grid.map(r => r[i]).reverse()).reverse(); for (let r = 0; r < SZ; r++) grid[r][i] = col[r]; }
        }
        if (grid.some((r, ri) => r.some((v, ci) => v !== old[ri][ci]))) {
            add(); draw();
        }
        updateScore('🔢 ' + score);
        if (!grid.flat().includes(0) && !canMove()) updateScore('游戏结束！' + score);
    }

    function canMove() {
        for (let r = 0; r < SZ; r++)
            for (let c = 0; c < SZ - 1; c++)
                if (grid[r][c] === grid[r][c + 1]) return true;
        for (let c = 0; c < SZ; c++)
            for (let r = 0; r < SZ - 1; r++)
                if (grid[r][c] === grid[r + 1][c]) return true;
        return false;
    }

    function draw() {
        ctx.fillStyle = '#bbada0'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < SZ; r++)
            for (let c = 0; c < SZ; c++) {
                const x = c * cell + 10, y = r * cell + 10;
                const colors = { 0: '#cdc1b4', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
                ctx.fillStyle = colors[grid[r][c]] || '#3c3a32';
                ctx.fillRect(x, y, cell - 5, cell - 5);
                if (grid[r][c]) {
                    ctx.fillStyle = grid[r][c] > 4 ? '#fff' : '#776e65';
                    ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(grid[r][c], x + cell / 2, y + cell / 2 + 8);
                }
            }
    }

    let tsx, tsy;
    canvas.addEventListener('touchstart', e => { tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; });
    canvas.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tsx, dy = e.changedTouches[0].clientY - tsy;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    });

    document.onkeydown = function (e) {
        if (e.key === 'ArrowLeft') move('left');
        if (e.key === 'ArrowRight') move('right');
        if (e.key === 'ArrowUp') move('up');
        if (e.key === 'ArrowDown') move('down');
    };

    add(); add(); draw();
    setControls('<button onclick="startGame(\'game2048\')">🔄 重新开始</button>');
}

// ========== 6. 打砖块 ==========
function init_breakout() {
    const canvas = document.createElement('canvas');
    canvas.width = 380; canvas.height = 500;
    canvas.style.background = '#111';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let paddle = { x: 140, y: 470, w: 100, h: 12 };
    let ball = { x: 190, y: 300, dx: 3, dy: -3, r: 7 };
    let score = 0, lives = 3;
    let bricks = [];
    function buildBricks() {
        bricks = [];
        for (let r = 0; r < 5; r++)
            for (let c = 0; c < 7; c++)
                bricks.push({
                    x: c * 50 + 15, y: r * 25 + 30, w: 44, h: 20, alive: true,
                    color: ['#ff6b6b','#ff9f43','#feca57','#54a0ff','#5f27cd'][r]
                });
    }
    buildBricks();

    function loop() {
        ball.x += ball.dx; ball.y += ball.dy;
        if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.dx *= -1;
        if (ball.y - ball.r < 0) ball.dy *= -1;
        if (ball.y + ball.r > canvas.height) {
            lives--;
            if (lives <= 0) {
                updateScore('游戏结束！' + score);
                clearInterval(gameTimer);
                return;
            }
            ball.x = 190; ball.y = 300; ball.dx = 3; ball.dy = -3;
        }
        if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h &&
            ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
            ball.dy = -Math.abs(ball.dy);
        }
        bricks.forEach(b => {
            if (b.alive && ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
                b.alive = false; ball.dy *= -1; score += 10;
            }
        });
        if (bricks.every(b => !b.alive)) buildBricks();
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
        bricks.forEach(b => { if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); } });
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        updateScore('🧱 ' + score + ' ❤️' + lives);
    }

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, e.clientX - rect.left - paddle.w / 2));
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, e.touches[0].clientX - rect.left - paddle.w / 2));
    });

    gameTimer = setInterval(loop, 16);
    setControls('<button onclick="startGame(\'breakout\')">🔄 重新开始</button>');
}

// ========== 7. 记忆翻牌 ==========
function init_memory() {
    const icons = ['🌸','🌟','🎈','🐱','🍕','🎵','⚽','🦋'];
    let cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
    let flipped = [], matched = [], score = 0, lock = false;
    const canvas = document.createElement('canvas');
    canvas.width = 340; canvas.height = 340;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const cardW = 72, cardH = 72, gap = 10;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cards.forEach((icon, i) => {
            const x = (i % 4) * (cardW + gap) + 14;
            const y = Math.floor(i / 4) * (cardH + gap) + 14;
            if (matched.includes(i) || flipped.includes(i)) {
                ctx.fillStyle = '#fff'; ctx.fillRect(x, y, cardW, cardH);
                ctx.font = '32px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(icon, x + cardW / 2, y + cardH / 2 + 10);
            } else {
                ctx.fillStyle = '#e94560'; ctx.fillRect(x, y, cardW, cardH);
                ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('?', x + cardW / 2, y + cardH / 2 + 8);
            }
            ctx.strokeStyle = '#333'; ctx.strokeRect(x, y, cardW, cardH);
        });
    }

    canvas.onclick = function (e) {
        if (lock) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 14;
        const y = e.clientY - rect.top - 14;
        const col = Math.floor(x / (cardW + gap));
        const row = Math.floor(y / (cardH + gap));
        const i = row * 4 + col;
        if (i < 0 || i >= cards.length || matched.includes(i) || flipped.includes(i)) return;
        flipped.push(i);
        if (flipped.length === 2) {
            lock = true;
            if (cards[flipped[0]] === cards[flipped[1]]) {
                matched.push(...flipped);
                score += 20;
                flipped = [];
                lock = false;
                if (matched.length === cards.length) updateScore('🎉 完成！' + score);
            } else {
                setTimeout(() => { flipped = []; lock = false; draw(); }, 700);
            }
        }
        draw();
        updateScore('🧠 ' + score);
    };

    draw();
    setControls('<button onclick="startGame(\'memory\')">🔄 重新开始</button>');
}

// ========== 8. 反应测试 ==========
function init_reaction() {
    document.getElementById('gameArea').innerHTML = `
        <div id="reactBox" style="width:280px;height:280px;background:#e94560;border-radius:50%;
            display:flex;align-items:center;justify-content:center;cursor:pointer;
            font-size:22px;color:#fff;text-align:center;transition:background 0.2s">
            点击开始
        </div>`;
    let state = 'waiting', startTime;
    const box = document.getElementById('reactBox');

    box.onclick = function () {
        if (state === 'waiting') {
            box.style.background = '#e94560';
            box.textContent = '等待绿色...';
            state = 'ready';
            const delay = 1000 + Math.random() * 3000;
            window._reactTimeout = setTimeout(() => {
                if (state === 'ready') {
                    box.style.background = '#2ed573';
                    box.textContent = '快按！';
                    startTime = Date.now();
                    state = 'go';
                }
            }, delay);
        } else if (state === 'go') {
            const time = Date.now() - startTime;
            box.textContent = time + ' ms';
            updateScore('⚡ ' + time + 'ms');
            state = 'done';
            setTimeout(() => {
                box.style.background = '#e94560';
                box.textContent = '点击开始';
                state = 'waiting';
            }, 2000);
        }
    };

    setControls('<button onclick="startGame(\'reaction\')">🔄 重新测试</button>');
}

// ========== 9. 像素小鸟 ==========
function init_flappy() {
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 400;
    canvas.style.background = '#87CEEB';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let bird = { x: 60, y: 200, vy: 0, r: 12 };
    let pipes = [{ x: 300, gapY: 200, gap: 110 }];
    let score = 0, over = false;

    function loop() {
        if (over) return;
        bird.vy += 0.4;
        bird.y += bird.vy;
        pipes.forEach(p => p.x -= 2);
        if (pipes.length && pipes[0].x < -50) { pipes.shift(); score++; }
        if (!pipes.length || pipes[pipes.length - 1].x < 150) {
            pipes.push({ x: 320, gapY: 80 + Math.random() * 200, gap: 110 });
        }
        pipes.forEach(p => {
            if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + 40 &&
                (bird.y - bird.r < p.gapY - p.gap / 2 || bird.y + bird.r > p.gapY + p.gap / 2)) {
                over = true;
            }
        });
        if (bird.y + bird.r > canvas.height || bird.y - bird.r < 0) over = true;

        ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        pipes.forEach(p => {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(p.x, 0, 40, p.gapY - p.gap / 2);
            ctx.fillRect(p.x, p.gapY + p.gap / 2, 40, canvas.height - p.gapY - p.gap / 2);
        });
        ctx.fillStyle = '#f1c40f'; ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = '20px sans-serif'; ctx.fillText(score, 10, 30);
        if (over) updateScore('游戏结束！' + score);
        else updateScore('🐦 ' + score);
    }

    canvas.onclick = function () {
        if (!over) bird.vy = -7; else startGame('flappy');
    };
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (!over) bird.vy = -7; else startGame('flappy');
    });

    gameTimer = setInterval(loop, 20);
    setControls('<button onclick="startGame(\'flappy\')">🔄 重新开始</button>');
}

// ========== 10. 乒乓球 ==========
function init_pong() {
    const canvas = document.createElement('canvas');
    canvas.width = 380; canvas.height = 300;
    canvas.style.background = '#111';
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let ball = { x: 190, y: 150, dx: 3, dy: 2, r: 8 };
    let paddle = { x: 150, y: 280, w: 80, h: 10 };
    let score = 0;

    function loop() {
        ball.x += ball.dx; ball.y += ball.dy;
        if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.dx *= -1;
        if (ball.y - ball.r < 0) ball.dy *= -1;
        if (ball.y + ball.r > canvas.height) { score = 0; ball.x = 190; ball.y = 150; ball.dx = 3; ball.dy = 2; }
        if (ball.y + ball.r > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
            ball.dy = -Math.abs(ball.dy);
            ball.dx += (ball.x - paddle.x - paddle.w / 2) * 0.08;
            score++;
        }
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        updateScore('🏓 ' + score);
    }

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, e.clientX - rect.left - paddle.w / 2));
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, e.touches[0].clientX - rect.left - paddle.w / 2));
    });

    gameTimer = setInterval(loop, 16);
    setControls('<button onclick="startGame(\'pong\')">🔄 重新开始</button>');
}

// ========== 11. 井字棋 ==========
function init_tictactoe() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 300;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let board = Array(9).fill(null), turn = 'X', over = false;

    function draw() {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 300);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
        [100, 200].forEach(p => {
            ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 300); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(300, p); ctx.stroke();
        });
        board.forEach((v, i) => {
            const x = (i % 3) * 100 + 50, y = Math.floor(i / 3) * 100 + 50;
            ctx.font = '50px sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = v === 'X' ? '#e94560' : '#4facfe';
            ctx.fillText(v || '', x, y + 15);
        });
    }

    canvas.onclick = function (e) {
        if (over) return;
        const rect = canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / 100);
        const r = Math.floor((e.clientY - rect.top) / 100);
        const i = r * 3 + c;
        if (board[i]) return;
        board[i] = turn;
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        if (wins.some(w => w.every(j => board[j] === turn))) {
            over = true;
            updateScore(turn + ' 获胜！');
        } else if (board.every(b => b)) {
            over = true;
            updateScore('平局！');
        }
        turn = turn === 'X' ? 'O' : 'X';
        draw();
    };

    draw();
    setControls('<button onclick="startGame(\'tictactoe\')">🔄 重新开始</button>');
}

// ========== 12. 消消乐 ==========
function init_match3() {
    const SIZE = 6, cell = 50;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE * cell + 10;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const emojis = ['🔴','🟢','🔵','🟡','🟣','🟠'];
    let grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null).map(() => Math.floor(Math.random() * 6)));
    let selected = null, score = 0;

    function draw() {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++) {
                ctx.fillStyle = '#2a2a4a';
                ctx.fillRect(c * cell + 6, r * cell + 6, cell - 6, cell - 6);
                ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(emojis[grid[r][c]], c * cell + cell / 2, r * cell + cell / 2 + 9);
                if (selected && selected.r === r && selected.c === c) {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
                    ctx.strokeRect(c * cell + 6, r * cell + 6, cell - 6, cell - 6);
                }
            }
    }

    canvas.onclick = function (e) {
        const rect = canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / cell);
        const r = Math.floor((e.clientY - rect.top) / cell);
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
        if (selected) {
            if (Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1) {
                const sr = selected.r, sc = selected.c;
                [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]];
                score += 5;
            }
            selected = null;
        } else {
            selected = { r, c };
        }
        draw();
        updateScore('💎 ' + score);
    };

    draw();
    setControls('<button onclick="startGame(\'match3\')">🔄 重新开始</button>');
}

// ========== 13. 迷宫 ==========
function init_maze() {
    const SIZE = 10, cell = 32;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE * cell;
    document.getElementById('gameArea').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let player = { x: 0, y: 0 };
    const goal = { x: SIZE - 1, y: SIZE - 1 };
    const walls = new Set();
    // 生成简单迷宫
    for (let i = 0; i < SIZE; i++) {
        if (i !== Math.floor(SIZE/2)) walls.add(`${i},${Math.floor(SIZE/3)}`);
        if (i !== Math.floor(SIZE/2)) walls.add(`${i},${Math.floor(SIZE*2/3)}`);
        walls.add(`${Math.floor(SIZE/3)},${i}`);
        walls.add(`${Math.floor(SIZE*2/3)},${i}`);
    }
    // 确保起点终点通畅
    walls.delete('0,0');
    walls.delete(`${SIZE-1},${SIZE-1}`);
    // 打通一些墙
    for (let i = 0; i < SIZE; i++) {
        walls.delete(`${Math.floor(SIZE/2)},${i}`);
        walls.delete(`${i},${Math.floor(SIZE/2)}`);
    }

    function draw() {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++) {
                if (walls.has(`${c},${r}`)) {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(c * cell, r * cell, cell, cell);
                }
                ctx.strokeStyle = '#333'; ctx.strokeRect(c * cell, r * cell, cell, cell);
            }
        ctx.fillStyle = '#f0c060'; ctx.fillRect(goal.x * cell + 4, goal.y * cell + 4, cell - 8, cell - 8);
        ctx.fillStyle = '#e94560'; ctx.beginPath();
        ctx.arc(player.x * cell + cell/2, player.y * cell + cell/2, cell/3, 0, Math.PI*2); ctx.fill();
    }

    document.onkeydown = function (e) {
        let nx = player.x, ny = player.y;
        if (e.key === 'ArrowUp') ny--;
        if (e.key === 'ArrowDown') ny++;
        if (e.key === 'ArrowLeft') nx--;
        if (e.key === 'ArrowRight') nx++;
        if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && !walls.has(`${nx},${ny}`)) {
            player.x = nx; player.y = ny;
            if (player.x === goal.x && player.y === goal.y) updateScore('🏆 到达终点！');
        }
        draw();
    };

    draw();
    setControls(`
        <button onclick="document.onkeydown({key:'ArrowUp'})">⬆</button>
        <button onclick="document.onkeydown({key:'ArrowLeft'})">⬅</button>
        <button onclick="document.onkeydown({key:'ArrowDown'})">⬇</button>
        <button onclick="document.onkeydown({key:'ArrowRight'})">➡</button>
        <button onclick="startGame('maze')">🔄</button>
    `);
}

// ========== 14. 打字竞速 (手机虚拟键盘版) ==========
function init_typing() {
    const words = [
        'hello','world','happy','smile','dream','light','music','dance','star',
        'flower','rainbow','sunshine','candy','puppy','kitten','cloud','ocean',
        'mountain','river','forest','garden','castle','dragon','wizard','fairy',
        'magic','sparkle','bubble','cookie','apple','lemon','cherry','grape',
        'peach','mango','melon','bread','cheese','butter','sugar','honey',
        'tiger','panda','rabbit','monkey','dolphin','penguin','parrot','eagle',
        'summer','winter','spring','autumn','snow','rain','wind','storm',
        'thunder','lightning','rainbow','sunset','sunrise','midnight','twilight',
        'diamond','crystal','silver','golden','pearl','ruby','emerald','amber',
        'piano','guitar','violin','drum','flute','trumpet','rhythm','melody',
        'circle','square','triangle','spiral','galaxy','planet','comet','asteroid',
        'rocket','robot','pirate','ninja','knight','hero','angel','ghost',
        'turtle','lizard','parrot','falcon','jaguar','koala','walrus','otter',
        'bamboo','lotus','maple','willow','orchid','daisy','tulip','rose',
        'bridge','tower','temple','palace','harbor','island','lagoon','reef',
        'marble','velvet','cotton','denim','coral','ivory','bronze','copper',
        'picnic','candle','lantern','pillow','basket','ribbon','feather','button',
        'garden','jungle','desert','meadow','canyon','glacier','volcano','geyser',
        'rocket','shuttle','launch','orbit','cosmic','nebula','quasar','pulsar',
        'riddle','puzzle','secret','mystery','legend','myth','fable','story',
        'autumn','breeze','chilly','cozy','frost','crispy','golden','rustic',
        'bubble','giggle','jolly','lively','merry','peppy','sunny','zesty',
        'brave','clever','gentle','kind','loyal','noble','swift','wise',
        'amber','azure','coral','indigo','jade','mauve','olive','plum',
        'acorn','birch','cedar','elm','fern','holly','ivy','moss'
    ];

    let target = '';
    let input = '';
    let score = 0;
    let combo = 0;
    let timeLeft = 60;
    let timerInterval = null;
    let gameOver = false;

    // 键盘布局
    const rows = [
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['z','x','c','v','b','n','m']
    ];

    document.getElementById('gameArea').innerHTML = `
        <div style="text-align:center;padding:10px;width:100%;max-width:380px">
            <div id="typeTimer" style="font-size:18px;color:#4facfe;margin-bottom:8px">⏱ 60s</div>
            <div id="typeCombo" style="font-size:14px;color:#f0c060;margin-bottom:4px;min-height:20px"></div>
            <div id="typeWord" style="font-size:40px;color:#fff;letter-spacing:6px;margin:15px 0;min-height:50px;word-break:break-all"></div>
            <div id="typeInput" style="font-size:24px;color:#2ed573;letter-spacing:4px;margin:10px 0;min-height:30px;word-break:break-all"></div>
            <div id="typeKeyboard" style="margin-top:10px"></div>
        </div>
    `;

    function buildKeyboard() {
        const kb = document.getElementById('typeKeyboard');
        kb.innerHTML = '';
        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.style.cssText = 'display:flex;justify-content:center;gap:4px;margin-bottom:4px;flex-wrap:wrap';
            row.forEach(letter => {
                const btn = document.createElement('button');
                btn.textContent = letter.toUpperCase();
                btn.style.cssText = `
                    width:32px;height:38px;border-radius:8px;border:none;
                    background:#2a2a4a;color:#fff;font-size:15px;
                    cursor:pointer;font-weight:bold;
                    transition:all 0.1s;
                `;
                btn.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    if (gameOver) return;
                    pressKey(letter);
                    btn.style.background = '#4facfe';
                    btn.style.transform = 'scale(0.9)';
                });
                btn.addEventListener('pointerup', () => {
                    btn.style.background = '#2a2a4a';
                    btn.style.transform = 'scale(1)';
                });
                btn.addEventListener('pointerleave', () => {
                    btn.style.background = '#2a2a4a';
                    btn.style.transform = 'scale(1)';
                });
                rowDiv.appendChild(btn);
            });
            kb.appendChild(rowDiv);
        });

        // 退格键
        const delRow = document.createElement('div');
        delRow.style.cssText = 'display:flex;justify-content:center;gap:4px;margin-top:4px';
        ['Clear', '⌫'].forEach(label => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `
                padding:8px 24px;border-radius:8px;border:none;
                background:#e94560;color:#fff;font-size:15px;
                cursor:pointer;font-weight:bold;
                transition:all 0.1s;
            `;
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (gameOver) return;
                if (label === '⌫') {
                    input = input.slice(0, -1);
                } else {
                    input = '';
                }
                updateDisplay();
                btn.style.transform = 'scale(0.9)';
            });
            btn.addEventListener('pointerup', () => btn.style.transform = 'scale(1)');
            btn.addEventListener('pointerleave', () => btn.style.transform = 'scale(1)');
            delRow.appendChild(btn);
        });
        document.getElementById('typeKeyboard').appendChild(delRow);
    }

    function pressKey(letter) {
        if (gameOver) return;
        input += letter;
        updateDisplay();

        // 检查是否匹配
        if (input === target) {
            combo++;
            const bonus = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
            score += target.length * 10 * bonus;
            updateScore('⌨️ ' + score);
            document.getElementById('typeCombo').textContent = combo >= 2 ? '🔥 Combo x' + combo : '';
            newWord();
        } else if (!target.startsWith(input)) {
            // 不匹配，闪烁提示
            const wordEl = document.getElementById('typeWord');
            wordEl.style.color = '#ff4757';
            setTimeout(() => { wordEl.style.color = '#fff'; }, 150);
            combo = 0;
            document.getElementById('typeCombo').textContent = '';
            input = input.slice(0, -1);
            updateDisplay();
        }
    }

    function updateDisplay() {
        document.getElementById('typeInput').textContent = input;
        // 高亮已输入部分
        const wordEl = document.getElementById('typeWord');
        let display = '';
        for (let i = 0; i < target.length; i++) {
            if (i < input.length && input[i] === target[i]) {
                display += '<span style="color:#2ed573">' + target[i] + '</span>';
            } else if (i < input.length) {
                display += '<span style="color:#ff4757">' + target[i] + '</span>';
            } else {
                display += target[i];
            }
        }
        wordEl.innerHTML = display;
    }

    function newWord() {
        target = words[Math.floor(Math.random() * words.length)];
        input = '';
        document.getElementById('typeWord').innerHTML = target;
        document.getElementById('typeInput').textContent = '';
    }

    function startTimer() {
        timeLeft = 60;
        document.getElementById('typeTimer').textContent = '⏱ ' + timeLeft + 's';
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('typeTimer').textContent = '⏱ ' + timeLeft + 's';
            if (timeLeft <= 10) {
                document.getElementById('typeTimer').style.color = '#ff4757';
            }
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                gameOver = true;
                document.getElementById('typeTimer').textContent = '⏰ Time up!';
                document.getElementById('typeWord').textContent = 'Final Score: ' + score;
                document.getElementById('typeInput').textContent = '';
                document.getElementById('typeCombo').textContent = '';
                updateScore('⌨️ ' + score + ' 🏁');
            }
        }, 1000);
    }

    buildKeyboard();
    newWord();
    startTimer();
    updateScore('⌨️ 0');
    setControls('<button onclick="startGame(\'typing\')">🔄 Restart</button>');
}

// ========== 15. 骰子比大小 ==========
function init_dice() {
    let score = 0;
    document.getElementById('gameArea').innerHTML = `
        <div style="text-align:center;padding:30px">
            <div id="diceFace" style="font-size:90px">🎲</div>
            <div id="diceNum" style="font-size:28px;color:#f0c060;margin:10px 0">?</div>
        </div>`;

    function roll(guess) {
        const result = Math.floor(Math.random() * 6) + 1;
        const diceEmojis = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
        document.getElementById('diceFace').textContent = diceEmojis[result];
        document.getElementById('diceNum').textContent = result;

        let correct = false;
        if (guess === 'big' && result >= 4) correct = true;
        if (guess === 'small' && result <= 3) correct = true;
        if (guess === result) correct = true;

        if (correct) {
            score += 10;
            showToast('猜对了！+10');
        } else {
            score = Math.max(0, score - 5);
            showToast('猜错了 -5');
        }
        updateScore('🎲 ' + score);
    }

    window._rollDice = roll;
    setControls(`
        <button onclick="window._rollDice('small')">小 (1-3)</button>
        <button onclick="window._rollDice('big')">大 (4-6)</button>
        <button onclick="startGame('dice')">🔄</button>
    `);
}
