import { auth, db, isEmulatorMode } from './firebase-config.js?v=2';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Sport Configs & Field Formations
export const SPORT_REGISTRY = {
  football: { name: 'Football', emoji: '⚽', defaultFormat: '5v5', maxPlayers: 10, positions: [
    { id: 'gk_a', label: 'Goalkeeper', shortLabel: 'GK', team: 1 },
    { id: 'df_a1', label: 'Defender', shortLabel: 'DF', team: 1 },
    { id: 'df_a2', label: 'Defender', shortLabel: 'DF', team: 1 },
    { id: 'mf_a', label: 'Midfielder', shortLabel: 'MF', team: 1 },
    { id: 'st_a', label: 'Striker', shortLabel: 'ST', team: 1 },
    { id: 'gk_b', label: 'Goalkeeper', shortLabel: 'GK', team: 2 },
    { id: 'df_b1', label: 'Defender', shortLabel: 'DF', team: 2 },
    { id: 'df_b2', label: 'Defender', shortLabel: 'DF', team: 2 },
    { id: 'mf_b', label: 'Midfielder', shortLabel: 'MF', team: 2 },
    { id: 'st_b', label: 'Striker', shortLabel: 'ST', team: 2 }
  ]},
  basketball: { name: 'Basketball', emoji: '🏀', defaultFormat: '3v3', maxPlayers: 6, positions: [
    { id: 'g_a1', label: 'Guard', shortLabel: 'PG', team: 1 },
    { id: 'g_a2', label: 'Guard', shortLabel: 'SG', team: 1 },
    { id: 'c_a', label: 'Center', shortLabel: 'C', team: 1 },
    { id: 'g_b1', label: 'Guard', shortLabel: 'PG', team: 2 },
    { id: 'g_b2', label: 'Guard', shortLabel: 'SG', team: 2 },
    { id: 'c_b', label: 'Center', shortLabel: 'C', team: 2 }
  ]},
  tennis: { name: 'Tennis', emoji: '🎾', defaultFormat: 'singles', maxPlayers: 2, positions: [
    { id: 'p_a', label: 'Player A', shortLabel: 'P1', team: 1 },
    { id: 'p_b', label: 'Player B', shortLabel: 'P2', team: 2 }
  ]},
  padel: { name: 'Padel', emoji: '🎾', defaultFormat: 'doubles', maxPlayers: 4, positions: [
    { id: 'p_a1', label: 'Player A1', shortLabel: 'A1', team: 1 },
    { id: 'p_a2', label: 'Player A2', shortLabel: 'A2', team: 1 },
    { id: 'p_b1', label: 'Player B1', shortLabel: 'B1', team: 2 },
    { id: 'p_b2', label: 'Player B2', shortLabel: 'B2', team: 2 }
  ]},
  volleyball: { name: 'Volleyball', emoji: '🏐', defaultFormat: '4v4', maxPlayers: 8, positions: [
    { id: 'v_a1', label: 'Setter', shortLabel: 'S', team: 1 },
    { id: 'v_a2', label: 'Hitter', shortLabel: 'OH', team: 1 },
    { id: 'v_a3', label: 'Middle', shortLabel: 'MB', team: 1 },
    { id: 'v_a4', label: 'Libero', shortLabel: 'L', team: 1 },
    { id: 'v_b1', label: 'Setter', shortLabel: 'S', team: 2 },
    { id: 'v_b2', label: 'Hitter', shortLabel: 'OH', team: 2 },
    { id: 'v_b3', label: 'Middle', shortLabel: 'MB', team: 2 },
    { id: 'v_b4', label: 'Libero', shortLabel: 'L', team: 2 }
  ]},
  badminton: { name: 'Badminton', emoji: '🏸', defaultFormat: 'doubles', maxPlayers: 4, positions: [
    { id: 'b_a1', label: 'Team A1', shortLabel: 'A1', team: 1 },
    { id: 'b_a2', label: 'Team A2', shortLabel: 'A2', team: 1 },
    { id: 'b_b1', label: 'Team B1', shortLabel: 'B1', team: 2 },
    { id: 'b_b2', label: 'Team B2', shortLabel: 'B2', team: 2 }
  ]},
  running: { name: 'Running', emoji: '🏃', defaultFormat: 'group', maxPlayers: 20, positions: [] },
  custom: { name: 'Other Sport', emoji: '🏅', defaultFormat: 'custom', maxPlayers: 10, positions: [] }
};

// Application State
export const state = {
  currentUser: null,
  userProfile: null,
  activeTab: 'explore', // 'explore' | 'my-games' | 'organize' | 'detail'
  currentSessionId: null,
  currentSession: null,
  positions: [],
  waitingList: [],
  gamesList: [],
  selectedSportFilter: 'all',
  activeListeners: [],
  wizardStep: 1,
  wizardDraft: {
    sportType: 'football',
    sportFormat: '5v5',
    title: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '18:00',
    durationMinutes: 90,
    locationName: '',
    locationUrl: '',
    maxPlayers: 10,
    isPublic: true,
    notes: ''
  }
};

// UI Notifications
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Router & Deep Link Parser
export function initRouter() {
  const handleRoute = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || sessionStorage.getItem('sitbit_redirect_target');
    
    let path = window.location.pathname;
    if (redirect) {
      sessionStorage.removeItem('sitbit_redirect_target');
      window.history.replaceState(null, '', redirect);
      path = redirect.split('?')[0];
    }

    if (path.includes('/group-sessions/') || path.includes('/session/') || path.includes('/invite/')) {
      const parts = path.split('/');
      const sessionId = parts[parts.length - 1] || parts[parts.length - 2];
      if (sessionId && sessionId !== 'group-sessions') {
        openSessionDetail(sessionId);
        return;
      }
    }

    if (path === '/organize') {
      switchTab('organize');
    } else if (path === '/my-games') {
      switchTab('my-games');
    } else {
      switchTab('explore');
    }
  };

  window.addEventListener('popstate', handleRoute);
  handleRoute();
}

export function navigateTo(path) {
  window.history.pushState(null, '', path);
  initRouter();
}

