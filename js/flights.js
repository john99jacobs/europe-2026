const FLIGHT_STATUS_URL = 'https://3qaxsli3bb.execute-api.eu-central-1.amazonaws.com/';

function extractFlightIata(detail) {
  if (!detail) return null;
  const m = detail.match(/\b([A-Z]{2})\s+(\d{2,4})\b/);
  return m ? m[1] + m[2] : null;
}

function formatFlightStatus(status, delay) {
  if (status === 'cancelled')                    return { text: 'Cancelled',              cls: 'bad'  };
  if (status === 'delayed' || delay > 0)         return { text: `Delayed +${delay} min`,  cls: 'warn' };
  if (status === 'active')                       return { text: 'In flight',              cls: 'ok'   };
  if (status === 'landed')                       return { text: 'Landed',                 cls: 'ok'   };
  if (status === 'scheduled')                    return { text: 'On time',                cls: 'ok'   };
  return null;
}

async function loadFlightStatuses(events) {
  const flightEvents = events.filter(e => e.type === 'flight' && e.detail);
  if (!flightEvents.length) return;

  await Promise.all(flightEvents.map(async (event) => {
    const iata = extractFlightIata(event.detail);
    if (!iata) return;

    const el = document.querySelector(`[data-flight-iata="${iata}"]`);
    if (!el) return;

    try {
      const res = await fetch(`${FLIGHT_STATUS_URL}?flight=${iata}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.status) return;

      const formatted = formatFlightStatus(data.status, data.departure?.delay ?? 0);
      if (!formatted) return;

      const statusEl = el.querySelector('.flight-status');
      if (!statusEl) return;

      statusEl.textContent = formatted.text;
      statusEl.className = `flight-status flight-status--${formatted.cls}`;
      statusEl.removeAttribute('hidden');
    } catch {
      /* fail silently — widget stays hidden */
    }
  }));
}
