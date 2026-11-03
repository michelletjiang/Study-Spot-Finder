// Which floors a building has: basements B1..B{basements} below ground, then 1..floors.
// Used to check new buildings (controllers/building-controller.js) and study spots' floors (controllers/studyspot-controller.js).
const MIN_FLOORS = 1;
const MAX_FLOORS = 10;
const MAX_BASEMENTS = 2;

const isWhole = (value, min, max) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max && String(value).trim() !== '';

// An error message for the floors and basements an admin entered, or null. Basements may be left out (= none).
function checkLevels({ floors, basements = 0 }) {
    if (!isWhole(floors, MIN_FLOORS, MAX_FLOORS)) return `Floors must be a whole number from ${MIN_FLOORS} to ${MAX_FLOORS}.`;
    if (!isWhole(basements, 0, MAX_BASEMENTS)) return `Basement levels must be 0 to ${MAX_BASEMENTS}.`;
    return null;
}

// True if floor ("3", "B1", "b2") is one of the building's floors.
function isFloorOf(floor, building) {
    const f = String(floor).trim().toUpperCase();
    const basement = /^B(\d+)$/.exec(f);
    if (basement) return Number(basement[1]) >= 1 && Number(basement[1]) <= (building.basements || 0);
    return isWhole(f, 1, building.floors);
}

// "1-5", "B1 or 1-5", "B1, B2 or 1-5": the floors a spot in this building can be on, for error messages.
function floorRange(building) {
    const basements = Array.from({ length: building.basements || 0 }, (_, i) => `B${i + 1}`);
    return [...basements, `1-${building.floors}`].join(', ').replace(/, (?=[^,]*$)/, ' or ');
}

module.exports = { MIN_FLOORS, MAX_FLOORS, MAX_BASEMENTS, checkLevels, isFloorOf, floorRange };
