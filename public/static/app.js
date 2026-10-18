/* ═══════════════════════════════════════════════════════
   MyDoctor's - Complete Frontend JavaScript
   AI Symptom Checker | Doctor Search | Appointments
═══════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ────────────────────────────────────────────
const state = {
  currentUser: null,
  currentPage: 'home',
  sessionToken: null,
  selectedBodyPart: null,
  selectedTime: null,
  currentBookingDoctor: null,
  symptoms: [],
  allDoctors: [],
  searchTimeout: null,
  nearbyLoaded: false,
};

const API = '';  // same-origin

// ─── UTILITIES ───────────────────────────────────────
const $  = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg, type = 'info', duration = 3500) {
  const toast = $('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${msg}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.className = 'toast', duration);
}

function setLoading(btnId, loading) {
  const btn = $(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loadingEl = btn.querySelector('.btn-loading');
  if (text) text.style.display = loading ? 'none' : '';
  if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
  btn.disabled = loading;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return `<div class="stars">
    ${'<i class="fas fa-star"></i>'.repeat(full)}
    ${half ? '<i class="fas fa-star-half-alt"></i>' : ''}
    ${'<i class="far fa-star"></i>'.repeat(empty)}
  </div>`;
}

async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.sessionToken) headers['X-Session-Token'] = state.sessionToken;
  try {
    const res = await fetch(API + endpoint, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Network error. Please check connection.' } };
  }
}

// ─── PAGE NAVIGATION ──────────────────────────────────
function showPage(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-link').forEach(l => l.classList.remove('active'));

  const el = $(`page-${page}`);
  if (el) {
    el.classList.add('active');
    state.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Highlight top nav
  $$('.nav-link').forEach(l => {
    if (l.getAttribute('onclick')?.includes(`'${page}'`)) l.classList.add('active');
  });

  // Sync bottom nav active state
  syncBottomNav(page);

  // Close mobile menu
  $('navMenu')?.classList.remove('open');
  $('hamburger')?.classList.remove('active');

  // Lazy load
  if (page === 'findDoctors') loadDoctors();
  if (page === 'appointments') loadAppointments();
  if (page === 'nearby') loadNearbyServices();
  if (page === 'dashboard') loadDashboard();
  if (page === 'profile') loadProfile();
  if (page === 'myProfile') loadMyProfilePage();
  if (page === 'reports') loadReportsPage();
  if (page === 'chat') initMedbotPage();

  // Push history state for back navigation
  const stateObj = { page };
  const url = '#' + page;
  if (window.history.state?.page !== page) {
    window.history.pushState(stateObj, '', url);
  }
}

// ─── BOTTOM NAV SYNC ──────────────────────────────────
const PAGE_TO_BOTTOM_NAV = {
  home: 'bnHome',
  findDoctors: 'bnDoctors',
  aiChecker: 'bnAI',
  appointments: 'bnAppts',
  myProfile: 'bnProfile',
};

function syncBottomNav(page) {
  $$('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const id = PAGE_TO_BOTTOM_NAV[page];
  if (id) $(`${id}`)?.classList.add('active');
}

function setBottomNav(id) {
  $$('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  $(id)?.classList.add('active');
}

function toggleMenu() {
  $('navMenu').classList.toggle('open');
  $('hamburger').classList.toggle('active');
}

// ─── BACK NAVIGATION (Android & Browser) ──────────────
window.addEventListener('popstate', (e) => {
  // If there are open modals, close the topmost one first
  const openModals = $$('.modal-overlay.open');
  if (openModals.length > 0) {
    closeModal(openModals[openModals.length - 1].id);
    window.history.pushState({ page: state.currentPage }, '', '#' + state.currentPage);
    return;
  }
  // Navigate to page from history state
  if (e.state && e.state.page) {
    const page = e.state.page;
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    const el = $(`page-${page}`);
    if (el) {
      el.classList.add('active');
      state.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      syncBottomNav(page);
      // Trigger lazy loads without pushing history again
      if (page === 'findDoctors') loadDoctors();
      if (page === 'appointments') loadAppointments();
      if (page === 'nearby') loadNearbyServices();
      if (page === 'dashboard') loadDashboard();
      if (page === 'myProfile') loadMyProfilePage();
    }
  } else {
    // At root — show home
    showPage('home');
  }
});

// ─── NAVBAR SCROLL ────────────────────────────────────
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) $('navbar').classList.add('scrolled');
  else $('navbar').classList.remove('scrolled');
});

// ─── MODALS ───────────────────────────────────────────
function openModal(id) {
  $(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  $(id).classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOnBg(e, id) {
  if (e.target.id === id) closeModal(id);
}

function switchToRegister() {
  closeModal('loginModal');
  openModal('registerModal');
}

function switchToLogin() {
  closeModal('registerModal');
  openModal('loginModal');
}

function togglePasswordVisibility(inputId) {
  const input = $(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ─── AUTH ─────────────────────────────────────────────
let loginType = 'patient';
let registerType = 'patient';

function setLoginType(type) {
  loginType = type;
  $('login-type-patient').classList.toggle('active', type === 'patient');
  $('login-type-doctor').classList.toggle('active', type === 'doctor');
}

function setRegisterType(type) {
  registerType = type;
  $('reg-type-patient').classList.toggle('active', type === 'patient');
  $('reg-type-doctor').classList.toggle('active', type === 'doctor');
  $('patientRegForm').style.display = type === 'patient' ? '' : 'none';
  $('doctorRegForm').style.display = type === 'doctor' ? '' : 'none';
}

async function login() {
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const errEl = $('loginError');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please fill all fields'; errEl.style.display = 'flex'; return;
  }

  setLoading('loginBtn', true);
  const res = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, userType: loginType })
  });
  setLoading('loginBtn', false);

  if (res.ok && res.data.success) {
    state.sessionToken = res.data.token;
    state.currentUser = res.data.user;
    localStorage.setItem('md_token', res.data.token);
    localStorage.setItem('md_user', JSON.stringify(res.data.user));
    closeModal('loginModal');
    updateNavForUser(res.data.user);
    showToast(`Welcome back, ${res.data.user.name}! 👋`, 'success');
    showPage('dashboard');
  } else {
    errEl.textContent = res.data.error || 'Login failed'; errEl.style.display = 'flex';
  }
}

async function register() {
  const errEl = $('registerError');
  errEl.style.display = 'none';
  setLoading('registerBtn', true);

  let body = {};
  if (registerType === 'patient') {
    body = {
      name: $('pat_name').value.trim(),
      email: $('pat_email').value.trim(),
      password: $('pat_password').value,
      phone: $('pat_phone').value,
      dob: $('pat_dob').value,
      gender: $('pat_gender').value,
      blood_group: $('pat_blood').value,
      city: $('pat_city').value,
      state: $('pat_state').value,
      pincode: $('pat_pincode').value
    };
    if (!body.name || !body.email || !body.password) {
      errEl.textContent = 'Name, email and password are required'; errEl.style.display = 'flex'; setLoading('registerBtn', false); return;
    }
    var res = await apiCall('/api/auth/register/patient', { method: 'POST', body: JSON.stringify(body) });
  } else {
    body = {
      name: $('doc_name').value.trim(),
      email: $('doc_email').value.trim(),
      password: $('doc_password').value,
      phone: $('doc_phone').value,
      specialization: $('doc_spec').value,
      experience_years: parseInt($('doc_exp').value) || 0,
      qualification: $('doc_qual').value,
      consultation_fee: parseFloat($('doc_fee').value) || 500,
      hospital_name: $('doc_hospital').value,
      hospital_address: $('doc_address').value,
      city: $('doc_city').value,
      state: $('doc_state').value,
      bio: $('doc_bio').value
    };
    if (!body.name || !body.email || !body.password || !body.specialization) {
      errEl.textContent = 'Name, email, password & specialization required'; errEl.style.display = 'flex'; setLoading('registerBtn', false); return;
    }
    var res = await apiCall('/api/auth/register/doctor', { method: 'POST', body: JSON.stringify(body) });
  }

  setLoading('registerBtn', false);

  if (res.ok && res.data.success) {
    state.sessionToken = res.data.token;
    state.currentUser = res.data.user;
    localStorage.setItem('md_token', res.data.token);
    localStorage.setItem('md_user', JSON.stringify(res.data.user));
    closeModal('registerModal');
    updateNavForUser(res.data.user);
    showToast(`Welcome to MyDoctor's, ${res.data.user.name}! 🎉`, 'success');
    showPage('dashboard');
  } else {
    errEl.textContent = res.data.error || 'Registration failed'; errEl.style.display = 'flex';
  }
}

async function logout() {
  await apiCall('/api/auth/logout', { method: 'POST' });
  state.sessionToken = null;
  state.currentUser = null;
  localStorage.removeItem('md_token');
  localStorage.removeItem('md_user');
  $('guestActions').style.display = '';
  $('userActions').style.display = 'none';
  $('userDropdown').classList.remove('open');
  if ($('welcomeStrip')) $('welcomeStrip').style.display = 'none';
  updateMobileWelcome(null);
  showToast('Logged out successfully', 'info');
  showPage('home');
}

function updateNavForUser(user) {
  if (!user) return;
  $('guestActions').style.display = 'none';
  $('userActions').style.display = '';
  $('dropUserName').textContent = user.name;
  $('dropUserType').textContent = user.type === 'doctor' ? `Dr. ${user.specialization || 'Doctor'}` : 'Patient';
  if (user.profile_image) {
    $('userAvatarImg').src = user.profile_image;
    $('userAvatarImg').style.display = '';
    $('avatarFallback').style.display = 'none';
  } else {
    $('avatarFallback').style.display = 'flex';
    $('userAvatarImg').style.display = 'none';
  }
  // Update welcome strip on home page
  updateWelcomeStrip(user);
}

function updateWelcomeStrip(user) {
  const strip = $('welcomeStrip');
  if (!strip) return;
  if (!user) { strip.style.display = 'none'; return; }
  strip.style.display = '';
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const greet = $('welcomeGreeting');
  if (greet) greet.textContent = `Welcome back, ${firstName}! 👋`;
  const avatar = $('welcomeAvatar');
  if (avatar) {
    const initials = user.name ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    avatar.innerHTML = user.profile_image
      ? `<img src="${user.profile_image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.outerHTML='${initials}'">`
      : initials;
  }
  // Also update mobile home welcome
  updateMobileWelcome(user);
}

function toggleUserMenu() {
  $('userDropdown').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) $('userDropdown')?.classList.remove('open');
});

// ─── RESTORE SESSION ──────────────────────────────────
function restoreSession() {
  const token = localStorage.getItem('md_token');
  const userStr = localStorage.getItem('md_user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      state.sessionToken = token;
      state.currentUser = user;
      updateNavForUser(user);
    } catch {}
  }
}

// ─── STATS COUNTER ANIMATION ──────────────────────────
function animateCounters() {
  $$('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const start = Date.now();
    const suffix = target >= 1000 ? (target >= 100000 ? 'K+' : '+') : '+';
    const displayTarget = target >= 1000 ? Math.round(target / 1000) : target;

    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * displayTarget);
      el.textContent = current + (progress === 1 ? suffix : '');
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

// ─── HERO SEARCH ──────────────────────────────────────
function heroSearch() {
  const query = $('heroSearchInput').value.trim();
  const city = $('heroLocationInput').value.trim();
  showPage('findDoctors');
  setTimeout(() => {
    if (query) $('doctorSearch').value = query;
    if (city) $('cityFilter').value = city;
    searchDoctors();
  }, 300);
}

function quickSearch(spec) {
  showPage('findDoctors');
  setTimeout(() => {
    $('specFilter').value = spec;
    searchDoctors();
  }, 300);
}

function filterBySpec(spec) {
  showPage('findDoctors');
  setBottomNav('bnDoctors');
  setTimeout(() => {
    // Map specialty card labels to search terms that match DB specialization strings
    // We use the search field (not dropdown) for maximum flexibility
    const searchTermMap = {
      'Cardiology':      'Cardiologist',
      'Orthopaedics':    'Orthopaedic',
      'Obstetrics':      'Gynecologist',
      'OBG':             'Gynecologist',
      'Paediatrics':     'Pediatrician',
      'Neuro':           'Neurologist',
      'Neuro Surgery':   'Neurosurgeon',
      'Nephrology':      'Nephrologist',
      'Urology':         'Urologist',
      'Oncology':        'Oncologist',
      'Dermatology':     'Dermatologist',
      'Ophthalmology':   'Ophthalmologist',
      'ENT':             'ENT',
      'Psychiatry':      'Psychiatrist',
      'Pulmonology':     'Pulmonologist',
      'General Medicine':'General Medicine',
    };
    const searchTerm = searchTermMap[spec] || spec;
    // Clear dropdown, use search text box for DB-matching
    if ($('specFilter')) $('specFilter').value = '';
    if ($('doctorSearch')) $('doctorSearch').value = searchTerm;
    loadDoctors();
  }, 300);
}

// Mobile home search functions
function mobileHomeSearch() {
  const query = ($('mhSearchInput')?.value || '').trim();
  if (!query) return;
  showPage('findDoctors');
  setBottomNav('bnDoctors');
  setTimeout(() => {
    if ($('doctorSearch')) $('doctorSearch').value = query;
    loadDoctors();
  }, 300);
}

function mobileQuickSearch(term) {
  showPage('findDoctors');
  setBottomNav('bnDoctors');
  setTimeout(() => {
    if ($('doctorSearch')) $('doctorSearch').value = term;
    loadDoctors();
  }, 300);
}

// Update mobile welcome greeting when user logs in/out
function updateMobileWelcome(user) {
  const greeting = $('mhGreeting');
  const avatar = $('mhAvatar');
  if (!greeting) return;
  if (!user) {
    greeting.textContent = 'Welcome';
    if (avatar) avatar.innerHTML = '<i class="fas fa-user-circle"></i>';
    return;
  }
  const firstName = user.name ? user.name.split(' ')[0] : '';
  greeting.textContent = firstName ? `Hello, ${firstName} 👋` : 'Welcome back 👋';
  if (avatar) {
    const initials = user.name
      ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : '?';
    avatar.innerHTML = user.profile_image
      ? `<img src="${user.profile_image}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.innerHTML='${initials}'">`
      : `<span style="font-size:1rem;font-weight:700;color:var(--primary)">${initials}</span>`;
  }
}

// ─── FIND DOCTORS ─────────────────────────────────────
let doctorSearchTimeout = null;

function searchDoctors() {
  clearTimeout(doctorSearchTimeout);
  doctorSearchTimeout = setTimeout(loadDoctors, 400);
}

// active city filter for doctors page
let _doctorCityFilter = '';

function setDoctorCity(city) {
  _doctorCityFilter = city;
  // update tab highlight
  ['dcAll','dcHubballi','dcDharwad'].forEach(id => $$(`.city-tab-btn`).forEach(b => b.classList.remove('active')));
  const map = {'':'dcAll','Hubballi':'dcHubballi','Dharwad':'dcDharwad'};
  $(map[city])?.classList.add('active');
  loadDoctors();
}

function clearFilters() {
  $('doctorSearch').value = '';
  $('specFilter').value = '';
  if ($('hospitalFilter')) $('hospitalFilter').value = '';
  $('sortFilter').value = 'verified';
  _doctorCityFilter = '';
  ['dcAll','dcHubballi','dcDharwad'].forEach(id => $(id)?.classList.remove('active'));
  $('dcAll')?.classList.add('active');
  loadDoctors();
}

async function loadDoctors() {
  const container = $('doctorsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Finding doctors...</p></div>';

  const search = $('doctorSearch')?.value.trim() || '';
  const spec   = $('specFilter')?.value || '';
  const hospital = $('hospitalFilter')?.value || '';
  const city   = _doctorCityFilter || '';

  let url = '/api/doctors?limit=80';
  if (search)   url += `&search=${encodeURIComponent(search)}`;
  if (spec)     url += `&specialization=${encodeURIComponent(spec)}`;
  if (hospital) url += `&hospital=${encodeURIComponent(hospital)}`;
  if (city)     url += `&city=${encodeURIComponent(city)}`;

  const res = await apiCall(url);
  if (!res.ok || !res.data.success) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Failed to load doctors</h3><p>Please try again</p></div>';
    return;
  }

  let doctors = res.data.doctors;
  const sort = $('sortFilter')?.value || 'verified';
  if (sort === 'experience') doctors.sort((a, b) => (b.experience_years||0) - (a.experience_years||0));
  else if (sort === 'fee_low') doctors.sort((a, b) => (a.consultation_fee||0) - (b.consultation_fee||0));
  else if (sort === 'fee_high') doctors.sort((a, b) => (b.consultation_fee||0) - (a.consultation_fee||0));
  else doctors.sort((a, b) => (b.is_verified||0) - (a.is_verified||0) || (b.rating||0) - (a.rating||0));

  const ri = $('resultsInfo');
  if (ri) ri.textContent = `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} found${city ? ` in ${city}` : ' in Hubballi–Dharwad'}`;

  if (doctors.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-user-md"></i><h3>No doctors found</h3><p>Try adjusting your filters</p></div>';
    return;
  }

  container.innerHTML = doctors.map(doc => renderDoctorListCard(doc)).join('');
}

function renderDoctorListCard(doc) {
  const initials = doc.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const verified = doc.is_verified ? `<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>` : '';
  const expText  = doc.experience_years ? `<span class="dc-meta-pill"><i class="fas fa-briefcase"></i> ${doc.experience_years} yrs</span>` : '';
  const feeText  = doc.consultation_fee ? `<span class="dc-meta-pill fee-pill">₹${doc.consultation_fee}</span>` : '';
  const qualText = doc.qualification ? `<span class="dc-meta-pill"><i class="fas fa-graduation-cap"></i> ${doc.qualification}</span>` : '';
  const locText  = (doc.area || doc.city) ? `<span class="dc-meta-pill"><i class="fas fa-map-marker-alt"></i> ${doc.area || doc.city}</span>` : '';
  const schedPill = getOpdSummary(doc);

  return `
  <div class="doctor-list-card hd-doc-card">
    <div class="hd-doc-avatar">${initials}</div>
    <div class="hd-doc-body">
      <div class="hd-doc-name-row">
        <h3 class="hd-doc-name">${doc.name}</h3>
        ${verified}
      </div>
      <div class="hd-doc-spec"><i class="fas fa-stethoscope"></i> ${doc.specialization}${doc.sub_specializations && doc.sub_specializations.length ? ' · ' + doc.sub_specializations[0] : ''}</div>
      <div class="hd-doc-hospital"><i class="fas fa-hospital-alt"></i> ${doc.hospital_name}${doc.city ? ', ' + doc.city : ''}</div>
      <div class="hd-doc-pills">
        ${expText}${qualText}${feeText}${locText}
        ${schedPill}
      </div>
    </div>
    <div class="hd-doc-actions">
      <button class="btn-hd-view" onclick="event.stopPropagation();showDoctorProfile(${doc.id})"><i class="fas fa-user-md"></i> View Profile</button>
      <button class="btn-hd-book" onclick="event.stopPropagation();openBooking(${doc.id})"><i class="fas fa-calendar-plus"></i> Book</button>
    </div>
  </div>`;
}

function getOpdSummary(doc) {
  // Try opd_schedule from doctor_hospital_links
  if (doc.opd_schedule && doc.opd_schedule.length) {
    try {
      const s = typeof doc.opd_schedule === 'string' ? JSON.parse(doc.opd_schedule) : doc.opd_schedule;
      if (s && s.length && s[0].days) {
        return `<span class="dc-meta-pill opd-pill"><i class="fas fa-clock"></i> OPD: ${s[0].days.join(',')} ${s[0].time||''}</span>`;
      }
    } catch(e){}
  }
  if (doc.opd_schedule && typeof doc.opd_schedule === 'string' && doc.opd_schedule !== '[]') {
    return `<span class="dc-meta-pill opd-pill"><i class="fas fa-clock"></i> ${doc.opd_schedule}</span>`;
  }
  return '';
}

async function showDoctorProfile(doctorId) {
  openModal('doctorProfileModal');
  const content = $('doctorProfileContent');
  content.innerHTML = '<div class="loading-state" style="padding:60px 20px"><div class="spinner"></div><p>Loading profile...</p></div>';

  const res = await apiCall(`/api/doctors/${doctorId}`);
  if (!res.ok || !res.data.success) {
    content.innerHTML = '<div class="empty-state" style="padding:40px"><i class="fas fa-user-md"></i><h3>Profile not found</h3></div>';
    return;
  }

  const doc = res.data.doctor;
  const links = doc.hospital_links || [];
  const reviews = res.data.reviews || [];

  // Build OPD schedule HTML from doctor_hospital_links
  let opdHtml = '';
  if (links.length) {
    opdHtml = `<div class="dp-section"><h4><i class="fas fa-clock"></i> OPD Schedule</h4><ul class="dp-opd-list">`;
    links.forEach(l => {
      const days = Array.isArray(l.opd_days) ? l.opd_days.join(', ') : (l.opd_days || '');
      opdHtml += `<li><strong>${l.h_name || 'Hospital'}</strong> — ${days}${l.opd_times ? ' · ' + l.opd_times : ''}${l.department ? ' (' + l.department + ')' : ''}</li>`;
    });
    opdHtml += `</ul></div>`;
  }

  const row = (label, val, icon='') => val ? `<div class="dp-row"><span class="dp-label">${icon ? '<i class="fas fa-'+icon+'"></i> ' : ''}${label}</span><span class="dp-val">${val}</span></div>` : '';
  const tags = (arr) => arr && arr.length ? arr.map(t => `<span class="doctor-tag">${t}</span>`).join('') : '';
  const awardsHtml = doc.awards && doc.awards.length ? `<div class="dp-section"><h4><i class="fas fa-award"></i> Awards &amp; Fellowships</h4><ul class="dp-list">${doc.awards.map(a => `<li>${a}</li>`).join('')}</ul></div>` : '';
  const diseasesHtml = doc.diseases_treated && doc.diseases_treated.length ? `<div class="dp-section"><h4><i class="fas fa-stethoscope"></i> Conditions Treated</h4><div class="doctor-tags">${tags(doc.diseases_treated)}</div></div>` : '';
  const langHtml = doc.languages && doc.languages.length ? row('Languages', doc.languages.join(', '), 'language') : '';
  const regHtml = doc.kmc_reg_number ? row('Medical Registration', doc.kmc_reg_number, 'id-card') : '';
  const bioHtml = doc.bio ? `<div class="dp-section"><h4><i class="fas fa-user"></i> About</h4><p class="dp-bio">${doc.bio}</p></div>` : '';
  const reviewsHtml = reviews.length ? `<div class="dp-section"><h4><i class="fas fa-star"></i> Patient Reviews</h4>${reviews.map(r => `<div class="dp-review"><div class="dp-review-name">${r.patient_name}</div><div>${generateStars(r.rating)} <span style="font-size:0.8rem;color:var(--light)">${r.created_at ? r.created_at.slice(0,10) : ''}</span></div><p style="margin:4px 0 0;font-size:0.9rem">${r.comment||''}</p></div>`).join('')}</div>` : '';

  // Primary hospital details for map/call
  const primaryLink = links.find(l => l.is_primary) || links[0];
  const actionsHtml = `<div class="dp-actions">
    ${doc.hospital_phone ? `<a href="tel:${doc.hospital_phone}" class="btn-call"><i class="fas fa-phone"></i> Call Hospital</a>` : ''}
    <button class="btn-hd-book" onclick="closeModal('doctorProfileModal');openBooking(${doc.id})"><i class="fas fa-calendar-plus"></i> Book Appointment</button>
    ${primaryLink && primaryLink.h_maps_url ? `<a href="${primaryLink.h_maps_url}" target="_blank" class="btn-directions"><i class="fas fa-directions"></i> Directions</a>` : (doc.hospital_maps_url ? `<a href="${doc.hospital_maps_url}" target="_blank" class="btn-directions"><i class="fas fa-directions"></i> Directions</a>` : '')}
  </div>`;

  content.innerHTML = `
    <div class="doctor-profile-modal-inner">
      <div class="dp-header">
        <div class="dp-avatar">${doc.name.split(' ').filter(Boolean).map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="dp-header-info">
          <h2>${doc.name} ${doc.is_verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}</h2>
          <div class="dp-spec">${doc.specialization}${doc.sub_specializations && doc.sub_specializations.length ? ' · ' + doc.sub_specializations.join(', ') : ''}</div>
          <div class="dp-hospital"><i class="fas fa-hospital-alt"></i> ${doc.hospital_name}${doc.city ? ', ' + doc.city : ''}</div>
        </div>
      </div>
      <div class="dp-pills">
        ${doc.experience_years ? `<span class="dc-meta-pill"><i class="fas fa-briefcase"></i> ${doc.experience_years} yrs experience</span>` : ''}
        ${doc.qualification ? `<span class="dc-meta-pill"><i class="fas fa-graduation-cap"></i> ${doc.qualification}</span>` : ''}
        ${doc.consultation_fee ? `<span class="dc-meta-pill fee-pill">₹${doc.consultation_fee} consultation</span>` : ''}
        ${doc.online_consultation ? `<span class="dc-meta-pill online-pill"><i class="fas fa-video"></i> Online Available</span>` : ''}
        ${doc.rating ? `<span class="dc-meta-pill">${generateStars(doc.rating)} ${doc.rating} (${doc.total_ratings||0})</span>` : ''}
      </div>
      <div class="dp-details">
        ${bioHtml}
        ${opdHtml}
        ${diseasesHtml}
        ${doc.languages && doc.languages.length ? `<div class="dp-section"><h4><i class="fas fa-language"></i> Languages</h4><p>${doc.languages.join(', ')}</p></div>` : ''}
        ${regHtml ? `<div class="dp-section">${regHtml}</div>` : ''}
        ${awardsHtml}
        ${reviewsHtml}
      </div>
      ${actionsHtml}
      <div class="dp-verified-stamp"><i class="fas fa-shield-alt"></i> Information source: Official/verified source &nbsp;·&nbsp; Last researched: ${doc.last_verified || 'September 2026'}</div>
    </div>`;
}

function renderDoctorCard(doc) {
  const initials = doc.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  return `
  <div class="doctor-card" onclick="showDoctorDetail(${doc.id})">
    <div class="doctor-card-top">
      ${doc.is_verified ? '<div class="doctor-verified"><i class="fas fa-check"></i> Verified</div>' : ''}
      <div class="doctor-avatar">
        ${doc.profile_image ? `<img src="${doc.profile_image}" alt="${doc.name}" onerror="this.style.display='none'">` : ''}
        <div class="doctor-avatar-placeholder">${initials}</div>
      </div>
      <div class="doctor-name">${doc.name}</div>
      <div class="doctor-spec">${doc.specialization}</div>
    </div>
    <div class="doctor-card-body">
      <div class="doctor-hospital"><i class="fas fa-hospital-alt"></i> ${doc.hospital_name || 'Private Clinic'}</div>
      <div class="doctor-meta">
        <div class="doctor-meta-item"><i class="fas fa-briefcase"></i> ${doc.experience_years || 0} Years</div>
        <div class="doctor-meta-item"><i class="fas fa-map-marker-alt"></i> ${doc.city || 'India'}</div>
      </div>
      <div class="doctor-rating">${generateStars(doc.rating || 0)}<span class="rating-text">${(doc.rating || 0).toFixed(1)} (${doc.total_ratings || 0})</span></div>
      <div class="doctor-fee"><span class="fee-label">Consultation Fee</span><span class="fee-amount">₹${doc.consultation_fee || 0}</span></div>
      <div class="doctor-tags">${(doc.diseases_treated || []).slice(0, 3).map(d => `<span class="doctor-tag">${d}</span>`).join('')}</div>
      <button class="btn-book" onclick="event.stopPropagation();openBooking(${doc.id})"><i class="fas fa-calendar-plus"></i> Book Appointment</button>
    </div>
  </div>`;
}

// ─── FEATURED DOCTORS ─────────────────────────────────
async function loadFeaturedDoctors() {
  const res = await apiCall('/api/doctors?limit=8');
  if (!res.ok || !res.data.success) return;
  const container = $('featuredDoctors');
  if (!container) return;
  container.innerHTML = res.data.doctors.slice(0, 4).map(renderDoctorCard).join('');
}

// ─── DOCTOR DETAIL PAGE ───────────────────────────────
async function showDoctorDetail(doctorId) {
  showPage('doctorDetail');
  const container = $('doctorDetailContent');
  container.innerHTML = '<div class="loading-state" style="padding:100px"><div class="spinner"></div><p>Loading doctor profile...</p></div>';

  const res = await apiCall(`/api/doctors/${doctorId}`);
  if (!res.ok || !res.data.success) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-user-md"></i><h3>Doctor not found</h3></div>';
    return;
  }

  const doc = res.data.doctor;
  const reviews = res.data.reviews || [];
  const initials = doc.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  container.innerHTML = `
  <button class="back-btn" onclick="history.back()"><i class="fas fa-arrow-left"></i> Back</button>
  <div class="doctor-detail-layout">
    <div class="doctor-detail-main">
      <div class="doctor-detail-hero">
        <div class="doctor-detail-avatar">
          ${doc.profile_image ? `<img src="${doc.profile_image}" alt="${doc.name}">` : initials}
        </div>
        <div>
          <div class="doctor-detail-name">${doc.name} ${doc.is_verified ? '<span class="verified-badge" style="font-size:0.85rem"><i class="fas fa-check"></i> Verified</span>' : ''}</div>
          <div class="doctor-detail-spec">${doc.specialization} ${(doc.sub_specializations || []).length > 0 ? '· ' + doc.sub_specializations.join(' · ') : ''}</div>
          <div class="doctor-detail-meta">
            <div class="doctor-detail-meta-item"><i class="fas fa-hospital"></i> ${doc.hospital_name || 'Private Clinic'}</div>
            <div class="doctor-detail-meta-item"><i class="fas fa-map-marker-alt"></i> ${doc.city || ''}, ${doc.state || ''}</div>
            <div class="doctor-detail-meta-item"><i class="fas fa-briefcase"></i> ${doc.experience_years || 0} Years Experience</div>
            <div class="doctor-detail-meta-item"><i class="fas fa-graduation-cap"></i> ${doc.qualification || 'MBBS'}</div>
          </div>
        </div>
      </div>

      ${doc.bio ? `<div class="detail-section"><h3><i class="fas fa-info-circle"></i> About</h3><p>${doc.bio}</p></div>` : ''}

      <div class="detail-section">
        <h3><i class="fas fa-star"></i> Rating & Reviews</h3>
        <div class="doctor-rating" style="margin-bottom:16px;gap:12px">
          ${generateStars(doc.rating || 0)}
          <span style="font-size:1.2rem;font-weight:800;color:var(--dark)">${(doc.rating || 0).toFixed(1)}</span>
          <span style="color:var(--lighter);font-size:0.85rem">${doc.total_ratings || 0} reviews</span>
        </div>
        ${reviews.length === 0 ? '<p style="color:var(--lighter)">No reviews yet. Be the first to review!</p>' : 
          reviews.map(r => `<div class="review-card">
            <div class="review-header">
              <div class="review-author">${r.patient_name || 'Anonymous'}</div>
              <div class="review-date">${formatDate(r.created_at)}</div>
            </div>
            <div class="stars" style="margin-bottom:6px">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
            <div class="review-text">${r.review_text || ''}</div>
          </div>`).join('')}
      </div>

      ${(doc.diseases_treated || []).length > 0 ? `
      <div class="detail-section">
        <h3><i class="fas fa-heartbeat"></i> Conditions Treated</h3>
        <div class="diseases-chips">${doc.diseases_treated.map(d => `<span class="disease-chip">${d}</span>`).join('')}</div>
      </div>` : ''}

      ${(doc.languages || []).length > 0 ? `
      <div class="detail-section">
        <h3><i class="fas fa-language"></i> Languages</h3>
        <div class="diseases-chips">${doc.languages.map(l => `<span class="lang-chip"><i class="fas fa-comment"></i> ${l}</span>`).join('')}</div>
      </div>` : ''}
    </div>

    <div class="book-sidebar">
      <div class="book-card">
        <div class="book-card-fee">
          <div class="fee-label">Consultation Fee</div>
          <div class="fee-amount">₹${doc.consultation_fee || 0}</div>
        </div>
        <div style="margin-bottom:20px">
          <div style="font-size:0.85rem;font-weight:600;color:var(--mid);margin-bottom:10px"><i class="fas fa-calendar-alt"></i> Available Days</div>
          <div class="availability-grid">
            ${allDays.map(day => `<div class="day-badge ${(doc.available_days || []).includes(day) ? 'available' : ''}">${day}</div>`).join('')}
          </div>
        </div>
        <button class="btn-book" onclick="openBooking(${doc.id})" style="margin-bottom:12px"><i class="fas fa-calendar-plus"></i> Book Appointment</button>
        ${doc.phone ? `<a href="tel:${doc.phone}" class="btn-call" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:var(--primary-light);color:var(--primary);border-radius:10px;font-weight:600;font-size:0.88rem"><i class="fas fa-phone"></i> ${doc.phone}</a>` : ''}
      </div>
    </div>
  </div>`;
}

// ─── BODY DIAGRAM ─────────────────────────────────────
// Track body view (front/back) and last-tapped part for zoom-on-tap
const bodyDiagramState = { view: 'front', lastPart: null, lastTime: 0 };

// Region info for zoom card
const BODY_REGION_INFO = {
  head:         { icon: 'fa-brain',       label: 'Head & Face',    desc: 'Includes skull, brain, eyes, ears, nose, sinuses, jaw and scalp.' },
  neck:         { icon: 'fa-lungs',       label: 'Neck / Throat',  desc: 'Covers throat, cervical spine, thyroid, lymph nodes and carotid vessels.' },
  chest:        { icon: 'fa-heartbeat',   label: 'Chest',          desc: 'Heart, lungs, ribs, sternum and upper digestive tract (oesophagus).' },
  shoulder:     { icon: 'fa-bone',        label: 'Shoulder',       desc: 'Shoulder joint, rotator cuff muscles, clavicle and scapula.' },
  abdomen:      { icon: 'fa-stomach',     label: 'Abdomen',        desc: 'Stomach, liver, gallbladder, spleen, pancreas, small intestine.' },
  pelvis:       { icon: 'fa-venus-mars',  label: 'Pelvis / Hips',  desc: 'Hip joints, bladder, reproductive organs and pelvic floor muscles.' },
  arm:          { icon: 'fa-hand-paper',  label: 'Arm / Hand',     desc: 'Shoulder to wrist: humerus, elbow, forearm, wrist and hand.' },
  leg:          { icon: 'fa-walking',     label: 'Leg / Knee / Foot', desc: 'Thigh, knee joint, shin, calf, ankle and foot.' },
  'upper-back': { icon: 'fa-spine',       label: 'Upper Back',     desc: 'Thoracic spine, trapezius, rhomboid muscles and scapular area.' },
  'lower-back': { icon: 'fa-spine',       label: 'Lower Back',     desc: 'Lumbar spine, sacrum, erector spinae and surrounding muscles.' },
};

function selectBodyPart(part, displayName) {
  const now = Date.now();
  const isDoubleTap = (bodyDiagramState.lastPart === part) && (now - bodyDiagramState.lastTime < 600);
  bodyDiagramState.lastPart = part;
  bodyDiagramState.lastTime = now;

  state.selectedBodyPart = part;
  // Remove selected from ALL body-part groups first
  $$('.body-part').forEach(g => g.classList.remove('selected'));
  // Match by part name in both front (bp-) and back (bpb-) views
  $$('[id^="bp-"],[id^="bpb-"]').forEach(g => {
    const idPart = g.id.replace(/^bpb?-/, '').replace(/^(left|right)-/, '').replace(/-.*/, '');
    if (idPart === part || g.id.endsWith(`-${part}`) || g.id === `bp-${part}` || g.id === `bpb-${part}`) {
      g.classList.add('selected');
    }
  });
  const badge = $('selectedPartBadge');
  if (badge) { badge.style.display = 'flex'; $('selectedPartName').textContent = displayName; }

  // On double-tap / second tap — show zoom card
  if (isDoubleTap) { showBodyZoom(part, displayName); }
}

