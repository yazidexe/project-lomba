// --- OPEN SCREEN ---
const welcomeScreen = document.getElementById("welcome-screen");

welcomeScreen.addEventListener("click", () => {
  welcomeScreen.classList.add("slide-up");
});

// --- GAME PROTOTYPE JS ---
(function () {
  // Config
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const timeDisplay = document.getElementById("timeDisplay");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const levelSelect = document.getElementById("levelSelect");

  // Fungsi responsive canvas
  function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const aspectRatio = 720 / 420; // rasio asli canvas

    let newWidth = containerWidth;
    let newHeight = containerWidth / aspectRatio;

    if (newHeight > containerHeight) {
      newHeight = containerHeight;
      newWidth = newHeight * aspectRatio;
    }

    // Set style ukuran canvas supaya responsive (CSS pixel)
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas(); // panggil saat awal

  let state = {
    running: false,
    score: 0,
    timeLeft: 60,
    spawnInterval: 1500, // ms
    lastSpawn: 0,
    items: [],
    player: { x: 80, y: 80, size: 28, speed: 250 }, // px/sec
    keys: {},
    lastFrame: 0,
  };

  const ITEM_TYPES = [
    { name: "plastik", src: "assets/plastik.png", points: 10, size: 90 },
    { name: "kertas", src: "assets/kaleng.png", points: 8, size: 50 },
    { name: "daun", src: "assets/pisang.png", points: 5, size: 50 },
  ];

  // Load semua gambar
  ITEM_TYPES.forEach((type) => {
    const img = new Image();
    img.src = type.src;
    type.img = img;
  });

  function setLevel(level) {
    if (level === "easy") {
      state.spawnInterval = 2000;
      state.timeLeft = 60;
    } else {
      state.spawnInterval = 1200;
      state.timeLeft = 60;
    }
  }
  setLevel(levelSelect.value);

  // Controls
  window.addEventListener("keydown", (e) => {
    state.keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", resetGame);
  levelSelect.addEventListener("change", () => setLevel(levelSelect.value));

  function startGame() {
    if (state.running) return;
    state.running = true;
    state.score = 0;
    state.items = [];
    state.lastSpawn = performance.now();
    state.lastFrame = performance.now();
    scoreDisplay.textContent = state.score;
    timeDisplay.textContent = state.timeLeft;
    requestAnimationFrame(loop);
  }

  function resetGame() {
    state.running = false;
    state.score = 0;
    state.items = [];
    state.player.x = 80;
    state.player.y = 80;
    state.timeLeft = 30;
    scoreDisplay.textContent = state.score;
    timeDisplay.textContent = state.timeLeft;

    // Pastikan popup disembunyikan setiap reset
    document.getElementById("popup").style.display = "none";

    drawSplash();
  }

  function spawnItem() {
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const padding = 30;
    const x = Math.random() * (canvas.width - padding * 2) + padding;
    const y = Math.random() * (canvas.height - padding * 2) + padding;
    state.items.push({
      ...type,
      x,
      y,
      created: performance.now(),
    });
  }

  function update(dt) {
    // player movement
    const p = state.player;
    let vx = 0,
      vy = 0;
    if (state.keys["arrowleft"] || state.keys["a"]) vx = -1;
    if (state.keys["arrowright"] || state.keys["d"]) vx = 1;
    if (state.keys["arrowup"] || state.keys["w"]) vy = -1;
    if (state.keys["arrowdown"] || state.keys["s"]) vy = 1;
    // normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    p.x += vx * p.speed * dt;
    p.y += vy * p.speed * dt;
    // clamp
    p.x = Math.max(p.size / 2, Math.min(canvas.width - p.size / 2, p.x));
    p.y = Math.max(p.size / 2, Math.min(canvas.height - p.size / 2, p.y));

    // spawn
    if (performance.now() - state.lastSpawn > state.spawnInterval) {
      spawnItem();
      state.lastSpawn = performance.now();
    }

    // collisions
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      const dx = it.x - p.x;
      const dy = it.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < it.size / 2 + p.size / 2 - 2) {
        // collect
        state.score += it.points;
        state.items.splice(i, 1);
        scoreDisplay.textContent = state.score;
      }
    }

    // timer
    state.timeLeft -= dt;
    timeDisplay.textContent = Math.max(0, Math.ceil(state.timeLeft));
    if (state.timeLeft <= 0) {
      endRound();
    }
  }

  function showPopup(message) {
    document.getElementById("popup-message").innerHTML = message;
    document.getElementById("popup").style.display = "flex";
  }

  document.getElementById("close-popup").addEventListener("click", function () {
    document.getElementById("popup").style.display = "none";
  });

  const tips = [
    "Ajak tetangga untuk memilah sampah di rumah ya!",
    "Kurangi penggunaan plastik sekali pakai.",
    "Gunakan botol minum isi ulang untuk mengurangi sampah.",
    "Pisahkan sampah organik dan anorganik.",
  ];

  function endRound() {
    state.running = false;
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setTimeout(() => {
      showPopup(`Skor kamu: ${state.score} <br> Tips: ${randomTip}`);
    }, 80);
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // background simple grid / ground
    // draw items
    state.items.forEach((it) => {
      ctx.drawImage(it.img, it.x - it.size / 2, it.y - it.size / 2, it.size, it.size);
      // small label
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.font = "11px Arial";
      ctx.fillText("+" + it.points, it.x - 8, it.y + 4);
    });
    //karakter
    const playerImg = new Image();
    playerImg.src = "assets/trash.png";
    // draw player
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    // faktor pembesaran
    const scale = 2;
    ctx.drawImage(playerImg, -(p.size * scale) / 2, -(p.size * scale) / 2, p.size * scale, p.size * scale);

    ctx.restore();
  }

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
    state.lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function drawSplash() {
    // idle screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = "#a6171c";
    ctx.font = "20px Poppins";
    ctx.fillText('Tekan "Mulai" untuk memulai misi membersihkan lahan', 50, 70);
  }

  // init
  resetGame();
  drawSplash();
  // allow clicking canvas to focus for keyboard
  canvas.addEventListener("click", () => canvas.focus());
})();
