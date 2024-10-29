const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

let paddleWidth = 100, paddleHeight = 10, ballRadius = 10;
let paddleX = (canvas.width - paddleWidth) / 2;
let ballX = canvas.width / 2, ballY = canvas.height - 30;
let dx, dy;
let bricks = [];
let brickRowCount, brickColumnCount, brickWidth = 100, brickHeight = 30, brickPadding = 10;
let score = 0;
let lives = 3;  // 新增生命
let isGameOver = false;
let animationFrameId; // 用來保存動畫循環的 ID
let gamePaused = false;  // 新增遊戲是否暫停的狀態
const levels = {
    easy: [
        { rows: 3, cols: 5, speed: { dx: 2, dy: -2 } },
        { rows: 4, cols: 6, speed: { dx: 2, dy: -2 } },
        { rows: 5, cols: 7, speed: { dx: 2, dy: -2 } }
    ],
    medium: [
        { rows: 4, cols: 6, speed: { dx: 3, dy: -3 } },
        { rows: 5, cols: 7, speed: { dx: 3, dy: -3 } },
        { rows: 6, cols: 8, speed: { dx: 3, dy: -3 } }
    ],
    hard: [
        { rows: 5, cols: 7, speed: { dx: 4, dy: -4 } },
        { rows: 6, cols: 8, speed: { dx: 4, dy: -4 } },
        { rows: 7, cols: 9, speed: { dx: 4, dy: -4 } }
    ]
};


class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;  // 粒子的隨機大小
        this.speedX = Math.random() * 2 - 1;  // 粒子的水平移動速度
        this.speedY = Math.random() * 2 - 1;  // 粒子的垂直移動速度
        this.color = `rgba(255, 255, 0, ${Math.random()})`;  // 粒子的顏色（黃色閃光效果）
        this.life = Math.random() * 30 + 30;  // 粒子的壽命
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 1;  // 隨著時間減少粒子的壽命
        this.size *= 0.95;  // 逐漸減小粒子
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

let particlesArray = [];  // 儲存所有粒子的數組



let currentLevel = 0;  // 當前關卡
let currentDifficulty = 'easy';  // 當前難度

let comboCount = 0;  // 跟蹤連擊數
let comboTimer = null;  // 計時器
const COMBO_TIME_LIMIT = 2000;  // 連擊的時間限制，單位為毫秒
const BASE_SCORE = 1;  // 每個磚塊的基本分數
const COMBO_MULTIPLIER = 2;  // 連擊加分倍數



const bgMusic = document.getElementById("bgMusic");
const hitSound = document.getElementById("hitSound");

const difficultySelect = document.getElementById("difficultySelect");
const restartBtn = document.getElementById("restartBtn");
const gameOverDiv = document.getElementById("gameOver");
const scoreBoard = document.getElementById("scoreBoard");


let timeRemaining = 180;  // 每關卡倒數180秒（3分鐘）
let timerInterval = null;  // 用於計時器的setInterval引用

const timeBoard = document.getElementById("timeBoard");  // 顯示倒數時間的元素

const themePatterns = {
    nightSky: [
        (r, c) => true, // 全部磚塊
        (r, c) => (r + c) % 2 === 0, // 棋盤格樣式
        (r, c) => r % 2 === 0, // 每兩行一排
    ],
    forest: [
        (r, c) => c % 2 === 0, // 每兩列一排
        (r, c) => (r + c) % 3 === 0, // 三行交錯排列
        (r, c) => (r % 2 === 0 && c % 2 === 0) // 偶數行偶數列
    ]
};


function createBricks(difficulty, levelIndex) {
    const selectedPattern = themePatterns[currentTheme][levelIndex];  // 根據主題和關卡選擇圖案

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            let strength = difficulty === "hard" ? Math.floor(Math.random() * 3) + 1 :
                difficulty === "medium" ? Math.floor(Math.random() * 2) + 1 : 1;

            // 使用圖案設置磚塊
            if (selectedPattern(r, c)) {
                bricks[c][r] = { x: 0, y: 0, status: strength };
            } else {
                bricks[c][r] = { x: 0, y: 0, status: 0 }; // 無磚塊
            }
        }
    }
}



