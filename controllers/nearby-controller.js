const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model');
const Review = require('../models/reviews-model');
const { countCheckedIn } = require('../services/checkin-service');
const { getActiveAlertsBySpot } = require('../services/alert-service');
const { getNoiseHeat } = require('../services/noise-service');

// straight-line distance in metres between two lat/lng points (haversine)
function distanceMeters(lat1, lng1, lat2, lng2) {
    const rad = d => d * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

const WALK_METRES_PER_MINUTE = 80; // about 5 km/h

// POST /api/nearby   body: { latitude, longitude }
// Every study spot whose building has coordinates, with its distance from the user, its review summary,
// how many people are checked in right now, how loud they say it is, and any active alerts.
// The client does the ranking, so changing a preference doesn't need another request.
exports.nearby = async (req, res) => {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)) {
        return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    try {
        const [buildings, spots, summaries] = await Promise.all([Building.retrieveAll(), StudySpot.retrieveAll(), Review.summariseAll()]);
        const byName = new Map(buildings.filter(b => b.lat != null && b.lng != null).map(b => [b.buildingname, b]));
        const reviews = new Map(summaries.map(r => [`${r._id.buildingName}|${r._id.roomId}`, r]));
        const spotIds = spots.map(s => s._id);
        const [checkedIn, alerts, noise] = await Promise.all([countCheckedIn(spotIds), getActiveAlertsBySpot(spotIds), getNoiseHeat(spotIds)]);

        const results = [];
        for (const spot of spots) {
            const building = byName.get(spot.buildingName);
            if (!building) continue; // no coordinates yet (run `npm run geocode`), so no distance
            const meters = Math.round(distanceMeters(latitude, longitude, building.lat, building.lng));
            const summary = reviews.get(`${spot.buildingName}|${spot.name}`);
            results.push({
                _id: spot._id,
                name: spot.name,
                buildingname: spot.buildingName,
                floor: spot.floor,
                seats: spot.seatCount,
                hasPower: spot.hasPowerSocket,
                // 0 (Quiet) .. 2 (Loud): the average of what students checked in here rated it in the last hour,
                // newer ratings counting more (services/noise-service.js); null = nobody has rated it lately.
                liveNoise: noise[String(spot._id)]?.score ?? null,
                avgRating: summary?.avgRating ?? null,  // 1 .. 5, null = no reviews yet
                reviewCount: summary?.count ?? 0,
                distanceMeters: meters,
                checkedIn: checkedIn[String(spot._id)] || 0,                  // people checked in right now (seats free = seats - this)
                alerts: (alerts[String(spot._id)] || []).map(a => a.type),   // e.g. ['Aircon'], newest first
                walkingMinutes: Math.max(1, Math.round(meters / WALK_METRES_PER_MINUTE)), // straight line, so a slight underestimate
            });
        }
        res.json({ spots: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading database' });
    }
};
