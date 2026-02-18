// ============================================================
// NPS Future Forge — Core Game Engine
// ============================================================

const ANNUAL_RETURN = 0.10;       // 10% annual NPS return
const MONTHLY_RETURN = ANNUAL_RETURN / 12;
const CORPUS_GROWTH_STAGE = 500000;   // ₹5L → growth
const CORPUS_FREEDOM_STAGE = 2500000; // ₹25L → freedom
const MAX_CORPUS = 10000000;          // ₹1Cr (for UI scaling)
const SHOCK_INTERVAL = 3;             // every 3 months
const FREEDOM_AGE = 60;
const CURRENT_AGE = 30;
const TOTAL_MONTHS = (FREEDOM_AGE - CURRENT_AGE) * 12;

// ── State ────────────────────────────────────────────────────
let state = {
    monthlyContribution: 5000,
    totalCorpus: 0,
    streakCount: 0,
    protectionTokens: 2,
    resilience: 100,
    divergenceScore: 0,
    evolutionStage: 'early',
    freedomDaysRemaining: 10950,
    month: 0,
    shadowCorpus: 0,
    shadowResilience: 100,
    lastShock: null,
    isSyncing: false,
    allocationProfile: { equity: 50, corporate: 30, govt: 20 },
    expectedReturn: 0.102,
    leaderboard: generateLeaderboard(),
    guildProgress: 0,
    guildTarget: 1000000,
    minigameScore: 0,
    totalSaved: 0,
    projectedRetirementAge: 60,
    monthlyExpenses: 40000,
    inflationRate: 0.06
};

// ── Leaderboard Seed ─────────────────────────────────────────
function generateLeaderboard() {
    const names = ['Priya S.', 'Rahul M.', 'Ananya K.', 'Vikram P.', 'Sneha R.',
        'Arjun T.', 'Meera N.', 'Karthik B.', 'Divya L.', 'Suresh V.'];
    return names.map((name, i) => ({
        name,
        divergence: Math.floor(Math.random() * 80 + 20) - i * 3,
        streak: Math.floor(Math.random() * 24),
        corpus: Math.floor(Math.random() * 2000000 + 100000)
    })).sort((a, b) => b.divergence - a.divergence);
}

