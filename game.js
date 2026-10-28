
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const ui = {
  overlay: document.getElementById("overlay"),
  title: document.getElementById("overlay-title"),
  eyebrow: document.getElementById("overlay-eyebrow"),
  description: document.getElementById("overlay-description"),
  button: document.getElementById("start-button"),
  timer: document.getElementById("timer"),
  round: document.getElementById("round-label"),
  hearts1: document.getElementById("hearts1"),
  hearts2: document.getElementById("hearts2"),
  score1: document.getElementById("score1"),
  score2: document.getElementById("score2")
};

const keys = new Set();

const players = [
  {
    name: "P1",
    x: 220,
    y: 360,
    radius: 11,
    speed: 255,
    color: "#65aaff",
    controls: {
      up: "w",
      down: "s",
      left: "a",
      right: "d"
    },
    lives: 3,
    alive: true,
    invulnerable: 0,
    survival: 0
  },
  {
    name: "P2",
    x: 680,
    y: 360,
    radius: 11,
    speed: 255,
    color: "#ff687c",
    controls: {
      up: "arrowup",
      down: "arrowdown",
      left: "arrowleft",
      right: "arrowright"
    },
    lives: 3,
    alive: true,
    invulnerable: 0,
    survival: 0
  }
];

let meteors = [];
let particles = [];
let gameState = "ready";
let elapsed = 0;
let spawnTimer = 0;
let meteorId = 0;
let lastTime = 0;
let animationId = 0;

function resetGame() {
  players[0].x = 220;
  players[0].y = 360;
  players[1].x = 680;
  players[1].y = 360;

  for (const player of players) {
    player.lives = 3;
    player.alive = true;
    player.invulnerable = 0;
    player.survival = 0;
  }

  meteors = [];
  particles = [];
  elapsed = 0;
  spawnTimer = 0.5;
  meteorId = 0;
  keys.clear();

  updateUI();
}

function startGame() {
  resetGame();
  gameState = "running";
  ui.overlay.classList.add("hidden");
  ui.round.textContent = "SURVIVE";
  lastTime = performance.now();

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function pauseGame() {
  if (gameState === "running") {
    gameState = "paused";
    keys.clear();

    showOverlay(
      "",
      "PAUSED",
      "",
      "RESUME"
    );

    ui.round.textContent = "PAUSED";
  } else if (gameState === "paused") {
    gameState = "running";
    ui.overlay.classList.add("hidden");
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
    ui.round.textContent = "SURVIVE";
  }
}

function showOverlay(eyebrow, title, description, buttonText) {
  ui.eyebrow.textContent = eyebrow;
  ui.title.textContent = title;
  ui.description.textContent = description;
  ui.button.textContent = buttonText;
  ui.overlay.classList.remove("hidden");
}

function endGame() {
  gameState = "over";

  const [p1, p2] = players;
  let title;
  let description;

  if (!p1.alive && !p2.alive) {
    title = "DRAW";
    description = "";
  } else {
    const winner = p1.alive ? p1 : p2;

    title = `${winner.name} WINS`;
    description = "";
  }

  showOverlay(
    "",
    title,
    description,
    "PLAY AGAIN"
  );

  ui.round.textContent = "FINISHED";
}

function updateUI() {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const hearts = i === 0 ? ui.hearts1 : ui.hearts2;
    const score = i === 0 ? ui.score1 : ui.score2;

    hearts.textContent = Array.from(
      { length: 3 },
      (_, n) => n < player.lives ? "♥" : "♡"
    ).join(" ");

    hearts.style.color = player.color;
    score.textContent = `${player.survival.toFixed(1)}s`;
    score.style.color = player.color;
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  ui.timer.textContent =
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}

function spawnMeteor() {
  const radius = 7 + Math.random() * 13;

  meteors.push({
    id: meteorId++,
    x: radius + Math.random() * (W - radius * 2),
    y: -radius - Math.random() * 35,
    radius,
    speed: 145 + Math.random() * 95 + elapsed * 5,
    drift: (Math.random() - 0.5) * 45,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - 0.5) * 3
  });
}

function createParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      color,
      radius: 2 + Math.random() * 2
    });
  }
}

