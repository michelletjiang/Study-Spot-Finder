const crypto = require('crypto');

// Small synchronizer-token CSRF protection without a process-global token.
exports.csrf = (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const supplied = req.body && req.body._csrf || req.get('x-csrf-token');
  const expected = Buffer.from(req.session.csrfToken);
  const actual = Buffer.from(String(supplied || ''));
  if (!supplied || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(403).render('error', { message: 'Invalid or missing CSRF token.' });
  }
  next();
};

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
