let tripData = null;
let itineraryRendered = false;
let savedItineraryScroll = 0;

const EVENT_LABELS = {
  flight:           'Flight',
  train:            'Train',
  bus:              'Bus',
  boat:             'Boat',
  activity:         'Activity',
  'lodging-checkin':  'Check-in',
  'lodging-checkout': 'Check-out',
  transfer:         'Transfer',
  note:             'Note',
};

function mapsUrl(address, mapsQuery) {
  const q = address || mapsQuery;
  if (!q) return null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const encoded = encodeURIComponent(q);
  return isIOS
    ? `https://maps.apple.com/?q=${encoded}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayStr() {
  const param = new URLSearchParams(window.location.search).get('date');
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderBadge(type, unbooked) {
  const label = EVENT_LABELS[type] || type;
  const typeBadge = `<span class="badge badge--${type}">${label}</span>`;
  const unbookedBadge = unbooked ? `<span class="badge badge--unbooked">Not booked</span>` : '';
  return typeBadge + unbookedBadge;
}

function renderMapLink(address, mapsQuery) {
  const url = mapsUrl(address, mapsQuery);
  if (!url) return '';
  return `<a class="event-map-link" href="${url}" target="_blank" rel="noopener">Open in Maps ↗</a>`;
}

function renderEvent(event) {
  const unbooked = event.booked === false;
  const badgeHtml = renderBadge(event.type, unbooked);
  const timeHtml = event.time
    ? `<span class="event-time">${event.time}</span>`
    : `<span class="event-time--empty"></span>`;
  const detailHtml = event.detail
    ? `<div class="event-detail">${event.detail}</div>`
    : '';
  const noteHtml = event.note
    ? `<div class="event-note">${event.note}</div>`
    : '';
  const mapHtml = renderMapLink(event.address, event.maps_query);

  const iata = event.type === 'flight' ? extractFlightIata(event.detail) : null;
  const flightAttr = iata ? ` data-flight-iata="${iata}"` : '';
  const flightStatusHtml = iata ? `<span class="flight-status" hidden></span>` : '';

  return `
    <div class="event${unbooked ? ' event--unbooked' : ''}"${flightAttr}>
      <div class="event-row">
        ${timeHtml}
        <div class="event-body">
          <div class="event-top">
            <span class="event-label">${event.label}</span>
            ${badgeHtml}
          </div>
          ${detailHtml}
          ${flightStatusHtml}
          ${noteHtml}
          ${mapHtml}
        </div>
      </div>
    </div>`;
}

function renderLodging(lodging) {
  if (!lodging) return '';
  const mapHtml = renderMapLink(lodging.address, lodging.maps_query);
  const addressHtml = lodging.address
    ? `<div class="lodging-address">${lodging.address}</div>`
    : lodging.maps_query
      ? `<div class="lodging-address">${lodging.maps_query}</div>`
      : '';
  return `
    <div class="mt-6">
      <div class="section-label">Tonight's Lodging</div>
      <div class="lodging-card">
        <div class="lodging-name">${lodging.name}</div>
        ${addressHtml}
        ${mapHtml}
      </div>
    </div>`;
}

function renderTodayView(day, dayIndex, totalDays, nextDay) {
  const eventsHtml = day.events.map(renderEvent).join('');
  const lodgingHtml = renderLodging(day.lodging);

  const tomorrowHtml = nextDay ? (() => {
    const items = nextDay.events
      .filter(e => e.type !== 'note')
      .slice(0, 4)
      .map(e => `
        <div class="tomorrow-event">
          <span class="tomorrow-time">${e.time || '—'}</span>
          <span class="tomorrow-label">${e.label}</span>
        </div>`)
      .join('');
    return items ? `
      <div class="mt-6">
        <div class="section-label">Tomorrow — ${nextDay.city}</div>
        <div class="card">
          <div class="tomorrow-events">${items}</div>
        </div>
      </div>` : '';
  })() : '';

  document.getElementById('view-today').innerHTML = `
    <div class="day-header">
      <div class="day-number">Day ${dayIndex + 1} of ${totalDays}</div>
      <div class="day-title">${day.label}</div>
      <div class="day-city">${day.city}</div>
    </div>
    <div id="weather-widget" class="hidden mb-4"></div>
    <div class="section-label">Today's Schedule</div>
    <div class="event-list">${eventsHtml}</div>
    ${lodgingHtml}
    ${tomorrowHtml}`;

  loadWeather(day.lat, day.lng);
  loadFlightStatuses(day.events);
}

function renderCountdown() {
  const start = new Date(tripData.trip.start_date + 'T00:00:00');
  const now = new Date();
  const diff = Math.ceil((start - now) / 86400000);
  document.getElementById('view-today').innerHTML = `
    <div class="countdown-block">
      <div class="countdown-number">${diff}</div>
      <div class="countdown-label">${diff === 1 ? 'day' : 'days'} until departure</div>
      <div class="countdown-date">Departing ${formatDate(tripData.trip.start_date)}</div>
    </div>`;
}

function renderTripComplete() {
  document.getElementById('view-today').innerHTML = `
    <div class="trip-complete">
      <div class="trip-complete-title">Trip Complete</div>
      <div class="trip-complete-sub">What a journey — ${tripData.trip.name}.</div>
    </div>`;
}

function renderItineraryView() {
  if (itineraryRendered) return;
  itineraryRendered = true;

  const today = todayStr();
  const html = tripData.days.map((day) => {
    const isToday = day.date === today;
    const eventsHtml = day.events.map(renderEvent).join('');
    const lodgingHtml = renderLodging(day.lodging);
    const todayChip = isToday ? `<span class="itinerary-today-chip">Today</span>` : '';
    return `
      <div class="itinerary-day${isToday ? ' itinerary-day--today' : ''}" id="day-${day.date}">
        <div class="itinerary-day-header">
          <span class="itinerary-date">${formatDateShort(day.date)}${todayChip}</span>
          <span class="itinerary-day-title">${day.label}</span>
          <span class="itinerary-city">${day.city}</span>
        </div>
        <div class="event-list">${eventsHtml}</div>
        ${lodgingHtml}
      </div>`;
  }).join('');

  document.getElementById('view-itinerary').innerHTML = html;

  // Scroll to today on first render if we're in the trip window
  if (today >= tripData.trip.start_date && today <= tripData.trip.end_date) {
    const el = document.getElementById(`day-${today}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function route() {
  const hash = window.location.hash || '#today';
  const isToday = hash === '#today' || hash === '';
  const isItinerary = hash === '#itinerary';

  const todayView = document.getElementById('view-today');
  const itineraryView = document.getElementById('view-itinerary');

  // Save itinerary scroll position before hiding it
  if (!itineraryView.classList.contains('hidden') && !isItinerary) {
    savedItineraryScroll = window.scrollY;
  }

  todayView.classList.toggle('hidden', !isToday);
  itineraryView.classList.toggle('hidden', !isItinerary);
  document.getElementById('tab-today').classList.toggle('active', isToday);
  document.getElementById('tab-itinerary').classList.toggle('active', isItinerary);

  if (isToday) {
    const today = todayStr();
    const start = tripData.trip.start_date;
    const end = tripData.trip.end_date;

    if (today < start) {
      renderCountdown();
    } else if (today > end) {
      renderTripComplete();
    } else {
      const idx = tripData.days.findIndex(d => d.date === today);
      if (idx === -1) {
        renderCountdown();
        return;
      }
      const day = tripData.days[idx];
      const nextDay = tripData.days[idx + 1] || null;
      renderTodayView(day, idx, tripData.days.length, nextDay);
    }
  } else if (isItinerary) {
    renderItineraryView();
    // Restore scroll position after layout is updated
    requestAnimationFrame(() => window.scrollTo(0, savedItineraryScroll));
  }
}

async function init() {
  try {
    const res = await fetch('trip.json');
    tripData = await res.json();
  } catch {
    document.getElementById('view-today').innerHTML =
      '<div class="countdown-block"><div class="countdown-label">Unable to load trip data.</div></div>';
    return;
  }
  if (!window.location.hash) window.location.hash = '#today';
  route();
}

window.addEventListener('hashchange', route);
window.addEventListener('load', init);

// ── Pull-to-refresh ────────────────────────────────────────────────────────
(function () {
  const THRESHOLD = 72;  // px of pull needed to trigger
  const FULL_H    = 56;  // px height of indicator at threshold

  const ptr = document.createElement('div');
  ptr.id = 'ptr';
  const spinner = document.createElement('div');
  spinner.id = 'ptr-spinner';
  ptr.appendChild(spinner);
  document.body.prepend(ptr);

  let startY = 0;
  let lastY  = 0;
  let armed  = false;

  document.addEventListener('touchstart', e => {
    if (window.scrollY !== 0) return;
    startY = lastY = e.touches[0].clientY;
    armed  = true;
    ptr.classList.remove('ptr-ready', 'ptr-loading');
    ptr.style.transition = '';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!armed) return;
    lastY   = e.touches[0].clientY;
    const dy = Math.max(0, lastY - startY);
    // Rubber-band: full resistance past threshold
    const h = dy < THRESHOLD ? (dy / THRESHOLD) * FULL_H
                              : FULL_H + (dy - THRESHOLD) * 0.15;
    ptr.style.height = Math.min(h, FULL_H * 1.4) + 'px';
    ptr.classList.toggle('ptr-ready', dy >= THRESHOLD);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!armed) return;
    armed = false;
    const triggered = lastY - startY >= THRESHOLD;
    ptr.style.transition = 'height 0.22s ease';
    if (triggered) {
      ptr.style.height = FULL_H + 'px';
      ptr.classList.add('ptr-loading');
      setTimeout(() => location.reload(), 350);
    } else {
      ptr.style.height = '0';
      ptr.classList.remove('ptr-ready');
    }
  });
}());
