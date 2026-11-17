const logo = '/assets/images/eventable-wordmark.svg';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function header(state) {
  return `
    <header class="topbar">
      <button class="brand-button" data-screen="landing" aria-label="Return to home">
        <img src="${logo}" alt="EVENTABLE" />
      </button>
      <div class="topbar-actions">
        <span class="status-chip"><i></i> VISUAL PREVIEW</span>
        ${state.isAdmin ? '<button class="icon-button" data-screen="admin">ADMIN DASHBOARD</button>' : ''}
        ${state.screen === 'dashboard' || state.screen === 'admin' ? '<button class="icon-button" data-logout>LOG OUT</button>' : ''}
        <button class="icon-button" data-sound-toggle aria-label="${state.soundEnabled ? 'Mute' : 'Unmute'} sound">
          <span>${state.soundEnabled ? '◖)' : '◖×'}</span> ${state.soundEnabled ? 'SOUND ON' : 'SOUND OFF'}
        </button>
      </div>
    </header>
  `;
}

function landing(state) {
  return `
    ${header(state)}
    <main class="landing screen-enter">
      <video class="home-video" autoplay muted loop playsinline aria-hidden="true"><source src="/assets/videos/homepage-neon-particles.mp4" type="video/mp4" /></video>
      <div class="landing-copy">
        <p class="eyebrow"><span class="pulse-dot"></span> A NEW WAY TO GO TOGETHER</p>
        <h1>Make a night<br /><em>worth remembering.</em></h1>
        <p class="hero-description">Tickets, tables, and shared moments — curated for the nights that start with a spark and end with a story.</p>
        <div class="hero-actions">
          <button class="button button-primary" data-screen="auth">Enter EVENTABLE <span>↗</span></button>
          <button class="button button-quiet" data-screen="dashboard">Preview dashboard <span>→</span></button>
        </div>
        <div class="hero-meta"><span>01</span><div></div><span>ALL SET. GO TOGETHER.</span></div>
      </div>
      <div class="landing-art" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="hero-orb"><span>NY<br /><b>26</b></span></div>
        <div class="floating-label label-top">JALANDHAR / 2026</div>
        <div class="floating-label label-bottom">TICKETS · TABLES · TOGETHER</div>
      </div>
    </main>
    <footer class="landing-footer"><span>EVENTABLE® / PHASE 01</span><span>SCROLL TO DISCOVER ↓</span></footer>
  `;
}

function auth(state) {
  const isLogin = state.authMode === 'login';
  return `
    ${header(state)}
    <main class="auth-layout screen-enter">
      <section class="auth-intro">
        <div class="auth-logo-lockup"><img src="${logo}" alt="EVENTABLE" /><span>ALL SET. GO TOGETHER.</span></div>
        <p class="eyebrow"><span class="pulse-dot"></span> YOUR NIGHT STARTS HERE</p>
        <h1>Good nights<br /><em>begin together.</em></h1>
        <p class="auth-visual-copy">A shared night is always better than an ordinary one. Enter the first chapter of EVENTABLE.</p>
        <div class="auth-visual-note"><span>“</span><p>Tickets, tables, and the people who make them matter.</p></div>
      </section>
      <section class="auth-panel">
        <div class="auth-tabs">
          <button class="${isLogin ? 'active' : ''}" data-auth-mode="login">Log in</button>
          <button class="${!isLogin ? 'active' : ''}" data-auth-mode="signup">Create account</button>
        </div>
        <p class="eyebrow">${isLogin ? 'WELCOME BACK' : 'JOIN THE MOVEMENT'}</p>
        <h2>${isLogin ? 'Enter the night.' : 'Make it official.'}</h2>
        <p class="panel-copy">${isLogin ? 'Your next shared memory is waiting.' : 'One account for every plan worth making.'}</p>
        <form class="auth-form">
          ${!isLogin ? '<label>Full name<input name="fullName" type="text" autocomplete="name" placeholder="How should we call you?" /></label>' : ''}
          <label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="••••••••" /></label>
          <button class="button button-primary" type="submit" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Connecting…' : isLogin ? 'Continue to dashboard' : 'Create account'} <span>↗</span></button>
          <p class="form-message ${state.authMessageType === 'error' ? 'is-error' : ''}" aria-live="polite">${state.authMessage || ''}</p>
        </form>
        <p class="auth-disclaimer">SECURE SUPABASE AUTH · Your password is handled by Supabase and never logged by EVENTABLE.</p>
      </section>
    </main>
  `;
}

