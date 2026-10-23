const mongoose = require('mongoose');

function parseComparisonIds(value) {
  const rawIds = String(value || '').split(',').map(id => id.trim()).filter(Boolean);
  const ids = rawIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id).toHexString() : id);
  const valid = ids.length >= 2 && ids.length <= 3 && new Set(ids).size === ids.length && rawIds.every(id => mongoose.isValidObjectId(id));
  return { ids, valid };
}

module.exports = { parseComparisonIds };