function clearBodyPart() {
  state.selectedBodyPart = null;
  bodyDiagramState.lastPart = null;
  $$('.body-part').forEach(g => g.classList.remove('selected'));
  const badge = $('selectedPartBadge');
  if (badge) badge.style.display = 'none';
}

function switchBodyView(view) {
  bodyDiagramState.view = view;
  const front = $('bodyDiagramFront');
  const back  = $('bodyDiagramBack');
  const btnF  = $('bvFront');
  const btnB  = $('bvBack');
  if (view === 'front') {
    if (front) front.style.display = '';
    if (back)  back.style.display  = 'none';
    if (btnF) btnF.classList.add('active');
    if (btnB) btnB.classList.remove('active');
  } else {
    if (front) front.style.display = 'none';
    if (back)  back.style.display  = '';
    if (btnF) btnF.classList.remove('active');
    if (btnB) btnB.classList.add('active');
  }
  clearBodyPart();
}

function showBodyZoom(part, displayName) {
  // Remove existing overlay if any
  const existing = $('bodyZoomOverlay');
  if (existing) existing.remove();

  const info = BODY_REGION_INFO[part] || { icon: 'fa-dot-circle', label: displayName, desc: 'Tap the symptom button to log your concern.' };
  const overlay = document.createElement('div');
  overlay.id = 'bodyZoomOverlay';
  overlay.className = 'body-zoom-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="body-zoom-card">
      <button class="body-zoom-close" onclick="document.getElementById('bodyZoomOverlay').remove()"><i class="fas fa-times"></i></button>
      <h3><i class="fas ${info.icon}" style="color:var(--primary)"></i> ${info.label}</h3>
      <p>${info.desc}</p>
      <button class="body-zoom-symptom-btn" onclick="
        document.getElementById('bodyZoomOverlay').remove();
        const inp = document.getElementById('symptomInput');
        if(inp){ inp.focus(); inp.placeholder='Describe ${displayName} symptoms…'; }
        const tabEl = document.querySelector('.ai-tab');
        if(tabEl && !tabEl.classList.contains('active')) tabEl.click();
      ">
        <i class="fas fa-plus-circle"></i> Add ${displayName} Symptoms
      </button>
    </div>`;
  document.body.appendChild(overlay);
}

// ─── SYMPTOM INPUT ────────────────────────────────────
const SYMPTOM_SUGGESTIONS_LIST = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Vomiting', 'Dizziness',
  'Chest pain', 'Shortness of breath', 'Back pain', 'Joint pain', 'Abdominal pain',
  'Skin rash', 'Itching', 'Weight loss', 'Weight gain', 'Hair loss', 'Blurred vision',
  'Runny nose', 'Sore throat', 'Muscle weakness', 'Numbness', 'Tingling',
  'Frequent urination', 'Blood in urine', 'Swelling', 'Bruising', 'Bleeding',
  'Sweating', 'Chills', 'Loss of appetite', 'Insomnia', 'Anxiety', 'Depression',
  'Tremors', 'Seizures', 'Memory loss', 'Confusion', 'Heartburn', 'Bloating',
  'Constipation', 'Diarrhea', 'Wheezing', 'Palpitations', 'Cold sensitivity',
  'Heat sensitivity', 'Irregular periods', 'Pelvic pain', 'Burning sensation'
];

function handleSymptomInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = $('symptomInput').value.trim().replace(',', '');
    if (val) addSymptom(val);
    $('symptomInput').value = '';
    hideSuggestions();
  } else {
    showSuggestions($('symptomInput').value.trim());
  }
}

function showSuggestions(query) {
  if (!query) { hideSuggestions(); return; }
  const matches = SYMPTOM_SUGGESTIONS_LIST.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !state.symptoms.includes(s)).slice(0, 6);
  if (!matches.length) { hideSuggestions(); return; }
  $('symptomSuggestions').innerHTML = matches.map(s =>
    `<div class="suggestion-item" onclick="addSymptom('${s}')">${s}</div>`
  ).join('');
}

function hideSuggestions() {
  $('symptomSuggestions').innerHTML = '';
}

function addSymptom(sym) {
  if (!sym || state.symptoms.includes(sym)) return;
  state.symptoms.push(sym);
  renderSymptomTags();
  $('symptomInput').value = '';
  hideSuggestions();
}

function removeSymptom(sym) {
  state.symptoms = state.symptoms.filter(s => s !== sym);
  renderSymptomTags();
}

function renderSymptomTags() {
  $('symptomTags').innerHTML = state.symptoms.map(s =>
    `<span class="symptom-tag">${s}<button onclick="removeSymptom('${s}')"><i class="fas fa-times"></i></button></span>`
  ).join('');
}

function switchAITab(tab, btn) {
  $$('.ai-tab').forEach(t => t.classList.remove('active'));
  $$('.ai-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  $(`tab-${tab}`).classList.add('active');
  $('aiResults').style.display = 'none';
}

// ─── AI ANALYSIS ──────────────────────────────────────
async function analyzeSymptoms() {
  if (state.symptoms.length === 0) {
    showToast('Please add at least one symptom', 'warning'); return;
  }

  // Emergency check — before calling API, warn immediately for red-flag symptoms
  const emergencySymptoms = [
    'chest pain', 'severe chest pain', 'shortness of breath', 'difficulty breathing',
    'unconscious', 'not breathing', 'stroke', 'facial drooping', 'sudden numbness',
    'seizure', 'convulsion', 'severe bleeding', 'uncontrolled bleeding',
    'severe head injury', 'suicidal', 'overdose'
  ];
  const sympLower = state.symptoms.map(s => s.toLowerCase());
  const isEmergency = emergencySymptoms.some(e =>
    sympLower.some(s => s.includes(e) || e.includes(s))
  );
  if (isEmergency) {
    // Show emergency alert immediately
    const emergDiv = $('aiResults');
    if (emergDiv) {
      emergDiv.style.display = 'block';
      $('urgencyAlert').className = 'urgency-alert urgency-emergency';
      $('urgencyAlert').innerHTML = '🚨 <strong>EMERGENCY: Please call 112 or go to the nearest hospital immediately!</strong><br><small>Do not wait for AI analysis for potentially life-threatening symptoms.</small>';
      emergDiv.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const btn = $('analyzeBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing with AI...';

  const res = await apiCall('/api/ai/analyze-symptoms', {
    method: 'POST',
    body: JSON.stringify({ symptoms: state.symptoms, bodyPart: state.selectedBodyPart })
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-robot"></i> Analyze Symptoms with AI';

  if (!res.ok || !res.data.success) {
    showToast('Analysis failed. Please try again.', 'error');
    // Show fallback if API fails
    const emergDiv = $('aiResults');
    if (emergDiv) {
      emergDiv.style.display = 'block';
      $('aiPredictions').innerHTML = `
        <div class="urgency-alert urgency-moderate" style="margin:12px 0">
          <i class="fas fa-exclamation-circle"></i>
          <strong>AI analysis is temporarily unavailable.</strong><br>
          Please consult a General Physician for your symptoms. For emergencies, call 112 immediately.
        </div>`;
    }
    return;
  }

  const { analysis, matchedDoctors } = res.data;
  displayAIResults(analysis, matchedDoctors);
}

function displayAIResults(analysis, doctors) {
  const resultsDiv = $('aiResults');
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Urgency alert
  const urgencyMessages = {
    emergency: { text: '🚨 EMERGENCY: Call 112 or go to the nearest hospital immediately! Do not wait.', cls: 'urgency-emergency' },
    high:      { text: '⚠️ High Priority: These symptoms need prompt medical attention. Please see a doctor today.', cls: 'urgency-high' },
    moderate:  { text: '📋 Moderate: Please schedule an appointment with a doctor soon.', cls: 'urgency-moderate' },
    low:       { text: '✅ Low Priority: Monitor your symptoms. See a doctor if they persist or worsen.', cls: 'urgency-low' }
  };
  // Override urgency text if Gemini gave a specific emergency warning
  let urgText = (urgencyMessages[analysis.urgencyLevel] || urgencyMessages.low).text;
  let urgCls  = (urgencyMessages[analysis.urgencyLevel] || urgencyMessages.low).cls;
  if (analysis.emergencyWarning) {
    urgText = '🚨 ' + analysis.emergencyWarning;
    urgCls  = 'urgency-emergency';
  }
  $('urgencyAlert').className = `urgency-alert ${urgCls}`;
  $('urgencyAlert').innerHTML = urgText;

  // Predictions
  let html = `
    <div class="ai-disclaimer-note">
      <i class="fas fa-info-circle"></i>
      <strong>Educational Information Only</strong> — These are possible conditions based on symptom patterns.
      Percentages are <em>symptom-match scores</em>, not diagnostic accuracy.
      This is <strong>NOT</strong> a medical diagnosis. Always consult a qualified doctor.
    </div>`;

  if (!analysis.predictions || analysis.predictions.length === 0) {
    html += '<div class="empty-state"><i class="fas fa-search"></i><h3>No specific condition matched</h3><p>Try adding more detailed symptoms or consult a General Physician</p></div>';
  } else {
    html += analysis.predictions.map(p => `
      <div class="prediction-card">
        <div style="flex:1;min-width:0">
          <div class="prediction-disease">${p.disease}</div>
          <div class="prediction-desc">${p.description}</div>
          <span class="prediction-spec"><i class="fas fa-user-md"></i> ${p.specialization}</span>
        </div>
        <div class="prediction-confidence">
          <div class="confidence-num">${p.confidence}%</div>
          <div class="confidence-label">Match</div>
          <div class="confidence-bar"><div class="confidence-fill" style="width:${p.confidence}%"></div></div>
        </div>
      </div>`).join('');
  }

  // Gemini-provided extra guidance
  if (analysis.generalAdvice) {
    html += `<div class="ai-extra-card"><i class="fas fa-lightbulb" style="color:#F59E0B"></i><div>
      <strong>General Advice</strong><p>${analysis.generalAdvice}</p></div></div>`;
  }
  if (analysis.warningSigns) {
    html += `<div class="ai-extra-card ai-warning-card"><i class="fas fa-exclamation-triangle" style="color:#EF4444"></i><div>
      <strong>Seek Immediate Care If</strong><p>${analysis.warningSigns}</p></div></div>`;
  }
  if (analysis.followUpQuestions) {
    html += `<div class="ai-extra-card"><i class="fas fa-question-circle" style="color:#6366F1"></i><div>
      <strong>Your Doctor May Ask</strong><p>${analysis.followUpQuestions}</p></div></div>`;
  }

  $('aiPredictions').innerHTML = html;

  // Matched Doctors — only show if real matches exist
  if (doctors && doctors.length > 0) {
    $('matchedDoctorsSection').style.display = '';
    $('matchedDoctors').innerHTML = doctors.slice(0, 4).map(renderDoctorCard).join('');
  } else {
    $('matchedDoctorsSection').style.display = 'none';
  }
}

// ─── DISEASE SEARCH ───────────────────────────────────
const DISEASE_LIST = [
  'Heart Disease', 'Hypertension', 'Migraine', 'Epilepsy', 'Stroke', 'Parkinson Disease',
  'Acne', 'Eczema', 'Psoriasis', 'Skin Allergy', 'Arthritis', 'Back Pain', 'Sciatica',
  'PCOS', 'Pregnancy', 'Endometriosis', 'Asthma', 'COPD', 'Pneumonia', 'Bronchitis',
  'Diabetes', 'Hypothyroidism', 'Hyperthyroidism', 'IBS', 'Gastritis', 'Hepatitis',
  'Acid Reflux', 'Fever', 'Dengue', 'Malaria', 'UTI', 'Kidney Disease', 'Thyroid',
  'Cancer', 'Anemia', 'Osteoporosis', 'Insomnia', 'Anxiety', 'Depression', 'ADHD'
];

function diseaseSearchSuggest() {
  const query = $('diseaseSearchInput').value.trim();
  if (!query) { $('diseaseSuggestions').innerHTML = ''; return; }
  const matches = DISEASE_LIST.filter(d => d.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  $('diseaseSuggestions').innerHTML = matches.map(d =>
    `<div class="disease-suggestion-item" onclick="selectDisease('${d}')"><i class="fas fa-search"></i> ${d}</div>`
  ).join('');
}

function selectDisease(disease) {
  $('diseaseSearchInput').value = disease;
  $('diseaseSuggestions').innerHTML = '';
}

async function searchByDisease() {
  const disease = $('diseaseSearchInput').value.trim();
  if (!disease) { showToast('Please enter a disease name', 'warning'); return; }

  const btn = $$('.btn-analyze')[1];
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...'; }

  const res = await apiCall('/api/ai/analyze-symptoms', {
    method: 'POST', body: JSON.stringify({ disease })
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Find Matching Doctors'; }

  if (!res.ok || !res.data.success) { showToast('Search failed', 'error'); return; }

  const resultsDiv = $('aiResults');
  resultsDiv.style.display = 'block';
  $('urgencyAlert').className = 'urgency-alert urgency-low';
  $('urgencyAlert').textContent = `🔍 Showing doctors specialized in: ${disease}`;
  $('aiPredictions').innerHTML = '';
  $('aiDisclaimer')?.remove();

  const doctors = res.data.matchedDoctors || [];
  if (doctors.length > 0) {
    $('matchedDoctorsSection').style.display = '';
    $('matchedDoctors').innerHTML = doctors.map(renderDoctorCard).join('');
  } else {
    $('matchedDoctors').innerHTML = '<div class="empty-state"><i class="fas fa-user-md"></i><h3>No specialists found</h3><p>Try a different disease name</p></div>';
  }
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// ─── NEARBY SERVICES ──────────────────────────────────
function switchNearbyTab(tab, btn) {
  $$('.nearby-tab').forEach(t => t.classList.remove('active'));
  $$('.nearby-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  $(`tab-${tab}`).classList.add('active');
}

let _nearbyCity = '';
let _nearbyHospitals = [];

async function loadNearbyServices(city = '') {
  _nearbyCity = city;
  // Update city tab styles
  ['ncAll','ncHubballi','ncDharwad'].forEach(id => $(id)?.classList.remove('active'));
  const cityMap = {'':'ncAll','Hubballi':'ncHubballi','Dharwad':'ncDharwad'};
  $(cityMap[city])?.classList.add('active');

  const container = $('hospitalsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading hospitals...</p></div>';

  let url = `/api/hospitals?limit=30`;
  if (city) url += `&city=${encodeURIComponent(city)}`;
  const emerg = $('emergencyFilter')?.checked;
  if (emerg) url += `&emergency=1`;
  const search = $('hospitalSearch')?.value.trim();
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const type = $('hospitalTypeFilter')?.value;
  if (type) url += `&type=${encodeURIComponent(type)}`;

  const res = await apiCall(url);
  if (!res.ok || !res.data.success) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-hospital"></i><h3>Could not load hospitals</h3></div>';
    return;
  }

  _nearbyHospitals = res.data.hospitals;
  const ri = $('hospitalResultsInfo');
  if (ri) ri.textContent = `${_nearbyHospitals.length} hospital${_nearbyHospitals.length !== 1 ? 's' : ''} found${city ? ' in ' + city : ' in Hubballi–Dharwad'}`;

  if (_nearbyHospitals.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-hospital"></i><h3>No hospitals found</h3><p>Try changing your filters</p></div>';
    return;
  }

  container.innerHTML = _nearbyHospitals.map(h => renderHospitalCard(h)).join('');
}

let _hospitalSearchTimeout = null;
function searchHospitals() {
  clearTimeout(_hospitalSearchTimeout);
  _hospitalSearchTimeout = setTimeout(() => loadNearbyServices(_nearbyCity), 400);
}

function renderHospitalCard(h) {
  const specs = (h.specialties || []).slice(0, 5).map(s => `<span class="hosp-spec-tag">${s}</span>`).join('');
  const specsBlock = specs ? `<div class="hosp-spec-row">${specs}</div>` : '';
  const typeIcon = h.type === 'Government' ? 'fa-landmark' : h.type === 'Trust' ? 'fa-hands-helping' : 'fa-hospital-alt';
  const areaText = h.area ? `, ${h.area}` : '';
  const emergBadge = h.emergency
    ? `<span class="hosp-emerg-badge"><i class="fas fa-ambulance"></i> 24/7 Emergency</span>`
    : '';
  const bedsBadge = h.bed_count
    ? `<span class="hosp-meta-chip"><i class="fas fa-bed"></i> ${h.bed_count} Beds</span>`
    : '';
  const icuBadge = h.icu_available
    ? `<span class="hosp-meta-chip"><i class="fas fa-procedures"></i> ICU</span>`
    : '';
  const accBadge = h.accreditation
    ? `<span class="hosp-meta-chip"><i class="fas fa-certificate"></i> ${h.accreditation}</span>`
    : '';
  const metaRow = (emergBadge || bedsBadge || icuBadge || accBadge)
    ? `<div class="hosp-meta-row">${emergBadge}${bedsBadge}${icuBadge}${accBadge}</div>` : '';

  const phoneHtml = h.phone
    ? `<a href="tel:${h.phone}" class="hosp-btn hosp-btn-call"><i class="fas fa-phone"></i> ${h.phone}</a>`
    : '';
  const mapsHtml = h.google_maps_url
    ? `<a href="${h.google_maps_url}" target="_blank" class="hosp-btn hosp-btn-dir"><i class="fas fa-directions"></i> Directions</a>`
    : `<button class="hosp-btn hosp-btn-dir" onclick="openDirections('${h.name.replace(/'/g,"\\'")}')"><i class="fas fa-directions"></i> Directions</button>`;

  return `
  <div class="hd-hospital-card">
    <div class="hd-hospital-top">
      <div class="hd-hosp-avatar"><i class="fas ${typeIcon}"></i></div>
      <div class="hd-hospital-header-info">
        <div class="hd-hospital-name">${h.name}</div>
        <div class="hd-hospital-type">${h.type}${h.category && h.category !== h.type ? ' · ' + h.category : ''}</div>
        <div class="hd-hospital-loc"><i class="fas fa-map-marker-alt"></i> ${h.city}${areaText}</div>
      </div>
    </div>
    ${metaRow}
    ${specsBlock}
    <div class="hd-hospital-actions">
      <button class="hosp-btn hosp-btn-view" onclick="showHospitalProfile(${h.id})"><i class="fas fa-info-circle"></i> View Details</button>
      <button class="hosp-btn hosp-btn-docs" onclick="showPage('findDoctors');setDoctorCity('${h.city}')"><i class="fas fa-user-md"></i> Find Doctors</button>
      ${phoneHtml}
      ${mapsHtml}
    </div>
  </div>`;
}

