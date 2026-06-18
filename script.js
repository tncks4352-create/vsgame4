const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const nextLevelText = document.getElementById("nextLevelText");
const message = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const soundBtn = document.getElementById("soundBtn");

const nameInputBox = document.getElementById("nameInputBox");
const nicknameInput = document.getElementById("nicknameInput");
const saveRankBtn = document.getElementById("saveRankBtn");
const rankingList = document.getElementById("rankingList");
const clearRankBtn = document.getElementById("clearRankBtn");

const smallGunSound = new Audio("./smallgun.mp3");
const bigGunSound = new Audio("./biggun.mp3");
const finishSound = new Audio("./finish.mp3");

smallGunSound.volume = 0.35;
bigGunSound.volume = 0.65;
finishSound.volume = 0.7;

let player;
let bullets;
let keys;
let gameRunning;
let gameOver;
let lastBulletTime;
let animationId;

let score = 0;
let difficultyLevel = 1;
let finalScore = 0;
let soundEnabled = true;

const rankStorageKey = "bulletDodgeRankingsByBullets";

function initGame() {
  player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 18,
    speed: 4
  };

  bullets = [];
  keys = {};
  gameRunning = false;
  gameOver = false;
  lastBulletTime = 0;

  score = 0;
  difficultyLevel = 1;
  finalScore = 0;

  stopSound(finishSound);

  updateUI();
  message.textContent = "게임 시작 버튼을 누르세요";

  nameInputBox.classList.add("hidden");
  nicknameInput.value = "";

  draw();
}

function updateUI() {
  levelText.textContent = difficultyLevel;
  scoreText.textContent = score;
  nextLevelText.textContent = difficultyLevel * 10;
}

function playSound(sound) {
  if (!soundEnabled) return;

  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function stopSound(sound) {
  sound.pause();
  sound.currentTime = 0;
}

function startGame() {
  if (gameRunning) return;

  bullets = [];
  gameRunning = true;
  gameOver = false;
  lastBulletTime = performance.now();

  score = 0;
  difficultyLevel = 1;
  finalScore = 0;

  stopSound(finishSound);

  nameInputBox.classList.add("hidden");
  message.textContent = "탄막을 최대한 많이 피하세요!";

  updateUI();
  gameLoop();
}

function restartGame() {
  cancelAnimationFrame(animationId);
  initGame();
  startGame();
}

function gameLoop(timestamp) {
  if (!gameRunning || gameOver) return;

  update(timestamp);
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

function update(timestamp) {
  movePlayer();
  createBullets(timestamp);
  moveBullets();
  checkCollision();
  updateDifficulty();
  updateUI();
}

function movePlayer() {
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function getSpawnInterval() {
  return Math.max(120, 700 - difficultyLevel * 45);
}

function getBulletSpeed() {
  return 2 + difficultyLevel * 0.35;
}

function getBulletsPerWave() {
  return Math.min(5, 1 + Math.floor(difficultyLevel / 3));
}

function getBigBulletRadius() {
  return 26;
}

function createBullets(timestamp) {
  const spawnInterval = getSpawnInterval();

  if (timestamp - lastBulletTime > spawnInterval) {
    const bulletCount = getBulletsPerWave();

    for (let i = 0; i < bulletCount; i++) {
      createSingleBullet();
    }

    playSound(smallGunSound);
    lastBulletTime = timestamp;
  }
}

function createSingleBullet() {
  const side = Math.floor(Math.random() * 4);
  let x, y;

  const speed = getBulletSpeed();

  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -10;
  } else if (side === 1) {
    x = canvas.width + 10;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 10;
  } else {
    x = -10;
    y = Math.random() * canvas.height;
  }

  const angle = Math.atan2(player.y - y, player.x - x);
  const randomAngleOffset = (Math.random() - 0.5) * 0.35;

  bullets.push({
    x,
    y,
    radius: 7,
    vx: Math.cos(angle + randomAngleOffset) * speed,
    vy: Math.sin(angle + randomAngleOffset) * speed,
    counted: false,
    isBig: false
  });
}

function createBigLevelUpBullet() {
  const side = Math.floor(Math.random() * 4);
  let x, y;

  const speed = getBulletSpeed() * 0.85;

  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -30;
  } else if (side === 1) {
    x = canvas.width + 30;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 30;
  } else {
    x = -30;
    y = Math.random() * canvas.height;
  }

  const angle = Math.atan2(player.y - y, player.x - x);

  bullets.push({
    x,
    y,
    radius: getBigBulletRadius(),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    counted: false,
    isBig: true
  });

  playSound(bigGunSound);
}

function moveBullets() {
  bullets.forEach((bullet) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    const isOut =
      bullet.x < -30 ||
      bullet.x > canvas.width + 30 ||
      bullet.y < -30 ||
      bullet.y > canvas.height + 30;

    if (isOut && !bullet.counted) {
      score += 1;
      bullet.counted = true;
    }
  });

  bullets = bullets.filter((bullet) => {
    return (
      bullet.x > -50 &&
      bullet.x < canvas.width + 50 &&
      bullet.y > -50 &&
      bullet.y < canvas.height + 50
    );
  });
}

