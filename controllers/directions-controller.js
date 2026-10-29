const onemap = require('../services/onemap');

// "lat,lng" with both parts numbers (stops anything else being pasted into the OneMap URL)
const COORDS = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;

// GET /api/directions?from=lat,lng&to=lat,lng
// Returns walking and public transport routes, and which one is fastest
exports.getDirections = async (req, res) => {
    const { from, to } = req.query;
    if (!COORDS.test(from || '') || !COORDS.test(to || '')) {
        return res.status(400).json({ message: 'from and to must be "lat,lng"' });
    }
    try {
        res.json(await onemap.routes(from, to));
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: 'Could not find a route' });
    }
};
