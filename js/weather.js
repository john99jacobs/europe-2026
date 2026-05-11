async function loadWeather(lat, lng) {
  const widget = document.getElementById('weather-widget');
  if (!widget) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    const current = Math.round(data.current.temperature_2m);
    const high    = Math.round(data.daily.temperature_2m_max[0]);
    const low     = Math.round(data.daily.temperature_2m_min[0]);
    const code    = data.current.weather_code;
    const icon    = weatherIcon(code);
    const desc    = weatherDesc(code);

    widget.innerHTML = `
      <div class="weather-temp">${icon} ${current}°F</div>
      <div class="weather-meta">
        <strong>${desc}</strong><br>
        High ${high}° · Low ${low}°
      </div>`;
    widget.classList.remove('hidden');
  } catch {
    /* silently hide on any error */
  }
}

function weatherIcon(code) {
  if (code === 0)              return '☀️';
  if (code <= 2)               return '🌤️';
  if (code === 3)              return '☁️';
  if (code <= 49)              return '🌫️';
  if (code <= 69)              return '🌧️';
  if (code <= 79)              return '🌨️';
  if (code <= 84)              return '🌧️';
  if (code <= 99)              return '⛈️';
  return '🌡️';
}

function weatherDesc(code) {
  if (code === 0)              return 'Clear sky';
  if (code === 1)              return 'Mostly clear';
  if (code === 2)              return 'Partly cloudy';
  if (code === 3)              return 'Overcast';
  if (code <= 49)              return 'Foggy';
  if (code <= 59)              return 'Drizzle';
  if (code <= 69)              return 'Rain';
  if (code <= 79)              return 'Snow';
  if (code <= 84)              return 'Rain showers';
  if (code <= 99)              return 'Thunderstorm';
  return 'Unknown';
}
