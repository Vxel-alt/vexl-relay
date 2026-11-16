// Application State
const State = {
    user: JSON.parse(localStorage.getItem('vexl_user') || 'null'),
    isPro: localStorage.getItem('vexl_is_pro') === 'true',
    chroma: JSON.parse(localStorage.getItem('vexl_chroma') || '{"h":160,"s":84,"l":45}'),
    generatedOTP: null,
    isPhoneVerified: false,
    mode: 'deep',
    duration: 50 * 60,
    timeLeft: 50 * 60,
    isRunning: false,
    timerId: null,
    sessionStartTime: Date.now(),
    xp: parseInt(localStorage.getItem('vexl_xp') || '0'),
    streak: parseInt(localStorage.getItem('vexl_streak') || '1'),
    totalSeconds: parseInt(localStorage.getItem('vexl_total_seconds') || '0'),
    completedSessions: parseInt(localStorage.getItem('vexl_sessions') || '0'),
    tasks: JSON.parse(localStorage.getItem('vexl_tasks') || '[]'),
    history: JSON.parse(localStorage.getItem('vexl_history') || JSON.stringify([45, 60, 30, 90, 25, 50, 0]))
};

const Durations = { deep: 50 * 60, pomodoro: 25 * 60, sprint: 15 * 60, flow: 0 };

// Initialize Decentralized P2P GunDB Network (Real People Only — Zero Bots)
const gun = Gun({
    peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://peer.peer.ooo/gun',
        'https://gun-us.herokuapp.com/gun'
    ]
});
const livePeersMap = {};
const renderedChatIds = new Set();

// Verified Embeddable Study Videos & Stream Presets
const StreamPresets = {
    'Class 10 Boards': [
        { label: 'Class 10 Science Full Revision', videoId: 'i_23KUAEtUM', searchQuery: 'Next Toppers Class 10 Science' },
        { label: 'Class 10 Maths Complete Marathon', videoId: 'TMubSpgTOVE', searchQuery: 'Physics Wallah Class 10 Maths' },
        { label: 'Lo-Fi Study Beats (24/7 Live)', videoId: 'jfKfPfyJRdk', searchQuery: 'Next Toppers Class 10 SST' }
    ],
    'Class 12 Boards': [
        { label: 'Physics Complete Concepts', videoId: 'b1t41Q3xRM8', searchQuery: 'Physics Wallah Class 12 Physics' },
        { label: 'Organic Chemistry Masterclass', videoId: 'bSMx0NS0XfY', searchQuery: 'Physics Wallah Class 12 Chemistry' },
        { label: 'Lo-Fi Deep Focus Stream', videoId: 'jfKfPfyJRdk', searchQuery: 'Next Toppers Class 12 Boards' }
    ],
    'JEE': [
        { label: 'Calculus & Integration Deep Dive', videoId: 'WUvTyaaNkzM', searchQuery: 'Physics Wallah JEE Physics' },
        { label: 'Linear Algebra Visualized', videoId: 'fNk_zzaMoSs', searchQuery: 'Physics Wallah Manzil JEE' },
        { label: 'JEE Focus Timer Stream', videoId: 'jfKfPfyJRdk', searchQuery: 'Physics Wallah JEE Chemistry' }
    ],
    'NEET': [
        { label: 'Human Biology & Genetics', videoId: '8m6hHRlKwxY', searchQuery: 'Physics Wallah NEET Biology' },
        { label: 'Cell Structure & Function', videoId: 'URUJD5NEXC8', searchQuery: 'Physics Wallah NEET Physics' },
        { label: 'NEET Focus Stream', videoId: 'jfKfPfyJRdk', searchQuery: 'Physics Wallah Yakeen NEET' }
    ],
    'Commerce': [
        { label: 'Economics & Market Principles', videoId: '3ez10ADR_gM', searchQuery: 'Commerce Wallah Accountancy' },
        { label: 'Accounting Fundamentals', videoId: 'yYX4bvQSqbo', searchQuery: 'Next Toppers Commerce' }
    ],
    'Coding': [
        { label: 'JavaScript Full Course', videoId: 'PkZNo7MFNFg', searchQuery: 'JavaScript Full Course' },
        { label: 'Python for Beginners', videoId: '_uQrJ0TkZlc', searchQuery: 'Python Full Course' },
        { label: 'HTML & CSS Full Course', videoId: 'G3e-cpL7ofc', searchQuery: 'HTML CSS Full Course' }
    ]
};

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const timerStatusText = document.getElementById('timer-status-text');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const ringProgress = document.getElementById('ring-progress');
const modeBtns = document.querySelectorAll('.mode-btn');

