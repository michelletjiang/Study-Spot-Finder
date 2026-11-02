import { api } from './api'

// Reviews and favourites point at a spot by building name + spot name, not by its id.
// This loads every spot once so a page can link a review or favourite to its room (/spots/:id).
const key = (buildingName, spotName) => `${buildingName}\n${spotName}`

export async function loadSpotIndex() {
  const spots = await api('/api/spots')
  const byKey = new Map(spots.map(s => [key(s.buildingName, s.name), s]))
  // the spot, or undefined if it has been deleted or renamed since
  return (buildingName, spotName) => byKey.get(key(buildingName, spotName))
}
