const crypto = require('crypto');

// Each session gets its own synchronizer token. A form must send it back, so another site
// cannot silently submit a state-changing request using the browser's session cookie.
exports.csrf = (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Accept the hidden form field used by these EJS pages or the equivalent API header.
  const supplied = req.body && req.body._csrf || req.get('x-csrf-token');
  const expected = Buffer.from(req.session.csrfToken);
  const actual = Buffer.from(String(supplied || ''));
  // Check length before timingSafeEqual because Node requires equal-length Buffers.
  if (!supplied || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(403).render('error', { message: 'Invalid or missing CSRF token.' });
  }
  next();
};

// Make session-derived values available to every EJS view; this controls display only,
// while auth-middleware still enforces access to the route itself.
exports.requestLocals = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.session = req.session;
  next();
};

exports.notFound = (req, res) => res.status(404).render('error', { message: 'Page not found.' });
exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render('error', { message: 'Something went wrong.' });
};