// Tab Switching
export function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.play-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  const appView = document.getElementById('play-app-view');
  if (!appView) return;

  if (tabName === 'explore') {
    renderExploreView();
  } else if (tabName === 'my-games') {
    renderMyGamesView();
  } else if (tabName === 'organize') {
    renderOrganizeView();
  } else if (tabName === 'detail') {
    // rendered directly by openSessionDetail
  }
}

// Authentication Handlers
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    state.currentUser = user;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          state.userProfile = userSnap.data();
        } else {
          // Initialize user profile compatible with Flutter app
          const defaultProfile = {
            displayName: user.displayName || 'Player',
            name: user.displayName || 'Player',
            firstName: (user.displayName || 'Player').split(' ')[0],
            email: user.email,
            avatarUrl: user.photoURL || null,
            level: 1,
            skillScore: 100,
            motmCount: 0,
            currentXp: 50,
            selfRatedSkill: 3,
            preferredPosition: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, defaultProfile, { merge: true });
          state.userProfile = defaultProfile;
        }
      } catch (err) {
        console.warn('Profile hydration error:', err);
      }
    } else {
      state.userProfile = null;
    }
    updateAuthUI();
    if (state.activeTab === 'explore') initDiscoveryFeed();
    if (state.activeTab === 'my-games') renderMyGamesView();
    if (state.activeTab === 'detail' && state.currentSessionId) {
      renderDetailView();
    }
  });
}

function updateAuthUI() {
  const container = document.getElementById('auth-pill-container');
  if (!container) return;

  if (state.currentUser) {
    const name = state.userProfile?.displayName || state.currentUser.displayName || 'Player';
    const avatar = state.userProfile?.avatarUrl || state.currentUser.photoURL;
    container.innerHTML = `
      <div class="user-status-pill">
        <div class="user-avatar-badge">
          ${avatar ? `<img src="${avatar}" alt="${name}">` : name.charAt(0).toUpperCase()}
        </div>
        <span>${escapeHtml(name)}</span>
        <button id="signout-btn" class="btn btn-outline" style="min-height:30px; padding:4px 10px; font-size:12px; margin-left:6px;">Sign Out</button>
      </div>
    `;
    document.getElementById('signout-btn')?.addEventListener('click', () => {
      signOut(auth).then(() => showToast('Signed out successfully'));
    });
  } else {
    container.innerHTML = `
      <button id="auth-modal-btn" class="btn btn-primary" style="min-height:38px; padding:8px 16px; font-size:13px;">
        Sign In / Join
      </button>
    `;
    document.getElementById('auth-modal-btn')?.addEventListener('click', () => openAuthModal());
  }
}

// Authentication Modal Dialog
export function openAuthModal(onSuccessCallback = null) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const form = document.getElementById('auth-form');
  const toggleBtn = document.getElementById('auth-toggle-mode');
  const googleBtn = document.getElementById('auth-google-btn');
  let isSignUp = false;

  const updateMode = () => {
    document.getElementById('auth-modal-title').textContent = isSignUp ? 'Create SitBit Account' : 'Sign In to SitBit';
    document.getElementById('auth-submit-btn').textContent = isSignUp ? 'Create Account' : 'Sign In';
    document.getElementById('signup-fields').style.display = isSignUp ? 'block' : 'none';
    toggleBtn.textContent = isSignUp ? 'Already have an account? Sign In' : 'New to SitBit? Create Account';
  };
  updateMode();

  toggleBtn.onclick = (e) => {
    if (e) e.preventDefault();
    isSignUp = !isSignUp;
    updateMode();
  };

  googleBtn.onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      closeModal('auth-modal');
      showToast('Signed in with Google!');
      if (onSuccessCallback) onSuccessCallback();
    } catch (e) {
      showToast(e.message || 'Google sign in failed', 'danger');
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const displayName = document.getElementById('auth-name')?.value.trim() || 'Player';
    const submitBtn = document.getElementById('auth-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName,
          name: displayName,
          firstName: displayName.split(' ')[0],
          email,
          level: 1,
          skillScore: 100,
          currentXp: 50,
          createdAt: serverTimestamp()
        }, { merge: true });
        showToast('Account created!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Signed in successfully!');
      }
      closeModal('auth-modal');
      if (onSuccessCallback) onSuccessCallback();
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
    }
  };
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

