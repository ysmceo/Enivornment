const parseCoordinate = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const mapUploadedMedia = (files = []) =>
  files.map((file) => ({
    url: file.path,
    publicId: file.filename,
    resourceType: file.mimetype?.startsWith('video/') ? 'video' : 'image',
    originalName: file.originalname,
  }));

const normalizeReportPayload = (body = {}) => {
  const address = body['location.address'] || body?.location?.address;
  const longitude = parseCoordinate(
    body['location.coordinates.lng'] || body?.location?.coordinates?.lng || body?.longitude || body?.lng,
    0
  );
  const latitude = parseCoordinate(
    body['location.coordinates.lat'] || body?.location?.coordinates?.lat || body?.latitude || body?.lat,
    0
  );

  return {
    title: body.title,
    description: body.description,
    incidentDate: body.incidentDate,
    category: body.category || 'other',
    severity: body.severity || 'medium',
    state: body.state,
    isAnonymous: body.isAnonymous === 'true' || body.isAnonymous === true,
    reporterContact: {
      fullName: normalizeText(body['reporter.fullName'] || body?.reporter?.fullName || body.fullName),
      phone: normalizeText(body['reporter.phone'] || body?.reporter?.phone || body.phone),
      email: normalizeText(body['reporter.email'] || body?.reporter?.email || body.email),
    },
    location: {
      address,
      coordinates: { type: 'Point', coordinates: [longitude, latitude] },
    },
  };
};

module.exports = {
  mapUploadedMedia,
  normalizeReportPayload,
};