async function showHospitalProfile(hospitalId) {
  openModal('hospitalProfileModal');
  const content = $('hospitalProfileContent');
  content.innerHTML = '<div class="loading-state" style="padding:60px 20px"><div class="spinner"></div><p>Loading hospital profile...</p></div>';

  const res = await apiCall(`/api/hospitals/${hospitalId}`);
  if (!res.ok || !res.data.success) {
    content.innerHTML = '<div class="empty-state" style="padding:40px"><i class="fas fa-hospital"></i><h3>Hospital not found</h3></div>';
    return;
  }

  const h = res.data.hospital;
  const doctors = res.data.doctors || [];

  const specs = (h.specialties || []).map(s => `<span class="hosp-spec-tag">${s}</span>`).join('');
  const facilities = (h.facilities || []).map(f => `<span class="hosp-meta-chip"><i class="fas fa-check-circle" style="color:var(--secondary)"></i> ${f}</span>`).join('');

  // Badges row
  const badges = [
    h.emergency ? `<span class="hosp-emerg-badge"><i class="fas fa-ambulance"></i> 24/7 Emergency</span>` : '',
    h.bed_count ? `<span class="hosp-meta-chip"><i class="fas fa-bed"></i> ${h.bed_count} Beds</span>` : '',
    h.icu_available ? `<span class="hosp-meta-chip"><i class="fas fa-procedures"></i> ICU</span>` : '',
    h.blood_bank ? `<span class="hosp-meta-chip"><i class="fas fa-tint"></i> Blood Bank</span>` : '',
    h.ambulance ? `<span class="hosp-meta-chip"><i class="fas fa-ambulance"></i> Ambulance</span>` : '',
    h.accreditation ? `<span class="hosp-meta-chip"><i class="fas fa-certificate"></i> ${h.accreditation}</span>` : '',
  ].filter(Boolean).join('');

  const doctorsHtml = doctors.length ? `
    <div class="dp-section">
      <h4><i class="fas fa-user-md"></i> Doctors at This Hospital</h4>
      <div class="hp-doctors-list">
        ${doctors.map(d => `
          <div class="hp-doc-row" onclick="closeModal('hospitalProfileModal');showDoctorProfile(${d.id})">
            <div class="hp-doc-avatar">${d.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
            <div>
              <div class="hp-doc-name">${d.name}${d.is_verified ? ' <i class="fas fa-check-circle" style="color:var(--primary);font-size:0.75rem"></i>' : ''}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${d.specialization}${d.opd_days && d.opd_days.length ? ' · OPD: ' + d.opd_days.join(', ') : ''}</div>
            </div>
            <i class="fas fa-chevron-right" style="margin-left:auto;color:var(--text-muted);font-size:0.75rem"></i>
          </div>`).join('')}
      </div>
    </div>` : '';

  const phoneHtml = h.phone ? `<a href="tel:${h.phone}" class="hosp-btn hosp-btn-call"><i class="fas fa-phone"></i> ${h.phone}</a>` : '';
  const websiteHtml = h.website ? `<a href="${h.website}" target="_blank" class="hosp-btn hosp-btn-dir" style="text-decoration:none"><i class="fas fa-globe"></i> Website</a>` : '';
  const mapsHtml = h.google_maps_url
    ? `<a href="${h.google_maps_url}" target="_blank" class="hosp-btn hosp-btn-dir"><i class="fas fa-directions"></i> Directions</a>`
    : `<button class="hosp-btn hosp-btn-dir" onclick="openDirections('${(h.name||'').replace(/'/g,"\\'")}')"><i class="fas fa-directions"></i> Get Directions</button>`;

  content.innerHTML = `
    <div class="hospital-profile-inner">
      <div class="hp-header">
        <div class="hp-header-icon"><i class="fas fa-hospital-alt"></i></div>
        <div style="flex:1;min-width:0">
          <h2 style="margin:0 0 3px;font-size:1.15rem;line-height:1.3">${h.name}${h.short_name ? ` <small style="font-weight:500;color:var(--text-muted)">(${h.short_name})</small>` : ''}</h2>
          <div class="hp-type-city">${h.type}${h.category && h.category !== h.type ? ' · ' + h.category : ''} <span style="margin:0 4px">·</span> <i class="fas fa-map-marker-alt"></i> ${h.city}${h.area ? ', ' + h.area : ''}</div>
        </div>
      </div>
      ${badges ? `<div class="hosp-meta-row" style="margin-bottom:12px">${badges}</div>` : ''}
      ${h.rating ? `<div class="hp-rating-row">${generateStars(h.rating)} <span>${h.rating} rating</span></div>` : ''}
      ${h.description ? `<p class="hp-desc">${h.description}</p>` : ''}

      <div class="dp-section">
        <h4><i class="fas fa-info-circle"></i> Details</h4>
        ${h.address ? `<div class="dp-row"><i class="fas fa-map-marker-alt"></i><span>${h.address}${h.pincode ? ' – ' + h.pincode : ''}</span></div>` : ''}
        ${h.opd_timings ? `<div class="dp-row"><i class="fas fa-clock"></i><span><strong>OPD:</strong> ${h.opd_timings}</span></div>` : ''}
        ${h.established_year ? `<div class="dp-row"><i class="fas fa-calendar-alt"></i><span>Established ${h.established_year}</span></div>` : ''}
      </div>

      ${h.specialties && h.specialties.length ? `
      <div class="dp-section">
        <h4><i class="fas fa-stethoscope"></i> Specialties & Departments</h4>
        <div class="hosp-spec-row">${specs}</div>
      </div>` : ''}

      ${h.facilities && h.facilities.length ? `
      <div class="dp-section">
        <h4><i class="fas fa-tools"></i> Facilities</h4>
        <div class="hd-facilities-wrap">${facilities}</div>
      </div>` : ''}

      ${doctorsHtml}

      <div class="dp-actions">${phoneHtml}${websiteHtml}${mapsHtml}</div>
      <div class="dp-verified-stamp"><i class="fas fa-shield-alt"></i> Source: ${h.source || 'Official/verified'} &nbsp;·&nbsp; Researched: ${h.last_verified || 'September 2026'}</div>
    </div>`;
}

function detectLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported', 'warning'); return; }
  showToast('Detecting your location...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      showToast('Location detected! Loading nearby services...', 'success');
      loadNearbyServices();
    },
    () => {
      showToast('Location access denied. Please enter city manually.', 'warning');
    }
  );
}