let paddleY = canvas.height - paddleHeight;  // 擋板的初始垂直位置

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}


function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let brick = bricks[c][r];
            if (brick.status > 0) {
                let brickX = (c * (brickWidth + brickPadding)) + 30;
                let brickY = (r * (brickHeight + brickPadding)) + 30;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = brick.status === 1 ? "#0095DD" : brick.status === 2 ? "#DD9500" : "#DD0000";
                ctx.fill();
                ctx.closePath();

                ctx.fillStyle = "white";
                ctx.fillText(brick.status, brickX + brickWidth / 2 - 5, brickY + brickHeight / 2 + 5);
            }
        }
    }
}

function createParticles(x, y) {
    for (let i = 0; i < 10; i++) {  // 每次生成10個粒子
        particlesArray.push(new Particle(x, y));
    }
}


function collisionDetection() {
    let allBricksBroken = true;  // 初始化一個標誌，判斷所有磚塊是否被擊破
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let brick = bricks[c][r];
            if (brick.status > 0) {
                allBricksBroken = false;  // 如果有任何磚塊還沒被擊破，標誌設為 false
                if (
                    ballX > brick.x && ballX < brick.x + brickWidth &&
                    ballY > brick.y && ballY < brick.y + brickHeight
                ) {
                    dy = -dy;
                    brick.status--;
                    hitSound.play();  // 播放擊打音效

                    // 更新分數並檢查是否應獎勵生命
                    comboCount++;
                    let bonus = (comboCount > 1) ? (comboCount - 1) * COMBO_MULTIPLIER : 0;
                    let totalPoints = BASE_SCORE + bonus;
                    score += totalPoints;
                    scoreBoard.textContent = "Score: " + score;

                    // 獎勵生命：每 100 分增加一條命
                    if (score % 100 === 0) {
                        lives++;
                        livesBoard.textContent = `Lives: ${lives}`;
                    }

                    // 連擊計時器邏輯
                    if (comboTimer) {
                        clearTimeout(comboTimer);  // 重置計時器
                    }

                    createParticles(brick.x + brickWidth / 2, brick.y + brickHeight / 2);

                    // 重啟計時器，設置連擊窗口時間
                    comboTimer = setTimeout(() => {
                        comboCount = 0;  // 如果在指定時間內沒有擊破新的磚塊，重置連擊
                    }, COMBO_TIME_LIMIT);
                }
            }
        }
    }

    // 當所有磚塊被擊破時，顯示過關動畫
    if (allBricksBroken) {
        showLevelCompleteAnimation();
    }
}



function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}


function draw() {
    if (isGameOver || gamePaused) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';  // 黑色背景帶有透明度
    ctx.fillRect(0, 0, canvas.width, canvas.height);  // 用透明度背景來淡化畫布

    drawBricks();
    drawBall();
    drawPaddle();
    collisionDetection();
    handleParticles();  // 更新並繪製粒子效果

    ballX += dx;
    ballY += dy;

    // 修改碰撞判定，使用動態的擋板位置 paddleY
    if (ballX > paddleX && ballX < paddleX + paddleWidth && ballY + ballRadius > paddleY && ballY + ballRadius < paddleY + paddleHeight) {
        dy = -dy;
    }

    if (ballX + dx > canvas.width - ballRadius || ballX + dx < ballRadius) {
        dx = -dx;
    }
    if (ballY + dy < ballRadius) {
        dy = -dy;
    } else if (ballY + dy > canvas.height - ballRadius && !gamePaused) {
        // 檢測到球掉落，但要排除遊戲暫停狀態
        if (ballX > paddleX && ballX < paddleX + paddleWidth) {
            dy = -dy;
        } else {
            lives--; // 減少生命
            livesBoard.textContent = `Lives: ${lives}`; // 更新 livesBoard 顯示正確的生命數量
            if (lives === 0) {
                isGameOver = true;
                gameOverDiv.classList.remove("hidden");
                bgMusic.pause();  // 停止背景音樂
            } else {
                gamePaused = true;  // 遊戲暫停
                cancelAnimationFrame(animationFrameId);  // 暫停動畫

                // 彈出提示視窗
                Swal.fire({
                    title: 'Oops!',
                    text: `剩下 ${lives} 次機會！`,
                    icon: 'warning',
                    confirmButtonText: '繼續遊戲'
                }).then(() => {
                    ballX = canvas.width / 2;
                    ballY = canvas.height - 30;
                    dx = 3;
                    dy = -3;
                    paddleX = (canvas.width - paddleWidth) / 2;
                    gamePaused = false;  // 解除暫停狀態
                    draw();  // 恢復動畫循環
                });
            }
        }
    }

    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }

    animationFrameId = requestAnimationFrame(draw);  // 繼續動畫循環
}

