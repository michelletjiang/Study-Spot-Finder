// Study preferences saved on the profile page and used to rank spots (client/src/ranking.js).
// Need ids match NEEDS in ranking.js. 'off' = don't mind.
const NEED_IDS = ['quiet', 'power', 'rated', 'seatsFree'];
const NEED_LEVELS = ['off', 'nice', 'must'];
const DISTANCE_LEVELS = ['low', 'medium', 'high'];
const SEAT_CHOICES = [null, 2, 4, 6];

const DEFAULT_PREFERENCES = {
    needs: Object.fromEntries(NEED_IDS.map(id => [id, 'off'])),
    distance: 'medium',
    seats: null,
};

// Turns a request body into clean preferences, or returns { errors } if any value isn't allowed.
function parsePreferences(body = {}) {
    const errors = [];
    const needs = {};
    for (const id of NEED_IDS) {
        const level = body.needs?.[id] ?? DEFAULT_PREFERENCES.needs[id];
        if (!NEED_LEVELS.includes(level)) errors.push(`Unknown level for ${id}.`);
        needs[id] = level;
    }
    const distance = body.distance ?? DEFAULT_PREFERENCES.distance;
    if (!DISTANCE_LEVELS.includes(distance)) errors.push('Unknown distance choice.');
    const seats = body.seats ?? DEFAULT_PREFERENCES.seats;
    if (!SEAT_CHOICES.includes(seats)) errors.push('Seats needed must be any, 2, 4 or 6.');
    return errors.length ? { errors } : { preferences: { needs, distance, seats } };
}

// The saved preferences with defaults filled in, for accounts made before preferences existed.
function withDefaults(saved) {
    return {
        needs: { ...DEFAULT_PREFERENCES.needs, ...saved?.needs },
        distance: saved?.distance || DEFAULT_PREFERENCES.distance,
        seats: saved?.seats ?? DEFAULT_PREFERENCES.seats,
    };
}

module.exports = { NEED_IDS, NEED_LEVELS, DISTANCE_LEVELS, SEAT_CHOICES, DEFAULT_PREFERENCES, parsePreferences, withDefaults };
