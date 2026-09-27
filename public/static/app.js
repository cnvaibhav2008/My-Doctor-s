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

  // Highlight nav
  $$('.nav-link').forEach(l => {
    if (l.getAttribute('onclick')?.includes(`'${page}'`)) l.classList.add('active');
  });

  // Close mobile menu
  $('navMenu').classList.remove('open');
  $('hamburger').classList.remove('active');

  // Lazy load
  if (page === 'findDoctors') loadDoctors();
  if (page === 'appointments') loadAppointments();
  if (page === 'nearby') loadNearbyServices();
  if (page === 'dashboard') loadDashboard();
  if (page === 'profile') loadProfile();
}

function toggleMenu() {
  $('navMenu').classList.toggle('open');
  $('hamburger').classList.toggle('active');
}

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
  setTimeout(() => {
    $('specFilter').value = spec;
    searchDoctors();
  }, 300);
}

// ─── FIND DOCTORS ─────────────────────────────────────
let doctorSearchTimeout = null;

function searchDoctors() {
  clearTimeout(doctorSearchTimeout);
  doctorSearchTimeout = setTimeout(loadDoctors, 400);
}

function clearFilters() {
  $('doctorSearch').value = '';
  $('specFilter').value = '';
  $('cityFilter').value = '';
  $('sortFilter').value = 'rating';
  loadDoctors();
}

async function loadDoctors() {
  const container = $('doctorsList');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Finding doctors...</p></div>';

  const search = $('doctorSearch')?.value.trim() || '';
  const spec = $('specFilter')?.value || '';
  const city = $('cityFilter')?.value.trim() || '';

  let url = '/api/doctors?limit=50';
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (spec) url += `&specialization=${encodeURIComponent(spec)}`;
  if (city) url += `&city=${encodeURIComponent(city)}`;

  const res = await apiCall(url);
  if (!res.ok || !res.data.success) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Failed to load doctors</h3><p>Please try again</p></div>';
    return;
  }

  let doctors = res.data.doctors;
  const sort = $('sortFilter')?.value || 'rating';
  if (sort === 'rating') doctors.sort((a, b) => b.rating - a.rating);
  else if (sort === 'experience') doctors.sort((a, b) => b.experience_years - a.experience_years);
  else if (sort === 'fee_low') doctors.sort((a, b) => a.consultation_fee - b.consultation_fee);
  else if (sort === 'fee_high') doctors.sort((a, b) => b.consultation_fee - a.consultation_fee);

  $('resultsInfo').textContent = `Found ${doctors.length} doctor${doctors.length !== 1 ? 's' : ''}`;

  if (doctors.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-user-md"></i><h3>No doctors found</h3><p>Try adjusting your search filters</p></div>';
    return;
  }

  container.innerHTML = doctors.map(doc => renderDoctorListCard(doc)).join('');
}