function dashboard(state) {
  return `
    ${header(state)}
    <main class="dashboard screen-enter">
      <div class="dashboard-heading">
        <div><p class="eyebrow"><span class="pulse-dot"></span> YOUR NIGHT, YOUR WAY</p><h1>Where are we<br /><em>going together?</em></h1></div>
        <div class="dashboard-index">02 <span>/ 02</span></div>
      </div>
      <section class="booking-grid">
        <article class="booking-card gala-card" data-cursor-card data-experience="gala">
          <div class="card-media"><video autoplay muted loop playsinline poster="/assets/images/eventable-wordmark-preview.png"><source src="/assets/videos/gala-concert-crowd.mp4" type="video/mp4" /></video><div class="media-shade"></div></div>
          <div class="card-content"><p class="card-kicker">01 / THE GALA</p><h2>New Year's<br /><em>Afterdark.</em></h2><p>31 DEC 2026 · 10 PM — 3 AM</p><span class="card-link">Explore event <b>↗</b></span></div>
          <span class="card-stamp">100<br /><small>SEATS</small></span>
        </article>
        <article class="booking-card lounge-card" data-cursor-card data-experience="lounge">
          <div class="card-media"><video autoplay muted loop playsinline poster="/assets/images/restaurant-neon-interior.jpg"><source src="/assets/videos/restaurant-neon-lounge.mp4" type="video/mp4" /></video><div class="media-shade"></div></div>
          <div class="card-content"><p class="card-kicker">02 / THE LOUNGE</p><h2>After hours,<br /><em>on purpose.</em></h2><p>TABLES · TASTE · GOOD ENERGY</p><span class="card-link">Find a table <b>↗</b></span></div>
          <span class="card-stamp">90<br /><small>MIN</small></span>
        </article>
      </section>
      <div class="dashboard-footer"><span>SELECT YOUR EXPERIENCE</span><span>JALANDHAR / INDIA</span><button class="dashboard-link" data-my-bookings>↗ MY BOOKINGS</button></div>
    </main>
  `;
}

