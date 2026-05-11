'use strict';

// Scoped to this trip's flights only — any other flight number is rejected
const ALLOWED_FLIGHTS = new Set(['AA78', 'AA7067', 'KL1168', 'AA9014', 'AA9019']);

exports.handler = async (event) => {
  const corsOrigin = process.env.CORS_ORIGIN;
  const apiKey    = process.env.AVIATIONSTACK_API_KEY;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  corsOrigin,
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const flightIata = (event.queryStringParameters?.flight ?? '').toUpperCase();

  if (!flightIata || !ALLOWED_FLIGHTS.has(flightIata)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid or missing flight number' }),
    };
  }

  try {
    // AviationStack free tier is HTTP only — this is fine because the call is
    // server-side from Lambda; the browser only ever talks to Lambda over HTTPS
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightIata}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AviationStack ${res.status}`);

    const data = await res.json();
    if (!data.data?.length) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Flight not found' }),
      };
    }

    // Return only what the dashboard needs — never proxy the raw response
    const f = data.data[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        flight_iata:  f.flight?.iata,
        status:       f.flight_status,
        departure: {
          airport:   f.departure?.airport,
          iata:      f.departure?.iata,
          scheduled: f.departure?.scheduled,
          actual:    f.departure?.actual,
          estimated: f.departure?.estimated,
          delay:     f.departure?.delay,
        },
        arrival: {
          airport:   f.arrival?.airport,
          iata:      f.arrival?.iata,
          scheduled: f.arrival?.scheduled,
          estimated: f.arrival?.estimated,
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Service unavailable' }),
    };
  }
};