function update(dt) {
  elapsed += dt;

  // Meteorų dažnėjimas laikui bėgant.
  const spawnInterval = Math.max(0.18, 0.8 - elapsed * 0.018);
  spawnTimer -= dt;

  while (spawnTimer <= 0) {
    spawnMeteor();
    spawnTimer += spawnInterval;
  }

  for (const player of players) {
    if (!player.alive) continue;

    const c = player.controls;
    let dx = 0;
    let dy = 0;

    if (keys.has(c.left)) dx--;
    if (keys.has(c.right)) dx++;
    if (keys.has(c.up)) dy--;
    if (keys.has(c.down)) dy++;

    // Diagonaliai judama tokiu pačiu greičiu.
    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      player.x += (dx / length) * player.speed * dt;
      player.y += (dy / length) * player.speed * dt;
    }

    player.x = Math.max(
      player.radius,
      Math.min(W - player.radius, player.x)
    );
    player.y = Math.max(
      player.radius,
      Math.min(H - player.radius, player.y)
    );

    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.survival += dt;
  }

  // Meteorų judėjimas ir susidūrimai.
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i];

    meteor.y += meteor.speed * dt;
    meteor.x += meteor.drift * dt;
    meteor.rotation += meteor.rotationSpeed * dt;

    if (meteor.x < meteor.radius || meteor.x > W - meteor.radius) {
      meteor.drift *= -1;
      meteor.x = Math.max(
        meteor.radius,
        Math.min(W - meteor.radius, meteor.x)
      );
    }

    for (const player of players) {
      if (!player.alive || player.invulnerable > 0) continue;

      const distance = Math.hypot(
        player.x - meteor.x,
        player.y - meteor.y
      );

      if (distance < player.radius + meteor.radius) {
        player.lives--;
        player.invulnerable = 1.1;

        createParticles(player.x, player.y, player.color, 18);
        createParticles(meteor.x, meteor.y, "#dce3ef", 8);

        if (player.lives <= 0) {
          player.lives = 0;
          player.alive = false;
          createParticles(player.x, player.y, player.color, 30);
        }

        // Tas pats meteoras nebegali smogti kitam žaidėjui.
        meteors.splice(i, 1);
        break;
      }
    }

    if (meteors[i] && meteor.y - meteor.radius > H) {
      meteors.splice(i, 1);
    }
  }

  // Dalelių animacijos.
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.08, dt);
    p.vy *= Math.pow(0.08, dt);
    p.life -= dt;

    if (p.life <= 0) particles.splice(i, 1);
  }

  updateUI();

  if (players.some(player => !player.alive)) {
    endGame();
  }
}

function drawBackground() {
  ctx.fillStyle = "#0d111a";
  ctx.fillRect(0, 0, W, H);

  // Subtilus taškelių tinklelis.
  ctx.fillStyle = "#242c3b";

  for (let x = 20; x < W; x += 30) {
    for (let y = 20; y < H; y += 30) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Arenos rėmelis.
  ctx.strokeStyle = "#293143";
  ctx.lineWidth = 1;
  ctx.strokeRect(8.5, 8.5, W - 17, H - 17);
}

function drawMeteor(meteor) {
  ctx.save();
  ctx.translate(meteor.x, meteor.y);
  ctx.rotate(meteor.rotation);

  // Išorinis švytėjimas.
  ctx.shadowBlur = 13;
  ctx.shadowColor = "#a8b4c8";
  ctx.fillStyle = "#dce3ef";

  ctx.beginPath();
  const sides = 8;

  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = meteor.radius * (i % 2 === 0 ? 1 : 0.78);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#8995a9";
  ctx.beginPath();
  ctx.arc(
    -meteor.radius * 0.15,
    -meteor.radius * 0.1,
    meteor.radius * 0.32,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

function drawPlayer(player) {
  if (!player.alive) return;

  // Trumpas mirksėjimas po susidūrimo.
  if (
    player.invulnerable > 0 &&
    Math.floor(player.invulnerable * 12) % 2 === 0
  ) {
    return;
  }

  ctx.save();

  ctx.shadowColor = player.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = player.color;

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.arc(
    player.x - 3,
    player.y - 3,
    2.5,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.strokeStyle = player.color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(
    player.x,
    player.y,
    player.radius + 6,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function draw() {
  drawBackground();

  for (const meteor of meteors) {
    drawMeteor(meteor);
  }

  for (const player of players) {
    drawPlayer(player);
  }

  drawParticles();

  // Žuvusio žaidėjo žymėjimas.
  for (const player of players) {
    if (player.alive) continue;

    ctx.save();
    ctx.fillStyle = player.color;
    ctx.globalAlpha = 0.6;
    ctx.font = "bold 12px Inter, Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "ELIMINATED",
      player === players[0] ? 220 : 680,
      30
    );
    ctx.restore();
  }
}

function loop(timestamp) {
  if (gameState !== "running") return;

  // Ribojamas dt, kad po trumpo užstrigimo nebūtų
  // didelio šuolio ar netikėto susidūrimo.
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();

  if (gameState === "running") {
    animationId = requestAnimationFrame(loop);
  }
}

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
      .includes(key)
  ) {
    event.preventDefault();
  }

  if (key === "r") {
    startGame();
    return;
  }

  if (key === "p") {
    pauseGame();
    return;
  }

  keys.add(key);
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
  keys.clear();
});

ui.button.addEventListener("click", () => {
  if (gameState === "paused") {
    pauseGame();
  } else {
    startGame();
  }
});

// Nupiešia pradinę areną dar prieš žaidimo pradžią.
drawBackground();

for (const player of players) {
  drawPlayer(player);
}

updateUI();
