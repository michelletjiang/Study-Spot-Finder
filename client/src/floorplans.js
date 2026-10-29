// Floorplans shown on the building page, keyed by building name, then floor (as the floor filter writes it: 'B1', '2', ...).
// Each room is a polygon in the image's pixel coordinates, linked to a study spot by name
// (the same building + name that reviews use). Spots for LKS level 2 are created by `npm run seed:lks`.
//
// To add a floor: put the image in client/public/floorplans/, then trace each room's corners in pixels
// (any image editor shows the cursor position) and list them as "x,y x,y ...".
export const floorplans = {
  'Li Ka Shing Library': {
    '2': {
      image: '/floorplans/lks-library-L2.png',
      width: 1290,
      height: 1100,
      rooms: [
        { spotName: 'RM2-0', points: '981,156 1050,156 1050,214 981,214' },
        { spotName: 'RM2-1', points: '1054,68 1125,68 1125,152 1054,152' },
        { spotName: 'RM2-2', points: '1127,68 1198,68 1198,152 1127,152' },
        { spotName: 'RM2-3', points: '1200,68 1271,68 1271,152 1200,152' },
        { spotName: 'RM2-4', points: '465,502 514,502 514,587 465,587' },
        { spotName: 'RM2-5', points: '415,502 463,502 463,587 415,587' },
        { spotName: 'Quiet Area (North)', points: '919,216 1052,216 1052,154 1271,154 1271,366 961,366 961,294 919,294' },
        { spotName: 'Quiet Area (East)', points: '1177,366 1271,366 1271,713 1147,713 1147,642 1127,642 1127,470 1177,470' },
        { spotName: 'Learning Commons (West)', points: '237,220 361,220 361,616 237,616' },
        { spotName: 'Learning Commons (East)', points: '517,300 607,300 648,454 631,454 631,686 537,686 537,590 517,590' },
        { spotName: 'Learning Commons (South)', points: '237,620 359,620 359,714 533,714 533,854 467,854 467,868 217,868' },
      ],
    },
  },
}

export function findFloorplan(buildingName, floor) {
  return floorplans[buildingName]?.[floor] || null
}
