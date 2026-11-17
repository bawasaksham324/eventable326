import { gsap } from 'gsap';
import { createBackdrop } from './components/backdrop.js';
import { createSoundManager } from './utils/soundManager.js';
import { renderApp } from './components/app.js';
import { galaBooking, restaurantBooking } from './components/app.js';
import { confirmEventBooking, getGalaData, getMyEventBookings } from './services/eventService.js';
import {
  cancelRestaurantReservation,
  confirmRestaurantReservation,
  getMyRestaurantReservations,
  getAdminRestaurantReservations,
  getAdminRestaurantMetrics,
  cancelAdminRestaurantReservation,
  getRestaurant,
  getRestaurantAvailability,
} from './services/restaurantService.js';
import { createTicketQrCode } from './utils/qrCode.js';
import { cancelAdminBooking, checkInAdminTicket, getAdminDashboardData, getCurrentProfile, getPublicTicket, verifyAdminTicket } from './services/adminService.js';
import {
  getCurrentSession,
  listenToAuthChanges,
  signIn,
  signOut,
  signUp,
} from './services/authService.js';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/admin.css';
import './styles/restaurant.css';

const state = {
  screen: 'auth',
  authMode: 'login',
  soundEnabled: true,
  authBusy: false,
  authMessage: '',
  authMessageType: '',
  gala: null,
  galaLoading: false,
  galaError: '',
  galaStep: 'seats',
  selectedSeatIds: [],
  attendeeNames: {},
  couponCode: '-NOPAYMENTGATEWAY',
  galaMessage: '',
  galaMessageType: '',
  bookings: [],
  bookingsLoading: false,
  bookingsError: '',
  profile: null,
  isAdmin: false,
  adminData: null,
  adminLoading: false,
  adminError: '',
  adminSearch: '',
  adminTicket: null,
  adminMessage: '',
  adminRestaurantReservations: [],
  adminRestaurantMetrics: null,
  adminRestaurantSearch: '',
  adminRestaurantDate: '',
  adminRestaurantStatus: 'all',
  publicTicket: null,
  publicTicketLoading: false,
  publicTicketError: '',
  restaurant: null,
  restaurantLoading: false,
  restaurantError: '',
  restaurantReservations: [],
  restaurantReservationsLoading: false,
  restaurantSlots: [],
  restaurantAvailabilityLoading: false,
  restaurantDate: new Date().toISOString().slice(0, 10),
  restaurantTime: '',
  restaurantGuestCount: 2,
  restaurantPhone: '',
  restaurantCouponCode: '-NOPAYMENTGATEWAY',
  restaurantStep: 'selection',
  restaurantSuccess: null,
  restaurantMessage: '',
  restaurantMessageType: '',
};

const sound = createSoundManager();
const app = document.querySelector('#app');
const screenPaths = {
  landing: '/',
  auth: '/auth',
  dashboard: '/dashboard',
  bookings: '/bookings',
  admin: '/admin',
};

function routePathForScreen(screen) {
  return screenPaths[screen] || '/';
}

function writeRoute(path, { replace = false, from = null } = {}) {
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ eventableRoute: path, from }, '', path);
}

function navigateToScreen(screen, { replace = false } = {}) {
  if (state.screen === screen && !document.querySelector('.experience-view')) return;
  const view = document.querySelector('.experience-view');
  if (view) {
    view.remove();
    gsap.killTweensOf(view);
    gsap.to('.booking-card', { opacity: 1, scale: 1, y: 0, duration: 0.3 });
  }
  writeRoute(routePathForScreen(screen), { replace });
  state.screen = screen;
  render();
  if (screen === 'dashboard') animateDashboardEntrance();
}

function routeFromLocation() {
  const path = window.location.pathname;
  if (path.startsWith('/ticket/')) return { type: 'ticket' };
  if (path.startsWith('/experience/')) {
    const type = path.split('/')[2];
    if (type === 'gala' || type === 'lounge') return { type: 'experience', experience: type };
  }
  const screen = Object.entries(screenPaths).find(([, screenPath]) => screenPath === path)?.[0];
  return { type: 'screen', screen: screen || 'landing' };
}

