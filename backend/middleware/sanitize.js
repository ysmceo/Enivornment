const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
};

const deepSanitize = (value) => {
  if (Array.isArray(value)) return value.map(deepSanitize);

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = deepSanitize(val);
      return acc;
    }, {});
  }

  return sanitizeString(value);
};

const sanitizeRequest = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query);
  }
  next();
};

module.exports = sanitizeRequest;