function galaBooking(state) {
  const gala = state.gala;
  if (state.galaLoading) {
    return '<div class="gala-booking-loading"><span class="pulse-dot"></span><p>Opening the ballroom…</p></div>';
  }

  function restaurantBookingMarkup(state) {
    if (state.restaurantLoading) {
      return '<div class="restaurant-loading"><span class="pulse-dot"></span><p>Preparing your table…</p></div>';
    }
    if (state.restaurantError) {
      return `<div class="restaurant-loading"><p class="form-message is-error">${state.restaurantError}</p><button class="button button-primary" data-restaurant-back>Return to experiences <span>↖</span></button></div>`;
    }
    if (state.restaurantSuccess) {
      return `<div class="restaurant-success screen-enter"><p class="eyebrow"><span class="pulse-dot"></span> RESERVATION CONFIRMED</p><h1>Your table<br /><em>is waiting.</em></h1><p>${state.restaurantSuccess.restaurant_name} · ${state.restaurantSuccess.table_number}<br />${new Date(state.restaurantSuccess.reservation_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p><button class="button button-primary" data-restaurant-back>Back to experiences <span>↖</span></button></div>`;
    }
    const restaurant = state.restaurant;
    const reservations = state.restaurantReservations || [];
    return `<div class="restaurant-booking-shell">
      <div class="restaurant-booking-head"><div><p class="eyebrow"><span class="pulse-dot"></span> NEON LOUNGE / TABLE RESERVATIONS</p><h1>After hours,<br /><em>on purpose.</em></h1><p>${restaurant.location.toUpperCase()} · ${restaurant.opening_hours.toUpperCase()}</p></div><button class="icon-button" data-restaurant-back>BACK TO EXPERIENCES ↖</button></div>
      <section class="restaurant-intro"><div class="restaurant-image"><img src="${restaurant.image_path}" alt="${restaurant.name}" /></div><div><p class="eyebrow">${restaurant.cuisine}</p><h2>${restaurant.name}</h2><p class="panel-copy">${restaurant.description}</p><p class="restaurant-meta">${restaurant.location} · ${restaurant.opening_hours}</p></div></section>
      ${state.restaurantStep === 'confirmation' ? `<section class="restaurant-confirmation"><p class="eyebrow">YOUR RESERVATION</p><h2>One more look.</h2><p class="panel-copy">${state.restaurantDate} · ${state.restaurantTime} · ${state.restaurantGuestCount} guest${state.restaurantGuestCount === 1 ? '' : 's'}</p><label>Phone number<input data-restaurant-phone value="${state.restaurantPhone}" placeholder="+91 98765 43210" /></label><label>100% COUPON<input data-restaurant-coupon value="${state.restaurantCouponCode}" placeholder="-NOPAYMENTGATEWAY" /></label><div class="restaurant-price"><span>Original reservation fee</span><strong>₹${(Number(restaurant.reservation_fee_per_person) * state.restaurantGuestCount).toLocaleString('en-IN')}</strong><span>Payable after valid coupon</span><strong class="free-price">₹0</strong></div><p class="form-message ${state.restaurantMessageType === 'error' ? 'is-error' : ''}">${state.restaurantMessage || 'A valid 100% restaurant coupon is required.'}</p><button class="button button-primary" data-confirm-restaurant>Confirm reservation <span>↗</span></button><button class="button button-quiet" data-restaurant-edit>Change time</button></section>` : `<section class="restaurant-booking-panel"><div><p class="eyebrow">RESERVE YOUR TABLE</p><h2>Choose your moment.</h2><div class="restaurant-controls"><label>Date<input type="date" data-restaurant-date min="${new Date().toISOString().slice(0, 10)}" value="${state.restaurantDate}" /></label><label>Party size<select data-restaurant-guests>${Array.from({ length: 10 }, (_, index) => index + 1).map((count) => `<option value="${count}" ${count === state.restaurantGuestCount ? 'selected' : ''}>${count} guest${count === 1 ? '' : 's'}</option>`).join('')}</select></label></div><p class="form-message ${state.restaurantMessageType === 'error' ? 'is-error' : ''}">${state.restaurantMessage || ''}</p></div><div class="restaurant-slots">${state.restaurantAvailabilityLoading ? '<p class="panel-copy">Finding open tables…</p>' : state.restaurantSlots.length ? state.restaurantSlots.map((slot) => `<button class="restaurant-slot" data-restaurant-slot="${slot.start_at}" ${slot.available ? '' : 'disabled'}><span>${slot.label}</span><small>${slot.available ? 'AVAILABLE' : 'FULL'}</small></button>`).join('') : '<p class="panel-copy">Choose a date to see available times.</p>'}</div></section>`}
      <section class="restaurant-reservations"><p class="eyebrow">MY RESERVATIONS</p><h2>Your table history.</h2>${state.restaurantReservationsLoading ? '<p class="panel-copy">Loading reservations…</p>' : reservations.length ? reservations.map((reservation) => `<article class="restaurant-reservation-record"><div><strong>${new Date(reservation.reservation_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong><span>${reservation.guest_count} guest${reservation.guest_count === 1 ? '' : 's'} · Table ${reservation.table_id.slice(0, 6).toUpperCase()}</span></div><div><em>${reservation.status}</em>${reservation.status === 'confirmed' ? `<button class="button button-quiet" data-cancel-restaurant="${reservation.id}">Cancel</button>` : ''}</div></article>`).join('') : '<p class="panel-copy">No restaurant reservations yet.</p>'}</section>
    </div>`;
  }
  if (state.exposeRestaurantRenderer) return restaurantBookingMarkup;
  if (state.galaError) {
    return `<div class="gala-booking-loading"><p class="form-message is-error">${state.galaError}</p><button class="button button-primary" data-gala-back>Return to experiences <span>↖</span></button></div>`;
  }

  if (state.galaSuccess) {
    return `<div class="gala-success screen-enter"><p class="eyebrow"><span class="pulse-dot"></span> BOOKING CONFIRMED</p><h1>Your night<br /><em>is set.</em></h1><p>Booking ID: <strong>${state.galaSuccess.booking_id}</strong><br />${state.galaSuccess.ticket_count} personalised ticket${state.galaSuccess.ticket_count === 1 ? '' : 's'} created.</p><button class="button button-primary" data-gala-back>Back to dashboard <span>↖</span></button></div>`;
  }
  const zoneById = Object.fromEntries(gala.zones.map((zone) => [zone.id, zone]));
  const selected = gala.seats.filter((seat) => state.selectedSeatIds.includes(seat.id));
  const subtotal = selected.reduce((sum, seat) => sum + Number(zoneById[seat.zone_id].current_price), 0);
  const checkout = state.galaStep === 'checkout';
  return `
    <div class="gala-booking-shell">
      <div class="gala-booking-head"><div><p class="eyebrow"><span class="pulse-dot"></span> THE OBSIDIAN BALLROOM / 360° ARENA</p><h1>New Year's<br /><em>Afterdark.</em></h1><p>31 DEC 2026 · 10 PM — 3 AM · JALANDHAR, PUNJAB</p></div><button class="icon-button" data-gala-back>BACK TO DASHBOARD ↖</button></div>
      ${checkout ? `
        <section class="gala-checkout">
          <div><p class="eyebrow">YOUR TICKETS</p><h2>Name the night.</h2><p class="panel-copy">Each seat becomes an individual personalised ticket.</p>
          <form class="attendee-form">${selected.map((seat) => `<label>${seat.seat_number} · ${zoneById[seat.zone_id].name}<input required name="${seat.id}" placeholder="Attendee name" value="${state.attendeeNames[seat.id] || ''}" /></label>`).join('')}</form></div>
          <div class="checkout-summary"><p class="eyebrow">FINAL CONFIRMATION</p><div class="summary-row"><span>Original subtotal</span><strong>₹${subtotal.toLocaleString('en-IN')}</strong></div><label class="coupon-label">100% COUPON<input data-coupon-input value="${state.couponCode}" placeholder="-NOPAYMENTGATEWAY" /></label><div class="summary-total"><span>PAYABLE</span><strong>₹0</strong></div><p class="form-message ${state.galaMessageType === 'error' ? 'is-error' : ''}">${state.galaMessage || 'Coupon will be validated securely when you confirm.'}</p><button class="button button-primary" data-confirm-gala>Confirm booking <span>↗</span></button></div>
        </section>
      ` : `
        <section class="gala-arena-layout">
          <div class="arena-panel"><p class="eyebrow">SELECT YOUR SEATS</p><div class="arena-map"><div class="arena-stage"><span>360°</span><b>STAGE</b></div>${gala.zones.map((zone) => `<div class="arena-zone zone-${zone.name.toLowerCase()}" style="--zone-color:${zone.name === 'Front' ? '#e5c4c4' : zone.name === 'Premium' ? '#c1c7d6' : zone.name === 'Standard' ? '#9a5360' : '#70414d'}"><span class="zone-label">${zone.name}</span>${gala.seats.filter((seat) => seat.zone_id === zone.id).map((seat) => `<button class="arena-seat ${seat.status === 'booked' ? 'is-booked' : ''} ${state.selectedSeatIds.includes(seat.id) ? 'is-selected' : ''}" data-seat-id="${seat.id}" ${seat.status === 'booked' ? 'disabled' : ''} title="${seat.seat_number} · ₹${Number(zone.current_price).toLocaleString('en-IN')}" aria-label="${seat.seat_number}, ${zone.name}, ₹${Number(zone.current_price).toLocaleString('en-IN')}">${seat.seat_number.split('-')[1]}</button>`).join('')}</div>`).join('')}</div></div>
          <aside class="gala-summary"><p class="eyebrow">YOUR SELECTION</p><h2>${selected.length}<small> / 5 seats</small></h2><div class="zone-prices">${gala.zones.map((zone) => `<span><i style="background:${zone.name === 'Front' ? '#e5c4c4' : zone.name === 'Premium' ? '#c1c7d6' : zone.name === 'Standard' ? '#9a5360' : '#70414d'}"></i>${zone.name}<b>₹${Number(zone.current_price).toLocaleString('en-IN')}</b></span>`).join('')}</div><div class="selected-list">${selected.length ? selected.map((seat) => `<span>${seat.seat_number}<b>${zoneById[seat.zone_id].name}</b></span>`).join('') : '<p>Select a seat to begin.</p>'}</div><div class="summary-total"><span>SUBTOTAL</span><strong>₹${subtotal.toLocaleString('en-IN')}</strong></div><button class="button button-primary" data-gala-checkout ${selected.length ? '' : 'disabled'}>Continue <span>↗</span></button><p class="seat-note">Coupon validation required at confirmation. No payment gateway.</p></aside>
        </section>
      `}
    </div>
  `;
}

function bookings(state) {
  if (state.bookingsLoading) return '<main class="bookings-page screen-enter"><p class="eyebrow">MY BOOKINGS</p><h1>Loading your<br /><em>nights.</em></h1></main>';
  return `<main class="bookings-page screen-enter"><div class="bookings-heading"><div><p class="eyebrow"><span class="pulse-dot"></span> YOUR EVENT HISTORY</p><h1>My<br /><em>bookings.</em></h1></div><button class="icon-button" data-screen="dashboard">BACK TO DASHBOARD ↖</button></div>${state.bookingsError ? `<p class="form-message is-error">${state.bookingsError}</p>` : state.bookings.length ? state.bookings.map((booking) => `<article class="booking-record"><div><p class="eyebrow">BOOKING ${booking.id.slice(0, 8).toUpperCase()}</p><strong>${new Date(booking.created_at).toLocaleDateString('en-IN')}</strong><span>${booking.event_tickets.length} ticket${booking.event_tickets.length === 1 ? '' : 's'} · ₹${Number(booking.subtotal).toLocaleString('en-IN')} → ₹${Number(booking.total_amount).toLocaleString('en-IN')}</span><small class="record-status">${booking.status}</small></div><div class="ticket-list">${booking.event_tickets.map((ticket) => ticketCard(ticket, booking)).join('')}</div></article>`).join('') : '<p class="panel-copy">No Gala bookings yet. Choose the event from your dashboard to begin.</p>'}</main>`;
}

function adminDashboard(state) {
  if (state.adminLoading) return '<main class="admin-page"><p class="eyebrow">ADMIN CONTROL</p><h1>Loading<br /><em>overview.</em></h1></main>';
  if (state.adminError) return `<main class="admin-page"><p class="eyebrow">ADMIN CONTROL</p><h1>Dashboard<br /><em>unavailable.</em></h1><p class="form-message is-error">${state.adminError}</p><button class="icon-button" data-screen="dashboard">BACK TO DASHBOARD ↖</button></main>`;
  const data = state.adminData;
  const metrics = data.metrics;
  const query = state.adminSearch.toLowerCase();
  const recent = data.recent_bookings.filter((booking) => `${booking.id} ${booking.ticket_codes.join(' ')}`.toLowerCase().includes(query));
  const restaurantMetrics = state.adminRestaurantMetrics || {
    total_reservations: 0,
    confirmed_reservations: 0,
    cancelled_reservations: 0,
    upcoming_reservations: 0,
    upcoming_guests: 0,
  };
  const restaurantQuery = state.adminRestaurantSearch.toLowerCase().trim();
  const restaurantReservations = (state.adminRestaurantReservations || []).filter((reservation) => {
    const matchesText = !restaurantQuery
      || `${reservation.customer_name} ${reservation.customer_email} ${reservation.phone} ${reservation.id}`.toLowerCase().includes(restaurantQuery);
    const matchesDate = !state.adminRestaurantDate || reservation.reservation_date === state.adminRestaurantDate;
    const matchesStatus = state.adminRestaurantStatus === 'all' || reservation.status === state.adminRestaurantStatus;
    return matchesText && matchesDate && matchesStatus;
  });
  return `<main class="admin-page screen-enter">
    <div class="admin-heading"><div><p class="eyebrow"><span class="pulse-dot"></span> AUTHORISED CONTROL ROOM</p><h1>Admin<br /><em>dashboard.</em></h1></div><button class="icon-button" data-screen="dashboard">BACK TO DASHBOARD ↖</button></div>
    <section class="admin-metrics">${[['BOOKINGS', metrics.total_bookings], ['TICKETS', metrics.total_tickets], ['BOOKED SEATS', metrics.booked_seats], ['AVAILABLE SEATS', metrics.available_seats], ['EVENTS', metrics.total_events]].map(([label, value]) => `<article><small>${label}</small><strong>${value}</strong></article>`).join('')}</section>
    <section class="admin-grid">
      <div class="admin-panel"><div class="admin-panel-head"><div><p class="eyebrow">BOOKING OPERATIONS</p><h2>Recent bookings.</h2></div><input class="admin-search" data-admin-search value="${state.adminSearch}" placeholder="Booking ref or ticket code" /></div>${recent.length ? recent.map((booking) => `<article class="admin-booking-row"><div><code>${booking.id}</code><strong>${booking.event_name}</strong><span>${booking.attendee_count} ticket${booking.attendee_count === 1 ? '' : 's'} · ${new Date(booking.created_at).toLocaleString('en-IN')}</span></div><div class="admin-booking-actions"><em>${booking.status}</em>${booking.status === 'confirmed' ? `<button class="button button-quiet" data-cancel-booking="${booking.id}">Cancel reservation</button>` : ''}</div></article>`).join('') : '<p class="panel-copy">No matching bookings.</p>'}</div>
      <div class="admin-panel"><p class="eyebrow">TICKET VERIFICATION</p><h2>Check a ticket.</h2><form class="admin-verify-form"><input name="ticketCode" placeholder="EVT-ticket-code" required /><button class="button button-primary" type="submit">Verify <span>↗</span></button></form><div class="admin-ticket-result">${state.adminTicket ? `<p class="form-message">${state.adminTicket.attendee_name} · ${state.adminTicket.seat_number_snapshot} · ${state.adminTicket.status}</p><p class="panel-copy">${state.adminTicket.event_name_snapshot}<br />Booking: ${state.adminTicket.booking_id}</p><button class="button button-primary" data-checkin-ticket ${state.adminTicket.checked_in ? 'disabled' : ''}>${state.adminTicket.checked_in ? 'Already checked in' : 'Check in ticket'}</button>` : `<p class="panel-copy">${state.adminMessage || 'Scan support can be added later; enter a ticket code to verify against Supabase.'}</p>`}</div></div>
    </section>
    <section class="admin-panel"><p class="eyebrow">SEATING INVENTORY</p><h2>Events and zones.</h2><div class="admin-inventory">${data.inventory.map((item) => `<div><span>${item.event_name} · ${item.zone_name}</span><b>₹${Number(item.price).toLocaleString('en-IN')}</b><small>${item.booked} booked / ${item.available} available</small></div>`).join('')}</div></section>
    <section class="admin-panel"><p class="eyebrow">COUPONS</p><h2>Active rules.</h2><div class="admin-inventory">${data.coupons.map((coupon) => `<div><span>${coupon.code}</span><b>${coupon.discount_percent}% · ${coupon.scope}</b><small>${coupon.deleted_at ? 'Deleted' : coupon.is_active ? 'Active' : 'Inactive'}</small></div>`).join('')}</div></section>
    <section class="admin-panel restaurant-admin-panel">
      <div class="admin-panel-head"><div><p class="eyebrow">RESTAURANT OPERATIONS</p><h2>Restaurant Reservations.</h2></div><div class="admin-filter-row"><input class="admin-search" data-admin-restaurant-search value="${escapeHtml(state.adminRestaurantSearch)}" placeholder="Customer, email, phone or reference" /><input type="date" data-admin-restaurant-date value="${state.adminRestaurantDate}" /><select data-admin-restaurant-status><option value="all" ${state.adminRestaurantStatus === 'all' ? 'selected' : ''}>All statuses</option><option value="confirmed" ${state.adminRestaurantStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option><option value="deleted" ${state.adminRestaurantStatus === 'deleted' ? 'selected' : ''}>Cancelled</option></select></div></div>
      <div class="admin-metrics restaurant-admin-metrics">${[['TOTAL RESERVATIONS', restaurantMetrics.total_reservations], ['CONFIRMED', restaurantMetrics.confirmed_reservations], ['CANCELLED', restaurantMetrics.cancelled_reservations], ['UPCOMING', restaurantMetrics.upcoming_reservations], ['UPCOMING GUESTS', restaurantMetrics.upcoming_guests]].map(([label, value]) => `<article><small>${label}</small><strong>${value}</strong></article>`).join('')}</div>
      ${restaurantReservations.length ? restaurantReservations.map((reservation) => `<article class="admin-booking-row restaurant-reservation-row"><div><code>${reservation.id}</code><strong>${escapeHtml(reservation.customer_name || 'Customer unavailable')} · ${escapeHtml(reservation.restaurant_name)} · Table ${escapeHtml(reservation.table_number)}</strong><span>${escapeHtml(reservation.customer_email || 'Email unavailable')} · ${escapeHtml(reservation.phone)} · ${new Date(reservation.reservation_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · ${reservation.guest_count} guest${reservation.guest_count === 1 ? '' : 's'}</span></div><div class="admin-booking-actions"><em>${reservation.status === 'deleted' ? 'cancelled' : reservation.status}</em>${reservation.status === 'confirmed' ? `<button class="button button-quiet" data-cancel-admin-restaurant="${reservation.id}">Cancel reservation</button>` : ''}</div></article>`).join('') : '<p class="panel-copy">No restaurant reservations match the selected filters.</p>'}
    </section>
  </main>`;
}

function publicTicket(state) {
  if (state.publicTicketLoading) return '<main class="public-ticket-page"><div class="public-ticket-shell"><p class="ticket-mark">EVENTABLE / 26</p><p class="eyebrow">PUBLIC TICKET VERIFICATION</p><h1>Preparing your<br /><em>night.</em></h1><div class="ticket-loading-line"></div></div></main>';
  if (state.publicTicketError) return `<main class="public-ticket-page"><div class="public-ticket-shell"><p class="ticket-mark">EVENTABLE / 26</p><p class="eyebrow">PUBLIC TICKET VERIFICATION</p><h1>Ticket<br /><em>unavailable.</em></h1><p class="form-message is-error">${escapeHtml(state.publicTicketError)}</p></div></main>`;
  const ticket = state.publicTicket;
  if (!ticket || ticket.status === 'unknown') return '<main class="public-ticket-page"><div class="public-ticket-shell"><p class="ticket-mark">EVENTABLE / 26</p><p class="eyebrow">PUBLIC TICKET VERIFICATION</p><h1>Unknown<br /><em>ticket.</em></h1><p class="panel-copy">This QR code does not match a ticket in EVENTABLE.</p></div></main>';
  const isValid = ticket.status === 'valid' || ticket.status === 'checked-in';
  const statusLabel = ticket.status === 'checked-in' ? 'CHECKED IN' : isValid ? 'VALID' : 'INVALIDATED';
  const eventName = ticket.event_name || "New Year's Eve Gala";
  const eventDate = ticket.start_at
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date(ticket.start_at))
    : 'Event date unavailable';
  const eventTime = ticket.start_at
    ? `${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(ticket.start_at))} – ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(ticket.end_at))}`
    : 'Event time unavailable';
  return `<main class="public-ticket-page screen-enter"><div class="public-ticket-shell"><div class="ticket-public-header"><p class="ticket-mark">EVENTABLE / 26</p><span class="ticket-live-dot"></span></div><section class="public-ticket-card ${isValid ? 'is-valid' : 'is-invalid'}"><div class="ticket-card-top"><p class="eyebrow">NEW YEAR GALA / DIGITAL PASS</p><span class="public-status ticket-status-${escapeHtml(ticket.status)}">${statusLabel}</span></div><h1>${escapeHtml(eventName)}</h1><p class="ticket-occasion">A NEW YEAR'S EVE AFTERDARK</p><div class="ticket-rule"></div><div class="public-ticket-details"><div><small>ATTENDEE</small><strong>${escapeHtml(ticket.attendee_name)}</strong><span>${escapeHtml(ticket.attendee_email || 'Email unavailable')}</span></div><div><small>VENUE</small><strong>${escapeHtml(ticket.venue)}</strong></div><div><small>DATE</small><strong>${escapeHtml(eventDate)}</strong></div><div><small>TIME</small><strong>${escapeHtml(eventTime)} IST</strong></div><div><small>SEAT / ZONE</small><strong>${escapeHtml(ticket.seat_number)} · ${escapeHtml(ticket.zone_name)}</strong></div><div><small>VALIDITY</small><strong>${statusLabel}</strong></div></div><div class="ticket-card-footer"><span>SHOW THIS SCREEN AT ENTRY</span><span>EVENTABLE</span></div></section><p class="public-ticket-note">Verified securely by EVENTABLE. This public page displays ticket details only and never checks in a ticket.</p></div></main>`;
}

function restaurantBooking(state) {
  return galaBooking({ exposeRestaurantRenderer: true })(state);
}

function ticketCard(ticket, booking) {
  const eventDate = ticket.start_at_snapshot
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(ticket.start_at_snapshot))
    : 'Event date unavailable';
  return `<article class="ticket-card">
    <div class="ticket-card-main">
      <div class="ticket-brand"><span>EVENTABLE</span><small>ALL SET. GO TOGETHER.</small></div>
      <p class="eyebrow">DIGITAL TICKET · ${ticket.status}</p>
      <h2>${ticket.event_name_snapshot || "New Year's Eve Gala"}</h2>
      <p class="ticket-date">${eventDate}</p>
      <div class="ticket-details"><span><small>ATTENDEE</small><b>${ticket.attendee_name}</b></span><span><small>SEAT / ZONE</small><b>${ticket.seat_number_snapshot} · ${ticket.zone_name_snapshot}</b></span><span><small>VENUE</small><b>${ticket.venue_snapshot || 'Jalandhar, Punjab'}</b></span></div>
      <div class="ticket-code-row"><span><small>BOOKING REFERENCE</small><code>${booking.id}</code></span><span><small>TICKET CODE</small><code>${ticket.ticket_code}</code></span></div>
    </div>
    <div class="ticket-qr"><div class="qr-placeholder" data-ticket-qr="${ticket.id}">Generating QR…</div><small>SCAN TO VERIFY TICKET</small></div>
  </article>`;
}

export function renderApp(state) {
  if (state.screen === 'auth') return auth(state);
  if (state.screen === 'dashboard') return dashboard(state);
  if (state.screen === 'bookings') return bookings(state);
  if (state.screen === 'gala-booking') return galaBooking(state);
  if (state.screen === 'admin') return adminDashboard(state);
  if (state.screen === 'public-ticket') return publicTicket(state);
  return landing(state);
}

export { galaBooking, restaurantBooking };