// ── Corpus Calculator ─────────────────────────────────────────
function calculateProjectedCorpus(monthly, months) {
    // Future Value of annuity with compound interest
    const r = MONTHLY_RETURN;
    if (r === 0) return monthly * months;
    return monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

function calculateRetirementAge(monthly) {
    // Find when corpus reaches comfortable retirement (25x annual expenses)
    const targetCorpus = state.monthlyExpenses * 12 * 25;
    for (let m = 1; m <= TOTAL_MONTHS; m++) {
        const corpus = calculateProjectedCorpus(monthly, m);
        if (corpus >= targetCorpus) {
            return CURRENT_AGE + Math.ceil(m / 12);
        }
    }
    return FREEDOM_AGE;
}

// ── Stage Manager ─────────────────────────────────────────────
function getStage(corpus) {
    if (corpus >= CORPUS_FREEDOM_STAGE) return 'freedom';
    if (corpus >= CORPUS_GROWTH_STAGE) return 'growth';
    return 'early';
}

function applyStageTheme(stage) {
    document.body.className = `stage-${stage}`;
    state.evolutionStage = stage;
}

// ── Dynamic Lighting ──────────────────────────────────────────
function updateLighting() {
    const corpusRatio = Math.min(1, state.totalCorpus / MAX_CORPUS);
    const shadowDecay = Math.max(0, 1 - (state.shadowResilience / 100));

    const worldBrightness = 0.5 + corpusRatio * 0.5;
    const shadowBrightness = Math.max(0.2, 0.9 - shadowDecay * 0.6);
    const worldSaturation = 0.6 + corpusRatio * 0.4;
    const shadowSaturation = Math.max(0.1, 1 - shadowDecay * 0.8);

    document.documentElement.style.setProperty('--world-brightness', worldBrightness);
    document.documentElement.style.setProperty('--shadow-brightness', shadowBrightness);
    document.documentElement.style.setProperty('--world-saturation', worldSaturation);
    document.documentElement.style.setProperty('--shadow-saturation', shadowSaturation);

    // Sky color
    const hue = 200 + corpusRatio * 40;
    const lightness = 15 + corpusRatio * 20;
    document.documentElement.style.setProperty('--sky-hue', hue);
    document.documentElement.style.setProperty('--sky-lightness', `${lightness}%`);
}

// ── UI Updaters ───────────────────────────────────────────────
function updateHUD() {
    // Corpus display
    el('corpus-amount').textContent = formatCurrency(state.totalCorpus);
    el('shadow-corpus').textContent = formatCurrency(state.shadowCorpus);

    // Resilience bars
    const resBar = el('resilience-fill');
    resBar.style.width = `${state.resilience}%`;
    resBar.style.background = resilienceColor(state.resilience);
    el('resilience-value').textContent = `${Math.round(state.resilience)}%`;

    const shadowResBar = el('shadow-resilience-fill');
    shadowResBar.style.width = `${state.shadowResilience}%`;
    shadowResBar.style.background = resilienceColor(state.shadowResilience);
    el('shadow-resilience-value').textContent = `${Math.round(state.shadowResilience)}%`;

    // Divergence score
    const divergence = Math.max(0, Math.round(state.resilience - state.shadowResilience + (state.totalCorpus / 50000)));
    state.divergenceScore = divergence;
    el('divergence-value').textContent = divergence;
    el('divergence-fill').style.width = `${Math.min(100, divergence)}%`;

    // Streak & tokens
    el('streak-count').textContent = state.streakCount;
    el('token-count').textContent = state.protectionTokens;
    el('month-count').textContent = state.month;

    // Freedom countdown
    const daysLeft = Math.max(0, state.freedomDaysRemaining - state.month * 30);
    el('freedom-days').textContent = Math.round(daysLeft).toLocaleString('en-IN');
    const progress = 1 - (daysLeft / state.freedomDaysRemaining);
    el('freedom-progress').style.width = `${progress * 100}%`;

    // Contribution preview
    const projAge = calculateRetirementAge(state.monthlyContribution);
    el('projected-age').textContent = projAge;
    el('projected-corpus').textContent = formatCurrency(
        calculateProjectedCorpus(state.monthlyContribution, TOTAL_MONTHS)
    );
    el('slider-value').textContent = `₹${state.monthlyContribution.toLocaleString('en-IN')}`;

    // Stage label
    const stageLabels = { early: '🏠 Early Stage', growth: '🌱 Growth Stage', freedom: '✨ Freedom Stage' };
    el('stage-label').textContent = stageLabels[state.evolutionStage];

    // Avatars
    el('future-avatar').innerHTML = AvatarRenderer.renderFutureSelf(
        state.evolutionStage, state.resilience, state.streakCount
    );
    el('shadow-avatar').innerHTML = AvatarRenderer.renderShadowTwin(
        state.shadowResilience, state.month
    );

    // Environment visuals
    updateEnvironment();
    updateLighting();
}

function updateEnvironment() {
    const stage = state.evolutionStage;
    const shadowDecay = 1 - (state.shadowResilience / 100);

    // Future world environment
    const futureEnv = el('future-environment');
    futureEnv.className = `environment env-${stage}`;

    // Shadow world environment
    const shadowEnv = el('shadow-environment');
    shadowEnv.className = `environment env-shadow`;
    shadowEnv.style.setProperty('--decay', shadowDecay);

    // Particles
    updateParticles(stage, shadowDecay);
}

// ── Particle System ───────────────────────────────────────────
let particleInterval = null;
function updateParticles(stage, shadowDecay) {
    const container = el('future-particles');
    if (!container) return;

    // Clear old particles periodically
    if (container.children.length > 20) {
        container.innerHTML = '';
    }

    const particle = document.createElement('div');
    particle.className = 'particle';

    if (stage === 'freedom') {
        particle.textContent = ['✨', '🌟', '💫', '⭐'][Math.floor(Math.random() * 4)];
        particle.style.fontSize = '16px';
    } else if (stage === 'growth') {
        particle.textContent = ['🍃', '🌿', '💚'][Math.floor(Math.random() * 3)];
        particle.style.fontSize = '12px';
    } else {
        particle.style.background = 'rgba(255,255,255,0.3)';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.borderRadius = '50%';
    }

    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${3 + Math.random() * 4}s`;
    particle.style.animationDelay = `${Math.random() * 2}s`;
    container.appendChild(particle);

    // Shadow particles (ash/smoke)
    const shadowContainer = el('shadow-particles');
    if (shadowContainer && shadowDecay > 0.2) {
        const sp = document.createElement('div');
        sp.className = 'particle shadow-particle';
        sp.style.left = `${Math.random() * 100}%`;
        sp.style.animationDuration = `${4 + Math.random() * 3}s`;
        shadowContainer.appendChild(sp);
        if (shadowContainer.children.length > 15) shadowContainer.innerHTML = '';
    }
}

// ── SYNC Action ───────────────────────────────────────────────
async function syncTimeline() {
    if (state.isSyncing) return;
    state.isSyncing = true;

    const btn = el('sync-btn');
    btn.disabled = true;
    btn.classList.add('syncing');
    btn.textContent = '⚡ SYNCING...';

    // Play sync animation
    el('future-world').classList.add('sync-pulse');
    playSound('sync');

    await sleep(800);

    // Advance month
    state.month++;
    state.totalCorpus = calculateProjectedCorpus(state.monthlyContribution, state.month);
    state.totalSaved += state.monthlyContribution;

    // Streak logic
    state.streakCount++;
    if (state.streakCount % 3 === 0) {
        showToast(`🔥 ${state.streakCount}-Month Streak! +5% Bonus Applied`, 'success');
    }

    // Freedom days countdown
    state.freedomDaysRemaining = Math.max(0, 10950 - state.month * 30);

    // Stage evolution
    const newStage = getStage(state.totalCorpus);
    if (newStage !== state.evolutionStage) {
        await triggerStageEvolution(newStage);
    }

    // Guild progress
    state.guildProgress = Math.min(state.guildTarget, state.guildProgress + state.monthlyContribution);

    await sleep(400);

    el('future-world').classList.remove('sync-pulse');
    btn.classList.remove('syncing');
    btn.disabled = false;
    btn.textContent = '⚡ SYNC TIMELINE';
    state.isSyncing = false;

    // Check for Life Shock
    if (state.month % SHOCK_INTERVAL === 0) {
        await sleep(600);
        triggerLifeShock();
        return;
    }

    updateHUD();
}

// ── Stage Evolution ───────────────────────────────────────────
async function triggerStageEvolution(newStage) {
    const overlay = el('evolution-overlay');
    const stageNames = { growth: '🌱 Growth Stage Unlocked!', freedom: '✨ Freedom Stage Achieved!' };
    const stageDesc = {
        growth: 'Your consistent contributions have upgraded your lifestyle. Better housing, new hobbies, financial stability!',
        freedom: 'You\'ve reached Financial Freedom! Luxury travel, complete independence, and a life on your terms!'
    };

    el('evolution-title').textContent = stageNames[newStage];
    el('evolution-desc').textContent = stageDesc[newStage];
    overlay.classList.add('active');
    playSound('evolution');

    applyStageTheme(newStage);
    await sleep(3000);
    overlay.classList.remove('active');
}

// ── Life Shock System ─────────────────────────────────────────
function triggerLifeShock() {
    const shock = LIFE_SHOCKS[Math.floor(Math.random() * LIFE_SHOCKS.length)];
    state.lastShock = shock;

    // Calculate protection based on corpus
    const corpusProtection = Math.min(0.9, state.totalCorpus / 1000000);
    const futureDamage = shock.damage * (1 - corpusProtection);
    const shadowDamage = shock.damage * 1.5;

    // Apply damage
    state.resilience = Math.max(5, state.resilience - futureDamage);
    state.shadowResilience = Math.max(0, state.shadowResilience - shadowDamage);

    // Show shock modal
    const modal = el('shock-modal');
    el('shock-icon').textContent = shock.icon;
    el('shock-title').textContent = shock.label;
    el('shock-desc').textContent = shock.description;
    el('shock-future-damage').textContent = `-${futureDamage.toFixed(1)} Resilience (Protected by ${(corpusProtection * 100).toFixed(0)}%)`;
    el('shock-shadow-damage').textContent = `-${shadowDamage.toFixed(1)} Resilience (No Protection)`;
    el('shock-insight').innerHTML = shock.insight;

    modal.classList.add('active');
    el('shadow-world').classList.add('shock-shake');
    playSound('shock');

    setTimeout(() => {
        el('shadow-world').classList.remove('shock-shake');
    }, 1000);

    // Start 30s insight timer
    startInsightTimer();
    updateHUD();
}

function startInsightTimer() {
    let seconds = 30;
    const timerEl = el('insight-timer');
    const interval = setInterval(() => {
        seconds--;
        timerEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(interval);
            timerEl.textContent = '✓';
        }
    }, 1000);
}

function closeShockModal() {
    el('shock-modal').classList.remove('active');
    updateHUD();
}

// ── Streak & Token System ─────────────────────────────────────
function useProtectionToken() {
    if (state.protectionTokens <= 0) {
        showToast('No Protection Tokens remaining!', 'error');
        return;
    }
    state.protectionTokens--;
    state.streakCount++; // Maintain streak
    showToast('🛡️ Protection Token used! Streak maintained.', 'success');
    updateHUD();
}

// ── Inflation Defense Mini-Game ───────────────────────────────
let inflationGame = { active: false, score: 0, timeLeft: 30, interval: null, spawnInterval: null };

function startInflationGame() {
    el('minigame-modal').classList.add('active');
    el('mg-title').textContent = '🛡️ Inflation Defense';
    el('mg-desc').textContent = 'Click the inflation bubbles before they reach the bottom! Each deflected bubble protects your corpus.';
    el('mg-canvas-area').innerHTML = '<div id="inflation-arena" style="position:relative;width:100%;height:300px;background:rgba(0,0,0,0.3);border-radius:12px;overflow:hidden;"></div>';
    el('mg-score').textContent = '0';
    el('mg-timer').textContent = '30';

    inflationGame = { active: true, score: 0, timeLeft: 30 };

    // Timer
    inflationGame.interval = setInterval(() => {
        inflationGame.timeLeft--;
        el('mg-timer').textContent = inflationGame.timeLeft;
        if (inflationGame.timeLeft <= 0) {
            endInflationGame();
        }
    }, 1000);

    // Spawn bubbles
    inflationGame.spawnInterval = setInterval(spawnInflationBubble, 1200);
}

function spawnInflationBubble() {
    if (!inflationGame.active) return;
    const arena = document.getElementById('inflation-arena');
    if (!arena) return;

    const item = INFLATION_ITEMS[Math.floor(Math.random() * INFLATION_ITEMS.length)];
    const bubble = document.createElement('div');
    bubble.className = 'inflation-bubble';
    bubble.innerHTML = `<span style="font-size:20px">${item.icon}</span><br><span style="font-size:10px">${item.label}</span><br><span style="font-size:11px;color:#ef4444">+${item.value}%</span>`;
    bubble.style.left = `${10 + Math.random() * 70}%`;
    bubble.style.top = '-60px';

    bubble.addEventListener('click', () => {
        if (!inflationGame.active) return;
        inflationGame.score += item.value;
        el('mg-score').textContent = inflationGame.score;
        bubble.classList.add('popped');
        showToast(`💥 Deflected ${item.label} inflation!`, 'success');
        setTimeout(() => bubble.remove(), 300);
    });

    arena.appendChild(bubble);

    // Animate falling
    let top = -60;
    const fall = setInterval(() => {
        top += 3;
        bubble.style.top = `${top}px`;
        if (top > 300) {
            clearInterval(fall);
            bubble.remove();
        }
    }, 50);
}

function endInflationGame() {
    inflationGame.active = false;
    clearInterval(inflationGame.interval);
    clearInterval(inflationGame.spawnInterval);

    const bonus = inflationGame.score * 1000;
    state.totalCorpus += bonus;
    state.minigameScore += inflationGame.score;

    el('mg-canvas-area').innerHTML = `
    <div style="text-align:center;padding:40px;">
      <div style="font-size:48px">🏆</div>
      <h3 style="color:#f39c12;margin:10px 0">Score: ${inflationGame.score}</h3>
      <p style="color:#aaa">Corpus Bonus: +${formatCurrency(bonus)}</p>
      <button class="btn-primary" onclick="closeMinigame()" style="margin-top:20px">Claim Reward</button>
    </div>`;
    updateHUD();
}

// ── Asset Allocation Mini-Game ────────────────────────────────
let allocationGame = { equity: 50, corporate: 30, govt: 20 };

function startAllocationGame() {
    el('minigame-modal').classList.add('active');
    el('mg-title').textContent = '📊 Asset Allocation';
    el('mg-desc').textContent = 'Optimize your NPS portfolio allocation. Balance risk and return to maximize your corpus growth.';
    el('mg-score').textContent = '10.2%';
    el('mg-timer').textContent = '∞';

    allocationGame = { ...state.allocationProfile };
    renderAllocationGame();
}

function renderAllocationGame() {
    el('mg-canvas-area').innerHTML = `
    <div style="padding:20px;">
      <div class="allocation-sliders">
        ${renderAllocSlider('equity', '📈 Equity', '#2ecc71', allocationGame.equity)}
        ${renderAllocSlider('corporate', '🏢 Corporate Bonds', '#3498db', allocationGame.corporate)}
        ${renderAllocSlider('govt', '🏛️ Government Securities', '#9b59b6', allocationGame.govt)}
      </div>
      <div class="allocation-chart" id="alloc-chart">${renderPieChart()}</div>
      <div style="text-align:center;margin-top:16px;">
        <div style="font-size:24px;font-weight:bold;color:#f39c12" id="alloc-return">Expected Return: ${calculateAllocReturn()}%</div>
        <div style="color:#aaa;font-size:12px;margin-top:4px">Based on historical NPS fund performance</div>
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;justify-content:center;">
        ${ALLOCATION_PRESETS.map(p => `<button class="btn-secondary" onclick="applyPreset('${p.name}')" style="font-size:11px;padding:6px 10px">${p.name}</button>`).join('')}
      </div>
      <button class="btn-primary" onclick="confirmAllocation()" style="width:100%;margin-top:16px">✅ Apply Allocation</button>
    </div>`;

    // Attach slider events
    ['equity', 'corporate', 'govt'].forEach(type => {
        const slider = document.getElementById(`alloc-${type}`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                allocationGame[type] = parseInt(e.target.value);
                // Normalize to 100%
                const total = allocationGame.equity + allocationGame.corporate + allocationGame.govt;
                if (total !== 100) {
                    const diff = 100 - total;
                    const others = ['equity', 'corporate', 'govt'].filter(t => t !== type);
                    allocationGame[others[0]] = Math.max(0, allocationGame[others[0]] + Math.floor(diff / 2));
                    allocationGame[others[1]] = Math.max(0, 100 - allocationGame[type] - allocationGame[others[0]]);
                }
                document.getElementById(`alloc-${type}-val`).textContent = `${allocationGame[type]}%`;
                document.getElementById('alloc-return').textContent = `Expected Return: ${calculateAllocReturn()}%`;
            });
        }
    });
}

function renderAllocSlider(type, label, color, value) {
    return `<div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span style="color:#ddd;font-size:13px">${label}</span>
      <span style="color:${color};font-weight:bold" id="alloc-${type}-val">${value}%</span>
    </div>
    <input type="range" id="alloc-${type}" min="5" max="85" value="${value}" 
      style="width:100%;accent-color:${color}">
  </div>`;
}

function renderPieChart() {
    const total = allocationGame.equity + allocationGame.corporate + allocationGame.govt;
    const eq = (allocationGame.equity / total) * 360;
    const corp = (allocationGame.corporate / total) * 360;
    return `<svg viewBox="0 0 100 100" style="width:120px;height:120px;margin:0 auto;display:block;">
    <circle r="40" cx="50" cy="50" fill="transparent" stroke="#2ecc71" stroke-width="20"
      stroke-dasharray="${eq * 0.698} ${251.2}" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
    <circle r="40" cx="50" cy="50" fill="transparent" stroke="#3498db" stroke-width="20"
      stroke-dasharray="${corp * 0.698} ${251.2}" stroke-dashoffset="${-eq * 0.698}" transform="rotate(-90 50 50)"/>
    <circle r="40" cx="50" cy="50" fill="transparent" stroke="#9b59b6" stroke-width="20"
      stroke-dasharray="${(360 - eq - corp) * 0.698} ${251.2}" stroke-dashoffset="${-(eq + corp) * 0.698}" transform="rotate(-90 50 50)"/>
    <circle r="28" cx="50" cy="50" fill="#1a1a2e"/>
    <text x="50" y="54" text-anchor="middle" font-size="8" fill="#fff">NPS</text>
  </svg>`;
}

function calculateAllocReturn() {
    const r = (allocationGame.equity * 0.12 + allocationGame.corporate * 0.09 + allocationGame.govt * 0.075) / 100;
    return (r * 100).toFixed(1);
}

function applyPreset(name) {
    const preset = ALLOCATION_PRESETS.find(p => p.name === name);
    if (preset) {
        allocationGame = { equity: preset.equity, corporate: preset.corporate, govt: preset.govt };
        renderAllocationGame();
    }
}

function confirmAllocation() {
    state.allocationProfile = { ...allocationGame };
    const newReturn = parseFloat(calculateAllocReturn()) / 100;
    state.expectedReturn = newReturn;
    showToast(`✅ Allocation updated! Expected return: ${calculateAllocReturn()}%`, 'success');
    closeMinigame();
    updateHUD();
}

function closeMinigame() {
    el('minigame-modal').classList.remove('active');
    if (inflationGame.active) {
        inflationGame.active = false;
        clearInterval(inflationGame.interval);
        clearInterval(inflationGame.spawnInterval);
    }
}

// ── Guild System ──────────────────────────────────────────────
function openGuild() {
    el('guild-modal').classList.add('active');
    renderLeaderboard();
}

function closeGuild() {
    el('guild-modal').classList.remove('active');
}

function renderLeaderboard() {
    // Add player to leaderboard
    const playerEntry = {
        name: '⭐ You',
        divergence: state.divergenceScore,
        streak: state.streakCount,
        corpus: state.totalCorpus
    };

    const board = [playerEntry, ...state.leaderboard].sort((a, b) => b.divergence - a.divergence).slice(0, 10);

    el('leaderboard-body').innerHTML = board.map((entry, i) => `
    <tr class="${entry.name === '⭐ You' ? 'player-row' : ''}">
      <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
      <td>${entry.name}</td>
      <td style="color:#f39c12">${entry.divergence}</td>
      <td style="color:#2ecc71">${entry.streak}🔥</td>
      <td>${formatCurrency(entry.corpus)}</td>
    </tr>`).join('');

    // Guild progress bar
    const guildPct = Math.min(100, (state.guildProgress / state.guildTarget) * 100);
    el('guild-progress-fill').style.width = `${guildPct}%`;
    el('guild-progress-text').textContent = `${formatCurrency(state.guildProgress)} / ${formatCurrency(state.guildTarget)}`;
}

// ── NPS Dashboard ─────────────────────────────────────────────
function openDashboard() {
    el('dashboard-modal').classList.add('active');
    renderDashboard();
}

function closeDashboard() {
    el('dashboard-modal').classList.remove('active');
}

function renderDashboard() {
    const projCorpus = calculateProjectedCorpus(state.monthlyContribution, TOTAL_MONTHS);
    el('dash-tier1').textContent = formatCurrency(state.totalCorpus * 0.8);
    el('dash-tier2').textContent = formatCurrency(state.totalCorpus * 0.2);
    el('dash-total').textContent = formatCurrency(state.totalCorpus);
    el('dash-projected').textContent = formatCurrency(projCorpus);
    el('dash-monthly').textContent = formatCurrency(state.monthlyContribution);
    el('dash-tax-saved').textContent = formatCurrency(state.totalSaved * 0.3);
    el('dash-return').textContent = `${(state.expectedReturn * 100).toFixed(1)}%`; // expectedReturn is decimal
}

// ── Slider Handler ────────────────────────────────────────────
function onSliderChange(value) {
    state.monthlyContribution = parseInt(value);
    const projAge = calculateRetirementAge(state.monthlyContribution);
    const projCorpus = calculateProjectedCorpus(state.monthlyContribution, TOTAL_MONTHS);
    el('projected-age').textContent = projAge;
    el('projected-corpus').textContent = formatCurrency(projCorpus);
    el('slider-value').textContent = `₹${state.monthlyContribution.toLocaleString('en-IN')}`;

    // Live home preview
    const stage = state.monthlyContribution >= 15000 ? 'freedom' : state.monthlyContribution >= 5000 ? 'growth' : 'early';
    el('home-preview').className = `home-preview preview-${stage}`;
}

// ── Utilities ─────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function formatCurrency(amount) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Math.round(amount)}`;
}

function resilienceColor(value) {
    if (value > 70) return 'linear-gradient(90deg, #2ecc71, #27ae60)';
    if (value > 40) return 'linear-gradient(90deg, #f39c12, #e67e22)';
    return 'linear-gradient(90deg, #e74c3c, #c0392b)';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const sounds = {
            sync: { freq: [440, 550, 660], duration: 0.3 },
            shock: { freq: [200, 150, 100], duration: 0.5 },
            evolution: { freq: [523, 659, 784, 1047], duration: 0.8 }
        };

        const s = sounds[type] || sounds.sync;
        s.freq.forEach((f, i) => {
            const o2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            o2.connect(g2);
            g2.connect(ctx.destination);
            o2.frequency.value = f;
            g2.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + s.duration);
            o2.start(ctx.currentTime + i * 0.1);
            o2.stop(ctx.currentTime + i * 0.1 + s.duration);
        });
    } catch (e) { /* Audio not supported */ }
}

// ── Init ──────────────────────────────────────────────────────
function init() {
    updateHUD();

    // Particle loop
    particleInterval = setInterval(() => {
        updateParticles(state.evolutionStage, 1 - state.shadowResilience / 100);
    }, 2000);

    // Slider init
    const slider = el('contribution-slider');
    if (slider) {
        slider.addEventListener('input', (e) => onSliderChange(e.target.value));
    }

    // Welcome animation
    setTimeout(() => {
        el('future-world').classList.add('sync-pulse');
        setTimeout(() => el('future-world').classList.remove('sync-pulse'), 1000);
    }, 500);
}

window.addEventListener('DOMContentLoaded', init);
