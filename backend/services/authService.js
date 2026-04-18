const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const buildAuthCookieOptions = () => ({
  expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || 7, 10) * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
});

const sanitizeUserForResponse = (userDoc) => {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc };
  if (user) delete user.password;
  return user;
};

module.exports = {
  signToken,
  buildAuthCookieOptions,
  sanitizeUserForResponse,
};
