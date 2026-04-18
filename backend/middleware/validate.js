const { validationResult } = require('express-validator');

/**
 * validate
 * Reads results from express-validator chains already run on the route.
 * On failure it returns a 422 with a clean array of field-level errors.
 * Usage: router.post('/route', [validationChains], validate, controller)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return res.status(422).json({ success: false, message: 'Validation failed', errors: formatted });
};

module.exports = validate;
