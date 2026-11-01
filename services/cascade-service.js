// ACTIVE: cascade deletes for the JSON API.
// MongoDB has no ON DELETE CASCADE, so when a parent record is removed we remove its children here.
// The chain is: building -> study spots -> reviews -> reports, plus favourites that copy a spot
// and the spot's crowd check-ins and alerts; and an account -> its reviews (-> reports),
// favourites, admin requests, crowd check-ins and alerts.
// Children are deleted before the parent, so a failure part-way never leaves a child pointing at nothing.

const Building = require('../models/building-model');
const StudySpot = require('../models/studyspot-model');
const Review = require('../models/reviews-model');
const Report = require('../models/reports');
const Favourite = require('../models/favourites-model');
const AdminRequest = require('../models/admin-request-model');
const CrowdReport = require('../models/crowd-report-model');
const StudySpotAlert = require('../models/studyspot-alert-model');

// Crowd check-ins and alerts link to spots and users by ObjectId.
async function deleteSpotActivity(spotIds) {
    await CrowdReport.deleteMany({ spot: { $in: spotIds } });
    await StudySpotAlert.deleteMany({ spot: { $in: spotIds } });
}

// Delete one review and every report filed against it.
async function deleteReview(reviewId) {
    await Report.deleteByReview(reviewId);
    return Review.deleteReview(reviewId);
}

// Delete one study spot with its reviews, their reports, and everyone's favourites of it.
// Reviews and favourites point at a spot by buildingName + spot name, not by ObjectId.
async function deleteSpot(spot) {
    const reviews = await Review.findByRoom(spot.buildingName, spot.name);
    await Report.deleteByReviews(reviews.map(r => r._id));
    await Review.deleteByRoom(spot.buildingName, spot.name);
    await Favourite.deleteBySpot(spot.buildingName, spot.name);
    await deleteSpotActivity([spot._id]);
    return StudySpot.deleteSpot(spot._id);
}

// Delete a building and everything under it.
async function deleteBuilding(building) {
    const name = building.buildingname;
    const reviews = await Review.findByBuilding(name);
    await Report.deleteByReviews(reviews.map(r => r._id));
    await Review.deleteByBuilding(name);
    await Favourite.deleteByBuilding(name);
    const spots = await StudySpot.findByBuilding(name);
    await deleteSpotActivity(spots.map(s => s._id));
    await StudySpot.deleteByBuilding(name);
    return Building.deleteBuilding(building.postal);
}

// Remove everything an account owns. The caller deletes the User document itself.
// user is the session user: { id, username }.
async function deleteUserData(user) {
    const reviews = await Review.findbyUser(user.username);
    await Report.deleteByReviews(reviews.map(r => r._id));
    await Review.deleteByUser(user.username);
    await Review.removeVotesByUser(user.username);
    await Favourite.deleteByUser(user.username);
    await AdminRequest.deleteByUser(user.id);
    await CrowdReport.deleteMany({ userId: user.id });
    await StudySpotAlert.deleteMany({ userId: user.id });
    // Remove their votes on other people's alerts.
    await StudySpotAlert.updateMany({}, { $pull: { confirms: user.id, disputes: user.id } });
}

// After an admin edits a spot, keep reviews and favourites attached to it.
// oldSpot is the spot before the edit; updated holds the new field values.
async function syncSpotEdit(oldSpot, updated) {
    await Favourite.updateSpotDetails(oldSpot.buildingName, oldSpot.name, {
        spotName:       updated.name,
        floor:          updated.floor,
        seatCount:      updated.seatCount,
        hasPowerSocket: updated.hasPowerSocket,
        noiseLevel:     updated.noiseLevel
    });
    if (updated.name !== oldSpot.name) {
        await Review.renameRoom(oldSpot.buildingName, oldSpot.name, updated.name);
    }
}

// After a user changes their username, move everything stored under the old one.
async function renameUser(oldUsername, newUsername) {
    await Review.renameUser(oldUsername, newUsername);
    await Report.renameReporter(oldUsername, newUsername);
    await Favourite.renameUser(oldUsername, newUsername);
}

module.exports = { deleteReview, deleteSpot, deleteBuilding, deleteUserData, syncSpotEdit, renameUser };