// ─── EXPLORE / DISCOVERY VIEW ────────────────────────────────────────────────
export function renderExploreView() {
  const container = document.getElementById('play-app-view');
  if (!container) return;

  container.innerHTML = `
    <div class="discovery-header">
      <div class="discovery-title-row">
        <div>
          <h2>Explore Local Games</h2>
          <p style="color:var(--muted); font-size:14px; margin-top:4px;">Browse and join open games organized by your community.</p>
        </div>
        <button id="quick-create-btn" class="btn btn-primary" style="min-height:42px; padding:8px 18px; font-size:14px;">
          + Organize Game
        </button>
      </div>
      <div class="sport-filter-scroll" id="sport-filter-bar">
        <button class="sport-chip ${state.selectedSportFilter === 'all' ? 'active' : ''}" data-sport="all">All Sports</button>
        ${Object.entries(SPORT_REGISTRY).map(([k, s]) => `
          <button class="sport-chip ${state.selectedSportFilter === k ? 'active' : ''}" data-sport="${k}">
            ${s.emoji} ${s.name}
          </button>
        `).join('')}
      </div>
    </div>
    <div id="games-grid" class="games-grid">
      <div style="text-align:center; padding:40px; color:var(--muted); grid-column:1/-1;">
        Loading active sessions...
      </div>
    </div>
  `;

  document.getElementById('quick-create-btn')?.addEventListener('click', () => {
    switchTab('organize');
  });

  document.querySelectorAll('.sport-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedSportFilter = btn.dataset.sport;
      document.querySelectorAll('.sport-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      filterAndRenderGames();
    });
  });

  // Listen to open public sessions
  clearActiveListeners();

  if (!state.currentUser) {
    const grid = document.getElementById('games-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="text-align:center; padding:48px 20px; background:var(--paper-card); border-radius:var(--radius-lg); border:1px solid var(--border); grid-column:1/-1;">
          <div style="font-size:36px; margin-bottom:12px;">⚽ 🏀 🎾</div>
          <h3 style="font-size:18px; font-weight:800; margin-bottom:8px;">Sign in to Explore Local Games</h3>
          <p style="color:var(--muted); font-size:14px; margin-bottom:20px; max-width:440px; margin-left:auto; margin-right:auto;">
            Join SitBit Play to discover upcoming matches, claim your tactical spot on the field, and organize games with players near you.
          </p>
          <button id="discovery-signin-btn" class="btn btn-primary" style="padding:10px 24px; font-size:14px;">Sign In / Join</button>
        </div>
      `;
      document.getElementById('discovery-signin-btn')?.addEventListener('click', () => openAuthModal());
    }
    return;
  }

  try {
    const q = query(
      collection(db, 'group_sessions'),
      where('isPublic', '==', true),
      where('status', 'in', ['open', 'inProgress']),
      limit(40)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      state.gamesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isPublic !== false); // enforce public-only in discovery
      filterAndRenderGames();
    }, (err) => {
      console.warn('Discovery query error:', err);
      const grid = document.getElementById('games-grid');
      if (grid) {
        grid.innerHTML = `
          <div style="text-align:center; padding:40px; color:var(--danger); grid-column:1/-1;">
            Failed to load games. Please check your network or sign in.
          </div>
        `;
      }
    });
    state.activeListeners.push(unsubscribe);
  } catch (err) {
    console.warn('Failed to query sessions:', err);
  }
}

function filterAndRenderGames() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  let filtered = state.gamesList;
  if (state.selectedSportFilter !== 'all') {
    filtered = filtered.filter(g => (g.sportType || 'custom') === state.selectedSportFilter);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding:60px 20px; background:var(--paper-card); border-radius:var(--radius-lg); border:1px solid var(--border); grid-column:1/-1;">
        <span style="font-size:36px; display:block; margin-bottom:12px;">🏃</span>
        <h3 style="font-size:18px; font-weight:800; margin-bottom:6px;">No games scheduled yet</h3>
        <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">Be the first to organize a session for your team!</p>
        <button id="empty-create-btn" class="btn btn-primary" style="min-height:42px;">Organize First Game</button>
      </div>
    `;
    document.getElementById('empty-create-btn')?.addEventListener('click', () => switchTab('organize'));
    return;
  }

  grid.innerHTML = filtered.map(game => {
    const sportInfo = SPORT_REGISTRY[game.sportType] || SPORT_REGISTRY.custom;
    const participants = game.participants || [];
    const confirmedCount = participants.filter(p => p.confirmed).length;
    const maxPlayers = game.maxPlayers || 10;
    const isFull = confirmedCount >= maxPlayers;
    const progressPercent = Math.min(100, Math.round((confirmedCount / maxPlayers) * 100));

    let dateDisplay = game.startTime || '18:00';
    if (game.date) {
      const d = game.date.toDate ? game.date.toDate() : new Date(game.date);
      dateDisplay = `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${game.startTime || '18:00'}`;
    }

    return `
      <div class="game-card" data-session-id="${game.id}">
        <div class="game-card-top">
          <span class="sport-badge">${sportInfo.emoji} ${sportInfo.name} ${game.sportFormat ? `• ${game.sportFormat}` : ''}</span>
          <span class="status-badge ${isFull ? 'status-full' : 'status-open'}">
            ${isFull ? 'Full / Waitlist' : 'Spots Open'}
          </span>
        </div>
        <h3 class="game-card-title">${escapeHtml(game.title || `${sportInfo.name} Game`)}</h3>
        <div class="game-card-info">
          <div class="info-line"><span>📅</span> ${dateDisplay} (${game.durationMinutes || 90}m)</div>
          <div class="info-line"><span>📍</span> ${escapeHtml(game.locationName || 'Local Venue')}</div>
          <div class="info-line"><span>👑</span> Organized by ${escapeHtml(game.organizerName || 'Coach')}</div>
        </div>
        <div class="capacity-meter">
          <span style="font-size:13px; font-weight:700; color:var(--ink);">
            ${confirmedCount}/${maxPlayers} Players
          </span>
          <div class="progress-track">
            <div class="progress-bar-fill" style="width:${progressPercent}%;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const sid = card.dataset.sessionId;
      navigateTo(`/group-sessions/${sid}`);
    });
  });
}

// ─── GAME DETAIL VIEW ────────────────────────────────────────────────────────
export function openSessionDetail(sessionId) {
  state.currentSessionId = sessionId;
  state.activeTab = 'detail';
  clearActiveListeners();

  // Listen to the session document
  const sessionRef = doc(db, 'group_sessions', sessionId);
  const unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      renderNotFoundGame(sessionId);
      return;
    }
    state.currentSession = { id: snap.id, ...snap.data() };
    renderDetailView();
  }, (err) => {
    console.warn('Session detail listen error:', err);
    showToast('Failed to load session details', 'danger');
  });
  state.activeListeners.push(unsubSession);

  // Listen to field positions
  const posRef = collection(db, 'group_sessions', sessionId, 'field_positions');
  const unsubPos = onSnapshot(posRef, (snap) => {
    state.positions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFieldPositions();
  });
  state.activeListeners.push(unsubPos);

  // Listen to waiting list
  const waitRef = collection(db, 'group_sessions', sessionId, 'waiting_list');
  const unsubWait = onSnapshot(waitRef, (snap) => {
    state.waitingList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderWaitingList();
  });
  state.activeListeners.push(unsubWait);
}

function renderDetailView() {
  const container = document.getElementById('play-app-view');
  if (!container || !state.currentSession) return;
  const session = state.currentSession;
  const uid = state.currentUser?.uid;

  const sportInfo = SPORT_REGISTRY[session.sportType] || SPORT_REGISTRY.custom;
  const participants = session.participants || [];
  const isJoined = uid && participants.some(p => p.uid === uid && p.confirmed);
  const isOrganizer = uid && session.creatorUid === uid;
  const isFull = participants.filter(p => p.confirmed).length >= (session.maxPlayers || 10);
  const isOnWaitlist = uid && state.waitingList.some(w => w.uid === uid);

  let dateDisplay = session.startTime || '18:00';
  if (session.date) {
    const d = session.date.toDate ? session.date.toDate() : new Date(session.date);
    dateDisplay = `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${session.startTime || '18:00'}`;
  }

  container.innerHTML = `
    <div class="game-detail-panel">
      <button id="detail-back-btn" class="back-btn">← Back to Explore</button>
      
      <div class="detail-header-row">
        <div>
          <span class="sport-badge" style="margin-bottom:8px;">${sportInfo.emoji} ${sportInfo.name} ${session.sportFormat ? `• ${session.sportFormat}` : ''}</span>
          <h1 class="detail-title">${escapeHtml(session.title || `${sportInfo.name} Game`)}</h1>
          <div class="detail-meta-strip">
            <span>📅 ${dateDisplay} (${session.durationMinutes || 90} mins)</span>
            <span>📍 ${escapeHtml(session.locationName || 'Local Venue')}</span>
            <span>👥 ${participants.length}/${session.maxPlayers || 10} Confirmed</span>
            ${!session.isPublic ? '<span style="color:var(--warning); font-weight:700;">🔒 Invite-Only</span>' : ''}
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="share-game-btn" class="btn btn-outline" style="min-height:42px; padding:8px 16px;">
            🔗 Share Game
          </button>
          ${isOrganizer ? `
            <button id="cancel-game-btn" class="btn btn-outline" style="min-height:42px; padding:8px 16px; color:var(--danger); border-color:var(--danger-soft);">
              Cancel Game
            </button>
          ` : ''}
        </div>
      </div>

      <div class="detail-actions-bar">
        ${!uid ? `
          <button id="detail-auth-join-btn" class="btn btn-primary" style="min-height:46px;">
            Sign in to Join Game
          </button>
          <span style="align-self:center; font-size:13px; color:var(--muted);">You can preview the game details before signing in.</span>
        ` : isJoined ? `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="color:var(--success); font-weight:800; font-size:15px;">✓ You are Confirmed for this Game</span>
            <button id="leave-game-btn" class="btn btn-outline" style="min-height:40px; padding:8px 16px; color:var(--danger);">
              Leave Game
            </button>
          </div>
        ` : isOnWaitlist ? `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="color:var(--warning); font-weight:800; font-size:15px;">⏳ You are on the Waiting List</span>
            <button id="leave-waitlist-btn" class="btn btn-outline" style="min-height:40px; padding:8px 16px;">
              Leave Waiting List
            </button>
          </div>
        ` : isFull ? `
          <button id="join-waitlist-btn" class="btn btn-gold" style="min-height:46px;">
            Join Waiting List
          </button>
          <span style="align-self:center; font-size:13px; color:var(--muted);">Game is currently full. If a player leaves, you'll be promoted automatically.</span>
        ` : `
          <button id="join-game-btn" class="btn btn-primary" style="min-height:46px;">
            Join Game Now
          </button>
          <span style="align-self:center; font-size:13px; color:var(--muted);">Open spots available! Join and pick your field position.</span>
        `}
      </div>

      <!-- Tactical Field Visualization -->
      <div class="pitch-container">
        <div style="display:flex; justify-content:space-between; align-items:center; color:#fff; margin-bottom:12px;">
          <h3 style="font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px;">Field Lineup & Positions</h3>
          <span style="font-size:12px; opacity:0.85;">Tap an empty spot to claim your position</span>
        </div>
        <div class="pitch-surface" id="tactical-pitch-surface">
          <!-- Rendered by renderFieldPositions -->
        </div>
      </div>

      <!-- Participant Roster & Waiting List -->
      <div class="roster-section">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:12px;">Confirmed Lineup (${participants.length})</h3>
        <div class="roster-list" id="confirmed-roster-list">
          ${participants.map(p => `
            <div class="player-row-card">
              <div class="user-avatar-badge" style="width:36px; height:36px; font-size:15px;">
                ${p.avatarUrl ? `<img src="${p.avatarUrl}" alt="${p.displayName}">` : p.displayName.charAt(0).toUpperCase()}
              </div>
              <div class="player-details-col">
                <div class="player-name-text">${escapeHtml(p.displayName)} ${p.isCaptain ? '👑' : ''}</div>
                <div class="player-subtag">${p.positionLabel ? `${p.positionLabel} • ` : ''}${p.teamNumber ? `Team ${p.teamNumber === 1 ? 'A' : 'B'}` : 'Player'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="roster-section" style="margin-top:24px;" id="waiting-list-section">
        <!-- Rendered by renderWaitingList -->
      </div>
    </div>
  `;

  document.getElementById('detail-back-btn')?.addEventListener('click', () => {
    navigateTo('/');
  });

  document.getElementById('share-game-btn')?.addEventListener('click', () => {
    const canonicalUrl = `${window.location.origin}/group-sessions/${session.id}`;
    navigator.clipboard.writeText(canonicalUrl).then(() => {
      showToast('Game link copied to clipboard!');
    }).catch(() => {
      prompt('Share this link with your team:', canonicalUrl);
    });
  });

  document.getElementById('detail-auth-join-btn')?.addEventListener('click', () => {
    openAuthModal(() => renderDetailView());
  });

  document.getElementById('join-game-btn')?.addEventListener('click', () => handleJoinGame());
  document.getElementById('leave-game-btn')?.addEventListener('click', () => handleLeaveGame());
  document.getElementById('join-waitlist-btn')?.addEventListener('click', () => handleJoinWaitlist());
  document.getElementById('leave-waitlist-btn')?.addEventListener('click', () => handleLeaveWaitlist());
  document.getElementById('cancel-game-btn')?.addEventListener('click', () => handleCancelGame());

  renderFieldPositions();
  renderWaitingList();
}

function renderFieldPositions() {
  const surface = document.getElementById('tactical-pitch-surface');
  if (!surface) return;
  const session = state.currentSession;
  if (!session) return;
  const uid = state.currentUser?.uid;
  const positions = state.positions;

  if (positions.length === 0) {
    surface.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.7); font-size:14px;">
        No designated positions for this activity. Players can join the roster directly.
      </div>
    `;
    return;
  }

  const team1 = positions.filter(p => (p.team || 1) === 1);
  const team2 = positions.filter(p => (p.team || 1) === 2);

  surface.innerHTML = `
    <div class="team-half">
      <div class="team-half-header">${escapeHtml(session.teamAName || 'Team A')}</div>
      <div class="position-spots-layout">
        ${team1.map(pos => renderPositionCard(pos, uid)).join('')}
      </div>
    </div>
    <div class="team-half">
      <div class="team-half-header">${escapeHtml(session.teamBName || 'Team B')}</div>
      <div class="position-spots-layout">
        ${team2.map(pos => renderPositionCard(pos, uid)).join('')}
      </div>
    </div>
  `;

  surface.querySelectorAll('.position-spot-card').forEach(spot => {
    spot.addEventListener('click', () => {
      const posId = spot.dataset.posId;
      handlePositionClick(posId);
    });
  });
}

function renderPositionCard(pos, uid) {
  const isClaimed = !!pos.claimedByUserId;
  const isMine = uid && pos.claimedByUserId === uid;
  let statusClass = '';
  if (isMine) statusClass = 'claimed-by-me';
  else if (isClaimed) statusClass = 'claimed-by-other';

  return `
    <div class="position-spot-card ${statusClass}" data-pos-id="${pos.id}">
      <div class="spot-pos-code">${escapeHtml(pos.shortLabel || pos.label || 'SPOT')}</div>
      <div class="spot-player-name">
        ${isMine ? '★ You' : isClaimed ? escapeHtml(pos.claimedByDisplayName || 'Claimed') : '+ Claim Spot'}
      </div>
    </div>
  `;
}

function renderWaitingList() {
  const section = document.getElementById('waiting-list-section');
  if (!section) return;
  if (state.waitingList.length === 0) {
    section.innerHTML = '';
    return;
  }

  section.innerHTML = `
    <h3 style="font-size:16px; font-weight:800; color:var(--warning); margin-bottom:8px;">
      Waiting List (${state.waitingList.length})
    </h3>
    <div class="roster-list">
      ${state.waitingList.map((w, idx) => `
        <div class="player-row-card" style="border-left:4px solid var(--warning);">
          <div style="font-weight:800; font-size:13px; color:var(--warning); width:20px;">#${idx + 1}</div>
          <div class="player-details-col">
            <div class="player-name-text">${escapeHtml(w.displayName)}</div>
            <div class="player-subtag">Awaiting open spot</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── PLAY CONCURRENCY & TRANSACTION HANDLERS ─────────────────────────────────

async function handleJoinGame() {
  if (!state.currentUser) {
    openAuthModal(() => handleJoinGame());
    return;
  }
  const session = state.currentSession;
  if (!session) return;
  const uid = state.currentUser.uid;
  const displayName = state.userProfile?.displayName || state.currentUser.displayName || 'Player';
  const avatarUrl = state.userProfile?.avatarUrl || state.currentUser.photoURL || null;

  try {
    await runTransaction(db, async (txn) => {
      const docRef = doc(db, 'group_sessions', session.id);
      const snap = await txn.get(docRef);
      if (!snap.exists()) throw new Error('Session not found');

      const data = snap.data();
      const participants = data.participants || [];
      if (participants.some(p => p.uid === uid)) {
        throw new Error('You have already joined this session');
      }

      const maxPlayers = data.maxPlayers || 10;
      if (participants.length >= maxPlayers) {
        // Automatically place on waitlist
        const waitRef = doc(db, 'group_sessions', session.id, 'waiting_list', uid);
        txn.set(waitRef, {
          uid,
          displayName,
          avatarUrl,
          status: 'waiting',
          joinedAt: serverTimestamp()
        });
        showToast('Session reached capacity — added to waiting list!', 'warning');
        return;
      }

      const newParticipant = {
        uid,
        displayName,
        avatarUrl,
        confirmed: true,
        participantType: 'registered',
        joinedAt: new Date()
      };

      const updatedParticipants = [...participants, newParticipant];
      const updatedUids = [...(data.participantUids || []), uid];

      txn.update(docRef, {
        participants: updatedParticipants,
        participantUids: updatedUids,
        updatedAt: serverTimestamp()
      });
    });

    showToast('Successfully joined the game! 🎉', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to join game', 'danger');
  }
}

async function handleLeaveGame() {
  if (!confirm('Are you sure you want to leave this game? Your spot will be released.')) return;
  const session = state.currentSession;
  if (!session || !state.currentUser) return;
  const uid = state.currentUser.uid;

  try {
    await runTransaction(db, async (txn) => {
      const docRef = doc(db, 'group_sessions', session.id);
      const snap = await txn.get(docRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const participants = (data.participants || []).filter(p => p.uid !== uid);
      const uids = (data.participantUids || []).filter(id => id !== uid);

      txn.update(docRef, {
        participants,
        participantUids: uids,
        updatedAt: serverTimestamp()
      });
    });

    // Release any position claimed by caller
    const myPos = state.positions.find(p => p.claimedByUserId === uid);
    if (myPos) {
      await updateDoc(doc(db, 'group_sessions', session.id, 'field_positions', myPos.id), {
        claimedByUserId: null,
        claimedByDisplayName: null,
        claimedAt: null
      });
    }

    // Auto-promote earliest waitlisted player if available
    if (state.waitingList.length > 0) {
      const first = state.waitingList[0];
      await deleteDoc(doc(db, 'group_sessions', session.id, 'waiting_list', first.uid));
      await updateDoc(doc(db, 'group_sessions', session.id), {
        participants: [...session.participants.filter(p => p.uid !== uid), {
          uid: first.uid,
          displayName: first.displayName,
          avatarUrl: first.avatarUrl || null,
          confirmed: true,
          participantType: 'registered',
          joinedAt: new Date()
        }],
        participantUids: [...session.participantUids.filter(id => id !== uid), first.uid],
        updatedAt: serverTimestamp()
      });
    }

    showToast('You have left the game');
  } catch (err) {
    showToast(err.message || 'Failed to leave game', 'danger');
  }
}

async function handlePositionClick(posId) {
  if (!state.currentUser) {
    openAuthModal();
    return;
  }
  const session = state.currentSession;
  if (!session) return;
  const uid = state.currentUser.uid;
  const participants = session.participants || [];
  if (!participants.some(p => p.uid === uid && p.confirmed)) {
    showToast('You must join the game before claiming a field position!', 'warning');
    return;
  }

  const pos = state.positions.find(p => p.id === posId);
  if (!pos) return;

  const posRef = doc(db, 'group_sessions', session.id, 'field_positions', posId);

  if (pos.claimedByUserId === uid) {
    // Release own spot
    await updateDoc(posRef, {
      claimedByUserId: null,
      claimedByDisplayName: null,
      claimedAt: null
    });
    showToast('Released position');
  } else if (!pos.claimedByUserId || session.creatorUid === uid) {
    // Release previous spot if any
    const existing = state.positions.find(p => p.claimedByUserId === uid);
    if (existing) {
      await updateDoc(doc(db, 'group_sessions', session.id, 'field_positions', existing.id), {
        claimedByUserId: null,
        claimedByDisplayName: null,
        claimedAt: null
      });
    }
    // Claim new spot
    await updateDoc(posRef, {
      claimedByUserId: uid,
      claimedByDisplayName: state.userProfile?.displayName || state.currentUser.displayName || 'Player',
      claimedAt: serverTimestamp()
    });
    showToast(`Claimed ${pos.label}!`);
  } else {
    showToast('This position is already taken by another player!', 'warning');
  }
}

async function handleJoinWaitlist() {
  if (!state.currentUser) {
    openAuthModal(() => handleJoinWaitlist());
    return;
  }
  const session = state.currentSession;
  if (!session) return;
  const uid = state.currentUser.uid;
  const displayName = state.userProfile?.displayName || state.currentUser.displayName || 'Player';

  try {
    const waitRef = doc(db, 'group_sessions', session.id, 'waiting_list', uid);
    await setDoc(waitRef, {
      uid,
      displayName,
      status: 'waiting',
      joinedAt: serverTimestamp()
    });
    showToast('Added to waiting list!');
  } catch (err) {
    showToast(err.message || 'Failed to join waiting list', 'danger');
  }
}

async function handleLeaveWaitlist() {
  const session = state.currentSession;
  if (!session || !state.currentUser) return;
  const uid = state.currentUser.uid;

  try {
    await deleteDoc(doc(db, 'group_sessions', session.id, 'waiting_list', uid));
    showToast('Removed from waiting list');
  } catch (err) {
    showToast(err.message || 'Failed to leave waitlist', 'danger');
  }
}

async function handleCancelGame() {
  if (!confirm('Are you sure you want to CANCEL this game session? All participants will be notified.')) return;
  const session = state.currentSession;
  if (!session) return;

  try {
    await updateDoc(doc(db, 'group_sessions', session.id), {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
    showToast('Game has been cancelled');
  } catch (err) {
    showToast(err.message || 'Failed to cancel game', 'danger');
  }
}

// ─── ORGANIZE GAME VIEW (CREATION WIZARD) ──────────────────────────────────
export function renderOrganizeView() {
  const container = document.getElementById('play-app-view');
  if (!container) return;

  // Restore cached draft from localStorage if available
  try {
    const saved = localStorage.getItem('sitbit_game_draft');
    if (saved) state.wizardDraft = { ...state.wizardDraft, ...JSON.parse(saved) };
  } catch (e) {}

  container.innerHTML = `
    <div class="wizard-panel">
      <div class="wizard-steps-indicator">
        <div class="wizard-step-node ${state.wizardStep >= 1 ? 'active' : ''}">
          <div class="wizard-step-circle">1</div>
          <span>Sport & Format</span>
        </div>
        <div class="wizard-step-node ${state.wizardStep >= 2 ? 'active' : ''}">
          <div class="wizard-step-circle">2</div>
          <span>Time & Venue</span>
        </div>
        <div class="wizard-step-node ${state.wizardStep >= 3 ? 'active' : ''}">
          <div class="wizard-step-circle">3</div>
          <span>Review & Publish</span>
        </div>
      </div>

      <form id="wizard-form">
        <div id="wizard-step-content">
          <!-- Step content injected below -->
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:28px; padding-top:20px; border-top:1px solid var(--border);">
          ${state.wizardStep > 1 ? `
            <button type="button" id="wizard-prev-btn" class="btn btn-outline">Back</button>
          ` : '<div></div>'}
          
          ${state.wizardStep < 3 ? `
            <button type="button" id="wizard-next-btn" class="btn btn-primary">Continue →</button>
          ` : `
            <button type="submit" id="wizard-publish-btn" class="btn btn-primary" style="min-width:180px;">
              Publish Game Now
            </button>
          `}
        </div>
      </form>
    </div>
  `;

  renderWizardStepContent();

  document.getElementById('wizard-prev-btn')?.addEventListener('click', () => {
    state.wizardStep--;
    renderOrganizeView();
  });

  document.getElementById('wizard-next-btn')?.addEventListener('click', () => {
    if (validateCurrentWizardStep()) {
      state.wizardStep++;
      saveDraft();
      renderOrganizeView();
    }
  });

  document.getElementById('wizard-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    publishGameSession();
  });
}

function renderWizardStepContent() {
  const content = document.getElementById('wizard-step-content');
  if (!content) return;
  const draft = state.wizardDraft;

  if (state.wizardStep === 1) {
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="w-sport">Select Sport</label>
        <select id="w-sport" class="form-select">
          ${Object.entries(SPORT_REGISTRY).map(([k, s]) => `
            <option value="${k}" ${draft.sportType === k ? 'selected' : ''}>${s.emoji} ${s.name}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="w-title">Game Title</label>
        <input type="text" id="w-title" class="form-input" placeholder="e.g. Saturday 5v5 Friendly" value="${escapeHtml(draft.title)}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="w-format">Match Format</label>
          <input type="text" id="w-format" class="form-input" placeholder="e.g. 5v5, 7v7, doubles" value="${escapeHtml(draft.sportFormat)}">
        </div>
        <div class="form-group">
          <label class="form-label" for="w-max">Player Capacity</label>
          <input type="number" id="w-max" class="form-input" min="2" max="60" value="${draft.maxPlayers || 10}" required>
        </div>
      </div>
    `;

    document.getElementById('w-sport')?.addEventListener('change', (e) => {
      draft.sportType = e.target.value;
      const s = SPORT_REGISTRY[draft.sportType];
      if (s) {
        draft.sportFormat = s.defaultFormat;
        draft.maxPlayers = s.maxPlayers;
        if (!draft.title || draft.title.endsWith('Game') || draft.title.endsWith('Match')) {
          draft.title = `${s.name} Match`;
        }
      }
      renderWizardStepContent();
    });
  } else if (state.wizardStep === 2) {
    content.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="w-date">Date</label>
          <input type="date" id="w-date" class="form-input" value="${draft.date}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="w-time">Start Time</label>
          <input type="time" id="w-time" class="form-input" value="${draft.startTime}" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="w-duration">Duration (minutes)</label>
        <select id="w-duration" class="form-select">
          <option value="60" ${draft.durationMinutes === 60 ? 'selected' : ''}>60 minutes</option>
          <option value="90" ${draft.durationMinutes === 90 ? 'selected' : ''}>90 minutes</option>
          <option value="120" ${draft.durationMinutes === 120 ? 'selected' : ''}>120 minutes</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="w-location">Venue / Location Name</label>
        <input type="text" id="w-location" class="form-input" placeholder="e.g. Central Park Turf Field, Pitch 3" value="${escapeHtml(draft.locationName)}" required>
      </div>

      <div class="form-group">
        <label class="form-label" for="w-map-url">Google Maps URL (Optional)</label>
        <input type="url" id="w-map-url" class="form-input" placeholder="https://maps.google.com/..." value="${escapeHtml(draft.locationUrl || '')}">
      </div>

      <div class="form-group">
        <label class="form-label" for="w-notes">Organizer Notes (Optional)</label>
        <textarea id="w-notes" class="form-textarea" rows="3" placeholder="Rules, footwear recommendations, bibs, etc.">${escapeHtml(draft.notes || '')}</textarea>
      </div>

      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer;">
          <input type="checkbox" id="w-public" ${draft.isPublic ? 'checked' : ''}>
          <span>Public Discovery (Visible in local explore feed)</span>
        </label>
        <span style="font-size:12px; color:var(--muted); display:block; margin-left:24px; margin-top:2px;">
          Uncheck to make this game private/invite-only.
        </span>
      </div>
    `;
  } else if (state.wizardStep === 3) {
    const sportInfo = SPORT_REGISTRY[draft.sportType] || SPORT_REGISTRY.custom;
    content.innerHTML = `
      <div style="background:var(--paper-alt); border-radius:var(--radius-md); padding:20px; border:1px solid var(--border); margin-bottom:20px;">
        <h3 style="font-size:20px; font-weight:800; margin-bottom:12px;">Game Review</h3>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:14px;">
          <div><strong>Sport:</strong> ${sportInfo.emoji} ${sportInfo.name} (${draft.sportFormat})</div>
          <div><strong>Title:</strong> ${escapeHtml(draft.title)}</div>
          <div><strong>When:</strong> ${draft.date} at ${draft.startTime} (${draft.durationMinutes}m)</div>
          <div><strong>Venue:</strong> ${escapeHtml(draft.locationName)}</div>
          <div><strong>Capacity:</strong> ${draft.maxPlayers} players</div>
          <div><strong>Visibility:</strong> ${draft.isPublic ? 'Public Game' : '🔒 Private (Invite-Only)'}</div>
        </div>
      </div>
      <p style="font-size:13px; color:var(--muted);">
        By publishing, this game will be created in your account. You will automatically be added as the confirmed captain and can share the invite link immediately.
      </p>
    `;
  }
}

function validateCurrentWizardStep() {
  const draft = state.wizardDraft;
  if (state.wizardStep === 1) {
    const title = document.getElementById('w-title')?.value.trim();
    if (!title) {
      showToast('Please enter a title for your game', 'warning');
      return false;
    }
    draft.title = title;
    draft.sportFormat = document.getElementById('w-format')?.value.trim() || '5v5';
    draft.maxPlayers = parseInt(document.getElementById('w-max')?.value, 10) || 10;
  } else if (state.wizardStep === 2) {
    const loc = document.getElementById('w-location')?.value.trim();
    if (!loc) {
      showToast('Please enter a venue or location', 'warning');
      return false;
    }
    draft.locationName = loc;
    draft.date = document.getElementById('w-date')?.value;
    draft.startTime = document.getElementById('w-time')?.value;
    draft.durationMinutes = parseInt(document.getElementById('w-duration')?.value, 10) || 90;
    draft.locationUrl = document.getElementById('w-map-url')?.value.trim() || '';
    draft.notes = document.getElementById('w-notes')?.value.trim() || '';
    draft.isPublic = document.getElementById('w-public')?.checked ?? true;
  }
  return true;
}

function saveDraft() {
  try {
    localStorage.setItem('sitbit_game_draft', JSON.stringify(state.wizardDraft));
  } catch (e) {}
}

async function publishGameSession() {
  if (!state.currentUser) {
    openAuthModal(() => publishGameSession());
    return;
  }

  const btn = document.getElementById('wizard-publish-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publishing Game...';
  }

  const draft = state.wizardDraft;
  const user = state.currentUser;
  const organizerName = state.userProfile?.displayName || user.displayName || 'Coach';
  const organizerAvatarUrl = state.userProfile?.avatarUrl || user.photoURL || null;

  try {
    const newSessionRef = doc(collection(db, 'group_sessions'));
    const sessionId = newSessionRef.id;

    // Build start date
    const startDateTime = new Date(`${draft.date}T${draft.startTime}:00`);
    const endsAt = new Date(startDateTime.getTime() + (draft.durationMinutes * 60000));

    const creatorParticipant = {
      uid: user.uid,
      displayName: organizerName,
      avatarUrl: organizerAvatarUrl,
      confirmed: true,
      isCaptain: true,
      participantType: 'registered',
      joinedAt: new Date()
    };

    const sessionData = {
      id: sessionId,
      creatorUid: user.uid,
      organizerName,
      organizerAvatarUrl,
      title: draft.title,
      sportType: draft.sportType,
      sportFormat: draft.sportFormat,
      maxPlayers: draft.maxPlayers,
      isPublic: draft.isPublic,
      date: startDateTime,
      endsAt: endsAt,
      startTime: draft.startTime,
      durationMinutes: draft.durationMinutes,
      locationName: draft.locationName,
      locationUrl: draft.locationUrl || null,
      notes: draft.notes || null,
      status: 'open',
      teamAName: 'Team A',
      teamBName: 'Team B',
      teamCount: 2,
      participants: [creatorParticipant],
      participantUids: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save main session document
    await setDoc(newSessionRef, sessionData);

    // Initialize default field positions for this sport if configured
    const sportInfo = SPORT_REGISTRY[draft.sportType];
    if (sportInfo && sportInfo.positions && sportInfo.positions.length > 0) {
      const batch = writeBatch(db);
      for (const pos of sportInfo.positions) {
        const pRef = doc(db, 'group_sessions', sessionId, 'field_positions', pos.id);
        batch.set(pRef, {
          label: pos.label,
          shortLabel: pos.shortLabel,
          team: pos.team,
          claimedByUserId: null,
          claimedByDisplayName: null,
          claimedAt: null
        });
      }
      await batch.commit();
    }

    // Clear draft
    localStorage.removeItem('sitbit_game_draft');
    state.wizardStep = 1;
    showToast('Game published successfully! 🚀', 'success');

    // Navigate to new session
    navigateTo(`/group-sessions/${sessionId}`);
  } catch (err) {
    showToast(err.message || 'Failed to publish game', 'danger');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publish Game Now';
    }
  }
}

// ─── MY GAMES VIEW ───────────────────────────────────────────────────────────
export function renderMyGamesView() {
  const container = document.getElementById('play-app-view');
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px; background:var(--paper-card); border-radius:var(--radius-lg); border:1px solid var(--border);">
        <span style="font-size:36px; display:block; margin-bottom:12px;">🔒</span>
        <h3 style="font-size:18px; font-weight:800; margin-bottom:6px;">Sign in to view your games</h3>
        <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">Track upcoming sessions, organized matches, and team rosters.</p>
        <button id="my-games-auth-btn" class="btn btn-primary">Sign In</button>
      </div>
    `;
    document.getElementById('my-games-auth-btn')?.addEventListener('click', () => openAuthModal());
    return;
  }

  const uid = state.currentUser.uid;
  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:26px; font-weight:900; letter-spacing:-0.5px;">My Games & Organizing</h2>
      <p style="color:var(--muted); font-size:14px; margin-top:4px;">Sessions you have joined or organized.</p>
    </div>
    <div id="my-games-grid" class="games-grid">
      <div style="text-align:center; padding:40px; color:var(--muted); grid-column:1/-1;">
        Loading your sessions...
      </div>
    </div>
  `;

  clearActiveListeners();
  try {
    const q = query(
      collection(db, 'group_sessions'),
      where('participantUids', 'array-contains', uid),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const myGames = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const grid = document.getElementById('my-games-grid');
      if (!grid) return;

      if (myGames.length === 0) {
        grid.innerHTML = `
          <div style="text-align:center; padding:50px 20px; background:var(--paper-card); border-radius:var(--radius-lg); border:1px solid var(--border); grid-column:1/-1;">
            <p style="color:var(--muted); font-size:15px; margin-bottom:16px;">You haven't joined any games yet.</p>
            <button id="find-games-btn" class="btn btn-primary">Find a Game to Join</button>
          </div>
        `;
        document.getElementById('find-games-btn')?.addEventListener('click', () => switchTab('explore'));
        return;
      }

      grid.innerHTML = myGames.map(game => {
        const sportInfo = SPORT_REGISTRY[game.sportType] || SPORT_REGISTRY.custom;
        const isOrganizer = game.creatorUid === uid;
        return `
          <div class="game-card" data-session-id="${game.id}">
            <div class="game-card-top">
              <span class="sport-badge">${sportInfo.emoji} ${sportInfo.name}</span>
              ${isOrganizer ? '<span class="status-badge" style="background:var(--warning-soft); color:var(--warning);">Organizing</span>' : '<span class="status-badge status-open">Joined</span>'}
            </div>
            <h3 class="game-card-title">${escapeHtml(game.title || `${sportInfo.name} Game`)}</h3>
            <div class="game-card-info">
              <div class="info-line"><span>📅</span> ${game.startTime || '18:00'}</div>
              <div class="info-line"><span>📍</span> ${escapeHtml(game.locationName || 'Venue')}</div>
            </div>
            <div style="margin-top:auto; font-size:12px; font-weight:700; color:var(--primary);">
              View Game Details →
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
          navigateTo(`/group-sessions/${card.dataset.sessionId}`);
        });
      });
    });
    state.activeListeners.push(unsub);
  } catch (err) {
    console.warn('My games query error:', err);
  }
}

function renderNotFoundGame(sessionId) {
  const container = document.getElementById('play-app-view');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center; padding:80px 20px; background:var(--paper-card); border-radius:var(--radius-lg); border:1px solid var(--border);">
      <span style="font-size:42px; display:block; margin-bottom:12px;">🔍</span>
      <h2 style="font-size:22px; font-weight:900; margin-bottom:8px;">Game Not Found</h2>
      <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">
        This game session (ID: <code>${escapeHtml(sessionId)}</code>) may have been deleted, cancelled, or the link is expired.
      </p>
      <button class="btn btn-primary" onclick="window.history.pushState(null, '', '/'); location.reload();">
        Back to Explore Games
      </button>
    </div>
  `;
}

function clearActiveListeners() {
  state.activeListeners.forEach(unsub => {
    try { unsub(); } catch (e) {}
  });
  state.activeListeners = [];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global App Initialization
export function initPlayApp() {
  initAuth();
  initRouter();
}
