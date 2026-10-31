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
  
  'Yong Pung How School of Law': {
    // SVGs: the room shapes below come straight from their <path>s (no translate);
    // the round law library is approximated with straight segments, minus the toilets/office/stairs cut out of it.
    // No level 4: it's mostly the law library, which has its own building and floorplan
    'B1': {
      image: '/floorplans/yph-law-LB1.svg',
      width: 1060,
      height: 604,
      rooms: [
        { spotName: 'Seminar Room B1-01', points: '697,127 867,127 867,166 832,184 832,197 737,197 737,184 697,154' },
        { spotName: 'GSR B1-04', points: '922,120 950,120 950,140 922,140' },
        { spotName: 'GSR B1-05', points: '951,120 984,120 984,140 951,140' },
        { spotName: 'GSR B1-06', points: '987,120 1018,120 1018,136 987,136' },
        { spotName: 'GSR B1-03', points: '922,143 975,143 975,159 922,159' },
        { spotName: 'GSR B1-07', points: '987,139 1018,139 1018,161 987,161' },
        { spotName: 'GSR B1-02', points: '925,161 963,161 963,193 925,193' },
        { spotName: 'GSR B1-08', points: '987,164 1018,164 1018,193 987,193' },
        { spotName: 'Classroom B1-13', points: '761,228 855,228 855,294 761,294' },
        { spotName: 'GSR B1-10', points: '857,219 893,219 893,237 857,237' },
        { spotName: 'GSR B1-11', points: '857,239 893,239 893,260 857,260' },
        { spotName: 'GSR B1-12', points: '857,262 893,262 893,294 857,294' },
        { spotName: 'Classroom B1-09', points: '896,223 1018,223 1018,285 896,285' },
      ],
    },
    'B2': {
      image: '/floorplans/yph-law-LB2.svg',
      width: 1060,
      height: 589,
      rooms: [
        { spotName: 'Seminar Room B2-01', points: '689,116 827,116 827,193 689,193' },
        { spotName: 'Classroom B2-03', points: '672,212 763,212 763,282 672,282' },
      ],
    },
    '1': {
      image: '/floorplans/yph-law-L1.svg',
      width: 1060,
      height: 576,
      rooms: [
        { spotName: 'Classroom 1-02', points: '787,131 876,131 876,200 787,200' },
      ],
    },
    '2': {
      image: '/floorplans/yph-law-L2.svg',
      width: 1060,
      height: 554,
      rooms: [
        { spotName: 'GSR 2-12', points: '211,122 238,122 238,160 211,160' },
        { spotName: 'GSR 2-13', points: '240,122 268,122 268,160 240,160' },
        { spotName: 'GSR 2-14', points: '271,122 299,122 299,161 271,161' },
        { spotName: 'Seminar Room 2-15', points: '407,118 487,118 487,200 407,200' },
        { spotName: 'Seminar Room 2-16', points: '534,122 618,122 618,204 534,204' },
        { spotName: 'Seminar Room 2-01', points: '725,125 793,125 793,217 725,217' },
        { spotName: 'Seminar Room 2-02', points: '796,149 890,149 890,220 796,220' },
        { spotName: 'Seminar Room 2-03', points: '922,129 1010,129 1010,226 922,226' },
        { spotName: 'GSR 2-08', points: '75,205 113,205 104,226 65,226' },
        { spotName: 'GSR 2-07', points: '64,228 103,228 92,253 52,253' },
        { spotName: 'Seminar Room 2-05', points: '362,312 451,312 451,374 362,374' },
        { spotName: 'Seminar Room 2-04', points: '460,318 550,318 550,376 460,376' },
        { spotName: 'Social Terrace', points: '356,398 574,398 574,456 356,456' },
      ],
    },
    '3': {
      image: '/floorplans/yph-law-L3.svg',
      width: 1060,
      height: 576,
      rooms: [
        { spotName: 'Seminar Room 3-11', points: '368,122 456,122 456,214 368,214' },
        { spotName: 'Seminar Room 3-12', points: '505,126 592,126 592,210 505,210' },
        { spotName: 'Seminar Room 3-01', points: '697,130 787,130 787,224 697,224' },
        { spotName: 'Seminar Room 3-02', points: '792,137 881,137 881,228 792,228' },
        { spotName: 'GSR 3-05', points: '916,155 969,155 969,187 916,187' },
        { spotName: 'GSR 3-04', points: '916,188 969,188 969,211 916,211' },
        { spotName: 'GSR 3-03', points: '916,213 969,213 969,236 916,236' },
        { spotName: 'GSR 3-06', points: '972,159 1019,159 1019,195 972,195' },
        { spotName: 'GSR 3-07', points: '972,197 1019,197 1019,228 972,228' },
        { spotName: 'GSR 3-08', points: '972,230 1019,230 1019,262 972,262' },
        { spotName: 'Kwa Geok Choo Law Library (Level 3)', points: '158,474 136,470 115,462 96,451 79,437 65,420 53,401 45,380 41,358 40,336 43,314 50,292 60,273 73,255 89,239 107,227 128,218 149,213 171,211 193,214 214,220 234,229 252,242 214,314 195,408' },
        { spotName: 'Learning Common', points: '316,314 364,316 364,408 458,408 458,462 316,462' },
        { spotName: 'Seminar Room 3-10', points: '366,319 453,319 453,406 366,406' },
        { spotName: 'Seminar Room 3-09', points: '519,327 604,327 604,411 519,411' },
      ],
    },
  },

  'School of Accountancy': {
    // SVGs: the room shapes below come straight from their <path>s (no translate);
    // the seminar rooms' rounded walls are approximated with straight segments
    '1': {
      image: '/floorplans/soa-L1.svg',
      width: 1060,
      height: 760,
      rooms: [
        { spotName: 'Seminar Room 1.1', points: '807,202 878,202 889,203 900,205 910,209 919,214 927,220 934,227 938,234 941,243 942,251 941,260 938,268 934,276 927,283 919,289 910,294 900,297 889,300 878,300 807,300' },
        { spotName: 'Seminar Room 1.2', points: '805,319 868,319 884,321 899,326 913,334 926,346 938,359 947,375 954,393 958,412 959,431 805,431' },
        { spotName: 'Seminar Room 1.3', points: '810,431 962,431 961,455 957,477 950,498 940,517 929,534 915,547 900,557 884,563 868,565 810,565' },
      ],
    },
    '2': {
      image: '/floorplans/soa-L2.svg',
      width: 1060,
      height: 760,
      rooms: [
        { spotName: 'GSR 2.5', points: '530,145 565,145 565,184 530,184' },
        { spotName: 'GSR 2.6', points: '568,156 602,164 597,204 568,204' },
        { spotName: 'GSR 2.7', points: '688,176 738,176 738,202 707,202 707,237 688,237' },
        { spotName: 'Seminar Room 2.2', points: '418,162 475,162 475,298 418,298 408,297 398,294 389,289 381,282 374,274 368,264 364,253 361,242 361,230 361,218 364,207 368,196 374,186 381,178 389,171 398,166 408,163 418,162' },
        { spotName: 'Seminar Room 2.1', points: '413,326 460,326 460,407 425,409 425,488 413,488 403,487 393,483 384,477 376,469 369,459 363,447 359,435 356,421 356,407 356,393 359,379 363,367 369,355 376,345 384,337 393,331 403,327 413,326' },
        { spotName: 'Seminar Room 2.3', points: '859,165 871,166 882,169 893,174 902,181 911,189 917,198 922,209 925,220 926,231 925,243 922,254 917,264 911,273 902,282 893,288 882,293 871,296 859,297 812,297 812,237 792,237 792,206 817,203 817,184 836,181' },
        { spotName: 'Seminar Room 2.4', points: '814,323 876,323 888,325 899,330 910,337 920,348 928,361 935,376 940,393 943,411 944,429 814,429' },
        { spotName: 'Seminar Room 2.5', points: '814,438 949,438 948,459 944,480 939,499 932,517 923,532 913,544 901,553 889,559 876,561 814,538' },
        { spotName: 'GSR 2.4', points: '518,389 567,389 567,413 518,413' },
        { spotName: 'GSR 2.3', points: '518,416 568,416 568,441 518,441' },
        { spotName: 'GSR 2.2', points: '516,444 551,446 551,499 515,483' },
        { spotName: 'GSR 2.1', points: '553,463 587,463 588,530 553,505' },
        { spotName: 'GSR 2.9', points: '692,415 736,415 736,443 692,443' },
        { spotName: 'GSR 2.8', points: '693,449 737,449 737,477 693,477' },
        { spotName: 'Classroom 2.1', points: '695,482 758,485 764,597 695,575' },
      ],
    },
    '3': {
      image: '/floorplans/soa-L3.svg',
      width: 1060,
      height: 760,
      rooms: [
        { spotName: 'GSR 3.2', points: '534,144 570,144 570,182 534,182' },
        { spotName: 'GSR 3.3', points: '572,155 620,155 620,193 572,193' },
        { spotName: 'GSR 3.4', points: '675,177 731,177 731,202 675,202' },
        { spotName: 'GSR 3.5', points: '675,204 731,204 731,236 675,236' },
        { spotName: 'GSR 3.6', points: '736,208 768,208 768,252 736,252' },
        { spotName: 'Seminar Room 3.3', points: '841,162 859,161 873,162 886,164 899,169 910,176 920,184 928,193 934,203 937,214 938,225 937,236 934,247 928,257 920,266 910,274 899,281 886,285 873,288 859,289 812,289 812,188 841,186' },
        { spotName: 'Seminar Room 3.4', points: '819,358 879,358 890,359 901,363 912,370 922,379 930,391 937,404 942,418 945,434 946,450 819,450' },
        { spotName: 'Seminar Room 3.5', points: '819,454 948,454 947,472 944,489 939,506 932,520 923,533 913,543 902,551 891,556 879,557 819,557' },
        { spotName: 'GSR 3.7', points: '699,524 763,528 765,597 698,571' },
        { spotName: 'GSR 3.10', points: '696,388 739,388 739,413 696,413' },
        { spotName: 'GSR 3.9', points: '697,417 740,417 740,443 697,443' },
        { spotName: 'GSR 3.8', points: '698,446 741,446 741,477 698,477' },
        { spotName: 'Seminar Room 3.2', points: '422,166 455,167 455,195 481,198 481,237 469,238 469,281 422,292 412,291 402,289 393,284 385,278 378,270 372,261 368,251 365,240 364,229 365,218 368,208 372,198 378,188 385,181 393,174 402,170 412,167 422,166' },
        { spotName: 'Seminar Room 3.1', points: '414,324 465,327 465,407 429,408 429,477 414,477 405,476 396,473 387,467 379,459 372,450 367,439 363,427 360,414 359,401 360,387 363,374 367,362 372,351 379,342 387,334 396,329 405,325 414,324' },
        { spotName: 'GSR 3.1', points: '520,446 591,450 592,530 517,490' },
      ],
    },
  },

  'School of Social Sciences / College of Integrative Studies': {
    // SVGs: the room shapes below come straight from their <path>s (no translate)
    'B1': {
      image: '/floorplans/soss-LB1.svg',
      width: 1060,
      height: 588,
      rooms: [
        { spotName: 'Seminar Room B1-1', points: '498,237 567,219 602,219 602,335 498,335' },
      ],
    },
    '1': {
      image: '/floorplans/soss-L1.svg',
      width: 1060,
      height: 640,
      rooms: [
        { spotName: 'Student Lounge', points: '390,261 709,142 763,297 706,312 706,367 590,382 390,382' },
        { spotName: 'Seminar Room 1-2', points: '270,388 373,388 373,491 270,491' },
        { spotName: 'Classroom 1-2', points: '374,391 480,391 480,500 374,500' },
        { spotName: 'Seminar Room 1-1', points: '481,400 588,400 588,506 481,506' },
      ],
    },
    '2': {
      image: '/floorplans/soss-L2.svg',
      width: 1060,
      height: 606,
      rooms: [
        { spotName: 'Seminar Room 2-2', points: '411,379 518,379 518,483 411,483' },
        { spotName: 'Seminar Room 2-1', points: '520,379 627,379 627,483 520,483' },
      ],
    },
    '3': {
      image: '/floorplans/soss-L3.svg',
      width: 1060,
      height: 574,
      rooms: [
        { spotName: 'Study Area', points: '189,335 251,292 274,285 284,348 189,348' },
        { spotName: 'Classroom 3-4', points: '276,285 458,212 458,313 276,316' },
        { spotName: 'Seminar Room 3-3', points: '287,363 395,363 395,458 287,458' },
        { spotName: 'Classroom 3-2', points: '395,363 501,363 501,458 395,458' },
        { spotName: 'Seminar Room 3-1', points: '502,363 606,363 606,461 502,461' },
        { spotName: 'Classroom 3-5', points: '793,238 927,217 930,304 793,310' },
      ],
    },
  },
}

export function findFloorplan(buildingName, floor) {
  return floorplans[buildingName]?.[floor] || null
}
