// Floorplans shown on the building and floor pages, keyed by building name, then floor (normalised: 'B1', '2', ...).
// Each room is a polygon in the image's pixel coordinates, linked to a study spot by name
// (the same building + name that reviews use). The spots themselves are created by `npm run seed:spots`.
//
// To add a floor: put the image in client/public/floorplans/, then trace each room's corners in pixels
// (any image editor shows the cursor position) and list them as "x,y x,y ...". Add its spots to scripts/seed-floorplan-spots.js.
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
    '3': {
      image: '/floorplans/lks-library-L3.png',
      width: 1316,
      height: 1117,
      rooms: [
        { spotName: 'RM3-1', points: '523,354 581,354 581,420 523,420' },
        { spotName: 'RM3-2', points: '523,423 581,423 581,493 523,493' },
        { spotName: 'RM3-3', points: '949,518 1013,518 1013,595 949,595' },
        { spotName: 'RM3-4', points: '949,439 1013,439 1013,515 949,515' },
        { spotName: 'RM3-5', points: '949,363 1013,363 1013,436 949,436' },
        { spotName: 'Study Space (West)', points: '150,260 262,190 445,190 560,232 618,330 520,352 420,352 420,788 80,788 45,620 70,420' },
        { spotName: 'Study Space (East)', points: '586,500 840,500 840,196 934,196 934,358 945,358 945,784 620,784 620,700 586,700' },
      ],
    },
    '4': {
      image: '/floorplans/lks-library-L4.png',
      width: 1285,
      height: 1105,
      rooms: [
        { spotName: 'RM4-1', points: '554,917 620,917 604,974 554,974' },
        { spotName: 'RM4-2', points: '623,842 683,842 683,915 623,915' },
        { spotName: 'RM4-4', points: '513,352 572,352 572,418 513,418' },
        { spotName: 'RM4-5', points: '513,420 572,420 572,478 513,478' },
        { spotName: 'RM4-6', points: '513,498 572,498 572,585 513,585' },
        { spotName: 'RM4-7', points: '912,530 978,530 978,592 912,592' },
        { spotName: 'RM4-8', points: '912,466 978,466 978,528 912,528' },
        { spotName: 'RM4-9', points: '912,403 978,403 978,464 912,464' },
        { spotName: 'RM4-10', points: '1092,501 1151,501 1151,565 1092,565' },
        { spotName: 'RM4-11', points: '1092,567 1151,567 1151,630 1092,630' },
        { spotName: 'RM4-12', points: '1092,632 1151,632 1151,695 1092,695' },
        { spotName: 'RM4-13', points: '1092,697 1151,697 1151,763 1092,763' },
        { spotName: 'RM4-14', points: '1197,942 1271,942 1271,1035 1197,1035' },
        { spotName: 'RM4-15', points: '1115,942 1195,942 1195,1035 1115,1035' },
        { spotName: 'RM4-16', points: '1053,942 1113,942 1113,1035 1053,1035' },
        { spotName: 'RM4-18', points: '974,143 1057,143 1057,244 974,244' },
        { spotName: 'Carrels & Study Space (East)', points: '913,595 1051,595 1051,762 913,762' },
        { spotName: 'Carrels & Study Space (North)', points: '250,187 433,183 510,118 580,205 633,325 653,455 573,455 573,349 411,349 75,349 125,255 195,175' },
        { spotName: 'Carrels & Study Space (North-East)', points: '831,187 917,187 917,247 1059,247 1059,65 1271,67 1271,765 1153,765 1153,401 831,401' },
        { spotName: 'Study Space (Level 4 South-East)', points: '1053,767 1271,767 1271,939 1053,939' },
        { spotName: 'Study Space (Level 4 West)', points: '75,353 411,353 411,819 418,819 418,915 277,979 240,1023 105,1005 43,875 20,675 35,495' },
      ],
    },
    '5': {
      image: '/floorplans/lks-library-L5.png',
      width: 1265,
      height: 1085,
      rooms: [
        { spotName: 'RM5-1', points: '336,871 410,871 410,955 336,955' },
        { spotName: 'RM5-2', points: '260,871 334,871 334,955 260,955' },
        { spotName: 'RM5-3', points: '184,871 258,871 258,955 184,955' },
        { spotName: 'RM5-4', points: '102,871 182,871 182,955 102,955' },
        { spotName: 'RM5-5', points: '349,514 403,514 403,573 349,573' },
        { spotName: 'RM5-6', points: '349,452 403,452 403,512 349,512' },
        { spotName: 'RM5-7', points: '349,383 403,383 403,450 349,450' },
        { spotName: 'RM5-8', points: '819,350 903,350 903,408 819,408' },
        { spotName: 'RM5-9', points: '819,260 903,260 903,348 819,348' },
        { spotName: 'RM5-10', points: '819,184 903,184 903,258 819,258' },
        { spotName: 'Quiet Area', points: '243,221 423,221 423,341 403,341 403,381 347,381 347,697 413,697 413,867 120,867 150,705 197,455' },
        { spotName: 'Learning Labs', points: '348,575 552,575 552,540 767,540 767,695 348,695' },
      ],
    },
  },
  'SCIS 1': {
    // SVGs: the room shapes below come straight from their <path>s (shifted by the SVG's translate(-150,-105));
    // the seminar rooms' curved roofs are approximated with 10 straight segments
    '2': {
      image: '/floorplans/scis1-L2.svg',
      width: 1060,
      height: 790,
      rooms: [
        { spotName: 'GSR 2-1', points: '145,365 190,365 190,411 145,411' },
        { spotName: 'GSR 2-2', points: '125,271 195,271 195,300 150,300 128,287' },
        { spotName: 'GSR 2-3', points: '118,229 210,229 210,267 118,267' },
        { spotName: 'GSR 2-4', points: '212,229 252,229 252,267 212,267' },
        { spotName: 'GSR 2-5', points: '637,237 685,237 685,291 637,291' },
        { spotName: 'GSR 2-6', points: '588,237 635,237 635,291 588,291' },
        { spotName: 'GSR 2-7', points: '538,237 586,237 586,291 538,291' },
        { spotName: 'SIS Learning Way 2.1', points: '252,435 495,445 495,477 375,475 320,625 170,597 170,463 252,457' },
        { spotName: 'Seminar Room 2-1', points: '168,193 168,145 186,132 204,123 223,116 241,112 259,110 277,112 295,116 314,123 332,132 350,145 350,193' },
        { spotName: 'Seminar Room 2-2', points: '390,195 390,140 405,129 420,120 435,114 450,110 466,109 481,110 496,114 511,120 526,129 541,140 541,195' },
        { spotName: 'Seminar Room 2-3', points: '543,197 543,140 558,129 573,120 589,114 604,110 619,109 634,110 649,114 665,120 680,129 695,140 695,197' },
        { spotName: 'Seminar Room 2-4', points: '732,230 732,155 752,141 773,130 793,122 813,118 834,116 854,118 874,122 894,130 915,141 935,155 935,230' },
      ],
    },
    '3': {
      image: '/floorplans/scis1-L3.svg',
      width: 1060,
      height: 790,
      rooms: [
        { spotName: 'GSR 3-1', points: '140,410 220,410 220,445 140,445' },
        { spotName: 'GSR 3-2', points: '100,295 162,295 162,321 100,321' },
        { spotName: 'GSR 3-3', points: '90,247 150,247 150,291 90,291' },
        { spotName: 'GSR 3-4', points: '187,252 240,252 240,300 187,300' },
        { spotName: 'GSR 3-5', points: '742,285 805,285 805,321 742,321' },
        { spotName: 'GSR 3-6', points: '742,247 805,247 805,282 742,282' },
        { spotName: 'SIS Project Way', points: '370,410 450,410 550,413 620,440 655,495 645,535 590,585 540,610 465,640 430,595 370,520' },
        { spotName: 'SIS Research Way 3', points: '115,525 370,520 430,595 465,640 440,665 370,690 315,717 230,675 150,610 115,565' },
        { spotName: 'Seminar Room 3-1', points: '168,213 168,157 185,146 202,137 219,131 236,127 253,126 270,127 287,131 304,137 321,146 338,157 338,213' },
        { spotName: 'Seminar Room 3-2', points: '413,210 413,149 427,140 441,133 455,128 469,125 483,124 497,125 511,128 525,133 539,140 553,149 553,210' },
        { spotName: 'Seminar Room 3-3', points: '555,215 555,145 569,136 583,129 596,124 610,121 624,120 638,121 652,124 665,129 679,136 693,145 693,215' },
        { spotName: 'Seminar Room 3-4', points: '775,135 850,117 930,120 980,155 980,215 925,217 925,250 865,250 865,220 775,220' },
        { spotName: 'Classroom 3.2', points: '470,237 607,237 607,311 470,311' },
        { spotName: 'Classroom 3.1', points: '609,240 740,240 740,315 609,315' },
      ],
    },
  },
}

export function findFloorplan(buildingName, floor) {
  return floorplans[buildingName]?.[floor] || null
}
