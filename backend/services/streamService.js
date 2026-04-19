const { v4: uuidv4 } = require('uuid');

const parseCoordinate = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildNewStreamPayload = ({ body, userId }) => {
  const roomId = uuidv4();
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

module.exports = { buildNewStreamPayload };