function closeExperienceForHistory() {
  const view = document.querySelector('.experience-view');
  if (!view) return;
  view.remove();
  gsap.killTweensOf(view);
  gsap.to('.booking-card', { opacity: 1, scale: 1, y: 0, duration: 0.3 });
}

function applyHistoryRoute() {
  const route = routeFromLocation();
  if (route.type === 'ticket') return;
  const protectedScreen = route.type === 'screen'
    && ['dashboard', 'bookings', 'admin'].includes(route.screen);
  if (protectedScreen && (!state.profile || (route.screen === 'admin' && !state.isAdmin))) {
    closeExperienceForHistory();
    state.screen = 'auth';
    writeRoute('/auth', { replace: true });
    render();
    return;
  }
  if (route.type === 'experience') {
    if (document.querySelector('.experience-view')) return;
    state.screen = 'dashboard';
    render();
    const card = document.querySelector(`[data-experience="${route.experience}"]`);
    if (card) expandExperience(card, route.experience, { skipHistory: true });
    return;
  }
  closeExperienceForHistory();
  if (state.screen !== route.screen) {
    state.screen = route.screen;
    render();
    if (route.screen === 'dashboard') animateDashboardEntrance();
  }
}

window.addEventListener('popstate', applyHistoryRoute);

function render() {
  app.innerHTML = renderApp(state);
  bindEvents();
  if (state.screen === 'auth') {
    gsap.fromTo('.auth-intro > *, .auth-panel', { opacity: 0, y: 24 }, {
      opacity: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out',
    });

  }
}

function bindEvents() {
  document.querySelectorAll('[data-screen]').forEach((element) => {
    element.addEventListener('click', () => {
      if (element.dataset.screen === 'dashboard') {
        if (state.screen !== 'public-ticket') navigateToScreen('dashboard');
      } else if (element.dataset.screen === 'admin' && state.isAdmin) {
        openAdminDashboard();
      } else if (element.dataset.screen === 'auth') {
        navigateToScreen('auth');
      } else if (element.dataset.screen === 'landing') {
        navigateToScreen('landing');
      }
    });
  });

  document.querySelector('[data-my-bookings]')?.addEventListener('click', async () => {
    writeRoute('/bookings', { from: routePathForScreen(state.screen) });
    state.screen = 'bookings';
    state.bookingsLoading = true;
    state.bookingsError = '';
    render();
    try {
      state.bookings = await getMyEventBookings();
    } catch (error) {
      state.bookingsError = error.message;
    } finally {
      state.bookingsLoading = false;
      render();
      renderTicketQRCodes();
    }
  });

  document.querySelector('.admin-search')?.addEventListener('input', (event) => {
    state.adminSearch = event.target.value;
    render();
  });

  document.querySelector('.admin-verify-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('ticketCode') || '').trim();
    state.adminMessage = '';
    state.adminTicket = null;
    try {
      state.adminTicket = await verifyAdminTicket(code);
    } catch (error) {
      state.adminMessage = error.message;
    }
    render();
  });

  document.querySelectorAll('[data-cancel-booking]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Cancel this reservation? Its tickets will be invalidated and its seats released.')) return;
      try {
        await cancelAdminBooking(button.dataset.cancelBooking);
        state.adminData = await getAdminDashboardData();
        state.adminMessage = 'Reservation cancelled and seats released.';
        render();
      } catch (error) {
        state.adminMessage = error.message;
        render();
      }
    });
  });

  document.querySelectorAll('[data-cancel-admin-restaurant]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Cancel this restaurant reservation?')) return;
      try {
        await cancelAdminRestaurantReservation(button.dataset.cancelAdminRestaurant);
        [state.adminRestaurantReservations, state.adminRestaurantMetrics] = await Promise.all([
          getAdminRestaurantReservations(),
          getAdminRestaurantMetrics(),
        ]);
        render();
      } catch (error) {
        state.adminMessage = error.message;
        render();
      }
    });
  });

  document.querySelector('[data-admin-restaurant-search]')?.addEventListener('input', (event) => {
    state.adminRestaurantSearch = event.target.value;
    render();
  });
  document.querySelector('[data-admin-restaurant-date]')?.addEventListener('change', (event) => {
    state.adminRestaurantDate = event.target.value;
    render();
  });
  document.querySelector('[data-admin-restaurant-status]')?.addEventListener('change', (event) => {
    state.adminRestaurantStatus = event.target.value;
    render();
  });

  document.querySelector('[data-checkin-ticket]')?.addEventListener('click', async () => {
    if (!state.adminTicket) return;
    try {
      state.adminTicket = await checkInAdminTicket(state.adminTicket.ticket_code);
      state.adminMessage = 'Ticket checked in successfully.';
    } catch (error) {
      state.adminMessage = error.message;
    }
    render();
  });

  document.querySelectorAll('[data-auth-mode]').forEach((element) => {
    element.addEventListener('click', () => {
      state.authMode = element.dataset.authMode;
      state.authMessage = '';
      state.authMessageType = '';
      render();
    });
  });

  document.querySelector('.auth-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    submitAuth(form);
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    state.authBusy = true;
    state.authMessage = '';
    try {
      await signOut();
      state.authBusy = false;
      state.profile = null;
      state.isAdmin = false;
      state.screen = 'auth';
      state.authMode = 'login';
      render();
    } catch (error) {
      state.authBusy = false;
      state.authMessage = error.message;
      state.authMessageType = 'error';
      render();
    }

  });

  document.querySelector('[data-sound-toggle]')?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    sound.setEnabled(state.soundEnabled);
    sound.play('click');
    render();
  });

  document.querySelectorAll('[data-cursor-card]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      gsap.to(card, { rotateY: x * 7, rotateX: y * -7, x: x * 8, y: y * -8, duration: 0.45, ease: 'power2.out', overwrite: true });
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.5)' });
    });
    card.addEventListener('click', () => expandExperience(card, card.dataset.experience));
  });

  document.querySelectorAll('button, a').forEach((element) => {
    element.addEventListener('mouseenter', () => sound.play('hover'));
  });
}