function handleParticles() {
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();  // 更新粒子位置和狀態
        particlesArray[i].draw(ctx);  // 繪製粒子
        if (particlesArray[i].life <= 0 || particlesArray[i].size <= 0.5) {
            particlesArray.splice(i, 1);  // 移除已經消失的粒子
            i--;
        }
    }
}





let rightPressed = false, leftPressed = false;
let jumpDistance = 50;  // 擋板每次跳躍的距離（可以是 30 或 50 像素）
let jumpCooldown = false;  // 記錄擋板是否處於冷卻狀態
const COOLDOWN_TIME = 1500;  // 冷卻時間，單位為毫秒，1.5 秒

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
    else if (e.code === "Space" && !jumpCooldown) {
        // 空白鍵被按下，且不在冷卻時間內
        jumpPaddle();  // 執行跳躍功能
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

function jumpPaddle() {
    jumpCooldown = true;  // 設置冷卻狀態
    let originalY = paddleY;  // 記錄跳躍前的原始位置
    paddleY -= jumpDistance;  // 擋板向上移動指定像素

    // 限制擋板不能超出畫布頂部
    if (paddleY < 0) {
        paddleY = 0;
    }

    // 設置跳躍後0.5秒返回原位
    setTimeout(() => {
        paddleY = originalY;  // 返回初始位置
    }, 500);  // 0.5秒後返回原位

    // 設置冷卻計時器，1~2秒內不能再次跳躍
    setTimeout(() => {
        jumpCooldown = false;  // 冷卻時間結束，解除冷卻狀態
    }, COOLDOWN_TIME);
}



document.getElementById("nightSkyBtn").addEventListener("click", () => changeTheme("nightSky"));
document.getElementById("forestBtn").addEventListener("click", () => changeTheme("forest"));
let currentTheme;  // 定義當前主題變數

function changeTheme(theme) {
    currentTheme = theme;  // 設定當前主題
    let body = document.body;
    if (theme === "nightSky") {
        body.style.backgroundImage = "url('https://images.unsplash.com/photo-1528818955841-a7f1425131b5?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fHN0YXJyeSUyMHNreXxlbnwwfHwwfHx8MA%3D%3D')";
    } else if (theme === "forest") {
        body.style.backgroundImage = "url('https://media.istockphoto.com/id/1419410282/photo/silent-forest-in-spring-with-beautiful-bright-sun-rays.jpg?s=612x612&w=0&k=20&c=UHeb1pGOw6ozr6utsenXHhV19vW6oiPIxDqhKCS2Llk=')";
    }

    document.getElementById("themeSelect").classList.add("hidden");
    document.getElementById("difficultySelect").classList.remove("hidden");
}

document.getElementById("easyBtn").addEventListener("click", () => startGame("easy", 0));
document.getElementById("mediumBtn").addEventListener("click", () => startGame("medium", 0));
document.getElementById("hardBtn").addEventListener("click", () => startGame("hard", 0));

function startGame(difficulty, levelIndex) {

    if (bgMusic.paused) {
        bgMusic.play();
    }

    currentDifficulty = difficulty;
    currentLevel = levelIndex;

    // 初始化分數和生命顯示
    score = 0;
    lives = 3;
    scoreBoard.textContent = "Score: " + score;
    livesBoard.textContent = `Lives: ${lives}`;

    // 重置時間和分數顯示
    resetTimer();
    timeBoard.textContent = `Time Remaining: ${timeRemaining}s`;

    // 正確隱藏難度選擇區域，顯示遊戲畫面和得分欄
    document.getElementById("difficultySelect").classList.add("hidden");
    document.getElementById("gameCanvas").classList.remove("hidden");
    document.getElementById("scoreBoard").classList.remove("hidden");
    document.getElementById("timeBoard").classList.remove("hidden");
    document.getElementById("livesBoard").classList.remove("hidden");

    const levelData = levels[difficulty][levelIndex];
    brickRowCount = levelData.rows;
    brickColumnCount = levelData.cols;
    dx = levelData.speed.dx;
    dy = levelData.speed.dy;

    paddleX = (canvas.width - paddleWidth) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;

    createBricks(difficulty, levelIndex);  // 初始化磚塊
    draw();  // 開始遊戲動畫
    startTimer();  // 啟動倒數計時
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        timeBoard.textContent = `Time Remaining: ${timeRemaining}s`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            gameOver("Time's up!");  // 時間到，遊戲結束
        }
    }, 1000);  // 每秒減少剩餘時間
}