function renderDoctorListCard(doc) {
  const initials = doc.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  const avatarContent = doc.profile_image
    ? `<img src="${doc.profile_image}" alt="${doc.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">${initials}`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;font-weight:700;border-radius:12px">${initials}</div>`;

  return `
  <div class="doctor-list-card" onclick="showDoctorDetail(${doc.id})">
    <div class="doctor-list-avatar">${avatarContent}</div>
    <div class="doctor-list-info">
      <h3>${doc.name} ${doc.is_verified ? '<span class="verified-badge"><i class="fas fa-check"></i> Verified</span>' : ''}</h3>
      <div class="doctor-list-spec"><i class="fas fa-stethoscope"></i> ${doc.specialization}</div>
      <div class="doctor-list-hospital"><i class="fas fa-hospital"></i> ${doc.hospital_name || 'Private Clinic'}, ${doc.city || ''}</div>
      <div class="doctor-list-meta">
        <div class="doctor-list-meta-item">${generateStars(doc.rating || 0)} <span>${(doc.rating || 0).toFixed(1)} (${doc.total_ratings || 0})</span></div>
        <div class="doctor-list-meta-item"><i class="fas fa-briefcase"></i> ${doc.experience_years || 0} yrs exp</div>
        <div class="doctor-list-meta-item"><i class="fas fa-graduation-cap"></i> ${doc.qualification || 'MBBS'}</div>
        ${doc.city ? `<div class="doctor-list-meta-item"><i class="fas fa-map-marker-alt"></i> ${doc.city}</div>` : ''}
      </div>
      <div class="doctor-tags" style="margin-top:8px">
        ${(doc.diseases_treated || []).slice(0, 4).map(d => `<span class="doctor-tag">${d}</span>`).join('')}
      </div>
    </div>
    <div class="doctor-list-actions">
      <div class="doctor-list-fee">
        <div class="fee-amount">₹${doc.consultation_fee || 0}</div>
        <div class="fee-label">Consultation</div>
      </div>
      <button class="btn-view-profile" onclick="event.stopPropagation();showDoctorDetail(${doc.id})"><i class="fas fa-eye"></i> View</button>
      <button class="btn-book-list" onclick="event.stopPropagation();openBooking(${doc.id})"><i class="fas fa-calendar-plus"></i> Book</button>
    </div>
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
function selectBodyPart(part, displayName) {
  state.selectedBodyPart = part;
  // Remove selected from ALL body-part groups first
  $$('.body-part').forEach(g => g.classList.remove('selected'));
  // Match by part name: e.g. 'arm' matches both 'bp-left-arm' and 'bp-right-arm'
  $$('[id^="bp-"]').forEach(g => {
    if (g.id === `bp-${part}` || g.id.includes(`-${part}`) || g.id === `bp-${part}s`) {
      g.classList.add('selected');
    }
  });
  $('selectedPartBadge').style.display = 'flex';
  $('selectedPartName').textContent = displayName;
}

function clearBodyPart() {
  state.selectedBodyPart = null;
  $$('.body-part').forEach(g => g.classList.remove('selected'));
  $('selectedPartBadge').style.display = 'none';
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
    showToast('Analysis failed. Please try again.', 'error'); return;
  }

  const { analysis, matchedDoctors } = res.data;
  displayAIResults(analysis, matchedDoctors);
}

function displayAIResults(analysis, doctors) {
  const resultsDiv = $('aiResults');
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Urgency
  const urgencyMessages = {
    emergency: { text: '🚨 EMERGENCY: Please go to the nearest hospital immediately!', cls: 'urgency-emergency' },
    high: { text: '⚠️ High Priority: Please consult a doctor as soon as possible.', cls: 'urgency-high' },
    moderate: { text: '📋 Moderate: Schedule an appointment with a doctor soon.', cls: 'urgency-moderate' },
    low: { text: '✅ Low Priority: Monitor symptoms. Consult if they persist.', cls: 'urgency-low' }
  };
  const urg = urgencyMessages[analysis.urgencyLevel] || urgencyMessages.low;
  $('urgencyAlert').className = `urgency-alert ${urg.cls}`;
  $('urgencyAlert').textContent = urg.text;

  // Predictions
  if (analysis.predictions.length === 0) {
    $('aiPredictions').innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No specific condition matched</h3><p>Try adding more detailed symptoms or consult a General Physician</p></div>';
  } else {
    $('aiPredictions').innerHTML = analysis.predictions.map(p => `
      <div class="prediction-card">
        <div>
          <div class="prediction-disease">${p.disease}</div>
          <div class="prediction-desc">${p.description}</div>
          <span class="prediction-spec"><i class="fas fa-user-md"></i> ${p.specialization}</span>
        </div>
        <div class="prediction-confidence">
          <div class="confidence-num">${p.confidence}%</div>
          <div class="confidence-label">Match</div>
          <div class="confidence-bar"><div class="confidence-fill" style="width:${p.confidence}%"></div></div>
        </div>
      </div>
    `).join('');
  }

  // Matched Doctors
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

async function loadNearbyServices(city = '') {
  if (state.nearbyLoaded && !city) return;
  const url = `/api/nearby/hospitals${city ? `?city=${encodeURIComponent(city)}` : ''}`;
  const res = await apiCall(url);
  if (!res.ok || !res.data.success) return;

  state.nearbyLoaded = true;
  const { hospitals, scanCentres, pharmacies } = res.data;
  renderHospitals(hospitals);
  renderDiagnostics(scanCentres);
  renderPharmacies(pharmacies);
}

function renderHospitals(hospitals) {
  $('hospitalsList').innerHTML = hospitals.map(h => `
    <div class="nearby-card">
      <div class="nearby-card-top">
        <div class="nearby-icon hospital"><i class="fas fa-hospital"></i></div>
        <div>
          <div class="nearby-name">${h.name}</div>
          <div class="nearby-type">${h.type}</div>
          <div class="nearby-distance"><i class="fas fa-map-marker-alt"></i> ${h.distance}</div>
        </div>
      </div>
      <div class="nearby-rating-row">${generateStars(h.rating)}<span style="font-size:0.82rem;color:var(--light)">${h.rating} Rating</span></div>
      ${h.emergency ? '<div class="nearby-badges"><span class="badge-emergency">🚨 24/7 Emergency</span></div>' : ''}
      <div class="nearby-services-tags">${(h.specialties || []).map(s => `<span class="nearby-service-tag">${s}</span>`).join('')}</div>
      <div class="nearby-actions">
        <a href="tel:${h.phone}" class="btn-call"><i class="fas fa-phone"></i> Call</a>
        <button class="btn-directions" onclick="openDirections('${h.name}')"><i class="fas fa-directions"></i> Directions</button>
      </div>
    </div>
  `).join('');
}

function renderDiagnostics(centres) {
  $('diagnosticList').innerHTML = centres.map(c => `
    <div class="nearby-card">
      <div class="nearby-card-top">
        <div class="nearby-icon diagnostic"><i class="fas fa-microscope"></i></div>
        <div>
          <div class="nearby-name">${c.name}</div>
          <div class="nearby-type">${c.type}</div>
          <div class="nearby-distance"><i class="fas fa-map-marker-alt"></i> ${c.distance}</div>
        </div>
      </div>
      <div class="nearby-rating-row">${generateStars(c.rating)}<span style="font-size:0.82rem;color:var(--light)">${c.rating} Rating</span></div>
      <div class="nearby-services-tags">${(c.services || []).map(s => `<span class="nearby-service-tag">${s}</span>`).join('')}</div>
      <div class="nearby-actions">
        <a href="tel:${c.phone}" class="btn-call"><i class="fas fa-phone"></i> Call</a>
        <button class="btn-directions" onclick="openDirections('${c.name}')"><i class="fas fa-directions"></i> Directions</button>
      </div>
    </div>
  `).join('');
}

function renderPharmacies(pharmacies) {
  $('pharmacyList').innerHTML = pharmacies.map(p => `
    <div class="nearby-card">
      <div class="nearby-card-top">
        <div class="nearby-icon pharmacy"><i class="fas fa-pills"></i></div>
        <div>
          <div class="nearby-name">${p.name}</div>
          <div class="nearby-type">${p.type}</div>
          <div class="nearby-distance"><i class="fas fa-map-marker-alt"></i> ${p.distance}</div>
        </div>
      </div>
      <div class="nearby-rating-row">${generateStars(p.rating)}<span style="font-size:0.82rem;color:var(--light)">${p.rating} Rating</span></div>
      ${p.open24 ? '<div class="nearby-badges"><span class="badge-open24">🟢 Open 24/7</span></div>' : '<div class="nearby-badges"><span style="background:#FEF3C7;color:#D97706;padding:3px 10px;border-radius:20px;font-size:0.72px;font-weight:700">⏰ Regular Hours</span></div>'}
      <div class="nearby-actions">
        <a href="tel:${p.phone}" class="btn-call"><i class="fas fa-phone"></i> Call</a>
        <button class="btn-directions" onclick="openDirections('${p.name}')"><i class="fas fa-directions"></i> Directions</button>
      </div>
    </div>
  `).join('');
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
});