const xpEl = document.getElementById('user-xp');
const streakEl = document.getElementById('streak-count');
const rankEl = document.getElementById('display-rank');

function initApp() {
    applyChromaTheme(State.chroma.h, State.chroma.s, State.chroma.l, false);
    if (State.isPro) enableProVisuals();

    if (!State.user) {
        document.getElementById('onboarding-modal').style.display = 'flex';
    } else {
        document.getElementById('onboarding-modal').style.display = 'none';
        applyUserData();
        connectRealP2PNetwork();
    }

    updateUI();
    renderTasks();
    setupEventListeners();
    setupChromaDial();
    initYouTubeBrowser();
    updateLiveStatsDisplay();
}

// ==========================================
// 1. MULTI-STEP ONBOARDING & IN-APP OTP
// ==========================================
window.nextStep = function(stepNum) {
    document.querySelectorAll('.step-container').forEach(c => c.classList.add('hidden'));
    document.getElementById(`step-${stepNum}`).classList.remove('hidden');
};

window.triggerOTP = function() {
    const code = document.getElementById('input-country-code').value;
    const phone = document.getElementById('input-phone').value.trim();
    const errEl = document.getElementById('otp-error-msg');

    if (phone.length < 6) {
        alert('Please enter a valid mobile number first.');
        return;
    }

    State.generatedOTP = String(Math.floor(1000 + Math.random() * 9000));
    State.isPhoneVerified = false;
    errEl.textContent = '';

    document.getElementById('otp-verify-box').classList.remove('hidden');
    document.getElementById('send-otp-btn').textContent = 'Resend OTP 🔄';

    const toast = document.getElementById('otp-toast');
    document.getElementById('otp-toast-msg').innerHTML = `Code sent to ${code} ${phone}: <span id="otp-toast-code">${State.generatedOTP}</span>`;
    toast.classList.add('show');

    setTimeout(() => toast.classList.remove('show'), 9000);
};

window.verifyAndProceed = function() {
    const entered = document.getElementById('input-otp').value.trim();
    const errEl = document.getElementById('otp-error-msg');

    if (!State.generatedOTP) {
        errEl.textContent = 'Please click "Send OTP Code" first.';
        return;
    }

    if (entered === State.generatedOTP) {
        State.isPhoneVerified = true;
        errEl.textContent = '';
        document.getElementById('otp-toast').classList.remove('show');
        nextStep(3);
    } else {
        errEl.textContent = 'Invalid OTP. Check the code shown at the top!';
    }
};

window.completeOnboarding = function() {
    const name = document.getElementById('input-name').value.trim() || 'Scholar';
    const countryCode = document.getElementById('input-country-code').value;
    const phone = document.getElementById('input-phone').value.trim();
    const email = document.getElementById('input-email').value.trim() || 'student@gmail.com';
    const stream = document.getElementById('input-stream').value;
    const dob = document.getElementById('input-dob').value;
    const studentId = 'VXL-' + Math.floor(100000 + Math.random() * 900000);

    State.user = { name, countryCode, phone, email, stream, dob, studentId };
    localStorage.setItem('vexl_user', JSON.stringify(State.user));

    document.getElementById('onboarding-modal').style.display = 'none';
    applyUserData();
    initYouTubeBrowser();
    connectRealP2PNetwork();
};

