const normalizeMode = (value) => {
  const mode = String(value || 'webrtc').trim().toLowerCase();
  if (['webrtc', 'hybrid', 'hls'].includes(mode)) return mode;
  return 'webrtc';
};

const STREAMING_MODE = normalizeMode(process.env.STREAMING_MODE);

const isTrue = (value, fallback = false) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

module.exports = {
  STREAMING_MODE,
  USE_SFU: STREAMING_MODE === 'hybrid',
  USE_HLS: STREAMING_MODE === 'hls',
  SFU: {
    url: process.env.SFU_URL || '',
    apiKey: process.env.SFU_API_KEY || '',
    apiSecret: process.env.SFU_API_SECRET || '',
  },
  HLS: {
    ingestUrl: process.env.HLS_INGEST_URL || '',
    playbackBaseUrl: process.env.HLS_PLAYBACK_BASE_URL || '',
    signingKey: process.env.HLS_SIGNING_KEY || '',
  },
  ADAPTIVE: {
    enabled: isTrue(process.env.ADAPTIVE_QUALITY_ENABLED, true),
    mobileDefault: process.env.MOBILE_QUALITY_DEFAULT || 'low',
    desktopDefault: process.env.DESKTOP_QUALITY_DEFAULT || 'auto',
  },
};