async function renderTicketQRCodes() {
  const placeholders = document.querySelectorAll('[data-ticket-qr]');
  await Promise.all([...placeholders].map(async (placeholder) => {
    try {
      const ticket = state.bookings
        .flatMap((booking) => booking.event_tickets)
        .find((item) => item.id === placeholder.dataset.ticketQr);
      if (!ticket?.public_token) throw new Error('Ticket token unavailable.');
      const image = document.createElement('img');
      image.src = await createTicketQrCode(ticket.public_token);
      image.alt = `QR code for ticket ${ticket.ticket_code}`;
      placeholder.replaceWith(image);
    } catch {
      placeholder.textContent = 'QR unavailable';
      placeholder.classList.add('qr-error');
    }
  }));
}

async function openAdminDashboard() {
  if (state.screen !== 'admin') writeRoute('/admin', { from: routePathForScreen(state.screen) });
  state.screen = 'admin';
  state.adminLoading = true;
  state.adminError = '';
  state.adminTicket = null;
  render();
  try {
    const [adminData, restaurantReservations, restaurantMetrics] = await Promise.all([
      getAdminDashboardData(),
      getAdminRestaurantReservations(),
      getAdminRestaurantMetrics(),
    ]);
    state.adminData = adminData;
    state.adminRestaurantReservations = restaurantReservations;
    state.adminRestaurantMetrics = restaurantMetrics;
  } catch (error) {
    state.adminError = error.message;
  } finally {
    state.adminLoading = false;
    render();
  }
}