function applyUserData() {
    if (!State.user) return;
    const initials = State.user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'VX';
    
    document.getElementById('display-username').textContent = State.user.name;
    document.getElementById('user-avatar-initials').textContent = initials;
    document.getElementById('user-stream-badge').textContent = State.user.stream;
    document.getElementById('topbar-stream-pill').textContent = `Stream: ${State.user.stream}`;
    document.getElementById('chat-room-title').textContent = `${State.user.stream} Lounge`;
    document.getElementById('chat-stream-name').textContent = State.user.stream;

    // Profile Page Fields
    document.getElementById('profile-big-avatar').textContent = initials;
    document.getElementById('profile-full-name').textContent = State.user.name;
    document.getElementById('prof-name').value = State.user.name;
    document.getElementById('prof-country-code').value = State.user.countryCode || '+91';
    document.getElementById('prof-phone').value = State.user.phone || '';
    document.getElementById('prof-email').value = State.user.email || '';
    document.getElementById('prof-stream').value = State.user.stream || 'Class 10 Boards';
    document.getElementById('prof-dob').value = State.user.dob || '';
    document.getElementById('prof-student-id').value = State.user.studentId || 'VXL-884920';
}

document.getElementById('profile-edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    State.user.name = document.getElementById('prof-name').value.trim() || 'Scholar';
    State.user.countryCode = document.getElementById('prof-country-code').value;
    State.user.phone = document.getElementById('prof-phone').value.trim();
    State.user.email = document.getElementById('prof-email').value.trim();
    State.user.stream = document.getElementById('prof-stream').value;
    State.user.dob = document.getElementById('prof-dob').value;

    localStorage.setItem('vexl_user', JSON.stringify(State.user));
    applyUserData();
    initYouTubeBrowser();
    connectRealP2PNetwork();
    alert('✅ Student Profile updated & synced to your new stream!');
});

window.resetAccount = function() {
    if (confirm('Reset your student profile and re-run onboarding?')) {
        localStorage.removeItem('vexl_user');
        location.reload();
    }
};

// ==========================================
// 2. REAL PEOPLE P2P PRESENCE & STREAM CHAT (ZERO BOTS)
// ==========================================
function connectRealP2PNetwork() {
    if (!State.user) return;
    const presenceRoom = gun.get('vexl_focus_v1_online_peers');
    const streamKey = State.user.stream.replace(/\s+/g, '_').toLowerCase();
    const chatRoom = gun.get(`vexl_focus_v1_chat_${streamKey}`);

    // Broadcast this real user's live heartbeat every 5 seconds
    function broadcastPresence() {
        if (!State.user) return;
        presenceRoom.get(State.user.studentId).put({
            id: State.user.studentId,
            name: State.user.name,
            stream: State.user.stream,
            isPro: State.isPro,
            status: State.isRunning ? 'Locked In ⚡' : 'In Study Room',
            joinedAt: State.sessionStartTime,
            lastSeen: Date.now()
        });
    }

    broadcastPresence();
    setInterval(broadcastPresence, 5000);

    // Listen for real active users worldwide
    presenceRoom.map().on((peerData, id) => {
        if (!peerData || !peerData.name || !peerData.lastSeen) return;
        livePeersMap[id] = peerData;
        renderRealOnlinePeers();
    });

    // Refresh peer timers & prune offline users (>25s inactive) every second
    setInterval(renderRealOnlinePeers, 1000);

    // Clear old chat messages when switching streams & subscribe to current stream chat
    const chatBox = document.getElementById('chat-messages-box');
    chatBox.innerHTML = `<div class="chat-system-notice">Connected to <strong>${State.user.stream}</strong> real-time student room. Only real students in your stream can see and reply here!</div>`;
    renderedChatIds.clear();

    chatRoom.map().on((msg, msgId) => {
        if (!msg || !msg.text || renderedChatIds.has(msgId)) return;
        // Only show messages from the last 24 hours
        if (Date.now() - msg.timestamp > 86400000) return;

        renderedChatIds.add(msgId);
        appendChatMessage(msg);
    });

    // Send real message handler
    const chatForm = document.getElementById('chat-form');
    chatForm.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        const msgId = `${State.user.studentId}_${Date.now()}`;
        chatRoom.get(msgId).put({
            senderId: State.user.studentId,
            senderName: State.user.name,
            isPro: State.isPro,
            text: text,
            timestamp: Date.now()
        });

        input.value = '';
    };
}

