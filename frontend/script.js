/* ==========================================================================
   ROMANTIC INTERACTIVE WEB APP - SCRIPT
   Features: Particle Engines, Evasive NO Physics, Auto-play Romantic Guitar,
             Secure Admin Session Auth, IST Timestamps, Header Home Button
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
    searchQuery: '',
    firstInteractionDone: false,
    celebrationDone: false,
    musicFadeInterval: null    // track active fade so we don't stack them
  };

  const ADJECTIVES = [
    "Adorable", "Beautiful", "Cutie", "Dazzling",
    "Gorgeous", "Intelligent", "Kind", "Lovable"
  ];

  // --- DOM ELEMENTS ---
  const bgCanvas = document.getElementById('bgCanvas');
  const fxCanvas = document.getElementById('fxCanvas');
  const bgCtx    = bgCanvas.getContext('2d');
  const fxCtx    = fxCanvas.getContext('2d');

  const landingScreen  = document.getElementById('landingScreen');
  const questionScreen = document.getElementById('questionScreen');
  const kissScreen     = document.getElementById('kissScreen');
  const finalScreen    = document.getElementById('finalScreen');

  const greetingText    = document.getElementById('greetingText');
  const landingProgress = document.getElementById('landingProgress');
  const buttonsBox      = document.getElementById('buttonsBox');
  const yesBtn          = document.getElementById('yesBtn');
  const noBtn           = document.getElementById('noBtn');

  const kissAnimOverlay = document.getElementById('kissAnimOverlay');
  const kissAnimContent = document.getElementById('kissAnimContent');

  const toastContainer = document.getElementById('toastContainer');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundLabel     = document.getElementById('soundLabel');
  const musicIcon      = document.getElementById('musicIcon');
  const adminBtn       = document.getElementById('adminBtn');

  // Home button — now in the header beside music/admin
  const homeBtn = document.getElementById('homeBtn');

  // Admin Modal Elements
  const adminModal            = document.getElementById('adminModal');
  const closeAdminModal       = document.getElementById('closeAdminModal');
  const adminLoginForm        = document.getElementById('adminLoginForm');
  const adminPasswordInput    = document.getElementById('adminPasswordInput');
  const adminLoginSubmitBtn   = document.getElementById('adminLoginSubmitBtn');
  const adminLoginError       = document.getElementById('adminLoginError');
  const adminDashboardContent = document.getElementById('adminDashboardContent');
  const adminLogoutBtn        = document.getElementById('adminLogoutBtn');

  // Dashboard Stats
  const statTotalVisitors = document.getElementById('statTotalVisitors');
  const statTodayVisitors = document.getElementById('statTodayVisitors');
  const statYesClicks     = document.getElementById('statYesClicks');
  const statNoAttempts    = document.getElementById('statNoAttempts');
  const statFavoriteKiss  = document.getElementById('statFavoriteKiss');

  // Table & Pagination
  const visitorSearchInput = document.getElementById('visitorSearchInput');
  const exportCsvBtn       = document.getElementById('exportCsvBtn');
  const visitorTableBody   = document.getElementById('visitorTableBody');
  const prevPageBtn        = document.getElementById('prevPageBtn');
  const nextPageBtn        = document.getElementById('nextPageBtn');
  const pageInfo           = document.getElementById('pageInfo');

  // Background Audio
  const bgAudio = document.getElementById('bgAudio');

  let kissChartInstance  = null;
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
    let greeting;
    if      (hour >= 5  && hour < 12) greeting = "Good Morning";
    else if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17 && hour < 20) greeting = "Good Evening";
    else                              greeting = "Good Night";

    const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    STATE.greeting = greeting;
    STATE.adjective = randAdj;
    return `${greeting} My ${randAdj} Lady`;
  }

  function initApp() {
    setupCanvasResizing();
    startParticleEngine();

    // Display Dynamic Greeting
    greetingText.textContent = computeTimeGreeting();

    // Post Visit to Backend
    postData('/api/visit', {
      session_id: STATE.sessionId,
      greeting: STATE.greeting,
      adjective: STATE.adjective,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`
    });

    // --- MUSIC: Start automatically ---
    // Attempt autoplay immediately. If browser blocks it,
    // music will start on the very first interaction automatically.
    initMusicAutoplay();

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
    constructor() { this.reset(); }
    reset() {
      this.x        = Math.random() * bgCanvas.width;
      this.y        = bgCanvas.height + Math.random() * 100;
      this.size     = Math.random() * 14 + 8;
      this.speedY   = Math.random() * 1.2 + 0.5;
      this.speedX   = Math.sin(Math.random() * Math.PI) * 0.8;
      this.opacity  = Math.random() * 0.6 + 0.2;
      this.type     = Math.random() > 0.4 ? 'heart' : 'petal';
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
        const t = this.size * 0.3;
        ctx.moveTo(0, t);
        ctx.bezierCurveTo(0, 0, -this.size / 2, 0, -this.size / 2, t);
        ctx.bezierCurveTo(-this.size / 2, (this.size + t) / 2, 0, this.size, 0, this.size);
        ctx.bezierCurveTo(0, this.size, this.size / 2, (this.size + t) / 2, this.size / 2, t);
        ctx.bezierCurveTo(this.size / 2, 0, 0, 0, 0, t);
        ctx.fill();
      } else {
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
      this.x = x; this.y = y;
      this.color = color; this.type = type;
      this.size  = Math.random() * 12 + 6;
      this.vx    = (Math.random() - 0.5) * 12;
      this.vy    = (Math.random() - 0.5) * 12 - 2;
      this.gravity = 0.2;
      this.alpha   = 1;
      this.decay   = Math.random() * 0.02 + 0.01;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.vy += this.gravity; this.alpha -= this.decay;
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
    for (let i = 0; i < 45; i++) bgParticles.push(new BgParticle());
    function animate() {
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      bgParticles.forEach(p => { p.update(); p.draw(bgCtx); });
      for (let i = fxParticles.length - 1; i >= 0; i--) {
        const p = fxParticles[i];
        p.update(); p.draw(fxCtx);
        if (p.alpha <= 0) fxParticles.splice(i, 1);
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  function triggerHeartExplosion(x, y) {
    const colors = ['#ff4081', '#e91e63', '#ff80ab', '#ffffff', '#ffeb3b'];
    for (let i = 0; i < 70; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      fxParticles.push(new FxParticle(x, y, color, Math.random() > 0.5 ? 'heart' : 'star'));
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
    const btnRect   = noBtn.getBoundingClientRect();
    const yesRect   = yesBtn.getBoundingClientRect();
    const btnCenter = { x: btnRect.left + btnRect.width / 2, y: btnRect.top + btnRect.height / 2 };
    if (Math.hypot(e.clientX - btnCenter.x, e.clientY - btnCenter.y) < 100) {
      moveNoButtonSafely(yesRect);
      recordNoAttempt();
    }
  }

  function moveNoButtonSafely(yesRect) {
    const cardRect = questionScreen.querySelector('.question-card').getBoundingClientRect();
    let newX, newY, safe = false, attempts = 0;
    while (!safe && attempts < 20) {
      attempts++;
      newX = Math.random() * (cardRect.width - 120) - (cardRect.width / 2 - 60);
      newY = Math.random() * (cardRect.height - 120) - (cardRect.height / 2 - 60);
      const absX = cardRect.left + cardRect.width / 2 + newX;
      const absY = cardRect.top  + cardRect.height / 2 + newY;
      if (Math.hypot(absX - (yesRect.left + yesRect.width / 2), absY - (yesRect.top + yesRect.height / 2)) > 140) safe = true;
    }
    noBtn.style.position = 'relative';
    noBtn.style.left = `${newX}px`;
    noBtn.style.top  = `${newY}px`;
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
      if (questionScreen.classList.contains('hidden')) { clearInterval(popupInterval); return; }
      showToast(messages[msgIdx % messages.length]);
      msgIdx++;
    }, 6000);
  }

  yesBtn.addEventListener('click', () => {
    const rect = yesBtn.getBoundingClientRect();
    triggerHeartExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (STATE.audioEnabled) playKissSynthSound();
    postData('/api/yes-click', { session_id: STATE.sessionId });
    setTimeout(() => switchScreen(questionScreen, kissScreen), 1200);
  });

  // ==========================================================================
  // 4. KISS SELECTION SCREEN & CUSTOM SVG ANIMATIONS
  // ==========================================================================
  document.querySelectorAll('.kiss-card').forEach(card => {
    card.addEventListener('click', () => handleKissSelection(card.getAttribute('data-category')));
  });

  function handleKissSelection(category) {
    postData('/api/kiss-selection', { session_id: STATE.sessionId, kiss_category: category });
    if (STATE.audioEnabled) playKissSynthSound();
    renderKissAnimation(category);
    setTimeout(() => {
      kissAnimOverlay.classList.add('hidden');
      switchScreen(kissScreen, finalScreen);
      startFinalCelebration();
    }, 2800);
  }

  function renderKissAnimation(category) {
    const animations = {
      Forehead: `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#ff4081" stroke-width="4"/><text x="50" y="45" font-size="30" text-anchor="middle">👑</text><text x="50" y="75" font-size="22" text-anchor="middle">💋</text></svg><div class="kiss-anim-title">Cute Forehead Kiss! 👑</div>`,
      Cheek:    `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><text x="35" y="60" font-size="35" text-anchor="middle">😊</text><text x="65" y="55" font-size="30" text-anchor="middle">💋</text></svg><div class="kiss-anim-title">Sweet Cheek Kiss! 😊</div>`,
      Nose:     `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><text x="50" y="55" font-size="40" text-anchor="middle">👃</text><text x="50" y="25" font-size="20" text-anchor="middle">✨</text></svg><div class="kiss-anim-title">Boopable Nose Kiss! ✨</div>`,
      Lips:     `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><text x="50" y="60" font-size="45" text-anchor="middle">💋</text></svg><div class="kiss-anim-title">Romantic Lips Kiss! 💖</div>`,
      Neck:     `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><text x="40" y="60" font-size="35" text-anchor="middle">🦒</text><text x="65" y="70" font-size="25" text-anchor="middle">💋</text></svg><div class="kiss-anim-title">Warm Neck Kiss! 🔥</div>`,
      Eyes:     `<svg class="kiss-anim-svg" viewBox="0 0 100 100"><text x="50" y="55" font-size="40" text-anchor="middle">👁️</text><text x="50" y="30" font-size="22" text-anchor="middle">💋</text></svg><div class="kiss-anim-title">Tender Eye Kiss! 👁️✨</div>`
    };
    kissAnimContent.innerHTML = animations[category] || '';
    kissAnimOverlay.classList.remove('hidden');
  }

  // ==========================================================================
  // 5. FINAL SCREEN CELEBRATION (15s) + HOME BUTTON IN HEADER (Req 6)
  // ==========================================================================
  function startFinalCelebration() {
    let secondsLeft = 15;
    const timerDisplay = document.getElementById('finalTimerDisplay');

    const interval = setInterval(() => {
      triggerHeartExplosion(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
    }, 600);

    const countdown = setInterval(() => {
      secondsLeft--;
      timerDisplay.textContent = `Continuing romantic magic... ${secondsLeft}s`;
      if (secondsLeft <= 0) {
        clearInterval(countdown);
        clearInterval(interval);
        timerDisplay.textContent = "Tharkulllieee 💕 I'm Blushing nnn ";

        postData('/api/complete-visit', {
          session_id: STATE.sessionId,
          visit_duration: (Date.now() - STATE.visitStartTime) / 1000
        });

        // Show the Home button in the header with animation
        showHomeButtonInHeader();
      }
    }, 1000);
  }

  /**
   * Reveal the Home button in the app-header (beside music & admin buttons).
   * Removes .header-hidden to display it with CSS slide-in animation.
   */
  function showHomeButtonInHeader() {
    STATE.celebrationDone = true;
    homeBtn.classList.remove('header-hidden');
    // Brief toast to draw attention
    showToast("💖 Click 'Home' to start again!");
  }

  /**
   * Home Button click: reset entire app state and return to landing screen.
   * Does NOT reload the browser page.
   */
  homeBtn.addEventListener('click', () => {
    resetAppToHome();
  });

  function resetAppToHome() {
    // 1. Hide home button again until next celebration
    homeBtn.classList.add('header-hidden');
    STATE.celebrationDone = false;

    // 2. New session ID
    const newSid = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('romantic_session_id', newSid);
    STATE.sessionId = newSid;
    STATE.visitStartTime = Date.now();
    STATE.noAttemptCount = 0;

    // 3. Reset NO button position
    noBtn.style.position = '';
    noBtn.style.left = '';
    noBtn.style.top  = '';

    // 4. Reset timer text
    document.getElementById('finalTimerDisplay').textContent = 'Continuing romantic Jaadoo... 15s';

    // 5. New greeting
    greetingText.textContent = computeTimeGreeting();
    landingProgress.style.width = '0%';

    // 6. Switch all screens to hidden, make landing active
    [questionScreen, kissScreen, finalScreen].forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    landingScreen.classList.remove('hidden');
    landingScreen.classList.add('active');

    // 7. Re-post visit to backend
    postData('/api/visit', {
      session_id: STATE.sessionId,
      greeting: STATE.greeting,
      adjective: STATE.adjective,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`
    });

    // 8. Restart landing progress then question screen
    setTimeout(() => {
      runLandingProgress(7000, () => {
        switchScreen(landingScreen, questionScreen);
        initEvasiveNoButton();
        startPlayfulPopups();
      });
    }, 500);
  }

  // ==========================================================================
  // 6. ROMANTIC BACKGROUND MUSIC ENGINE (Req 5)
  //    Auto-starts. First interaction fallback if browser blocks autoplay.
  //    Toggle button: ON/OFF. Smooth fade in/out. 25% volume.
  // ==========================================================================

  // Comfortable default volume (25%)
  bgAudio.volume = 0;

  /**
   * Initialize music auto-play strategy:
   * 1. Try to play immediately.
   * 2. If autoplay is blocked, register first-interaction handler.
   * Music will start ON automatically; user can click to turn it OFF.
   */
  function initMusicAutoplay() {
    bgAudio.volume = 0;
    const playPromise = bgAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Autoplay allowed — fade in gently
          fadeAudioIn(0.25);
          STATE.audioEnabled = true;
          updateMusicUI(true);
        })
        .catch(() => {
          // Autoplay blocked — start music on first user interaction automatically
          registerFirstInteractionForMusic();
        });
    } else {
      // Older browsers — try first interaction anyway
      registerFirstInteractionForMusic();
    }
  }

  /**
   * Attach one-shot listeners: the very first click/tap/keypress starts music automatically.
   * User doesn't need to press the music button — it starts by itself.
   */
  function registerFirstInteractionForMusic() {
    const events = ['click', 'touchstart', 'keydown', 'mousemove'];
    let fired = false;

    function onFirstInteraction() {
      if (fired) return;
      fired = true;
      STATE.firstInteractionDone = true;
      events.forEach(evt => document.removeEventListener(evt, onFirstInteraction, true));

      // Only start if user has NOT explicitly turned music off via button
      if (!STATE.audioEnabled && sessionStorage.getItem('romantic_music_pref') !== 'off') {
        bgAudio.volume = 0;
        bgAudio.play()
          .then(() => {
            fadeAudioIn(0.25);
            STATE.audioEnabled = true;
            updateMusicUI(true);
          })
          .catch(() => {});
      }
    }

    events.forEach(evt => document.addEventListener(evt, onFirstInteraction, true));
  }

  /**
   * Smooth fade volume UP to targetVol over ~1s.
   */
  function fadeAudioIn(targetVol) {
    if (STATE.musicFadeInterval) clearInterval(STATE.musicFadeInterval);
    bgAudio.volume = 0;
    const steps = 25;
    const stepVal = targetVol / steps;
    STATE.musicFadeInterval = setInterval(() => {
      if (bgAudio.volume + stepVal >= targetVol) {
        bgAudio.volume = targetVol;
        clearInterval(STATE.musicFadeInterval);
        STATE.musicFadeInterval = null;
      } else {
        bgAudio.volume = Math.min(bgAudio.volume + stepVal, 1);
      }
    }, 40);
  }

  /**
   * Smooth fade volume DOWN to 0, then pause.
   */
  function fadeAudioOut() {
    if (STATE.musicFadeInterval) clearInterval(STATE.musicFadeInterval);
    const startVol = bgAudio.volume;
    const steps = 20;
    const stepVal = startVol / steps;
    STATE.musicFadeInterval = setInterval(() => {
      if (bgAudio.volume - stepVal <= 0) {
        bgAudio.volume = 0;
        bgAudio.pause();
        clearInterval(STATE.musicFadeInterval);
        STATE.musicFadeInterval = null;
      } else {
        bgAudio.volume = Math.max(bgAudio.volume - stepVal, 0);
      }
    }, 40);
  }

  /**
   * Update music toggle button appearance: icon, label, glow class.
   */
  function updateMusicUI(isOn) {
    if (isOn) {
      soundLabel.textContent = "Music: On";
      musicIcon.textContent  = "🎶";
      soundToggleBtn.classList.add('music-on');
    } else {
      soundLabel.textContent = "Music: Off";
      musicIcon.textContent  = "🎵";
      soundToggleBtn.classList.remove('music-on');
    }
  }

  /**
   * Music toggle button click:
   * - If music is ON → fade out and turn OFF
   * - If music is OFF → fade in and turn ON
   */
  soundToggleBtn.addEventListener('click', () => {
    STATE.firstInteractionDone = true; // mark interaction
    if (STATE.audioEnabled) {
      // Turn OFF
      fadeAudioOut();
      STATE.audioEnabled = false;
      updateMusicUI(false);
      sessionStorage.setItem('romantic_music_pref', 'off');
    } else {
      // Turn ON
      bgAudio.play()
        .then(() => {
          fadeAudioIn(0.25);
          STATE.audioEnabled = true;
          updateMusicUI(true);
          sessionStorage.setItem('romantic_music_pref', 'on');
        })
        .catch(err => console.warn("Audio play failed:", err));
    }
  });

  // Web Audio synth "kiss" chime (unchanged)
  let audioCtx = null;
  function initAudioContext() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playKissSynthSound() {
    try {
      initAudioContext();
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2,  audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  // ==========================================================================
  // 7. ADMIN DASHBOARD & SECURE SESSION AUTHENTICATION
  // ==========================================================================

  /**
   * Admin button click:
   * 1. Open modal.
   * 2. Check server session auth.
   * 3. If authenticated → show dashboard immediately.
   * 4. If not → show login form.
   */
  adminBtn.addEventListener('click', async () => {
    adminModal.classList.remove('hidden');
    // Show login form first (default state)
    showAdminLoginForm();

    // Then check if already authenticated on server
    const isAuth = await checkAdminAuth();
    if (isAuth) {
      showAdminDashboard();
      loadAdminDashboardData();
    }
  });

  closeAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  // Close modal if clicking outside the modal container
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) adminModal.classList.add('hidden');
  });

  /**
   * Login form submit — sends password to backend.
   * On success: shows dashboard and logout button.
   * On failure: shows error message.
   */
  adminLoginSubmitBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value.trim();
    if (!password) {
      adminLoginError.textContent = 'Please enter your password.';
      adminLoginError.classList.remove('hidden');
      return;
    }

    // Disable button to prevent double-click
    adminLoginSubmitBtn.disabled = true;
    adminLoginSubmitBtn.textContent = 'Logging in...';

    try {
      const res = await postData('/api/admin/login', { password });
      if (res && res.status === 'success') {
        STATE.adminToken = res.token;
        adminLoginError.classList.add('hidden');
        adminPasswordInput.value = '';
        showAdminDashboard();
        loadAdminDashboardData();
      } else {
        adminLoginError.textContent = '❌ Invalid Password. Please try again.';
        adminLoginError.classList.remove('hidden');
      }
    } catch (err) {
      adminLoginError.textContent = '❌ Login failed. Please try again.';
      adminLoginError.classList.remove('hidden');
    } finally {
      adminLoginSubmitBtn.disabled = false;
      adminLoginSubmitBtn.textContent = 'Login';
    }
  });

  // Allow Enter key on password field
  adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLoginSubmitBtn.click();
  });

  /**
   * Logout button — destroys Flask server session, resets modal to login form.
   */
  adminLogoutBtn.addEventListener('click', async () => {
    await postData('/api/admin/logout', {});
    STATE.adminToken = null;
    showAdminLoginForm();
    showToast("Logged out from Admin Dashboard 🔐");
  });

  /**
   * Check server session auth status via GET /api/admin/check-auth.
   */
  async function checkAdminAuth() {
    try {
      const response = await fetch('/api/admin/check-auth', { credentials: 'include' });
      const data = await response.json();
      return data.authenticated === true;
    } catch {
      return false;
    }
  }

  /** Show dashboard panel, hide login form, show logout button. */
  function showAdminDashboard() {
    adminLoginForm.classList.add('hidden');
    adminDashboardContent.classList.remove('hidden');
    adminLogoutBtn.classList.remove('hidden');
  }

  /** Show login form, hide dashboard panel, hide logout button. */
  function showAdminLoginForm() {
    adminLoginForm.classList.remove('hidden');
    adminDashboardContent.classList.add('hidden');
    adminLogoutBtn.classList.add('hidden');
    adminLoginError.classList.add('hidden');
  }

  async function loadAdminDashboardData() {
    const stats = await getData('/api/admin/statistics');
    if (stats) {
      statTotalVisitors.textContent = stats.total_visitors || 0;
      statTodayVisitors.textContent = stats.today_visitors || 0;
      statYesClicks.textContent     = stats.yes_clicks    || 0;
      statNoAttempts.textContent    = stats.no_attempts   || 0;
      statFavoriteKiss.textContent  = stats.most_selected_kiss || 'None';
      renderAdminCharts(stats);
    }
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
      const timeStr = formatIST(v.visit_timestamp);
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
    if (STATE.currentPage > 1) { STATE.currentPage--; loadVisitorTable(); }
  });
  nextPageBtn.addEventListener('click', () => {
    if (STATE.currentPage < STATE.totalPages) { STATE.currentPage++; loadVisitorTable(); }
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!STATE.adminToken) return;
    window.open(`/api/admin/export-csv?token=${encodeURIComponent(STATE.adminToken)}`, '_blank');
  });

  function renderAdminCharts(stats) {
    const kissCtx = document.getElementById('kissChart').getContext('2d');
    if (kissChartInstance) kissChartInstance.destroy();
    const kissLabels = Object.keys(stats.kiss_distribution || {});
    const kissValues = Object.values(stats.kiss_distribution || {});
    kissChartInstance = new Chart(kissCtx, {
      type: 'doughnut',
      data: {
        labels: kissLabels.length ? kissLabels : ['No Choices Yet'],
        datasets: [{ data: kissValues.length ? kissValues : [1], backgroundColor: ['#ff4081','#e91e63','#ff80ab','#ab47bc','#7e57c2','#ec407a'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ffffff' } } } }
    });

    const deviceCtx = document.getElementById('deviceChart').getContext('2d');
    if (deviceChartInstance) deviceChartInstance.destroy();
    const deviceLabels = Object.keys(stats.device_types || {});
    const deviceValues = Object.values(stats.device_types || {});
    deviceChartInstance = new Chart(deviceCtx, {
      type: 'bar',
      data: {
        labels: deviceLabels.length ? deviceLabels : ['Desktop'],
        datasets: [{ label: 'Visitors by Device', data: deviceValues.length ? deviceValues : [0], backgroundColor: '#ff4081' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { ticks: { color: '#ffffff' } }, y: { ticks: { color: '#ffffff' }, beginAtZero: true } },
        plugins: { legend: { labels: { color: '#ffffff' } } }
      }
    });
  }

  // ==========================================================================
  // 8. IST TIMESTAMP FORMATTER (Req 4)
  // ==========================================================================
  function formatIST(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return 'N/A';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(date) + ' IST';
    } catch {
      return isoStr;
    }
  }

  // ==========================================================================
  // 9. HELPER UTILITIES & TOASTS
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
        credentials: 'include',
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
        credentials: 'include',
        headers: { 'Authorization': STATE.adminToken ? `Bearer ${STATE.adminToken}` : '' }
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
        credentials: 'include',
        headers: { 'Authorization': STATE.adminToken ? `Bearer ${STATE.adminToken}` : '' }
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
