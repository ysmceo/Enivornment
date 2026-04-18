const STATE_CENTROIDS = {
  Abia: { lat: 5.5320, lng: 7.4860 },
  Adamawa: { lat: 9.3265, lng: 12.3984 },
  'Akwa Ibom': { lat: 5.0077, lng: 7.8493 },
  Anambra: { lat: 6.2209, lng: 6.9369 },
  Bauchi: { lat: 10.3158, lng: 9.8442 },
  Bayelsa: { lat: 4.9200, lng: 6.2640 },
  Benue: { lat: 7.1906, lng: 8.1291 },
  Borno: { lat: 11.8846, lng: 13.1510 },
  'Cross River': { lat: 5.9631, lng: 8.3345 },
  Delta: { lat: 5.7040, lng: 5.9339 },
  Ebonyi: { lat: 6.2649, lng: 8.0137 },
  Edo: { lat: 6.3350, lng: 5.6037 },
  Ekiti: { lat: 7.7190, lng: 5.3110 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  FCT: { lat: 9.0765, lng: 7.3986 },
  Gombe: { lat: 10.2897, lng: 11.1673 },
  Imo: { lat: 5.5720, lng: 7.0588 },
  Jigawa: { lat: 12.2280, lng: 9.5616 },
  Kaduna: { lat: 10.5222, lng: 7.4384 },
  Kano: { lat: 11.7471, lng: 8.5241 },
  Katsina: { lat: 12.9883, lng: 7.6006 },
  Kebbi: { lat: 12.4539, lng: 4.1975 },
  Kogi: { lat: 7.7337, lng: 6.6906 },
  Kwara: { lat: 8.9669, lng: 4.3874 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Nasarawa: { lat: 8.5378, lng: 8.3220 },
  Niger: { lat: 9.9309, lng: 5.5983 },
  Ogun: { lat: 7.1475, lng: 3.3619 },
  Ondo: { lat: 7.2508, lng: 5.2103 },
  Osun: { lat: 7.5629, lng: 4.5199 },
  Oyo: { lat: 8.1574, lng: 3.6147 },
  Plateau: { lat: 9.2182, lng: 9.5179 },
  Rivers: { lat: 4.8156, lng: 6.9780 },
  Sokoto: { lat: 13.0059, lng: 5.2476 },
  Taraba: { lat: 7.9994, lng: 10.7732 },
  Yobe: { lat: 12.2939, lng: 11.4390 },
  Zamfara: { lat: 12.1222, lng: 6.2236 },
};

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  STATE_CENTROIDS,
  haversineDistanceKm,
};