function searchNearby() {
  const city = $('nearbyLocation').value.trim();
  state.nearbyLoaded = false;
  loadNearbyServices(city);
}

function openDirections(name) {
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(name)}`, '_blank');
}

// ─── APPOINTMENTS ─────────────────────────────────────
async function loadAppointments() {
  if (!state.currentUser) {
    $('appointmentsContent').innerHTML = `
      <div class="auth-required-card">
        <i class="fas fa-lock"></i>
        <h3>Login Required</h3>
        <p>Please login to view and manage your appointments</p>
        <button class="btn-primary" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Login Now</button>
      </div>`;
    return;
  }

  const isDoctor = state.currentUser.type === 'doctor';
  const res = await apiCall(isDoctor ? '/api/appointments/doctor' : '/api/appointments/patient');
  if (!res.ok || !res.data.success) return;

  const appointments = res.data.appointments;
  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
  const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  $('appointmentsContent').innerHTML = `
    <div style="padding:28px 0">
      <div class="appointment-tabs">
        <button class="appt-tab active" onclick="switchApptTab('upcoming', this)"><i class="fas fa-calendar-check"></i> Upcoming (${upcoming.length})</button>
        <button class="appt-tab" onclick="switchApptTab('past', this)"><i class="fas fa-history"></i> Past (${past.length})</button>
      </div>
      <div id="upcoming-appts">${renderAppointments(upcoming, isDoctor)}</div>
      <div id="past-appts" style="display:none">${renderAppointments(past, isDoctor)}</div>
    </div>`;
}

function switchApptTab(tab, btn) {
  $$('.appt-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  $('upcoming-appts').style.display = tab === 'upcoming' ? '' : 'none';
  $('past-appts').style.display = tab === 'past' ? '' : 'none';
}

function renderAppointments(appointments, isDoctor) {
  if (appointments.length === 0) {
    return '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No appointments</h3><p>Book your first appointment to get started</p></div>';
  }
  return appointments.map(a => `
    <div class="appointment-card">
      <div>
        <div class="appt-doctor-name">${isDoctor ? a.patient_name : a.doctor_name || 'Doctor'}</div>
        <div class="appt-spec">${isDoctor ? `Patient` : a.specialization || ''}</div>
        <div class="appt-hospital"><i class="fas fa-hospital"></i> ${a.hospital_name || ''}</div>
        <div class="appt-details">
          <div class="appt-detail"><i class="fas fa-calendar"></i> ${formatDate(a.appointment_date)}</div>
          <div class="appt-detail"><i class="fas fa-clock"></i> ${a.appointment_time}</div>
          ${a.reason ? `<div class="appt-detail"><i class="fas fa-comment"></i> ${a.reason}</div>` : ''}
        </div>
        <div class="appt-id">Booking ID: ${a.appointment_id}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
        <span class="appt-status status-${a.status}">${a.status}</span>
        ${a.status === 'confirmed' || a.status === 'pending' ? `<button class="btn-cancel-appt" onclick="cancelAppointment(${a.id})"><i class="fas fa-times"></i> Cancel</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function cancelAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  const res = await apiCall(`/api/appointments/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status: 'cancelled' })
  });
  if (res.ok && res.data.success) {
    showToast('Appointment cancelled', 'info');
    loadAppointments();
  } else {
    showToast('Failed to cancel appointment', 'error');
  }
}

// ─── BOOKING MODAL ────────────────────────────────────
async function openBooking(doctorId) {
  if (!state.currentUser) {
    showToast('Please login to book an appointment', 'warning');
    openModal('loginModal'); return;
  }
  if (state.currentUser.type === 'doctor') {
    showToast('Doctors cannot book appointments', 'warning'); return;
  }

  const res = await apiCall(`/api/doctors/${doctorId}`);
  if (!res.ok) { showToast('Failed to load doctor info', 'error'); return; }

  const doc = res.data.doctor;
  state.currentBookingDoctor = doc;

  $('bookingDoctorName').textContent = `With ${doc.name}`;
  $('bookingDoctorInfo').innerHTML = `
    <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1.2rem;flex-shrink:0">
      ${doc.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
    </div>
    <div>
      <div style="font-weight:700;color:var(--dark)">${doc.name}</div>
      <div style="color:var(--primary);font-size:0.85rem">${doc.specialization}</div>
      <div style="color:var(--lighter);font-size:0.78rem">${doc.hospital_name || ''}, ${doc.city || ''}</div>
    </div>
  `;

  // Set min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $('bookingDate').min = tomorrow.toISOString().split('T')[0];
  $('bookingDate').value = '';
  $('timeSlots').innerHTML = '<p style="color:var(--lighter);font-size:0.85rem">Select a date first</p>';

  openModal('bookingModal');
}