function updateDifficulty() {
  const newLevel = Math.floor(score / 10) + 1;

  if (newLevel > difficultyLevel) {
    difficultyLevel = newLevel;
    message.textContent = `난이도 ${difficultyLevel} 상승! 큰 탄막 등장!`;
    createBigLevelUpBullet();
  }
}

function checkCollision() {
  for (let bullet of bullets) {
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.size + bullet.radius) {
      endGame();
      break;
    }
  }
}

function endGame() {
  if (gameOver) return;

  finalScore = score;

  gameRunning = false;
  gameOver = true;
  cancelAnimationFrame(animationId);

  message.textContent = `게임 종료! 총 ${finalScore}개의 총알을 피했습니다.`;
  playSound(finishSound);

  nameInputBox.classList.remove("hidden");
  nicknameInput.focus();
}

function saveRanking() {
  const nickname = nicknameInput.value.trim();

  if (nickname === "") {
    alert("닉네임을 입력하세요.");
    return;
  }

  const newRecord = {
    nickname,
    score: finalScore
  };

  const rankings = getRankings();
  rankings.push(newRecord);
  rankings.sort((a, b) => b.score - a.score);

  localStorage.setItem(rankStorageKey, JSON.stringify(rankings.slice(0, 10)));

  nameInputBox.classList.add("hidden");
  renderRankings();
}

function getRankings() {
  const savedData = localStorage.getItem(rankStorageKey);
  return savedData ? JSON.parse(savedData) : [];
}

function renderRankings() {
  const rankings = getRankings();

  rankingList.innerHTML = "";

  if (rankings.length === 0) {
    rankingList.innerHTML = "<li>아직 기록이 없습니다.</li>";
    return;
  }

  rankings.forEach((record, index) => {
    const li = document.createElement("li");

    let rankIcon = `${index + 1}.`;
    if (index === 0) rankIcon = "🥇";
    if (index === 1) rankIcon = "🥈";
    if (index === 2) rankIcon = "🥉";

    li.textContent = `${rankIcon} ${record.nickname} | ${record.score}개 회피`;
    rankingList.appendChild(li);
  });
}

function clearRankings() {
  localStorage.removeItem(rankStorageKey);
  renderRankings();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPlayer();
  drawBullets();
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.isBig ? "#facc15" : "#ef4444";
    ctx.fill();

    if (bullet.isBig) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === "Enter" && !nameInputBox.classList.contains("hidden")) {
    saveRanking();
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
saveRankBtn.addEventListener("click", saveRanking);
clearRankBtn.addEventListener("click", clearRankings);

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "사운드 ON" : "사운드 OFF";
});

initGame();
renderRankings();