/* ==========================================================================
   ROMANTIC INTERACTIVE WEB APP - SCRIPT
   Features: Particle Engines, Evasive NO Physics, Web Audio Synth, Admin Dashboard
   ========================================================================== */

(function () {
  'use strict';

  // --- APP STATE & CONSTANTS ---
  const STATE = {
    sessionId: getOrCreateSessionId(),
    greeting: '',
    adjective: '',
    visitStartTime: Date.now(),
    noAttemptCount: 0,
    audioEnabled: false,
    adminToken: null,
    currentPage: 1,
    totalPages: 1,
    searchQuery: ''
  };

  const ADJECTIVES = [
    "Adorable", "Beautiful", "Cutie", "Dazzling", 
    "Gorgeous", "Intelligent", "Kind", "Lovable"
  ];

  // --- DOM ELEMENTS ---
  const bgCanvas = document.getElementById('bgCanvas');
  const fxCanvas = document.getElementById('fxCanvas');
  const bgCtx = bgCanvas.getContext('2d');
  const fxCtx = fxCanvas.getContext('2d');

  const landingScreen = document.getElementById('landingScreen');
  const questionScreen = document.getElementById('questionScreen');
  const kissScreen = document.getElementById('kissScreen');
  const finalScreen = document.getElementById('finalScreen');

  const greetingText = document.getElementById('greetingText');
  const landingProgress = document.getElementById('landingProgress');

  const buttonsBox = document.getElementById('buttonsBox');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');

  const kissAnimOverlay = document.getElementById('kissAnimOverlay');
  const kissAnimContent = document.getElementById('kissAnimContent');

  const toastContainer = document.getElementById('toastContainer');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundLabel = document.getElementById('soundLabel');
  const adminBtn = document.getElementById('adminBtn');

  // Admin Modal Elements
  const adminModal = document.getElementById('adminModal');
  const closeAdminModal = document.getElementById('closeAdminModal');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminLoginSubmitBtn = document.getElementById('adminLoginSubmitBtn');
  const adminLoginError = document.getElementById('adminLoginError');
  const adminDashboardContent = document.getElementById('adminDashboardContent');

  const statTotalVisitors = document.getElementById('statTotalVisitors');
  const statTodayVisitors = document.getElementById('statTodayVisitors');
  const statYesClicks = document.getElementById('statYesClicks');
  const statNoAttempts = document.getElementById('statNoAttempts');
  const statFavoriteKiss = document.getElementById('statFavoriteKiss');

  const visitorSearchInput = document.getElementById('visitorSearchInput');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const visitorTableBody = document.getElementById('visitorTableBody');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('pageInfo');

  let kissChartInstance = null;
  let deviceChartInstance = null;

  // ==========================================================================
  // 1. SESSION & INITIALIZATION
  // ==========================================================================
  function getOrCreateSessionId() {
    let sid = localStorage.getItem('romantic_session_id');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('romantic_session_id', sid);
    }
    return sid;
  }

  function computeTimeGreeting() {
    const hour = new Date().getHours();
    let greeting = "";
    if (hour >= 5 && hour < 12) {
      greeting = "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good Afternoon";
    } else if (hour >= 17 && hour < 20) {
      greeting = "Good Evening";
    } else {
      greeting = "Good Night";
    }
    const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    STATE.greeting = greeting;
    STATE.adjective = randAdj;
    return `${greeting} My ${randAdj} Lady`;
  }

  function initApp() {
    setupCanvasResizing();
    startParticleEngine();

    // Display Dynamic Greeting
    const fullGreeting = computeTimeGreeting();
    greetingText.textContent = fullGreeting;

    // Post Visit to Backend
    postData('/api/visit', {
      session_id: STATE.sessionId,
      greeting: STATE.greeting,
      adjective: STATE.adjective,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`
    });

    // Start 7 Second Landing Page Auto-Transition
    runLandingProgress(7000, () => {
      switchScreen(landingScreen, questionScreen);
      initEvasiveNoButton();
      startPlayfulPopups();
    });
  }

  function runLandingProgress(durationMs, onComplete) {
    let startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const pct = Math.min((elapsed / durationMs) * 100, 100);
      landingProgress.style.width = `${pct}%`;
      if (elapsed < durationMs) {
        requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(step);
  }

  function switchScreen(fromScreen, toScreen) {
    fromScreen.classList.remove('active');
    fromScreen.classList.add('hidden');
    setTimeout(() => {
      toScreen.classList.remove('hidden');
      toScreen.classList.add('active');
    }, 400);
  }

  // ==========================================================================
  // 2. CANVAS PARTICLE ENGINE (BACKGROUND & FX)
  // ==========================================================================
  const bgParticles = [];
  const fxParticles = [];

  function setupCanvasResizing() {
    function resize() {
      bgCanvas.width = fxCanvas.width = window.innerWidth;
      bgCanvas.height = fxCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
  }

  class BgParticle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * bgCanvas.width;
      this.y = bgCanvas.height + Math.random() * 100;
      this.size = Math.random() * 14 + 8;
      this.speedY = Math.random() * 1.2 + 0.5;
      this.speedX = Math.sin(Math.random() * Math.PI) * 0.8;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.type = Math.random() > 0.4 ? 'heart' : 'petal';
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.02;
    }
    update() {
      this.y -= this.speedY;
      this.x += Math.sin(this.y * 0.01) * 0.5;
      this.rotation += this.rotSpeed;
      if (this.y < -30) this.reset();
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;

      if (this.type === 'heart') {
        ctx.fillStyle = '#ff4081';
        ctx.beginPath();
        const topCurveHeight = this.size * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -this.size / 2, 0, -this.size / 2, topCurveHeight);
        ctx.bezierCurveTo(-this.size / 2, (this.size + topCurveHeight) / 2, 0, this.size, 0, this.size);
        ctx.bezierCurveTo(0, this.size, this.size / 2, (this.size + topCurveHeight) / 2, this.size / 2, topCurveHeight);
        ctx.bezierCurveTo(this.size / 2, 0, 0, 0, 0, topCurveHeight);
        ctx.fill();
      } else {
        // Petal
        ctx.fillStyle = '#ff80ab';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.4, this.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class FxParticle {
    constructor(x, y, color, type = 'star') {
      this.x = x;
      this.y = y;
      this.color = color;
      this.type = type;
      this.size = Math.random() * 12 + 6;
      this.vx = (Math.random() - 0.5) * 12;
      this.vy = (Math.random() - 0.5) * 12 - 2;
      this.gravity = 0.2;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.01;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      if (this.type === 'heart') {
        ctx.font = `${this.size * 1.5}px sans-serif`;
        ctx.fillText('💖', this.x, this.y);
      } else {
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function startParticleEngine() {
    for (let i = 0; i < 45; i++) {
      bgParticles.push(new BgParticle());
    }

    function animate() {
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      // Draw Background Particles
      bgParticles.forEach(p => {
        p.update();
        p.draw(bgCtx);
      });

      // Draw FX Particles
      for (let i = fxParticles.length - 1; i >= 0; i--) {
        const p = fxParticles[i];
        p.update();
        p.draw(fxCtx);
        if (p.alpha <= 0) {
          fxParticles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    }
    animate();
  }

  function triggerHeartExplosion(x, y) {
    const colors = ['#ff4081', '#e91e63', '#ff80ab', '#ffffff', '#ffeb3b'];
    for (let i = 0; i < 70; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const type = Math.random() > 0.5 ? 'heart' : 'star';
      fxParticles.push(new FxParticle(x, y, color, type));
    }
  }

  // ==========================================================================
  // 3. QUESTION SCREEN & EVASIVE NO BUTTON PHYSICS
  // ==========================================================================
  function initEvasiveNoButton() {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isMobile) {
      document.addEventListener('mousemove', handleNoButtonProximity);
    } else {
      noBtn.addEventListener('click', handleMobileNoTap);
    }
  }

  function handleNoButtonProximity(e) {
    if (questionScreen.classList.contains('hidden')) return;

    const btnRect = noBtn.getBoundingClientRect();
    const yesRect = yesBtn.getBoundingClientRect();
    const btnCenter = {
      x: btnRect.left + btnRect.width / 2,
      y: btnRect.top + btnRect.height / 2
    };

    const dist = Math.hypot(e.clientX - btnCenter.x, e.clientY - btnCenter.y);
    const threshold = 100; // 100px proximity

    if (dist < threshold) {
      // Evade to a new position
      moveNoButtonSafely(yesRect);
      recordNoAttempt();
    }
  }

  function moveNoButtonSafely(yesRect) {
    const cardRect = questionScreen.querySelector('.question-card').getBoundingClientRect();

    let newX, newY, safe = false;
    let attempts = 0;

    while (!safe && attempts < 20) {
      attempts++;
      // Random coordinates inside card padding
      newX = Math.random() * (cardRect.width - 120) - (cardRect.width / 2 - 60);
      newY = Math.random() * (cardRect.height - 120) - (cardRect.height / 2 - 60);

      // Check distance from YES button to avoid overlapping
      const absX = cardRect.left + cardRect.width / 2 + newX;
      const absY = cardRect.top + cardRect.height / 2 + newY;

      const distToYes = Math.hypot(absX - (yesRect.left + yesRect.width / 2), absY - (yesRect.top + yesRect.height / 2));
      if (distToYes > 140) {
        safe = true;
      }
    }

    noBtn.style.position = 'relative';
    noBtn.style.left = `${newX}px`;
    noBtn.style.top = `${newY}px`;
  }

  function handleMobileNoTap(e) {
    e.preventDefault();
    showToast("No option is unavailable Cutieeeee. Do you wanna click on YES? 😉");
    recordNoAttempt();
  }

  function recordNoAttempt() {
    STATE.noAttemptCount++;
    postData('/api/no-attempt', { session_id: STATE.sessionId });
  }

  function startPlayfulPopups() {
    const messages = [
      "No option is unavailable DAAAA.",
      "If you want, you can click on YES. 💖",
      "You can't escape ! Cutieeeee 😘",
      "Are you sure? I'm Disappointed Tharkulliee 😉"
    ];
    let msgIdx = 0;

    const popupInterval = setInterval(() => {
      if (questionScreen.classList.contains('hidden')) {
        clearInterval(popupInterval);
        return;
      }
      showToast(messages[msgIdx % messages.length]);
      msgIdx++;
    }, 6000);
  }

  // YES Button Click Logic
  yesBtn.addEventListener('click', (e) => {
    const rect = yesBtn.getBoundingClientRect();
    triggerHeartExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);

    if (STATE.audioEnabled) playKissSynthSound();

    postData('/api/yes-click', { session_id: STATE.sessionId });

    setTimeout(() => {
      switchScreen(questionScreen, kissScreen);
    }, 1200);
  });

  // ==========================================================================
  // 4. KISS SELECTION SCREEN & CUSTOM SVG ANIMATIONS
  // ==========================================================================
  const kissCards = document.querySelectorAll('.kiss-card');
  kissCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      handleKissSelection(category);
    });
  });

  function handleKissSelection(category) {
    // Post to backend
    postData('/api/kiss-selection', {
      session_id: STATE.sessionId,
      kiss_category: category
    });

    if (STATE.audioEnabled) playKissSynthSound();

    // Render unique kiss animation overlay
    renderKissAnimation(category);

    setTimeout(() => {
      kissAnimOverlay.classList.add('hidden');
      switchScreen(kissScreen, finalScreen);
      startFinalCelebration();
    }, 2800);
  }

  function renderKissAnimation(category) {
    let animHtml = "";
    switch (category) {
      case 'Forehead':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#ff4081" stroke-width="4"/>
            <text x="50" y="45" font-size="30" text-anchor="middle">👑</text>
            <text x="50" y="75" font-size="22" text-anchor="middle">💋</text>
          </svg>
          <div class="kiss-anim-title">Cute Forehead Kiss! 👑</div>
        `;
        break;
      case 'Cheek':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <text x="35" y="60" font-size="35" text-anchor="middle">😊</text>
            <text x="65" y="55" font-size="30" text-anchor="middle">💋</text>
          </svg>
          <div class="kiss-anim-title">Sweet Cheek Kiss! 😊</div>
        `;
        break;
      case 'Nose':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <text x="50" y="55" font-size="40" text-anchor="middle">👃</text>
            <text x="50" y="25" font-size="20" text-anchor="middle">✨</text>
          </svg>
          <div class="kiss-anim-title">Boopable Nose Kiss! ✨</div>
        `;
        break;
      case 'Lips':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <text x="50" y="60" font-size="45" text-anchor="middle">💋</text>
          </svg>
          <div class="kiss-anim-title">Romantic Lips Kiss! 💖</div>
        `;
        break;
      case 'Neck':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <text x="40" y="60" font-size="35" text-anchor="middle">🦒</text>
            <text x="65" y="70" font-size="25" text-anchor="middle">💋</text>
          </svg>
          <div class="kiss-anim-title">Warm Neck Kiss! 🔥</div>
        `;
        break;
      case 'Eyes':
        animHtml = `
          <svg class="kiss-anim-svg" viewBox="0 0 100 100">
            <text x="50" y="55" font-size="40" text-anchor="middle">👁️</text>
            <text x="50" y="30" font-size="22" text-anchor="middle">💋</text>
          </svg>
          <div class="kiss-anim-title">Tender Eye Kiss! 👁️✨</div>
        `;
        break;
    }
    kissAnimContent.innerHTML = animHtml;
    kissAnimOverlay.classList.remove('hidden');
  }

  // ==========================================================================
  // 5. FINAL SCREEN CELEBRATION (15 SECONDS)
  // ==========================================================================
  function startFinalCelebration() {
    let secondsLeft = 15;
    const timerDisplay = document.getElementById('finalTimerDisplay');

    // Continuous Heart Explosion
    const interval = setInterval(() => {
      const rx = Math.random() * window.innerWidth;
      const ry = Math.random() * window.innerHeight;
      triggerHeartExplosion(rx, ry);
    }, 600);

    const countdown = setInterval(() => {
      secondsLeft--;
      timerDisplay.textContent = `Continuing romantic magic... ${secondsLeft}s`;
      if (secondsLeft <= 0) {
        clearInterval(countdown);
        clearInterval(interval);
        timerDisplay.textContent = "Tharkulllieee 💕 I'm Blushing nnn ";

        // Complete Visit Call
        const durationSec = (Date.now() - STATE.visitStartTime) / 1000;
        postData('/api/complete-visit', {
          session_id: STATE.sessionId,
          visit_duration: durationSec
        });
      }
    }, 1000);
  }

  // ==========================================================================
  // 6. WEB AUDIO SYNTHESIZER (ROMANTIC MELODY & SOUND FX)
  // ==========================================================================
  let audioCtx = null;
  let synthInterval = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  soundToggleBtn.addEventListener('click', () => {
    initAudioContext();
    STATE.audioEnabled = !STATE.audioEnabled;
    if (STATE.audioEnabled) {
      soundLabel.textContent = "Sound: On";
      startRomanticSynthMelody();
    } else {
      soundLabel.textContent = "Sound: Off";
      stopRomanticSynthMelody();
    }
  });

  function startRomanticSynthMelody() {
    if (synthInterval) return;
    const notes = [440, 554.37, 659.25, 830.61, 880]; // A Major 7 chord notes
    let idx = 0;
    synthInterval = setInterval(() => {
      if (!STATE.audioEnabled || !audioCtx) return;
      playSoftSineNote(notes[idx % notes.length]);
      idx++;
    }, 500);
  }

  function stopRomanticSynthMelody() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
  }

  function playSoftSineNote(freq) {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {}
  }

  function playKissSynthSound() {
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  // ==========================================================================
  // 7. ADMIN DASHBOARD & ANALYTICS
  // ==========================================================================
  adminBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
  });

  closeAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  adminLoginSubmitBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value.trim();
    if (!password) return;

    const res = await postData('/api/admin/login', { password });
    if (res && res.status === 'success') {
      STATE.adminToken = res.token;
      adminLoginError.classList.add('hidden');
      adminLoginForm.classList.add('hidden');
      adminDashboardContent.classList.remove('hidden');
      loadAdminDashboardData();
    } else {
      adminLoginError.classList.remove('hidden');
    }
  });

  async function loadAdminDashboardData() {
    if (!STATE.adminToken) return;

    // Load Stats & Charts
    const stats = await getData('/api/admin/statistics');
    if (stats) {
      statTotalVisitors.textContent = stats.total_visitors || 0;
      statTodayVisitors.textContent = stats.today_visitors || 0;
      statYesClicks.textContent = stats.yes_clicks || 0;
      statNoAttempts.textContent = stats.no_attempts || 0;
      statFavoriteKiss.textContent = stats.most_selected_kiss || 'None';

      renderAdminCharts(stats);
    }

    // Load Visitor Table Logs
    loadVisitorTable();
  }

  async function loadVisitorTable() {
    const url = `/api/admin/recent-visits?page=${STATE.currentPage}&per_page=8&q=${encodeURIComponent(STATE.searchQuery)}`;
    const data = await getData(url);
    if (!data) return;

    STATE.totalPages = data.pages || 1;
    pageInfo.textContent = `Page ${data.page} of ${STATE.totalPages}`;

    visitorTableBody.innerHTML = '';
    data.visitors.forEach(v => {
      const tr = document.createElement('tr');
      const timeStr = v.visit_timestamp ? new Date(v.visit_timestamp).toLocaleString() : 'N/A';
      tr.innerHTML = `
        <td>${v.id}</td>
        <td>${timeStr}</td>
        <td>${v.ip_address || 'Local'} / <strong>${v.country}</strong></td>
        <td>${v.browser} (${v.operating_system})</td>
        <td>${v.greeting || '-'}</td>
        <td>${v.yes_clicked ? '💖 Yes' : 'No'}</td>
        <td>${v.no_attempt_count}</td>
        <td>${v.kiss_category ? '💋 ' + v.kiss_category : '-'}</td>
        <td>${v.visit_duration}s</td>
        <td><button class="delete-btn" data-id="${v.id}">Delete</button></td>
      `;
      visitorTableBody.appendChild(tr);
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Delete visitor record #${id}?`)) {
          await deleteData(`/api/admin/visit/${id}`);
          loadAdminDashboardData();
        }
      });
    });
  }

  visitorSearchInput.addEventListener('input', (e) => {
    STATE.searchQuery = e.target.value;
    STATE.currentPage = 1;
    loadVisitorTable();
  });

  prevPageBtn.addEventListener('click', () => {
    if (STATE.currentPage > 1) {
      STATE.currentPage--;
      loadVisitorTable();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (STATE.currentPage < STATE.totalPages) {
      STATE.currentPage++;
      loadVisitorTable();
    }
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!STATE.adminToken) return;
    window.open(`/api/admin/export-csv?token=${encodeURIComponent(STATE.adminToken)}`, '_blank');
  });

  function renderAdminCharts(stats) {
    // Kiss Choice Distribution Chart
    const kissCtx = document.getElementById('kissChart').getContext('2d');
    if (kissChartInstance) kissChartInstance.destroy();

    const kissLabels = Object.keys(stats.kiss_distribution || {});
    const kissValues = Object.values(stats.kiss_distribution || {});

    kissChartInstance = new Chart(kissCtx, {
      type: 'doughnut',
      data: {
        labels: kissLabels.length ? kissLabels : ['No Choices Yet'],
        datasets: [{
          data: kissValues.length ? kissValues : [1],
          backgroundColor: ['#ff4081', '#e91e63', '#ff80ab', '#ab47bc', '#7e57c2', '#ec407a']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#ffffff' } } }
      }
    });

    // Device Types Chart
    const deviceCtx = document.getElementById('deviceChart').getContext('2d');
    if (deviceChartInstance) deviceChartInstance.destroy();

    const deviceLabels = Object.keys(stats.device_types || {});
    const deviceValues = Object.values(stats.device_types || {});

    deviceChartInstance = new Chart(deviceCtx, {
      type: 'bar',
      data: {
        labels: deviceLabels.length ? deviceLabels : ['Desktop'],
        datasets: [{
          label: 'Visitors by Device',
          data: deviceValues.length ? deviceValues : [0],
          backgroundColor: '#ff4081'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#ffffff' } },
          y: { ticks: { color: '#ffffff' }, beginAtZero: true }
        },
        plugins: { legend: { labels: { color: '#ffffff' } } }
      }
    });
  }

  // ==========================================================================
  // 8. HELPER UTILITIES & TOASTS
  // ==========================================================================
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  async function postData(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': STATE.adminToken ? `Bearer ${STATE.adminToken}` : ''
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.warn("API Post Warning:", e);
      return null;
    }
  }

  async function getData(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': STATE.adminToken ? `Bearer ${STATE.adminToken}` : ''
        }
      });
      return await response.json();
    } catch (e) {
      console.warn("API Get Warning:", e);
      return null;
    }
  }

  async function deleteData(url) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': STATE.adminToken ? `Bearer ${STATE.adminToken}` : ''
        }
      });
      return await response.json();
    } catch (e) {
      console.warn("API Delete Warning:", e);
      return null;
    }
  }

  // Launch application on DOM ready
  document.addEventListener('DOMContentLoaded', initApp);

})();