function loadTimeSlots() {
  const doc = state.currentBookingDoctor;
  if (!doc) return;
  const date = $('bookingDate').value;
  if (!date) return;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[new Date(date).getDay()];
  const availableDays = doc.available_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  if (!availableDays.includes(dayName)) {
    $('timeSlots').innerHTML = '<p style="color:var(--accent);font-size:0.85rem"><i class="fas fa-times-circle"></i> Doctor not available on this day</p>';
    return;
  }

  const times = doc.available_times || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  state.selectedTime = null;
  $('timeSlots').innerHTML = times.map(t =>
    `<div class="time-slot" onclick="selectTimeSlot('${t}', this)">${t}</div>`
  ).join('');
}

function selectTimeSlot(time, el) {
  $$('.time-slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedTime = time;
}

async function confirmBooking() {
  const doc = state.currentBookingDoctor;
  const date = $('bookingDate').value;
  const errEl = $('bookingError');
  errEl.style.display = 'none';

  if (!date) { errEl.textContent = 'Please select a date'; errEl.style.display = 'flex'; return; }
  if (!state.selectedTime) { errEl.textContent = 'Please select a time slot'; errEl.style.display = 'flex'; return; }

  setLoading('bookingBtn', true);
  const res = await apiCall('/api/appointments/book', {
    method: 'POST',
    body: JSON.stringify({
      doctor_id: doc.id,
      appointment_date: date,
      appointment_time: state.selectedTime,
      reason: $('bookingReason').value,
      symptoms: $('bookingSymptoms').value ? [$('bookingSymptoms').value] : []
    })
  });
  setLoading('bookingBtn', false);

  if (res.ok && res.data.success) {
    closeModal('bookingModal');
    showToast(`Appointment confirmed for ${formatDate(date)} at ${state.selectedTime} ✅`, 'success', 5000);
    $('bookingReason').value = '';
    $('bookingSymptoms').value = '';
  } else {
    errEl.textContent = res.data.error || 'Booking failed'; errEl.style.display = 'flex';
  }
}

// ─── DASHBOARD ────────────────────────────────────────
async function loadDashboard() {
  if (!state.currentUser) {
    showPage('home'); return;
  }

  const user = state.currentUser;
  $('dashboardTitle').innerHTML = `<i class="fas fa-tachometer-alt"></i> ${user.type === 'doctor' ? 'Doctor' : 'Patient'} Dashboard`;
  $('dashboardSubtitle').textContent = `Welcome back, ${user.name}!`;

  const isDoctor = user.type === 'doctor';
  const apptRes = await apiCall(isDoctor ? '/api/appointments/doctor' : '/api/appointments/patient');
  const appointments = apptRes.ok ? (apptRes.data.appointments || []) : [];

  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
  const completed = appointments.filter(a => a.status === 'completed');

  if (isDoctor) {
    $('dashboardContent').innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#DBEAFE"><i class="fas fa-calendar-check" style="color:var(--primary);font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${upcoming.length}</div>
          <div class="dashboard-stat-label">Upcoming Appointments</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#D1FAE5"><i class="fas fa-check-circle" style="color:#059669;font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${completed.length}</div>
          <div class="dashboard-stat-label">Patients Seen</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#FEF3C7"><i class="fas fa-star" style="color:#D97706;font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${user.rating || '—'}</div>
          <div class="dashboard-stat-label">My Rating</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#F3E8FF"><i class="fas fa-stethoscope" style="color:var(--purple);font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${user.specialization || '—'}</div>
          <div class="dashboard-stat-label">Specialization</div>
        </div>
      </div>
      <div class="dashboard-tabs-bar">
        <button class="dash-tab active" onclick="switchDashTab('appointments', this)"><i class="fas fa-calendar"></i> Appointments</button>
        <button class="dash-tab" onclick="switchDashTab('prescribe', this)"><i class="fas fa-prescription"></i> Write Prescription</button>
        <button class="dash-tab" onclick="switchDashTab('upload-report', this)"><i class="fas fa-file-medical"></i> Upload Report</button>
      </div>
      <div id="dash-tab-appointments" class="dash-tab-panel active">
        <div class="dashboard-section">
          <h3><i class="fas fa-calendar-alt" style="color:var(--primary)"></i> Patient Appointments</h3>
          ${upcoming.length === 0 ? '<p style="color:var(--lighter)">No upcoming appointments</p>' :
            upcoming.slice(0, 8).map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:600;color:var(--dark)">${a.patient_name} ${a.patient_gender ? `<small style="color:var(--lighter)">(${a.patient_gender})</small>` : ''}</div>
                <div style="color:var(--light);font-size:0.82rem">${formatDate(a.appointment_date)} at ${a.appointment_time}</div>
                ${a.reason ? `<div style="color:var(--lighter);font-size:0.78rem">${a.reason}</div>` : ''}
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="appt-status status-${a.status}">${a.status}</span>
                ${a.status === 'confirmed' ? `<button class="btn-xs btn-success" onclick="markCompleted(${a.id})">✓ Done</button>` : ''}
              </div>
            </div>`).join('')}
          <div style="margin-top:16px"><button class="btn-view-all" onclick="showPage('appointments')"><i class="fas fa-arrow-right"></i> View All</button></div>
        </div>
      </div>
      <div id="dash-tab-prescribe" class="dash-tab-panel" style="display:none">
        <div class="dashboard-section">
          <h3><i class="fas fa-prescription" style="color:var(--primary)"></i> Write Prescription</h3>
          <div class="form-group"><label>Patient ID (from appointment)</label><input class="form-input" id="rx_patient_id" placeholder="Patient ID"></div>
          <div class="form-group"><label>Appointment ID (optional)</label><input class="form-input" id="rx_appt_id" placeholder="Appointment ID"></div>
          <div class="form-group"><label>Diagnosis</label><input class="form-input" id="rx_diagnosis" placeholder="Diagnosed condition"></div>
          <div id="rx_medicines_list">
            <div class="rx-medicine-row" id="rx_med_0">
              <div class="form-grid-3">
                <div class="form-group"><label>Medicine Name</label><input class="form-input" id="rx_med_name_0" placeholder="e.g. Paracetamol 500mg"></div>
                <div class="form-group"><label>Dosage</label><input class="form-input" id="rx_med_dose_0" placeholder="e.g. 1 tablet"></div>
                <div class="form-group"><label>Timing</label><select class="form-input" id="rx_med_timing_0"><option value="thrice">3x Daily (Morning/Afternoon/Night)</option><option value="twice">Twice Daily</option><option value="morning">Morning Only</option><option value="evening">Evening Only</option><option value="night">Night Only</option></select></div>
              </div>
            </div>
          </div>
          <button class="btn-secondary-hero" onclick="addMedicineRow()" style="margin:10px 0"><i class="fas fa-plus"></i> Add Another Medicine</button>
          <div class="form-group"><label>Instructions</label><textarea class="form-input" id="rx_instructions" rows="2" placeholder="e.g. Take after food, avoid alcohol..."></textarea></div>
          <div class="form-group"><label>Valid Till</label><input class="form-input" id="rx_valid" type="date"></div>
          <button class="btn-primary" onclick="submitPrescription()"><i class="fas fa-prescription"></i> Issue Prescription & Set Reminders</button>
        </div>
      </div>
      <div id="dash-tab-upload-report" class="dash-tab-panel" style="display:none">
        <div class="dashboard-section">
          <h3><i class="fas fa-file-upload" style="color:var(--primary)"></i> Upload Patient Report</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Patient ID</label><input class="form-input" id="rpt_patient_id" placeholder="Patient ID"></div>
            <div class="form-group"><label>Report Type</label><select class="form-input" id="rpt_type"><option value="blood_test">Blood Test</option><option value="urine_test">Urine Test</option><option value="xray">X-Ray</option><option value="mri">MRI</option><option value="ct_scan">CT Scan</option><option value="ecg">ECG</option><option value="ultrasound">Ultrasound</option><option value="biopsy">Biopsy</option><option value="general">General</option></select></div>
            <div class="form-group"><label>Report Title</label><input class="form-input" id="rpt_title" placeholder="e.g. CBC Blood Test Results"></div>
            <div class="form-group"><label>Report Date</label><input class="form-input" id="rpt_date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>Lab/Centre Name</label><input class="form-input" id="rpt_lab" placeholder="Laboratory name"></div>
            <div class="form-group"><label>Critical Report?</label><select class="form-input" id="rpt_critical"><option value="0">No</option><option value="1">Yes — Alert Patient</option></select></div>
          </div>
          <div class="form-group"><label>Findings / Results</label><textarea class="form-input" id="rpt_findings" rows="3" placeholder="Key findings from the report..."></textarea></div>
          <div class="form-group"><label>Description / Notes</label><textarea class="form-input" id="rpt_desc" rows="2" placeholder="Additional notes for patient..."></textarea></div>
          <div class="form-group"><label>Report File URL (paste link)</label><input class="form-input" id="rpt_file_url" placeholder="https://drive.google.com/..."></div>
          <button class="btn-primary" onclick="submitReport()"><i class="fas fa-upload"></i> Upload Report</button>
        </div>
      </div>`;
  } else {
    // Patient dashboard with tabs
    const reportsRes = await apiCall('/api/reports');
    const reports = reportsRes.ok ? (reportsRes.data.reports || []) : [];
    const remindersRes = await apiCall('/api/reminders');
    const reminders = remindersRes.ok ? (remindersRes.data.reminders || []) : [];
    const prescriptionsRes = await apiCall('/api/prescriptions');
    const prescriptions = prescriptionsRes.ok ? (prescriptionsRes.data.prescriptions || []) : [];

    const criticalReports = reports.filter(r => r.is_critical);

    $('dashboardContent').innerHTML = `
      ${criticalReports.length > 0 ? `<div class="critical-alert"><i class="fas fa-exclamation-triangle"></i> You have ${criticalReports.length} critical report(s) that require attention. <button onclick="switchDashTab('reports', document.querySelector('.dash-tab:nth-child(3)'))">View Reports</button></div>` : ''}
      <div class="dashboard-grid">
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#DBEAFE"><i class="fas fa-calendar-check" style="color:var(--primary);font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${upcoming.length}</div>
          <div class="dashboard-stat-label">Upcoming Appointments</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#D1FAE5"><i class="fas fa-user-md" style="color:#059669;font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${completed.length}</div>
          <div class="dashboard-stat-label">Doctors Consulted</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:#FEF3C7"><i class="fas fa-file-medical" style="color:#D97706;font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${reports.length}</div>
          <div class="dashboard-stat-label">Medical Reports</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat-icon" style="background:${reminders.length > 0 ? '#FEE2E2' : '#F3E8FF'}"><i class="fas fa-pills" style="color:${reminders.length > 0 ? '#DC2626' : 'var(--purple)'};font-size:1.4rem"></i></div>
          <div class="dashboard-stat-num">${reminders.length}</div>
          <div class="dashboard-stat-label">Active Reminders</div>
        </div>
      </div>
      <div class="dashboard-tabs-bar">
        <button class="dash-tab active" onclick="switchDashTab('overview', this)"><i class="fas fa-home"></i> Overview</button>
        <button class="dash-tab" onclick="switchDashTab('medications', this)"><i class="fas fa-pills"></i> Medications ${reminders.length > 0 ? `<span class="tab-badge">${reminders.length}</span>` : ''}</button>
        <button class="dash-tab" onclick="switchDashTab('reports', this)"><i class="fas fa-file-medical"></i> Reports ${criticalReports.length > 0 ? `<span class="tab-badge critical">${criticalReports.length}</span>` : ''}</button>
        <button class="dash-tab" onclick="switchDashTab('add-report', this)"><i class="fas fa-plus"></i> Add Report</button>
      </div>

      <!-- Overview Tab -->
      <div id="dash-tab-overview" class="dash-tab-panel active">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="dashboard-section">
            <h3><i class="fas fa-calendar-alt" style="color:var(--primary)"></i> Upcoming Appointments</h3>
            ${upcoming.length === 0 ? `<div class="empty-state"><i class="fas fa-calendar"></i><h3>No appointments yet</h3></div><button class="btn-primary" onclick="showPage('findDoctors')" style="margin-top:12px"><i class="fas fa-search"></i> Find Doctors</button>` :
              upcoming.slice(0, 3).map(a => `
              <div style="padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="font-weight:600;color:var(--dark)">${a.doctor_name}</div>
                <div style="color:var(--primary);font-size:0.82rem">${a.specialization}</div>
                <div style="color:var(--light);font-size:0.78rem">${formatDate(a.appointment_date)} · ${a.appointment_time}</div>
              </div>`).join('')}
            ${upcoming.length > 0 ? `<button class="btn-view-all" style="margin-top:12px" onclick="showPage('appointments')"><i class="fas fa-arrow-right"></i> View All</button>` : ''}
          </div>
          <div class="dashboard-section">
            <h3><i class="fas fa-robot" style="color:var(--purple)"></i> Quick Actions</h3>
            <div style="display:flex;flex-direction:column;gap:12px">
              <button class="btn-primary" onclick="showPage('aiChecker')"><i class="fas fa-robot"></i> Check Symptoms with AI</button>
              <button class="btn-secondary-hero" onclick="showPage('findDoctors')" style="justify-content:center"><i class="fas fa-user-md"></i> Find a Doctor</button>
              <button class="btn-secondary-hero" onclick="showPage('nearby')" style="justify-content:center"><i class="fas fa-map-marker-alt"></i> Nearby Services</button>
              <button class="btn-secondary-hero" onclick="switchDashTab('reports', document.querySelector('.dash-tab:nth-child(3)'));window.scrollTo({top:300,behavior:'smooth'})" style="justify-content:center"><i class="fas fa-file-medical"></i> My Reports</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Medications Tab -->
      <div id="dash-tab-medications" class="dash-tab-panel" style="display:none">
        <div class="dashboard-section">
          <h3><i class="fas fa-pills" style="color:#059669"></i> Active Medication Reminders</h3>
          ${reminders.length === 0 ? `
            <div class="empty-state"><i class="fas fa-pills"></i><h3>No active reminders</h3><p>Reminders are created automatically when your doctor prescribes medications</p></div>
          ` : reminders.map(r => `
            <div class="reminder-card ${r.is_active ? '' : 'reminder-inactive'}">
              <div class="reminder-card-top">
                <div class="reminder-icon"><i class="fas fa-capsules"></i></div>
                <div class="reminder-info">
                  <div class="reminder-med-name">${r.medicine_name}</div>
                  <div class="reminder-doctor">Prescribed by Dr. ${r.doctor_name}</div>
                  ${r.dosage ? `<div class="reminder-dosage"><i class="fas fa-weight"></i> ${r.dosage}</div>` : ''}
                </div>
                <div class="reminder-toggle-wrap">
                  <label class="toggle-switch">
                    <input type="checkbox" ${r.is_active ? 'checked' : ''} onchange="toggleReminder(${r.id}, this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-label">${r.is_active ? 'ON' : 'OFF'}</span>
                </div>
              </div>
              <div class="reminder-times">
                ${(r.times || []).map(t => `<span class="time-badge"><i class="fas fa-clock"></i> ${t}</span>`).join('')}
              </div>
              ${r.diagnosis ? `<div class="reminder-diagnosis">For: <strong>${r.diagnosis}</strong></div>` : ''}
            </div>
          `).join('')}
        </div>
        ${prescriptions.length > 0 ? `
        <div class="dashboard-section" style="margin-top:20px">
          <h3><i class="fas fa-prescription" style="color:var(--primary)"></i> My Prescriptions</h3>
          ${prescriptions.map(p => `
            <div class="prescription-card">
              <div class="prescription-header">
                <div>
                  <div class="prescription-doctor">Dr. ${p.doctor_name} <small class="prescription-spec">${p.specialization}</small></div>
                  ${p.diagnosis ? `<div class="prescription-diagnosis">Diagnosis: <strong>${p.diagnosis}</strong></div>` : ''}
                </div>
                <div class="prescription-date">${formatDate(p.created_at)}</div>
              </div>
              <div class="prescription-medicines">
                ${(p.medicines || []).map(m => `<div class="prescription-med"><i class="fas fa-pills"></i> <strong>${m.name}</strong> ${m.dosage ? `— ${m.dosage}` : ''} ${m.timing ? `(${m.timing})` : ''}</div>`).join('')}
              </div>
              ${p.instructions ? `<div class="prescription-instructions"><i class="fas fa-info-circle"></i> ${p.instructions}</div>` : ''}
              ${p.valid_till ? `<div class="prescription-valid"><i class="fas fa-calendar"></i> Valid till: ${formatDate(p.valid_till)}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
      </div>

      <!-- Reports Tab -->
      <div id="dash-tab-reports" class="dash-tab-panel" style="display:none">
        <div class="dashboard-section">
          <h3><i class="fas fa-file-medical" style="color:var(--primary)"></i> My Medical Reports</h3>
          ${reports.length === 0 ? `
            <div class="empty-state"><i class="fas fa-file-medical-alt"></i><h3>No reports yet</h3><p>Your doctor can upload reports, or you can add your own</p></div>
          ` : reports.map(r => `
            <div class="report-card ${r.is_critical ? 'report-critical' : ''}">
              <div class="report-card-left">
                <div class="report-icon ${r.report_type}"><i class="fas ${getReportIcon(r.report_type)}"></i></div>
                <div class="report-info">
                  <div class="report-title">${r.report_title} ${r.is_critical ? '<span class="critical-badge">⚠️ Critical</span>' : ''}</div>
                  <div class="report-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(r.report_date)}</span>
                    ${r.lab_name ? `<span><i class="fas fa-hospital"></i> ${r.lab_name}</span>` : ''}
                    ${r.doctor_name ? `<span><i class="fas fa-user-md"></i> Dr. ${r.doctor_name}</span>` : ''}
                  </div>
                  ${r.findings ? `<div class="report-findings">${r.findings}</div>` : ''}
                </div>
              </div>
              <div class="report-actions">
                ${r.file_url ? `<a href="${r.file_url}" target="_blank" class="btn-xs btn-primary-xs"><i class="fas fa-eye"></i> View</a>` : ''}
                <button class="btn-xs btn-danger-xs" onclick="deleteReport(${r.id})"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Add Report Tab -->
      <div id="dash-tab-add-report" class="dash-tab-panel" style="display:none">
        <div class="dashboard-section">
          <h3><i class="fas fa-plus-circle" style="color:var(--primary)"></i> Add Medical Report</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Report Type</label><select class="form-input" id="pat_rpt_type"><option value="blood_test">Blood Test</option><option value="urine_test">Urine Test</option><option value="xray">X-Ray</option><option value="mri">MRI</option><option value="ct_scan">CT Scan</option><option value="ecg">ECG</option><option value="ultrasound">Ultrasound</option><option value="biopsy">Biopsy</option><option value="general">General</option></select></div>
            <div class="form-group"><label>Report Title</label><input class="form-input" id="pat_rpt_title" placeholder="e.g. Annual Blood Test"></div>
            <div class="form-group"><label>Report Date</label><input class="form-input" id="pat_rpt_date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>Lab/Hospital Name</label><input class="form-input" id="pat_rpt_lab" placeholder="Lab name"></div>
          </div>
          <div class="form-group"><label>Findings / Results</label><textarea class="form-input" id="pat_rpt_findings" rows="3" placeholder="Key findings..."></textarea></div>
          <div class="form-group"><label>Description</label><textarea class="form-input" id="pat_rpt_desc" rows="2" placeholder="Additional notes..."></textarea></div>
          <div class="form-group"><label>File URL (Google Drive, etc.)</label><input class="form-input" id="pat_rpt_url" placeholder="https://..."></div>
          <button class="btn-primary" onclick="submitPatientReport()"><i class="fas fa-save"></i> Save Report</button>
        </div>
      </div>`;
  }
}

// ─── PROFILE ──────────────────────────────────────────
async function loadProfile() {
  if (!state.currentUser) {
    $('profileContent').innerHTML = `<div class="auth-required-card"><i class="fas fa-lock"></i><h3>Login Required</h3><button class="btn-primary" onclick="openModal('loginModal')">Login</button></div>`;
    return;
  }

  const user = state.currentUser;
  $('profileContent').innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading profile...</p></div>`;

  let profileData = user;
  if (user.type === 'doctor') {
    const res = await apiCall('/api/doctors/' + user.id);
    if (res.ok && res.data.success) profileData = { ...user, ...res.data.doctor };
  } else {
    const res = await apiCall('/api/patients/profile');
    if (res.ok && res.data.success) profileData = { ...user, ...res.data.patient };
  }

  const initials = profileData.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U';

  if (user.type === 'doctor') {
    $('profileContent').innerHTML = `
      <div class="profile-layout">
        <div class="profile-sidebar">
          <div class="profile-avatar-large">${profileData.profile_image ? `<img src="${profileData.profile_image}" alt="${profileData.name}">` : initials}</div>
          <div class="profile-name">${profileData.name}</div>
          <div class="profile-type"><i class="fas fa-stethoscope"></i> ${profileData.specialization || 'Doctor'}</div>
          ${profileData.is_verified ? '<div class="verified-badge" style="margin:0 auto"><i class="fas fa-check"></i> Verified Doctor</div>' : ''}
          <div style="margin-top:20px;text-align:left">
            ${profileData.hospital_name ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-hospital" style="color:var(--primary);margin-right:6px"></i>${profileData.hospital_name}</div>` : ''}
            ${profileData.city ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-map-marker-alt" style="color:var(--primary);margin-right:6px"></i>${profileData.city}, ${profileData.state || ''}</div>` : ''}
            ${profileData.experience_years ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-briefcase" style="color:var(--primary);margin-right:6px"></i>${profileData.experience_years} Years Experience</div>` : ''}
          </div>
        </div>
        <div class="profile-main">
          <div class="profile-section">
            <h3><i class="fas fa-user-md"></i> Professional Information</h3>
            <div class="form-grid-2">
              <div class="form-group"><label>Full Name</label><input class="form-input" id="prof_name" value="${profileData.name || ''}" placeholder="Your name"></div>
              <div class="form-group"><label>Phone</label><input class="form-input" id="prof_phone" value="${profileData.phone || ''}" placeholder="+91..."></div>
              <div class="form-group"><label>Specialization</label><input class="form-input" id="prof_spec" value="${profileData.specialization || ''}" readonly style="background:#f5f5f5"></div>
              <div class="form-group"><label>Experience (Years)</label><input class="form-input" id="prof_exp" type="number" value="${profileData.experience_years || ''}"></div>
              <div class="form-group"><label>Qualification</label><input class="form-input" id="prof_qual" value="${profileData.qualification || ''}"></div>
              <div class="form-group"><label>Consultation Fee (₹)</label><input class="form-input" id="prof_fee" type="number" value="${profileData.consultation_fee || ''}"></div>
              <div class="form-group"><label>Hospital Name</label><input class="form-input" id="prof_hospital" value="${profileData.hospital_name || ''}"></div>
              <div class="form-group"><label>City</label><input class="form-input" id="prof_city" value="${profileData.city || ''}"></div>
              <div class="form-group"><label>State</label><input class="form-input" id="prof_state" value="${profileData.state || ''}"></div>
              <div class="form-group"><label>Hospital Address</label><input class="form-input" id="prof_addr" value="${profileData.hospital_address || ''}"></div>
            </div>
            <div class="form-group" style="margin-top:8px"><label>Bio / About</label><textarea class="form-input form-textarea" id="prof_bio" rows="3">${profileData.bio || ''}</textarea></div>
          </div>
          <button class="btn-save" onclick="saveDoctorProfile()"><i class="fas fa-save"></i> Save Changes</button>
        </div>
      </div>`;
  } else {
    $('profileContent').innerHTML = `
      <div class="profile-layout">
        <div class="profile-sidebar">
          <div class="profile-avatar-large">${profileData.profile_image ? `<img src="${profileData.profile_image}" alt="${profileData.name}">` : initials}</div>
          <div class="profile-name">${profileData.name}</div>
          <div class="profile-type"><i class="fas fa-user"></i> Patient</div>
          <div style="margin-top:20px;text-align:left">
            ${profileData.blood_group ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-tint" style="color:red;margin-right:6px"></i>Blood Group: <strong>${profileData.blood_group}</strong></div>` : ''}
            ${profileData.gender ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-user" style="color:var(--primary);margin-right:6px"></i>${profileData.gender}</div>` : ''}
            ${profileData.dob ? `<div style="font-size:0.85rem;color:var(--mid);margin-bottom:8px"><i class="fas fa-birthday-cake" style="color:var(--primary);margin-right:6px"></i>${formatDate(profileData.dob)}</div>` : ''}
          </div>
        </div>
        <div class="profile-main">
          <div class="profile-section">
            <h3><i class="fas fa-user"></i> Personal Information</h3>
            <div class="form-grid-2">
              <div class="form-group"><label>Full Name</label><input class="form-input" id="pat_prof_name" value="${profileData.name || ''}"></div>
              <div class="form-group"><label>Phone</label><input class="form-input" id="pat_prof_phone" value="${profileData.phone || ''}"></div>
              <div class="form-group"><label>Date of Birth</label><input class="form-input" id="pat_prof_dob" type="date" value="${profileData.dob || ''}"></div>
              <div class="form-group"><label>Gender</label><select class="form-input" id="pat_prof_gender"><option value="">Select</option><option ${profileData.gender === 'Male' ? 'selected' : ''}>Male</option><option ${profileData.gender === 'Female' ? 'selected' : ''}>Female</option><option ${profileData.gender === 'Other' ? 'selected' : ''}>Other</option></select></div>
              <div class="form-group"><label>Blood Group</label><select class="form-input" id="pat_prof_blood"><option>Select</option><option ${profileData.blood_group === 'A+' ? 'selected' : ''}>A+</option><option ${profileData.blood_group === 'A-' ? 'selected' : ''}>A-</option><option ${profileData.blood_group === 'B+' ? 'selected' : ''}>B+</option><option ${profileData.blood_group === 'B-' ? 'selected' : ''}>B-</option><option ${profileData.blood_group === 'O+' ? 'selected' : ''}>O+</option><option ${profileData.blood_group === 'O-' ? 'selected' : ''}>O-</option><option ${profileData.blood_group === 'AB+' ? 'selected' : ''}>AB+</option><option ${profileData.blood_group === 'AB-' ? 'selected' : ''}>AB-</option></select></div>
              <div class="form-group"><label>City</label><input class="form-input" id="pat_prof_city" value="${profileData.city || ''}"></div>
              <div class="form-group"><label>State</label><input class="form-input" id="pat_prof_state" value="${profileData.state || ''}"></div>
              <div class="form-group"><label>Address</label><input class="form-input" id="pat_prof_addr" value="${profileData.address || ''}"></div>
            </div>
          </div>
          <button class="btn-save" onclick="savePatientProfile()"><i class="fas fa-save"></i> Save Changes</button>
        </div>
      </div>`;
  }
}

async function saveDoctorProfile() {
  const body = {
    name: $('prof_name').value.trim(),
    phone: $('prof_phone').value,
    experience_years: parseInt($('prof_exp').value) || 0,
    qualification: $('prof_qual').value,
    consultation_fee: parseFloat($('prof_fee').value) || 0,
    hospital_name: $('prof_hospital').value,
    city: $('prof_city').value,
    state: $('prof_state').value,
    hospital_address: $('prof_addr').value,
    bio: $('prof_bio').value
  };

  const res = await apiCall('/api/doctors/profile', { method: 'PUT', body: JSON.stringify(body) });
  if (res.ok && res.data.success) {
    showToast('Profile updated successfully! ✅', 'success');
    state.currentUser.name = body.name;
    localStorage.setItem('md_user', JSON.stringify(state.currentUser));
    $('dropUserName').textContent = body.name;
  } else {
    showToast(res.data.error || 'Update failed', 'error');
  }
}

async function savePatientProfile() {
  const body = {
    name: $('pat_prof_name').value.trim(),
    phone: $('pat_prof_phone').value,
    dob: $('pat_prof_dob').value,
    gender: $('pat_prof_gender').value,
    blood_group: $('pat_prof_blood').value,
    city: $('pat_prof_city').value,
    state: $('pat_prof_state').value,
    address: $('pat_prof_addr').value
  };

  const res = await apiCall('/api/patients/profile', { method: 'PUT', body: JSON.stringify(body) });
  if (res.ok && res.data.success) {
    showToast('Profile updated successfully! ✅', 'success');
    state.currentUser.name = body.name;
    localStorage.setItem('md_user', JSON.stringify(state.currentUser));
    $('dropUserName').textContent = body.name;
  } else {
    showToast(res.data.error || 'Update failed', 'error');
  }
}

// ─── MY PROFILE PAGE (Bottom Nav) ────────────────────
// Full structured patient profile accessible from bottom nav
async function loadMyProfilePage() {
  const container = $('myProfileContent');
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = `
      <div class="auth-required-card">
        <i class="fas fa-user-circle" style="font-size:3rem;color:var(--primary);margin-bottom:16px"></i>
        <h3>Sign In to View Your Profile</h3>
        <p>Access your medical history, appointments, and health records</p>
        <button class="btn-primary" onclick="openModal('loginModal')">
          <i class="fas fa-sign-in-alt"></i> Sign In
        </button>
        <button class="btn-secondary-hero" onclick="openModal('registerModal')" style="margin-top:10px;justify-content:center">
          <i class="fas fa-user-plus"></i> Create Account
        </button>
      </div>`;
    return;
  }

  const user = state.currentUser;
  container.innerHTML = '<div class="loading-state" style="padding:60px 20px"><div class="spinner"></div><p>Loading profile...</p></div>';

  // Load patient profile data
  let profileData = {};
  let appointments = [];
  let reports = [];

  try {
    if (user.type === 'patient') {
      const [profRes, apptRes, rptRes] = await Promise.all([
        apiCall('/api/patients/profile'),
        apiCall('/api/appointments/patient'),
        apiCall('/api/reports')
      ]);
      if (profRes.ok && profRes.data.success) profileData = profRes.data.patient;
      if (apptRes.ok && apptRes.data.success) appointments = apptRes.data.appointments || [];
      if (rptRes.ok && rptRes.data.reports) reports = rptRes.data.reports || [];
    } else {
      const profRes = await apiCall('/api/doctors/profile');
      if (profRes.ok && profRes.data.success) profileData = profRes.data.doctor || {};
    }
  } catch(e) {}

  const initials = (profileData.name || user.name || 'U').split(' ').filter(Boolean).map(n=>n[0]).join('').substring(0,2).toUpperCase();
  const upcoming = appointments.filter(a => ['pending','confirmed'].includes(a.status));
  const past = appointments.filter(a => ['completed','cancelled'].includes(a.status));

  if (user.type === 'doctor') {
    // Doctor profile — redirect to existing profile page
    showPage('profile');
    return;
  }

  container.innerHTML = `
    <div class="my-profile-page">
      <!-- Profile Header Card -->
      <div class="mp-header-card">
        <div class="mp-avatar">${profileData.profile_image
          ? `<img src="${profileData.profile_image}" alt="Profile">`
          : initials}
        </div>
        <div class="mp-header-info">
          <h2 class="mp-name">${profileData.name || user.name}</h2>
          <div class="mp-type"><i class="fas fa-user"></i> Patient</div>
          ${profileData.blood_group ? `<div class="mp-blood"><i class="fas fa-tint" style="color:#e53e3e"></i> ${profileData.blood_group}</div>` : ''}
          ${profileData.city ? `<div class="mp-city"><i class="fas fa-map-marker-alt"></i> ${profileData.city}${profileData.state ? ', ' + profileData.state : ''}</div>` : ''}
        </div>
        <button class="mp-edit-btn" onclick="switchToProfileEdit()"><i class="fas fa-edit"></i> Edit</button>
      </div>

      <!-- Stats strip -->
      <div class="mp-stats-strip">
        <div class="mp-stat"><div class="mp-stat-num">${upcoming.length}</div><div class="mp-stat-label">Upcoming</div></div>
        <div class="mp-stat"><div class="mp-stat-num">${past.length}</div><div class="mp-stat-label">Past Visits</div></div>
        <div class="mp-stat"><div class="mp-stat-num">${reports.length}</div><div class="mp-stat-label">Records</div></div>
      </div>

      <!-- Section tabs -->
      <div class="mp-tabs">
        <button class="mp-tab active" onclick="switchMpTab('info', this)"><i class="fas fa-user"></i> Info</button>
        <button class="mp-tab" onclick="switchMpTab('health', this)"><i class="fas fa-heartbeat"></i> Health</button>
        <button class="mp-tab" onclick="switchMpTab('appts', this)"><i class="fas fa-calendar-check"></i> Appts</button>
        <button class="mp-tab" onclick="switchMpTab('records', this)"><i class="fas fa-file-medical"></i> Records</button>
        <button class="mp-tab" onclick="switchMpTab('settings', this)"><i class="fas fa-cog"></i> Settings</button>
      </div>

      <!-- Personal Info -->
      <div id="mp-panel-info" class="mp-panel active">
        <div class="mp-section-card">
          <h4><i class="fas fa-user-circle"></i> Personal Details</h4>
          <div class="mp-info-grid">
            <div class="mp-info-row"><span class="mp-info-label">Full Name</span><span class="mp-info-val">${profileData.name || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Email</span><span class="mp-info-val">${profileData.email || user.email || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Phone</span><span class="mp-info-val">${profileData.phone || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Date of Birth</span><span class="mp-info-val">${profileData.dob ? formatDate(profileData.dob) : '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Gender</span><span class="mp-info-val">${profileData.gender || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Blood Group</span><span class="mp-info-val">${profileData.blood_group || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Address</span><span class="mp-info-val">${profileData.address || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">City</span><span class="mp-info-val">${profileData.city || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">State</span><span class="mp-info-val">${profileData.state || '—'}</span></div>
            <div class="mp-info-row"><span class="mp-info-label">Pincode</span><span class="mp-info-val">${profileData.pincode || '—'}</span></div>
          </div>
          <button class="mp-action-btn" onclick="switchToProfileEdit()"><i class="fas fa-edit"></i> Edit Personal Info</button>
        </div>
      </div>

      <!-- Health Info -->
      <div id="mp-panel-health" class="mp-panel" style="display:none">
        <div class="mp-section-card">
          <h4><i class="fas fa-heartbeat"></i> Medical History</h4>
          ${(profileData.medical_history || []).length > 0
            ? `<div class="mp-tags">${profileData.medical_history.map(m => `<span class="mp-tag">${m}</span>`).join('')}</div>`
            : '<p class="mp-empty">No medical history recorded</p>'}
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-allergies"></i> Allergies</h4>
          ${(profileData.allergies || []).length > 0
            ? `<div class="mp-tags">${profileData.allergies.map(a => `<span class="mp-tag allergy">${a}</span>`).join('')}</div>`
            : '<p class="mp-empty">No allergies recorded</p>'}
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-pills"></i> Current Medications</h4>
          ${(profileData.current_medications || []).length > 0
            ? `<div class="mp-tags">${profileData.current_medications.map(m => `<span class="mp-tag med">${m}</span>`).join('')}</div>`
            : '<p class="mp-empty">No medications recorded</p>'}
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-phone-alt"></i> Emergency Contact</h4>
          ${profileData.emergency_contact
            ? (() => { try { const ec = typeof profileData.emergency_contact === 'string' ? JSON.parse(profileData.emergency_contact) : profileData.emergency_contact;
              return `<div class="mp-info-grid">
                <div class="mp-info-row"><span class="mp-info-label">Name</span><span class="mp-info-val">${ec.name || '—'}</span></div>
                <div class="mp-info-row"><span class="mp-info-label">Relation</span><span class="mp-info-val">${ec.relation || '—'}</span></div>
                <div class="mp-info-row"><span class="mp-info-label">Phone</span><span class="mp-info-val">${ec.phone ? `<a href="tel:${ec.phone}">${ec.phone}</a>` : '—'}</span></div>
              </div>`; } catch(e){ return '<p class="mp-empty">No emergency contact recorded</p>'; } })()
            : '<p class="mp-empty">No emergency contact recorded</p>'}
          <button class="mp-action-btn" onclick="switchToProfileEdit()"><i class="fas fa-edit"></i> Update Health Info</button>
        </div>
      </div>

      <!-- Appointments -->
      <div id="mp-panel-appts" class="mp-panel" style="display:none">
        <div class="mp-section-card">
          <h4><i class="fas fa-calendar-check"></i> Upcoming Appointments (${upcoming.length})</h4>
          ${upcoming.length === 0
            ? `<div class="empty-state" style="padding:24px 0"><i class="fas fa-calendar"></i><h3>No upcoming appointments</h3><p>Book your first appointment</p></div>
               <button class="mp-action-btn" onclick="showPage('findDoctors')"><i class="fas fa-search"></i> Find Doctors</button>`
            : upcoming.map(a => `
              <div class="mp-appt-row">
                <div class="mp-appt-avatar">${(a.doctor_name || 'D').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
                <div class="mp-appt-info">
                  <div class="mp-appt-name">${a.doctor_name || 'Doctor'}</div>
                  <div class="mp-appt-spec">${a.specialization || ''}</div>
                  <div class="mp-appt-date"><i class="fas fa-calendar"></i> ${formatDate(a.appointment_date)} · ${a.appointment_time}</div>
                </div>
                <span class="appt-status status-${a.status}">${a.status}</span>
              </div>`).join('')}
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-history"></i> Past Visits (${past.length})</h4>
          ${past.length === 0
            ? '<p class="mp-empty">No past appointments</p>'
            : past.slice(0,5).map(a => `
              <div class="mp-appt-row" style="opacity:0.7">
                <div class="mp-appt-avatar">${(a.doctor_name || 'D').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
                <div class="mp-appt-info">
                  <div class="mp-appt-name">${a.doctor_name || 'Doctor'}</div>
                  <div class="mp-appt-date"><i class="fas fa-calendar"></i> ${formatDate(a.appointment_date)}</div>
                </div>
                <span class="appt-status status-${a.status}">${a.status}</span>
              </div>`).join('')}
          ${past.length > 5 ? `<button class="mp-action-btn" onclick="showPage('appointments')" style="margin-top:12px"><i class="fas fa-arrow-right"></i> View All Appointments</button>` : ''}
        </div>
      </div>

      <!-- Records -->
      <div id="mp-panel-records" class="mp-panel" style="display:none">
        <div class="mp-section-card">
          <h4><i class="fas fa-file-medical-alt"></i> Health Records (${reports.length})</h4>
          ${reports.length === 0
            ? '<div class="empty-state" style="padding:24px 0"><i class="fas fa-file-medical-alt"></i><h3>No records yet</h3><p>Upload lab reports or access via your dashboard</p></div>'
            : reports.slice(0,8).map(r => `
              <div class="mp-record-row">
                <i class="fas fa-file-medical mp-record-icon"></i>
                <div class="mp-record-info">
                  <div class="mp-record-title">${r.report_title || 'Medical Record'}</div>
                  <div class="mp-record-meta">${r.report_type || 'Document'} · ${r.report_date ? formatDate(r.report_date) : (r.created_at ? formatDate(r.created_at) : '')}</div>
                </div>
                ${r.file_url ? `<a href="${r.file_url}" target="_blank" class="mp-btn-view"><i class="fas fa-external-link-alt"></i></a>` : ''}
              </div>`).join('')}
          <button class="mp-action-btn" onclick="showPage('dashboard')" style="margin-top:12px"><i class="fas fa-plus"></i> Upload New Record</button>
        </div>
      </div>

      <!-- Settings -->
      <div id="mp-panel-settings" class="mp-panel" style="display:none">
        <div class="mp-section-card">
          <h4><i class="fas fa-cog"></i> Account Settings</h4>
          <div class="mp-settings-list">
            <button class="mp-setting-row" onclick="switchToProfileEdit()">
              <span><i class="fas fa-edit"></i> Edit Profile</span><i class="fas fa-chevron-right"></i>
            </button>
            <button class="mp-setting-row" onclick="showPage('appointments')">
              <span><i class="fas fa-calendar-check"></i> My Appointments</span><i class="fas fa-chevron-right"></i>
            </button>
            <button class="mp-setting-row" onclick="showPage('dashboard')">
              <span><i class="fas fa-tachometer-alt"></i> My Dashboard</span><i class="fas fa-chevron-right"></i>
            </button>
            <button class="mp-setting-row" onclick="showPage('nearby')">
              <span><i class="fas fa-hospital-alt"></i> Nearby Hospitals</span><i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-shield-alt"></i> Privacy & Legal</h4>
          <div class="mp-settings-list">
            <button class="mp-setting-row" onclick="showPrivacyPolicy()">
              <span><i class="fas fa-lock"></i> Privacy Policy</span><i class="fas fa-chevron-right"></i>
            </button>
            <button class="mp-setting-row" onclick="showTermsOfUse()">
              <span><i class="fas fa-file-contract"></i> Terms of Use</span><i class="fas fa-chevron-right"></i>
            </button>
            <button class="mp-setting-row" onclick="showMedDisclaimer()">
              <span><i class="fas fa-info-circle"></i> Medical Disclaimer</span><i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div class="mp-section-card">
          <h4><i class="fas fa-sign-out-alt"></i> Account Actions</h4>
          <button class="mp-action-btn danger" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
        </div>
      </div>
    </div>`;
}

function switchMpTab(tab, btn) {
  $$('.mp-tab').forEach(t => t.classList.remove('active'));
  $$('.mp-panel').forEach(p => p.style.display = 'none');
  if (btn) btn.classList.add('active');
  const panel = $(`mp-panel-${tab}`);
  if (panel) panel.style.display = 'block';
}

function switchToProfileEdit() {
  showPage('profile');
}

function showPrivacyPolicy() {
  openInfoModal('Privacy Policy', `
    <h4>Data We Collect</h4>
    <p>We collect name, email, phone, medical history, and appointment data to provide our healthcare matching service.</p>
    <h4>How We Use It</h4>
    <p>Your data is used solely to connect you with appropriate healthcare providers and manage your appointments. We do not sell your personal data.</p>
    <h4>Data Storage & Security</h4>
    <p>All data is stored securely with encryption at rest and in transit. Medical data is accessible only to you and doctors you authorize.</p>
    <h4>Your Rights</h4>
    <p>You have the right to access, correct, or delete your data. Contact us at support@mydoctors.app for data requests.</p>
    <h4>DPDPA 2023 Compliance</h4>
    <p>We follow applicable Indian data protection requirements under the Digital Personal Data Protection Act, 2023.</p>
    <h4>Contact</h4>
    <p>Privacy questions: privacy@mydoctors.app | Hubballi, Karnataka, India</p>
  `);
}

function showTermsOfUse() {
  openInfoModal('Terms of Use', `
    <h4>Acceptance</h4>
    <p>By using MyDoctor's, you agree to these terms. If you disagree, please do not use the service.</p>
    <h4>Service Description</h4>
    <p>MyDoctor's is a healthcare marketplace connecting patients with doctors. We are not a medical provider.</p>
    <h4>User Responsibilities</h4>
    <p>You are responsible for providing accurate information. Do not use this platform for emergencies — call 112.</p>
    <h4>AI Features</h4>
    <p>AI symptom analysis is for informational purposes only. It does not constitute a medical diagnosis.</p>
    <h4>Appointments</h4>
    <p>Booking through MyDoctor's is a scheduling service. The medical relationship is between you and your doctor.</p>
    <h4>Limitation of Liability</h4>
    <p>MyDoctor's is not liable for medical outcomes. Always consult a qualified healthcare professional for medical decisions.</p>
  `);
}

function showMedDisclaimer() {
  openInfoModal('Medical Disclaimer', `
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:16px">
      <strong>⚠️ IMPORTANT: This is NOT a medical service</strong>
    </div>
    <p><strong>MyDoctor's AI features provide general health information only.</strong></p>
    <ul>
      <li>AI symptom analysis does NOT replace professional medical diagnosis</li>
      <li>Confidence percentages shown are symptom match scores, not diagnostic accuracy</li>
      <li>Do NOT rely on this app for emergency medical decisions</li>
      <li>Always consult a qualified, registered medical professional for health concerns</li>
      <li>For emergencies, call 112 immediately or go to your nearest hospital</li>
    </ul>
    <p>Doctor profiles are based on publicly available information and user submissions. Verify credentials independently before making healthcare decisions.</p>
    <p><em>MyDoctor's does not hold any medical license and is not responsible for clinical outcomes.</em></p>
  `);
}

function openInfoModal(title, content) {
  // Create or reuse a generic info modal
  let modal = $('infoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'infoModal';
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeModal('infoModal'); };
    modal.innerHTML = `
      <div class="modal-box" style="max-width:520px;max-height:85vh;overflow-y:auto">
        <div class="modal-header">
          <h2 id="infoModalTitle"></h2>
          <button class="modal-close" onclick="closeModal('infoModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="infoModalBody"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  $('infoModalTitle').textContent = title;
  $('infoModalBody').innerHTML = content;
  openModal('infoModal');
}

// ─── INTERSECTION OBSERVER (stats) ───────────────────
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.5 });

// ─── KEYBOARD SHORTCUTS ──────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal-overlay.open').forEach(m => closeModal(m.id));
    $('userDropdown')?.classList.remove('open');
    $('navMenu').classList.remove('open');
    $('hamburger').classList.remove('active');
  }
});

// ─── DASHBOARD TABS ───────────────────────────────────
function switchDashTab(tab, btn) {
  $$('.dash-tab').forEach(t => t.classList.remove('active'));
  $$('.dash-tab-panel').forEach(p => p.style.display = 'none');
  if (btn) btn.classList.add('active');
  const panel = $(`dash-tab-${tab}`);
  if (panel) panel.style.display = 'block';
}

// ─── REPORT HELPERS ───────────────────────────────────
function getReportIcon(type) {
  const icons = {
    blood_test: 'fa-tint', urine_test: 'fa-flask', xray: 'fa-x-ray',
    mri: 'fa-brain', ct_scan: 'fa-circle-notch', ecg: 'fa-heartbeat',
    ultrasound: 'fa-wave-square', biopsy: 'fa-microscope', general: 'fa-file-medical'
  };
  return icons[type] || 'fa-file-medical';
}

async function submitReport() {
  const body = {
    patient_id: $('rpt_patient_id').value.trim(),
    report_type: $('rpt_type').value,
    report_title: $('rpt_title').value.trim(),
    report_date: $('rpt_date').value,
    lab_name: $('rpt_lab').value,
    findings: $('rpt_findings').value,
    description: $('rpt_desc').value,
    file_url: $('rpt_file_url').value,
    is_critical: parseInt($('rpt_critical').value) || 0
  };
  if (!body.patient_id || !body.report_title) { showToast('Patient ID and title required', 'warning'); return; }
  const res = await apiCall('/api/reports', { method: 'POST', body: JSON.stringify(body) });
  if (res.ok && res.data.success) {
    showToast('Report uploaded successfully! ✅', 'success');
    $('rpt_title').value = ''; $('rpt_patient_id').value = ''; $('rpt_findings').value = ''; $('rpt_desc').value = ''; $('rpt_file_url').value = '';
  } else {
    showToast(res.data.error || 'Upload failed', 'error');
  }
}

async function submitPatientReport() {
  const body = {
    report_type: $('pat_rpt_type').value,
    report_title: $('pat_rpt_title').value.trim(),
    report_date: $('pat_rpt_date').value,
    lab_name: $('pat_rpt_lab').value,
    findings: $('pat_rpt_findings').value,
    description: $('pat_rpt_desc').value,
    file_url: $('pat_rpt_url').value
  };
  if (!body.report_title) { showToast('Report title is required', 'warning'); return; }
  const res = await apiCall('/api/reports', { method: 'POST', body: JSON.stringify(body) });
  if (res.ok && res.data.success) {
    showToast('Report saved! ✅', 'success');
    // Refresh dashboard
    loadDashboard();
  } else {
    showToast(res.data.error || 'Save failed', 'error');
  }
}

async function deleteReport(id) {
  if (!confirm('Delete this report?')) return;
  const res = await apiCall('/api/reports/' + id, { method: 'DELETE' });
  if (res.ok) { showToast('Report deleted', 'info'); loadDashboard(); }
}

// ─── PRESCRIPTION HELPERS ─────────────────────────────
let rxMedCount = 1;
function addMedicineRow() {
  const idx = rxMedCount++;
  const row = document.createElement('div');
  row.className = 'rx-medicine-row';
  row.id = `rx_med_${idx}`;
  row.innerHTML = `
    <div class="form-grid-3">
      <div class="form-group"><label>Medicine Name</label><input class="form-input" id="rx_med_name_${idx}" placeholder="Medicine name"></div>
      <div class="form-group"><label>Dosage</label><input class="form-input" id="rx_med_dose_${idx}" placeholder="e.g. 1 tablet"></div>
      <div class="form-group"><label>Timing</label>
        <select class="form-input" id="rx_med_timing_${idx}">
          <option value="thrice">3x Daily</option><option value="twice">Twice Daily</option>
          <option value="morning">Morning</option><option value="evening">Evening</option><option value="night">Night</option>
        </select>
      </div>
    </div>
    <button onclick="document.getElementById('rx_med_${idx}').remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.8rem;margin-bottom:8px"><i class="fas fa-times"></i> Remove</button>`;
  $('rx_medicines_list').appendChild(row);
}

async function submitPrescription() {
  const patient_id = $('rx_patient_id').value.trim();
  if (!patient_id) { showToast('Patient ID required', 'warning'); return; }

  const medicines = [];
  $$('[id^="rx_med_name_"]').forEach(input => {
    const idx = input.id.replace('rx_med_name_', '');
    const name = input.value.trim();
    if (name) {
      medicines.push({
        name,
        dosage: $(`rx_med_dose_${idx}`)?.value || '',
        timing: $(`rx_med_timing_${idx}`)?.value || 'thrice',
        frequency: 'daily'
      });
    }
  });

  if (medicines.length === 0) { showToast('Add at least one medicine', 'warning'); return; }

  const body = {
    patient_id,
    appointment_id: $('rx_appt_id').value.trim() || null,
    diagnosis: $('rx_diagnosis').value.trim(),
    medicines,
    instructions: $('rx_instructions').value.trim(),
    valid_till: $('rx_valid').value || null
  };

  const res = await apiCall('/api/prescriptions', { method: 'POST', body: JSON.stringify(body) });
  if (res.ok && res.data.success) {
    showToast('Prescription issued & reminders set for patient! ✅', 'success', 5000);
    $('rx_patient_id').value = ''; $('rx_diagnosis').value = ''; $('rx_instructions').value = '';
    $$('[id^="rx_med_name_"]').forEach(i => i.value = '');
  } else {
    showToast(res.data.error || 'Failed to issue prescription', 'error');
  }
}

// ─── REMINDER TOGGLE ──────────────────────────────────
async function toggleReminder(id, isActive) {
  const res = await apiCall(`/api/reminders/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ is_active: isActive }) });
  if (res.ok) showToast(isActive ? 'Reminder activated ✅' : 'Reminder paused', 'info');
  else showToast('Failed to update reminder', 'error');
}

// ─── MARK APPOINTMENT COMPLETED ───────────────────────
async function markCompleted(id) {
  const res = await apiCall(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
  if (res.ok) { showToast('Appointment marked as completed ✅', 'success'); loadDashboard(); }
}

// ─── MEDICATION NOTIFICATIONS ─────────────────────────
async function checkMedicationReminders() {
  if (!state.currentUser || state.currentUser.type !== 'patient') return;
  const res = await apiCall('/api/reminders');
  if (!res.ok || !res.data.reminders) return;

  const reminders = res.data.reminders.filter(r => r.is_active);
  if (reminders.length === 0) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const reminder of reminders) {
    for (const t of (reminder.times || [])) {
      const diff = Math.abs(timeToMinutes(currentTime) - timeToMinutes(t));
      const lastKey = `reminded_${reminder.id}_${t}_${now.toDateString()}`;
      if (diff <= 10 && !sessionStorage.getItem(lastKey)) {
        sessionStorage.setItem(lastKey, '1');
        showToast(`💊 Time to take: ${reminder.medicine_name}${reminder.dosage ? ` — ${reminder.dosage}` : ''}`, 'info', 8000);
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💊 Medication Reminder — MyDoctor's`, {
            body: `Time to take ${reminder.medicine_name}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
            icon: '/static/icon.png'
          });
        }
      }
    }
  }
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast('Medication notifications enabled 🔔', 'success');
  }
}

// ─── AI CHATBOT ───────────────────────────────────────
const chatState = {
  isOpen: false,
  sessionId: null,
  isTyping: false,
  history: []   // local conversation history for context
};

function toggleChatbot() {
  chatState.isOpen = !chatState.isOpen;
  const win = $('chatbotWindow');
  const openIcon = document.querySelector('.chatbot-open-icon');
  const closeIcon = document.querySelector('.chatbot-close-icon');
  win.style.display = chatState.isOpen ? 'flex' : 'none';
  if (openIcon) openIcon.style.display = chatState.isOpen ? 'none' : '';
  if (closeIcon) closeIcon.style.display = chatState.isOpen ? '' : 'none';
  $('chatBadge').style.display = 'none';
  if (chatState.isOpen) setTimeout(() => $('chatInput')?.focus(), 200);
}

function sendQuickReply(text) {
  $('chatInput').value = text;
  sendChatMessage();
}

/**
 * Convert basic markdown-like syntax to HTML for chat bubbles.
 * Handles: **bold**, *italic*, bullet lines (•), newlines, numbered lists
 */
function formatChatMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*((?!\*)[^*]+)\*/g, '<em>$1</em>')
    // Bullet points: lines starting with •
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    // Numbered list: lines starting with 1. 2. etc.
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>(\n)?)+/gs, (m) => `<ul>${m}</ul>`)
    // Newlines to <br>
    .replace(/\n/g, '<br>')
    // Clean up extra <br> inside lists
    .replace(/<ul><br>/g, '<ul>')
    .replace(/<\/ul><br>/g, '</ul>');
}

function appendChatMsg(role, content) {
  const msgs = $('chatbotMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;

  const formatted = formatChatMarkdown(content);

  if (role === 'bot') {
    div.innerHTML = `
      <div class="chat-avatar"><i class="fas fa-robot"></i></div>
      <div class="chat-bubble">${formatted}</div>`;
  } else {
    div.innerHTML = `
      <div class="chat-bubble">${formatted}</div>
      <div class="chat-avatar user"><i class="fas fa-user"></i></div>`;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTypingIndicator() {
  const msgs = $('chatbotMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-avatar"><i class="fas fa-robot"></i></div>
    <div class="chat-bubble typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  $('typingIndicator')?.remove();
}

// Remove quick replies after first real interaction
function removeQuickReplies() {
  $('quickReplies')?.remove();
}

async function sendChatMessage() {
  const input = $('chatInput');
  const msg = input.value.trim();
  if (!msg || chatState.isTyping) return;
  input.value = '';

  removeQuickReplies();
  appendChatMsg('user', msg);

  // Add to local history
  chatState.history.push({ role: 'user', content: msg });

  chatState.isTyping = true;
  $('chatSendBtn').disabled = true;
  $('chatSendBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  showTypingIndicator();

  try {
    const res = await apiCall('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: msg,
        session_id: chatState.sessionId,
        history: chatState.history.slice(-10)  // send last 10 turns for context
      })
    });

    removeTypingIndicator();

    if (res.ok && res.data.success) {
      chatState.sessionId = res.data.session_id;
      const reply = res.data.reply;

      // Add bot reply to local history
      chatState.history.push({ role: 'assistant', content: reply });

      // Small natural delay
      await new Promise(r => setTimeout(r, 180));
      appendChatMsg('bot', reply);
    } else {
      const errMsg = res.data?.error || "I'm having trouble right now. Please try again.";
      appendChatMsg('bot', "⚠️ " + errMsg);
    }
  } catch (e) {
    removeTypingIndicator();
    appendChatMsg('bot', '⚠️ Network issue. Please check your connection and try again.');
  }

  chatState.isTyping = false;
  $('chatSendBtn').disabled = false;
  $('chatSendBtn').innerHTML = '<i class="fas fa-paper-plane"></i>';
  $('chatInput').focus();
}

// ─── DARK / LIGHT MODE ────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('md-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = saved || preferred;
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('md-theme', next);
  updateThemeIcon(next);
  showToast(next === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on', 'info', 1800);
}

function updateThemeIcon(theme) {
  const icon = $('themeIcon');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Listen for OS-level dark/light changes (when no manual override saved)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('md-theme')) {
    const theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }
});

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // ── THEME: apply saved preference immediately ──
  initTheme();

  // Hide loading screen
  setTimeout(() => {
    $('loadingScreen')?.classList.add('fade-out');
  }, 2200);

  // Restore session
  restoreSession();

  // Load featured doctors on home
  loadFeaturedDoctors();

  // Stats observer
  const statsEl = document.querySelector('.stats-section');
  if (statsEl) statsObserver.observe(statsEl);

  // Keyboard Enter on hero search
  $('heroSearchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') heroSearch(); });
  $('heroLocationInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') heroSearch(); });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.symptom-tags-input')) hideSuggestions();
    if (!e.target.closest('.disease-search-input')) { if ($('diseaseSuggestions')) $('diseaseSuggestions').innerHTML = ''; }
    // Close user dropdown when clicking outside
    if (!e.target.closest('.user-menu')) {
      $('userDropdown')?.classList.remove('open');
    }
  });

  // Scroll-to-top + navbar scroll effect
  document.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 60;
    $('navbar')?.classList.toggle('scrolled', scrolled);

    const scrolledFar = window.scrollY > 500;
    let btn = $('scrollTopBtn');
    if (!btn && scrolledFar) {
      btn = document.createElement('button');
      btn.id = 'scrollTopBtn';
      btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
      btn.style.cssText = 'position:fixed;bottom:90px;right:22px;width:42px;height:42px;border-radius:50%;background:var(--primary);color:white;font-size:0.95rem;box-shadow:var(--shadow-lg);z-index:999;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:all 0.3s;opacity:0.9';
      btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.appendChild(btn);
    }
    if (btn) btn.style.display = scrolledFar ? 'flex' : 'none';
  });

  // Request notification permission for reminders
  setTimeout(() => requestNotificationPermission(), 5000);

  // Check medication reminders every 5 minutes
  setInterval(checkMedicationReminders, 5 * 60 * 1000);
  // Initial check after 10 seconds (after session is restored)
  setTimeout(checkMedicationReminders, 10000);

  // ── PWA: Handle ?page= deep-link shortcuts ──
  handlePWADeepLink();

  // ── PWA: Register Service Worker ──
  registerServiceWorker();

  // ── PWA: Offline/Online detection ──
  initOfflineDetection();
});

// ─── PWA DEEP LINK ────────────────────────────────────
function handlePWADeepLink() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  const validPages = ['home', 'findDoctors', 'aiChecker', 'appointments', 'nearby', 'chat', 'dashboard', 'profile'];
  if (page && validPages.includes(page)) {
    // Small delay so app finishes loading first
    setTimeout(() => showPage(page), 300);
  }
}

// ─── SERVICE WORKER REGISTRATION ──────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      console.log('[PWA] Service Worker registered, scope:', reg.scope);
      // Check for updates
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄 App updated! Refresh for the latest version.', 'info', 6000);
          }
        });
      });
    })
    .catch(err => console.warn('[PWA] SW registration failed:', err));
}

// ─── PWA INSTALL PROMPT ───────────────────────────────
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  // Don't show if user dismissed before
  if (sessionStorage.getItem('pwa-banner-dismissed')) return;
  // Show banner after 4 seconds
  setTimeout(() => showInstallBanner(), 4000);
});

// When app is successfully installed
window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  dismissInstallBanner();
  showToast('🎉 MyDoctor\'s installed successfully!', 'success', 4000);
});

function showInstallBanner() {
  const banner = $('pwaInstallBanner');
  if (banner) {
    banner.style.display = 'flex';
  }
}

function dismissInstallBanner() {
  const banner = $('pwaInstallBanner');
  if (banner) {
    banner.style.animation = 'slideUpBanner 0.3s ease reverse';
    setTimeout(() => { banner.style.display = 'none'; }, 300);
  }
  sessionStorage.setItem('pwa-banner-dismissed', '1');
}

async function triggerPWAInstall() {
  if (!_deferredInstallPrompt) {
    // iOS: show manual instructions
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      showToast('📲 Tap the Share button → "Add to Home Screen" to install', 'info', 6000);
    } else {
      showToast('💡 Use browser menu → "Install app" or "Add to Home Screen"', 'info', 5000);
    }
    dismissInstallBanner();
    return;
  }
  dismissInstallBanner();
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('🎉 Installing MyDoctor\'s...', 'success', 3000);
  }
  _deferredInstallPrompt = null;
}

// ─── OFFLINE / ONLINE DETECTION ───────────────────────
function initOfflineDetection() {
  let offlineEl = null;

  function showOfflineToast() {
    if (offlineEl) return;
    offlineEl = document.createElement('div');
    offlineEl.className = 'offline-toast';
    offlineEl.innerHTML = '<i class="fas fa-wifi-slash" style="opacity:0.8"></i> You\'re offline — cached content shown';
    document.body.appendChild(offlineEl);
  }

  function removeOfflineToast() {
    if (offlineEl) {
      offlineEl.remove();
      offlineEl = null;
      showToast('✅ Back online!', 'success', 2500);
    }
  }

  if (!navigator.onLine) showOfflineToast();

  window.addEventListener('offline', showOfflineToast);
  window.addEventListener('online', removeOfflineToast);
}

// ─── MEDBOT PAGE (page-chat) ───────────────────────────
const medbotPageState = {
  sessionId: null,
  isTyping: false,
  history: [],
  initialized: false
};

function initMedbotPage() {
  const msgs = $('medbotPageMessages');
  if (!msgs) return;
  // Focus input
  setTimeout(() => $('medbotPageInput')?.focus(), 300);
}

function medbotPageSend(text) {
  const input = $('medbotPageInput');
  const msg = (text || input?.value || '').trim();
  if (!msg || medbotPageState.isTyping) return;
  if (input) input.value = '';
  _medbotPageSendMsg(msg);
}

async function _medbotPageSendMsg(msg) {
  const msgs = $('medbotPageMessages');
  if (!msgs) return;

  // Remove quick replies row when user sends first message
  const qr = document.querySelector('.medbot-page-quick-replies');
  if (qr) qr.style.display = 'none';

  // Append user bubble
  medbotPageAppend('user', msg);
  medbotPageState.history.push({ role: 'user', content: msg });
  medbotPageState.isTyping = true;

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'chat-bubble bot medbot-page-typing';
  typing.innerHTML = '<div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-text"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const res = await apiCall('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: msg,
        session_id: medbotPageState.sessionId,
        history: medbotPageState.history.slice(-10)
      })
    });
    typing.remove();
    if (res.ok && res.data.success) {
      medbotPageState.sessionId = res.data.session_id;
      const reply = res.data.reply;
      medbotPageState.history.push({ role: 'assistant', content: reply });
      await new Promise(r => setTimeout(r, 120));
      medbotPageAppend('bot', reply);
    } else {
      medbotPageAppend('bot', '⚠️ ' + (res.data?.error || "I'm having trouble right now. Please try again."));
    }
  } catch(e) {
    typing.remove();
    medbotPageAppend('bot', '⚠️ Network issue. Please check your connection and try again.');
  }
  medbotPageState.isTyping = false;
  $('medbotPageInput')?.focus();
}

function medbotPageAppend(role, text) {
  const msgs = $('medbotPageMessages');
  if (!msgs) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  const icon = role === 'bot' ? '<div class="chat-avatar"><i class="fas fa-robot"></i></div>' : '';
  const html = formatChatMarkdown(text);
  bubble.innerHTML = role === 'bot'
    ? `${icon}<div class="chat-text">${html}</div>`
    : `<div class="chat-text">${html}</div>`;
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
}

// ─── REPORTS PAGE ──────────────────────────────────────
function loadReportsPage() {
  const gate = $('reportsAuthGate');
  const wrap = $('reportsListWrap');
  if (!state.currentUser) {   // Fixed: was state.user (wrong)
    if (gate) gate.style.display = '';
    if (wrap) wrap.innerHTML = '';
    return;
  }
  if (gate) gate.style.display = 'none';
  if (wrap) wrap.innerHTML = '<div class="loading-state" style="padding:40px 20px"><div class="spinner"></div><p>Loading records...</p></div>';
  loadReports();
}

async function loadReports() {
  const wrap = $('reportsListWrap');
  if (!wrap) return;
  try {
    const res = await apiCall('/api/reports');
    if (!res.ok) { wrap.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical-alt"></i><h3>Could not load records</h3></div>'; return; }
    const reports = res.data.reports || [];
    if (!reports.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="fas fa-file-medical-alt"></i><h3>No Records Yet</h3><p>Your uploaded prescriptions and lab reports will appear here.</p></div>`;
      return;
    }
    wrap.innerHTML = reports.map(r => `
      <div class="report-card">
        <div class="report-icon"><i class="fas fa-file-medical"></i></div>
        <div class="report-info">
          <div class="report-title">${r.title || 'Medical Record'}</div>
          <div class="report-meta">${r.type || 'Document'} &bull; ${r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''}</div>
        </div>
        <button class="btn-icon-sm" onclick="deleteReport(${r.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
      </div>`).join('');
  } catch(e) {
    wrap.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading records</h3></div>';
  }
}

async function deleteReport(id) {
  if (!confirm('Delete this record?')) return;
  await apiCall(`/api/reports/${id}`, { method: 'DELETE' });
  loadReports();
}
