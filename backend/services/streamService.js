const STREAM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateStreamCode = (length = 6) => {
  let output = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * STREAM_CODE_ALPHABET.length);
    output += STREAM_CODE_ALPHABET[randomIndex];
  }
  return output;
};

const parseCoordinate = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildNewStreamPayload = ({ body, userId, streamCode }) => {
  const roomId = String(streamCode || generateStreamCode()).trim().toUpperCase();
  const accessLevel = body.accessLevel === 'premium' ? 'premium' : 'public';

  return {
    roomId,
    payload: {
      userId,
      streamId: roomId,
      active: true,
      streamer: userId,
      title: body.title || 'Live Report Stream',
      description: body.description || '',
      accessLevel,
      linkedReport: body.linkedReport || null,
      roomId,
      status: 'active',
      location: {
        address: body.address || null,
        coordinates: {
          type: 'Point',
          coordinates: [parseCoordinate(body.lng, 0), parseCoordinate(body.lat, 0)],
        },
      },
    },
  };
};

module.exports = { buildNewStreamPayload, generateStreamCode };