async function submitAuth(form) {
  const formData = new FormData(form);
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const needsName = state.authMode === 'signup';

  if ((needsName && !fullName) || !validEmail || password.length < 6) {
    state.authMessage = needsName && !fullName
      ? 'Enter your full name.'
      : !validEmail
        ? 'Enter a valid email address.'
        : 'Password must be at least 6 characters.';
    state.authMessageType = 'error';
    render();
    gsap.fromTo('.auth-form', { x: -5 }, { x: 5, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' });
    return;
  }

  state.authBusy = true;
  state.authMessage = '';
  state.authMessageType = '';
  render();

  try {
    if (needsName) {
      const { session } = await signUp({ fullName, email, password });
      state.authBusy = false;
      if (!session) {
        state.authMessage = 'Check your email to confirm your account, then return to log in.';
        state.authMessageType = 'success';
        state.authMode = 'login';
        render();
        return;
      }
      state.authBusy = false;
      enterDashboard();
      return;
    }

    await signIn({ email, password });
    state.authBusy = false;
    enterDashboard();
  } catch (error) {
    state.authBusy = false;
    state.authMessage = error.message;
    state.authMessageType = 'error';
    render();
  }
}

function enterDashboard() {
  state.authBusy = false;
  sound.play('whoosh');
  gsap.to('.auth-layout', {
    opacity: 0,
    y: -20,
    duration: 0.42,
    ease: 'power2.in',
    onComplete: () => {
      state.authBusy = false;
      state.authMessage = '';
      state.screen = 'dashboard';
      writeRoute('/dashboard', { replace: true });
      render();
      animateDashboardEntrance();
    },
  });
}

function animateDashboardEntrance() {
  const cards = document.querySelectorAll('.booking-card');
  if (!cards.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(cards, { opacity: 1, scale: 1, x: 0, y: 0, rotateX: 0, rotateZ: 0 });
    return;
  }
  gsap.set(cards, { opacity: 0, scale: 0.65, rotateX: 28, rotateY: 0 });
  gsap.set(cards[0], { x: -220, y: 160, rotateZ: -14 });
  gsap.set(cards[1], { x: 240, y: -130, rotateZ: 12 });
  const timeline = gsap.timeline({ delay: 0.2 });
  timeline.to(cards, {
    opacity: 1, duration: 0.7, stagger: 0.12, ease: 'power2.out',
  }).to(cards, {
    x: 0, y: 0, rotateZ: 0, scale: 1, rotateX: 0,
    duration: 1.15, stagger: 0.08, ease: 'expo.out',
  }).to(cards, {
    scale: 1.025, duration: 0.12, stagger: 0.03, ease: 'power2.out',
  }).to(cards, {
    scale: 1, duration: 0.65, stagger: 0.03, ease: 'elastic.out(1, 0.45)',
    onStart: () => sound.play('chime'),
  });
  gsap.to(cards, { y: -7, duration: 2.8, stagger: 0.3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.5 });
}

function expandExperience(card, type, { skipHistory = false } = {}) {
  if (document.querySelector('.experience-view')) return;
  if (!skipHistory) writeRoute(`/experience/${type}`, { from: routePathForScreen(state.screen) });
  sound.play('whoosh');
  state.galaSuccess = null;
  const bounds = card.getBoundingClientRect();
  const view = document.createElement('section');
  view.className = `experience-view ${type}-experience`;
  view.innerHTML = type === 'gala' ? `
    <video autoplay muted loop playsinline><source src="/assets/videos/gala-concert-crowd.mp4" type="video/mp4" /></video>
    <div class="experience-shade"></div><div class="experience-content">
      <p class="eyebrow"><span class="pulse-dot"></span> EVENT BOOKING / 01</p><h1>New Year's<br /><em>Afterdark.</em></h1>
      <p>31 DEC 2026 · 10 PM — 3 AM<br />A 360° night at The Obsidian Ballroom, Jalandhar.</p>
      <button class="button button-primary" data-enter-gala>Enter the arena <span>↗</span></button>
    </div>` : `
    <video autoplay muted loop playsinline><source src="/assets/videos/restaurant-neon-lounge.mp4" type="video/mp4" /></video>
    <div class="experience-shade"></div><div class="experience-content">
      <p class="eyebrow"><span class="pulse-dot"></span> RESTAURANT BOOKING / 02</p><h1>After hours,<br /><em>on purpose.</em></h1>
      <p>NEON LOUNGE · JALANDHAR<br />Good taste, good energy, your table waiting.</p>
      <button class="button button-primary" data-enter-restaurant>Reserve a table <span>↗</span></button>
    </div>`;
  document.body.append(view);
  const scaleX = bounds.width / window.innerWidth;
  const scaleY = bounds.height / window.innerHeight;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.set(view, { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, scale: 1, transformOrigin: 'top left' });
  gsap.to('.booking-card:not([data-experience="' + type + '"])', { opacity: 0, scale: .8, y: 40, duration: .55, ease: 'power2.in' });
  gsap.fromTo(view, { scaleX, scaleY, borderRadius: 2 }, {
    left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, scaleX: 1, scaleY: 1,
    borderRadius: 0, duration: reducedMotion ? 0.01 : 1.05, ease: 'expo.inOut',
    onComplete: () => {
      view.classList.add('is-open');
      gsap.fromTo(view.querySelectorAll('.experience-content > *'), { opacity: 0, y: 25 }, {
        opacity: 1, y: 0, duration: .65, stagger: .08, ease: 'power3.out',
      });
    },
  });
  view.querySelector('[data-back-dashboard]')?.addEventListener('click', () => returnToDashboard(view));
  view.querySelector('[data-enter-gala]')?.addEventListener('click', () => openGalaBooking(view));
  view.querySelector('[data-enter-restaurant]')?.addEventListener('click', () => openRestaurantBooking(view));
}

async function openRestaurantBooking(view) {
  state.restaurantLoading = true;
  state.restaurantError = '';
  state.restaurantSuccess = null;
  state.restaurantStep = 'selection';
  state.restaurantMessage = '';
  view.innerHTML = restaurantBooking(state);
  try {
    state.restaurant = await getRestaurant();
    state.restaurantLoading = false;
    await loadRestaurantReservations();
    await loadRestaurantSlots();
    view.innerHTML = restaurantBooking(state);
    bindRestaurantEvents(view);
  } catch (error) {
    state.restaurantLoading = false;
    state.restaurantError = error.message;
    view.innerHTML = restaurantBooking(state);
    view.querySelector('[data-restaurant-back]')?.addEventListener('click', () => closeGalaView(view));
  }
}

async function loadRestaurantReservations() {
  state.restaurantReservationsLoading = true;
  try {
    state.restaurantReservations = await getMyRestaurantReservations();
  } finally {
    state.restaurantReservationsLoading = false;
  }
}

async function loadRestaurantSlots() {
  if (!state.restaurant?.id || !state.restaurantDate) return;
  state.restaurantAvailabilityLoading = true;
  try {
    state.restaurantSlots = await getRestaurantAvailability({
      restaurantId: state.restaurant.id,
      date: state.restaurantDate,
      guestCount: state.restaurantGuestCount,
    });
  } finally {
    state.restaurantAvailabilityLoading = false;
  }
}

function bindRestaurantEvents(view) {
  view.querySelector('[data-restaurant-back]')?.addEventListener('click', () => closeGalaView(view));
  view.querySelector('[data-restaurant-date]')?.addEventListener('change', async (event) => {
    state.restaurantDate = event.target.value;
    state.restaurantTime = '';
    state.restaurantMessage = '';
    await loadRestaurantSlots();
    view.innerHTML = restaurantBooking(state);
    bindRestaurantEvents(view);
  });
  view.querySelector('[data-restaurant-guests]')?.addEventListener('change', async (event) => {
    state.restaurantGuestCount = Number(event.target.value);
    state.restaurantTime = '';
    await loadRestaurantSlots();
    view.innerHTML = restaurantBooking(state);
    bindRestaurantEvents(view);
  });
  view.querySelectorAll('[data-restaurant-slot]').forEach((slot) => {
    slot.addEventListener('click', () => {
      state.restaurantTime = new Date(slot.dataset.restaurantSlot).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      });
      state.restaurantStep = 'confirmation';
      state.restaurantMessage = '';
      view.innerHTML = restaurantBooking(state);
      bindRestaurantEvents(view);
    });
  });
  view.querySelector('[data-restaurant-edit]')?.addEventListener('click', () => {
    state.restaurantStep = 'selection';
    view.innerHTML = restaurantBooking(state);
    bindRestaurantEvents(view);
  });
  view.querySelector('[data-confirm-restaurant]')?.addEventListener('click', async () => {
    state.restaurantPhone = String(view.querySelector('[data-restaurant-phone]')?.value || '').trim();
    state.restaurantCouponCode = String(view.querySelector('[data-restaurant-coupon]')?.value || '').trim();
    if (!state.restaurantPhone) {
      state.restaurantMessage = 'Enter a phone number for the reservation.';
      state.restaurantMessageType = 'error';
      view.innerHTML = restaurantBooking(state);
      bindRestaurantEvents(view);
      return;
    }
    state.restaurantMessage = 'Confirming your table securely…';
    state.restaurantMessageType = '';
    view.innerHTML = restaurantBooking(state);
    try {
      state.restaurantSuccess = await confirmRestaurantReservation({
        restaurantId: state.restaurant.id,
        reservationDate: state.restaurantDate,
        startTime: state.restaurantTime,
        guestCount: state.restaurantGuestCount,
        phone: state.restaurantPhone,
        couponCode: state.restaurantCouponCode,
      });
      state.restaurantMessage = '';
      await loadRestaurantReservations();
      view.innerHTML = restaurantBooking(state);
      bindRestaurantEvents(view);
    } catch (error) {
      state.restaurantMessage = error.message;
      state.restaurantMessageType = 'error';
      view.innerHTML = restaurantBooking(state);
      bindRestaurantEvents(view);
    }
  });
  view.querySelectorAll('[data-cancel-restaurant]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Cancel this restaurant reservation?')) return;
      try {
        await cancelRestaurantReservation(button.dataset.cancelRestaurant);
        await loadRestaurantReservations();
        view.innerHTML = restaurantBooking(state);
        bindRestaurantEvents(view);
      } catch (error) {
        state.restaurantMessage = error.message;
        state.restaurantMessageType = 'error';
        view.innerHTML = restaurantBooking(state);
        bindRestaurantEvents(view);
      }
    });
  });
}

