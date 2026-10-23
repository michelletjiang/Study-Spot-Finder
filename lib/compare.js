const mongoose = require('mongoose');

function parseComparisonIds(value) {
  const ids = String(value || '').split(',').map(id => id.trim()).filter(Boolean);
  const valid = ids.length >= 2 && ids.length <= 3 && new Set(ids).size === ids.length && ids.every(id => mongoose.isValidObjectId(id));
  return { ids, valid };
}

module.exports = { parseComparisonIds };