function resetTimer() {
    clearInterval(timerInterval);  // 清除之前的計時器
    timeRemaining = 180;  // 重置時間為3分鐘
}

function gameOver(message) {
    isGameOver = true;
    clearInterval(timerInterval);  // 停止計時器
    Swal.fire({
        title: 'Game Over',
        text: message,
        icon: 'error',
        confirmButtonText: 'Return to Main Menu'
    }).then(() => {
        resetGame();  // 重置遊戲
        document.getElementById("difficultySelect").classList.remove("hidden");
        document.getElementById("gameCanvas").classList.add("hidden");
        document.getElementById("scoreBoard").classList.add("hidden");
        document.getElementById("timeBoard").classList.add("hidden");
    });
}



restartBtn.addEventListener("click", () => {
    document.location.reload();
});

function showLevelCompleteAnimation() {
    gamePaused = true;  // 暫停遊戲，防止動畫期間觸發其他邏輯
    cancelAnimationFrame(animationFrameId);  // 停止遊戲動畫
    clearInterval(timerInterval);  // 停止計時器

    const levelCompleteDiv = document.getElementById("levelComplete");
    levelCompleteDiv.classList.remove("hidden");
    levelCompleteDiv.classList.add("show");

    setTimeout(() => {
        levelCompleteDiv.classList.remove("show");
        levelCompleteDiv.classList.add("hidden");

        // 檢查是否還有下一關
        if (currentLevel < 2) {  // 每個難度有3個關卡
            currentLevel++;
            gamePaused = false;  // 恢復遊戲狀態
            startGame(currentDifficulty, currentLevel);  // 進入下一關，並重置計時器
        } else {
            // 所有關卡完成，顯示完成訊息並返回主選單
            Swal.fire({
                title: 'Congratulations!',
                text: `You have completed all levels on ${currentDifficulty} difficulty!`,
                icon: 'success',
                confirmButtonText: 'Return to Main Menu'
            }).then(() => {
                resetGame();  // 重置遊戲
                document.getElementById("difficultySelect").classList.remove("hidden");
                document.getElementById("gameCanvas").classList.add("hidden");
                document.getElementById("scoreBoard").classList.add("hidden");
                document.getElementById("timeBoard").classList.add("hidden");
            });
        }
    }, 3000);  // 顯示過關動畫 3 秒後跳轉
}




function resetGame() {
    currentLevel = 0;  // 重置到第一關
    score = 0;  // 重置分數
    lives = 3;  // 重置生命
    isGameOver = false;  // 重置遊戲結束狀態
    gamePaused = false;  // 解除暫停
}