async function openGalaBooking(view) {
  state.galaLoading = true;
  state.galaError = '';
  state.galaStep = 'seats';
  state.selectedSeatIds = [];
  state.attendeeNames = {};
  state.galaMessage = '';
  view.innerHTML = galaBooking(state);
  try {
    state.gala = await getGalaData();
    state.galaLoading = false;
    view.innerHTML = galaBooking(state);
    bindGalaEvents(view);
  } catch (error) {
    state.galaLoading = false;
    state.galaError = error.message;
    view.innerHTML = galaBooking(state);
    view.querySelector('[data-gala-back]')?.addEventListener('click', () => closeGalaView(view));
  }
}

function bindGalaEvents(view) {
  view.querySelector('[data-gala-back]')?.addEventListener('click', () => closeGalaView(view));
  view.querySelectorAll('[data-seat-id]').forEach((seatButton) => {
    seatButton.addEventListener('click', () => {
      const seatId = seatButton.dataset.seatId;
      if (state.selectedSeatIds.includes(seatId)) {
        state.selectedSeatIds = state.selectedSeatIds.filter((id) => id !== seatId);
      } else if (state.selectedSeatIds.length < 5) {
        state.selectedSeatIds = [...state.selectedSeatIds, seatId];
      } else {
        state.galaMessage = 'Maximum 5 tickets per booking.';
        state.galaMessageType = 'error';
      }
      view.innerHTML = galaBooking(state);
      bindGalaEvents(view);
    });
  });
  view.querySelector('[data-gala-checkout]')?.addEventListener('click', () => {
    state.galaStep = 'checkout';
    state.galaMessage = '';
    view.innerHTML = galaBooking(state);
    bindGalaEvents(view);
  });
  view.querySelector('.attendee-form')?.addEventListener('input', (event) => {
    if (event.target.name) state.attendeeNames[event.target.name] = event.target.value;
  });
  view.querySelector('[data-coupon-input]')?.addEventListener('input', (event) => {
    state.couponCode = event.target.value;
  });
  view.querySelector('[data-confirm-gala]')?.addEventListener('click', () => confirmGalaBooking(view));
}