function renderRealOnlinePeers() {
    const peerList = document.getElementById('peer-list');
    const countEl = document.getElementById('online-peer-count');
    const now = Date.now();

    // Filter only real users active within the last 25 seconds
    const activePeers = Object.values(livePeersMap).filter(p => (now - p.lastSeen) < 25000);
    countEl.textContent = activePeers.length;

    if (activePeers.length === 0) {
        peerList.innerHTML = `<div class="empty-peers-msg">You are the first student online right now. Share your Surge link to study together!</div>`;
        return;
    }

    peerList.innerHTML = activePeers.map(p => {
        const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'ST';
        const elapsedSecs = Math.max(0, Math.floor((now - (p.joinedAt || now)) / 1000));
        const m = Math.floor(elapsedSecs / 60);
        const s = elapsedSecs % 60;
        const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const isMe = State.user && p.id === State.user.studentId;

        const proBadgeHTML = p.isPro ? `
            <span class="pro-sparkle-pill mini">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z"/></svg>
                <span>PRO</span>
            </span>` : '';

        return `
            <div class="peer-item">
                <div class="peer-avatar">${initials}</div>
                <div class="peer-info">
                    <div class="peer-name-line">
                        <strong>${p.name} ${isMe ? '(You)' : ''}</strong>
                        ${proBadgeHTML}
                    </div>
                    <div class="peer-tag">
                        <span>${p.stream}</span>
                        <span class="peer-timer">${timeStr}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function appendChatMessage(msg) {
    const chatBox = document.getElementById('chat-messages-box');
    const isOwn = State.user && msg.senderId === State.user.studentId;
    const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const proBadge = msg.isPro ? `
        <span class="pro-sparkle-pill mini">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z"/></svg>
            <span>PRO</span>
        </span>` : '';

    const div = document.createElement('div');
    div.className = `chat-msg ${isOwn ? 'own' : ''}`;
    div.innerHTML = `
        <div class="chat-msg-meta">
            <span class="chat-msg-author">${escapeHTML(msg.senderName)}</span>
            ${proBadge}
            <span class="chat-msg-time">${timeFormatted}</span>
        </div>
        <div class="chat-msg-text">${escapeHTML(msg.text)}</div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

// ==========================================
// 3. CHROMA DIAL & VEXL+ ANIMATED STARFIELD
// ==========================================
function applyChromaTheme(h, s, l, save = true) {
    const color = `hsl(${h}, ${s}%, ${l}%)`;
    const glow = `hsla(${h}, ${s}%, ${l}%, 0.16)`;

    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', glow);

    const hueSlider = document.getElementById('chroma-hue-slider');
    const satSlider = document.getElementById('chroma-sat-slider');
    const lightSlider = document.getElementById('chroma-light-slider');

    if (hueSlider) hueSlider.value = h;
    if (satSlider) satSlider.value = s;
    if (lightSlider) lightSlider.value = l;

    const hueVal = document.getElementById('hue-val');
    const satVal = document.getElementById('sat-val');
    const lightVal = document.getElementById('light-val');
    if (hueVal) hueVal.textContent = `${h}°`;
    if (satVal) satVal.textContent = `${s}%`;
    if (lightVal) lightVal.textContent = `${l}%`;

    const readout = document.getElementById('chroma-hex-readout');
    if (readout) readout.textContent = `HSL(${h}°, ${s}%, ${l}%)`;

    // Position the knob around the circular wheel
    const knob = document.getElementById('chroma-knob');
    if (knob) {
        const rad = (h - 90) * (Math.PI / 180);
        const radius = 54;
        const cx = 62 + radius * Math.cos(rad);
        const cy = 62 + radius * Math.sin(rad);
        knob.style.left = `${cx}px`;
        knob.style.top = `${cy}px`;
    }

    if (save) {
        State.chroma = { h, s, l };
        localStorage.setItem('vexl_chroma', JSON.stringify(State.chroma));
    }
}

window.applyPresetTheme = function(h, s, l) {
    applyChromaTheme(h, s, l, true);
};

function setupChromaDial() {
    const hueSlider = document.getElementById('chroma-hue-slider');
    const satSlider = document.getElementById('chroma-sat-slider');
    const lightSlider = document.getElementById('chroma-light-slider');
    const wheel = document.getElementById('chroma-wheel');

    function updateFromSliders() {
        applyChromaTheme(parseInt(hueSlider.value), parseInt(satSlider.value), parseInt(lightSlider.value), true);
    }

    hueSlider.addEventListener('input', updateFromSliders);
    satSlider.addEventListener('input', updateFromSliders);
    lightSlider.addEventListener('input', updateFromSliders);

    // Interactive click/drag directly on the circular Chroma Wheel
    let isDraggingWheel = false;
    function handleWheelPointer(e) {
        const rect = wheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
        const roundedHue = Math.round(angle) % 360;
        applyChromaTheme(roundedHue, parseInt(satSlider.value), parseInt(lightSlider.value), true);
    }

    wheel.addEventListener('mousedown', (e) => { isDraggingWheel = true; handleWheelPointer(e); });
    window.addEventListener('mousemove', (e) => { if (isDraggingWheel) handleWheelPointer(e); });
    window.addEventListener('mouseup', () => { isDraggingWheel = false; });
}

function enableProVisuals() {
    State.isPro = true;
    localStorage.setItem('vexl_is_pro', 'true');
    document.body.classList.add('vexl-pro-active');
    document.getElementById('sidebar-pro-badge').classList.remove('hidden');
    document.getElementById('profile-pro-badge').classList.remove('hidden');
    startStarfieldAnimation();
}

let starfieldRunning = false;
function startStarfieldAnimation() {
    if (starfieldRunning) return;
    starfieldRunning = true;

    const canvas = document.getElementById('pro-starfield');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const stars = Array.from({ length: 130 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.3,
        speed: Math.random() * 0.35 + 0.08,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleDir: Math.random() > 0.5 ? 1 : -1
    }));

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Subtle purple cosmic nebula glow
        const grad = ctx.createRadialGradient(width * 0.8, height * 0.15, 20, width * 0.8, height * 0.15, width * 0.6);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        stars.forEach(s => {
            s.y -= s.speed;
            if (s.y < 0) {
                s.y = height;
                s.x = Math.random() * width;
            }
            s.alpha += 0.01 * s.twinkleDir;
            if (s.alpha >= 1 || s.alpha <= 0.15) s.twinkleDir *= -1;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(233, 213, 255, ${s.alpha})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// 4. YOUTUBE STUDY BROWSER
// ==========================================
function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function initYouTubeBrowser() {
    const stream = State.user?.stream || 'Class 10 Boards';
    const presets = StreamPresets[stream] || StreamPresets['Class 10 Boards'];
    const chipsContainer = document.getElementById('quick-chips');

    chipsContainer.innerHTML = presets.map(p => `
        <button type="button" class="chip-btn" onclick="loadEmbedVideo('${p.videoId}', '${p.label.replace(/'/g, "\\'")}', '${p.searchQuery.replace(/'/g, "\\'")}')">
            ▶ ${p.label}
        </button>
    `).join('');

    if (presets.length > 0) {
        loadEmbedVideo(presets[0].videoId, presets[0].label, presets[0].searchQuery);
    }
}

window.loadEmbedVideo = function(videoId, title, searchQuery) {
    const player = document.getElementById('active-yt-player');
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
    document.getElementById('current-video-title').textContent = title;
    
    const extBtn = document.getElementById('yt-external-search');
    if (extBtn && searchQuery) {
        extBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        extBtn.textContent = `Search "${searchQuery}" on YT ↗`;
    }
};

document.getElementById('yt-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('yt-search-input').value.trim();
    if (!input) return;

    const extractedId = extractYouTubeID(input);
    if (extractedId) {
        loadEmbedVideo(extractedId, 'Custom YouTube Lecture Loaded', input);
        document.getElementById('current-channel-tag').textContent = 'Playing directly inside VEXL Distraction-Free Player';
        return;
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(input)}`;
    const extBtn = document.getElementById('yt-external-search');
    extBtn.href = searchUrl;
    extBtn.textContent = `Open "${input}" on YouTube ↗`;
    document.getElementById('current-video-title').textContent = `Search ready: "${input}"`;
    document.getElementById('current-channel-tag').textContent = 'Click "Open on YouTube ↗", copy the lecture link, and paste it here to watch distraction-free!';
    window.open(searchUrl, '_blank');
});

// ==========================================
// 5. TIMER, TASKS, AUDIO & LIVE ANALYTICS
// ==========================================
function toggleTimer() {
    window.vexlAudio.init();
    if (State.isRunning) {
        clearInterval(State.timerId);
        State.isRunning = false;
        startPauseBtn.textContent = 'Resume Session';
        timerStatusText.textContent = 'Paused';
    } else {
        State.isRunning = true;
        startPauseBtn.textContent = 'Pause Session';
        timerStatusText.textContent = 'Locked In ⚡';

        State.timerId = setInterval(() => {
            State.totalSeconds++;
            if (State.totalSeconds % 60 === 0) {
                addXP(10);
                State.history[State.history.length - 1] += 1;
                localStorage.setItem('vexl_history', JSON.stringify(State.history));
            }
            updateLiveStatsDisplay();

            if (State.mode === 'flow') {
                State.timeLeft++;
            } else {
                if (State.timeLeft > 0) {
                    State.timeLeft--;
                } else {
                    completeSession();
                }
            }
            updateTimerDisplay();
            saveState();
        }, 1000);
    }
}

function updateLiveStatsDisplay() {
    const mins = Math.floor(State.totalSeconds / 60);
    const secs = State.totalSeconds % 60;
    const totalEl = document.getElementById('stat-total-time');
    if (totalEl) totalEl.textContent = `${mins}m ${secs}s`;
    const sessEl = document.getElementById('stat-completed-sessions');
    if (sessEl) sessEl.textContent = State.completedSessions;
}

function resetTimer() {
    clearInterval(State.timerId);
    State.isRunning = false;
    State.timeLeft = Durations[State.mode];
    startPauseBtn.textContent = 'Start Session';
    timerStatusText.textContent = 'Ready to Lock In';
    updateTimerDisplay();
}

function setMode(newMode) {
    clearInterval(State.timerId);
    State.isRunning = false;
    State.mode = newMode;
    State.duration = Durations[newMode];
    State.timeLeft = State.duration;
    startPauseBtn.textContent = 'Start Session';
    timerStatusText.textContent = 'Ready to Lock In';

    modeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${newMode}"]`).classList.add('active');
    updateTimerDisplay();
}

function updateTimerDisplay() {
    let mins = Math.floor(State.timeLeft / 60);
    let secs = State.timeLeft % 60;
    timeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (State.mode !== 'flow') {
        const total = Durations[State.mode];
        const progress = total > 0 ? (total - State.timeLeft) / total : 0;
        const circumference = 2 * Math.PI * 125;
        ringProgress.style.strokeDashoffset = circumference - (progress * circumference);
        document.title = `${timeDisplay.textContent} — VEXL. Focus`;
    } else {
        ringProgress.style.strokeDashoffset = 0;
        document.title = `${timeDisplay.textContent} — VEXL. Flow`;
    }
}

function completeSession() {
    clearInterval(State.timerId);
    State.isRunning = false;
    window.vexlAudio.playChime();
    State.completedSessions++;
    addXP(150);
    saveState();
    updateLiveStatsDisplay();
    alert('🎉 Focus session completed! +150 XP Awarded.');
    resetTimer();
}

function addXP(amount) {
    State.xp += amount;
    xpEl.textContent = State.xp;
    localStorage.setItem('vexl_xp', State.xp);
    updateRank();
}

function updateRank() {
    let rank = 'Lvl 1 • Initiate';
    if (State.xp > 500) rank = 'Lvl 3 • Locked In';
    if (State.xp > 1500) rank = 'Lvl 6 • Flow Architect';
    if (State.xp > 4000) rank = 'Lvl 10 • VEXL Elite';
    rankEl.textContent = rank;
    const profRank = document.getElementById('profile-rank-text');
    if (profRank) profRank.textContent = `${rank} • VEXL Focus Member`;
}

// Task Checklist
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');

function renderTasks() {
    taskList.innerHTML = '';
    const completedCount = State.tasks.filter(t => t.completed).length;
    taskCounter.textContent = `${completedCount}/${State.tasks.length}`;

    State.tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <span onclick="toggleTask(${index})" style="cursor:pointer; flex:1;">${escapeHTML(task.text)}</span>
            <button class="task-delete" onclick="deleteTask(${index})">×</button>
        `;
        taskList.appendChild(li);
    });
    localStorage.setItem('vexl_tasks', JSON.stringify(State.tasks));
}

window.toggleTask = function(index) {
    State.tasks[index].completed = !State.tasks[index].completed;
    if (State.tasks[index].completed) addXP(25);
    renderTasks();
};

window.deleteTask = function(index) {
    State.tasks.splice(index, 1);
    renderTasks();
};

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (text) {
        State.tasks.push({ text, completed: false });
        taskInput.value = '';
        renderTasks();
    }
});

// Audio Controls
function setupAudioControls() {
    ['rain', 'noise', 'vinyl', 'library'].forEach(track => {
        const slider = document.getElementById(`range-${track}`);
        const valLabel = document.getElementById(`val-${track}`);
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            valLabel.textContent = `${val}%`;
            window.vexlAudio.setVolume(track, val);
        });
    });

    document.getElementById('audio-master-btn').addEventListener('click', () => {
        window.vexlAudio.muteAll();
        ['rain', 'noise', 'vinyl', 'library'].forEach(track => {
            document.getElementById(`range-${track}`).value = 0;
            document.getElementById(`val-${track}`).textContent = '0%';
        });
    });
}

// Analytics Chart
function drawChart() {
    const canvas = document.getElementById('focus-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = State.history;
    const maxVal = Math.max(...data, 60);
    const barWidth = 50;
    const gap = 30;
    const startX = 40;

    data.forEach((val, i) => {
        const barHeight = Math.max((val / maxVal) * 160, 4);
        const x = startX + i * (barWidth + gap);
        const y = height - barHeight - 30;
        ctx.fillStyle = i === data.length - 1 ? '#10B981' : '#27272A';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#A1A1AA';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText(i === data.length - 1 ? 'Today' : `Day ${i+1}`, x + 4, height - 10);
    });

    updateLiveStatsDisplay();
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    const navBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (navBtn) navBtn.classList.add('active');
    
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add('active');
    if (tabName === 'analytics') drawChart();
};

function setupEventListeners() {
    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    modeBtns.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    const proModal = document.getElementById('pro-modal');
    document.getElementById('open-pro-modal').addEventListener('click', () => proModal.classList.add('active'));
    document.getElementById('close-pro-modal').addEventListener('click', () => proModal.classList.remove('active'));
    document.getElementById('upgrade-btn').addEventListener('click', () => {
        enableProVisuals();
        proModal.classList.remove('active');
    });

    setupAudioControls();
}

function updateUI() {
    xpEl.textContent = State.xp;
    streakEl.textContent = State.streak;
    updateRank();
}

function saveState() {
    localStorage.setItem('vexl_xp', State.xp);
    localStorage.setItem('vexl_streak', State.streak);
    localStorage.setItem('vexl_total_seconds', State.totalSeconds);
    localStorage.setItem('vexl_sessions', State.completedSessions);
}

window.addEventListener('DOMContentLoaded', initApp);