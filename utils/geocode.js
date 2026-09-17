// Best-effort pincode -> {lat, lng} lookup via OpenStreetMap's free Nominatim
// service. Called only when an admin adds/edits a serviceable pincode (a rare,
// low-frequency action), never on the hot checkout path — so it stays well
// within Nominatim's usage policy without needing an API key.

const NOMINATIM_HEADERS = { "User-Agent": "FreshDairyApp/1.0 (admin pincode setup)" };

const queryNominatim = async (url) => {
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
};

// Nominatim's structured postcode index has real gaps for smaller Indian towns
// (confirmed: e.g. pincode 534207 returns nothing). When that happens, fall
// back to a free-form place-name search using the city the admin entered —
// this resolves many cases the postcode index misses on its own.
const geocodePincode = async (pincode, city) => {
  try {
    const byPostcode = await queryNominatim(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(
        pincode
      )}&country=India&format=json&limit=1`
    );
    if (byPostcode) return byPostcode;

    if (city) {
      const byCityName = await queryNominatim(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          `${city}, India`
        )}&format=json&limit=1`
      );
      if (byCityName) return byCityName;
    }

    return null;
  } catch {
    return null;
  }
};

module.exports = { geocodePincode };