async function confirmGalaBooking(view) {
  const selected = state.gala.seats.filter((seat) => state.selectedSeatIds.includes(seat.id));
  const attendees = selected.map((seat) => ({
    seat_id: seat.id,
    attendee_name: String(state.attendeeNames[seat.id] || '').trim(),
  }));
  if (attendees.some((attendee) => attendee.attendee_name.length < 2)) {
    state.galaMessage = 'Enter a name for every selected seat.';
    state.galaMessageType = 'error';
    view.innerHTML = galaBooking(state);
    bindGalaEvents(view);
    return;
  }
  state.galaMessage = 'Confirming seats securely…';
  state.galaMessageType = '';
  view.innerHTML = galaBooking(state);
  bindGalaEvents(view);
  try {
    state.galaSuccess = await confirmEventBooking({
      eventId: state.gala.event.id,
      attendees,
      couponCode: state.couponCode,
    });
    state.galaMessage = '';
    view.innerHTML = galaBooking(state);
    view.querySelector('[data-gala-back]')?.addEventListener('click', () => closeGalaView(view));
  } catch (error) {
    state.galaMessage = error.message;
    state.galaMessageType = 'error';
    view.innerHTML = galaBooking(state);
    bindGalaEvents(view);
  }
}

function closeGalaView(view) {
  returnToDashboard(view);
}

