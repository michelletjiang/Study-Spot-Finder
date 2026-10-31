// ACTIVE: JSON handler for GET /api/directions, mounted in routes/api/directions-routes.js. All of it is used by MiniMap.vue through client/src/stores/map.js.
// The OneMap service does the real provider calls (blocked in the demo).
const onemap = require('../services/onemap');

// Existing note below: a strict shape check so nothing else can be put into the provider URL.
// "lat,lng" with both parts numbers (stops anything else being pasted into the OneMap URL)
// Pattern: two signed decimal numbers separated by a comma.
const COORDS = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;

// GET /api/directions?from=lat,lng&to=lat,lng
// Returns walking and public transport routes, and which one is fastest
// The handler: read from and to from the query string.
exports.getDirections = async (req, res) => {
    const { from, to } = req.query;
    // Both must match the shape, or answer 400.
    if (!COORDS.test(from || '') || !COORDS.test(to || '')) {
        return res.status(400).json({ message: 'from and to must be "lat,lng"' });
    }
    // Ask the OneMap service for routes.
    try {
        // Send the routes (walk, public transport and which is fastest) as JSON.
        res.json(await onemap.routes(from, to));
    } catch (error) {
        console.error(error);
        // Provider failure becomes a 502, meaning a bad answer from the service behind us. The message does not leak details.
        res.status(502).json({ message: 'Could not find a route' });
    }
};