function returnToDashboard(view) {
  state.galaSuccess = null;
  if (window.history.state?.eventableRoute?.startsWith('/experience/')) {
    if (window.history.state.from) {
      window.history.back();
      return;
    }
    writeRoute('/dashboard', { replace: true });
  }
  gsap.to(view, {
    opacity: 0, scale: .92, duration: .65, ease: 'power3.in',
    onComplete: () => { view.remove(); gsap.to('.booking-card', { opacity: 1, scale: 1, y: 0, duration: .5 }); },
  });
}

createBackdrop(document.body);
if (window.location.pathname.startsWith('/ticket/')) {
  state.screen = 'public-ticket';
  state.publicTicketLoading = true;
  render();
  getPublicTicket(decodeURIComponent(window.location.pathname.slice('/ticket/'.length)))
    .then((ticket) => { state.publicTicket = ticket; })
    .catch((error) => { state.publicTicketError = error.message; })
    .finally(() => { state.publicTicketLoading = false; render(); });
} else {
  const initialRoute = routeFromLocation();
  if (!window.history.state?.eventableRoute) {
    writeRoute(window.location.pathname, { replace: true });
  }
  render();
}

getCurrentSession()
  .then(async (session) => {
    if (session && state.screen !== 'public-ticket') {
      state.profile = await getCurrentProfile();
      state.isAdmin = state.profile?.role === 'admin';
      const initialRoute = routeFromLocation();
      if (initialRoute.type === 'experience') {
        state.screen = 'dashboard';
        render();
        const card = document.querySelector(`[data-experience="${initialRoute.experience}"]`);
        if (card) expandExperience(card, initialRoute.experience, { skipHistory: true });
      } else if (initialRoute.type === 'screen' && initialRoute.screen !== 'landing') {
        state.screen = initialRoute.screen;
        render();
        if (state.screen === 'dashboard') animateDashboardEntrance();
        if (state.screen === 'admin' && state.isAdmin) openAdminDashboard();
      } else {
        state.screen = 'dashboard';
        writeRoute('/dashboard', { replace: true });
        render();
        animateDashboardEntrance();
      }
    }
  })
  .catch((error) => {
    state.authMessage = error.message;
    state.authMessageType = 'error';
    render();
  });

listenToAuthChanges((session) => {
  if (state.authBusy) return;
  if (session && state.screen !== 'dashboard' && state.screen !== 'admin' && state.screen !== 'public-ticket') {
    getCurrentProfile().then((profile) => {
      state.profile = profile;
      state.isAdmin = profile?.role === 'admin';
      state.screen = 'dashboard';
      writeRoute('/dashboard', { replace: true });
      render();
      animateDashboardEntrance();
    }).catch((error) => {
      state.authMessage = error.message;
      state.authMessageType = 'error';
      render();
    });
  } else if (!session && (state.screen === 'dashboard' || state.screen === 'admin')) {
    state.authBusy = false;
    state.profile = null;
    state.isAdmin = false;
    state.screen = 'auth';
    state.authMode = 'login';
    state.authMessage = '';
    render();
  }
});
