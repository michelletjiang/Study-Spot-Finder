// Adds demo data for Yong Pung How School of Law and the Kwa Geok Choo Law Library inside it:
// reviews for every study spot, and past check-ins from the last two weeks so each room's "Busiest times" chart has a shape.
// Every demo review is tagged seed: 'demo-law' and every demo check-in has the same made-up userId, so re-running
// replaces them and real reviews and check-ins are never touched. The check-ins have all ended, so they don't change
// how many seats are free right now.
// Usage: npm run seed:law             (add or refresh)
//        npm run seed:law -- --remove (delete them all)
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const StudySpot = require('../models/studyspot-model');
const CheckIn = require('../models/checkin-model');

const BUILDING = 'Yong Pung How School of Law';
const SEED_TAG = 'demo-law';
const DUMMY_USER_ID = new mongoose.Types.ObjectId('000000000000000000a1a1a1');
const DAY_MS = 24 * 60 * 60 * 1000;
const SG_OFFSET_MS = 8 * 60 * 60 * 1000;

// the same demo students who review the other buildings
const REVIEWERS = ['tanya.goh', 'faizal_r', 'mei.ling', 'shaun.k', 'amanda_t', 'joel.wong', 'marcus_lim', 'nurul.h', 'huimin.ong', 'kaiwen.tan', 'benedict_o', 'clarissa.y', 'priya_s',
  'zhengyu.c', 'jolene_ng', 'sofia_lee', 'dhruv.k', 'aisha.rahman', 'weijie88', 'ryan_teo'];

// A small seeded random number generator, so re-running gives the same data.
let seed = 20261105;
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = list => list[Math.floor(random() * list.length)];

// What students say about each kind of room: [rating, noise, title, content]
const REVIEWS = {
  kgcQuiet: [
    [4, 'Quiet', 'Sockets everywhere', 'Every carrel has a socket and a lamp. Wifi is fast even when it is full.'],
    [5, 'Quiet', 'My go-to for readings', 'I can get through a whole week of readings in one afternoon here. Zero distractions.'],
    [4, 'Quiet', 'Cosy reading nooks', 'The curved desks along the edge feel private. Nice place to hide during recess week.'],
    [3, 'Quiet', 'Freezing cold', 'Love the silence but the aircon is brutal. Bring a hoodie and a scarf.'],
    [5, 'Quiet', 'Worth the walk', 'Further than Li Ka Shing but so much calmer. Always find a seat before noon.'],
    [2, 'Moderate', 'Not as quiet in week 13', 'During finals people whisper and pack in. Still okay but not the peace it usually is.'],
    [4, 'Quiet', 'Natural light is great', 'Big windows and soft lighting, my eyes do not get tired after hours of reading.'],
    [5, 'Quiet', 'Best quiet spot on campus', 'Dead silent and the desks are huge. Perfect for reading cases for hours.'],
    [5, 'Quiet', 'Exam season home', 'Came here every day during finals. Sockets at almost every seat and the lighting is soft.'],
    [4, 'Quiet', 'Lovely but fills up fast', 'Beautiful curved reading room. Get here before 10am in week 13 or you will not find a seat.'],
    [4, 'Quiet', 'Great view of the atrium', 'Calm and spacious. Aircon is a bit cold so bring a jacket.'],
    [3, 'Quiet', 'Too quiet for me honestly', 'You can hear every pen drop. Good if you need total focus, awkward if you snack.'],
    [5, 'Quiet', 'Law library supremacy', 'Cleanest library on campus and nobody talks. The carrels by the window are the best.'],
  ],
  kgcProject: [
    [4, 'Moderate', 'Screen is easy to use', 'Just plug in HDMI and it works. Great for running through slides.'],
    [5, 'Quiet', 'Soundproof enough', 'We had a mock interview here and nobody outside could hear us.'],
    [3, 'Moderate', 'Chairs could be better', 'The room is nice but the chairs get uncomfortable after two hours.'],
    [4, 'Moderate', 'Handy for case discussions', 'Big whiteboard for mapping out case facts. Markers sometimes run dry so bring your own.'],
    [2, 'Moderate', 'Booking hogs', 'People book and do not show up, so the room sits empty while we wait.'],
    [5, 'Moderate', 'Perfect for moot prep', 'Whiteboard plus a screen to plug into. We practised our moot submissions here.'],
    [4, 'Moderate', 'Good group room', 'Fits six comfortably. Soundproofing is decent so you can talk normally.'],
    [4, 'Quiet', 'Book early', 'Really nice rooms but they are always booked in the afternoons.'],
    [3, 'Moderate', 'A bit small', 'Okay for four people, six gets cramped with laptops and casebooks out.'],
    [5, 'Moderate', 'Our group project base', 'Booked this every week for our group project. Screen works well and it is very clean.'],
  ],
  gsr: [
    [4, 'Moderate', 'Good for late night work', 'Still open late and quiet after 8pm. We finished our memo here.'],
    [5, 'Quiet', 'Clean and bright', 'Feels new, whiteboard is clean and the screen connects quickly.'],
    [3, 'Moderate', 'Aircon too strong', 'Freezing in here even with the door open. Otherwise fine.'],
    [4, 'Moderate', 'Easy to book', 'Usually a slot free if you book a day ahead. Fits five people comfortably.'],
    [3, 'Loud', 'Busy corridor outside', 'People chatting outside the door between classes. Mornings are better.'],
    [4, 'Moderate', 'Solid group study room', 'Good whiteboard and the TV screen works. Can get warm with six people.'],
    [4, 'Moderate', 'Reliable for meetings', 'Always clean and the booking system is easy. Sockets under the table.'],
    [3, 'Moderate', 'Fine but no windows', 'Does the job for group work but feels a bit stuffy after two hours.'],
    [5, 'Quiet', 'Hidden gem', 'Usually free in the mornings and nobody walks past. Great for solo study too.'],
    [2, 'Loud', 'Thin walls', 'You can hear the group next door through the wall. Not great for calls.'],
  ],
  seminar: [
    [5, 'Quiet', 'Secret study spot', 'Nobody thinks to study in seminar rooms after 6pm. Had the whole room to myself.'],
    [4, 'Moderate', 'Great for group revision', 'The big screen and tiered seats make it easy to go through slides as a group.'],
    [2, 'Moderate', 'Kicked out twice', 'Two classes started while I was in here. Check the booking schedule outside the door.'],
    [4, 'Quiet', 'Big desks', 'Enough space to spread out a casebook, laptop and notes.'],
    [4, 'Quiet', 'Empty after classes', 'After the last class it is basically empty. Big desks and plenty of sockets.'],
    [3, 'Moderate', 'Check the timetable first', 'Nice room but classes keep starting, so you get kicked out a lot.'],
    [4, 'Quiet', 'Comfy chairs', 'The chairs are really comfortable and the room is bright. Good for a few hours of reading.'],
    [3, 'Moderate', 'Okay in a pinch', 'Aircon is strong and wifi is fine. People wander in looking for their class though.'],
  ],
  classroom: [
    [4, 'Quiet', 'Good backup spot', 'When KGC is full I come here. Usually empty in the late afternoon.'],
    [2, 'Moderate', 'Always a class', 'Every time I try there is a lesson going on. Not reliable.'],
    [3, 'Quiet', 'Plain but works', 'No frills, but quiet with sockets along the side walls.'],
    [4, 'Moderate', 'Fine for discussions', 'Okay for a small group to talk through a tutorial before class.'],
    [3, 'Moderate', 'Usable between lessons', 'Okay for a quick study session but there is almost always a class scheduled.'],
    [4, 'Quiet', 'Quiet in the evenings', 'After 7pm it is empty and calm. Sockets along the walls.'],
    [3, 'Moderate', 'Nothing special', 'Standard classroom. Fine if everywhere else is full.'],
  ],
  common: [
    [5, 'Moderate', 'Best for group chats', 'Lots of tables and you can talk at a normal volume. Great before tutorials.'],
    [3, 'Loud', 'Not for deep work', 'Too much going on for proper revision, but good for catching up with friends.'],
    [4, 'Moderate', 'Comfy and central', 'Sofas are comfy and it is near the lifts. Sockets by the pillars.'],
    [4, 'Quiet', 'Calm mornings', 'Before 10am it is nearly empty and very peaceful.'],
    [4, 'Moderate', 'Nice place to chill and study', 'Comfy sofas and a good buzz. Good for light work, not for deep focus.'],
    [3, 'Loud', 'Lively at lunch', 'Gets loud around lunchtime with groups discussing. Mornings are calmer.'],
    [4, 'Moderate', 'Good between classes', 'Close to the seminar rooms so it is easy to pop in for an hour.'],
  ],
  terrace: [
    [4, 'Moderate', 'Nice for a break', 'Good place to read lighter stuff and get some sun.'],
    [2, 'Loud', 'Too hot and noisy', 'Midday sun hits the tables and people come out for lunch. Go early.'],
    [4, 'Quiet', 'Peaceful in the evening', 'After sunset it cools down and is surprisingly quiet.'],
    [3, 'Moderate', 'Bring a power bank', 'Pretty spot but no sockets anywhere, so my laptop died halfway.'],
    [4, 'Moderate', 'Fresh air study', 'Nice breeze and lots of greenery. No sockets so charge your laptop first.'],
    [3, 'Loud', 'Hot in the afternoon', 'Lovely in the morning, but by 2pm it gets hot and busy.'],
    [5, 'Moderate', 'Great vibes', 'My favourite spot for reading in the morning. Very relaxing.'],
  ],
}

function kindOf(name) {
  if (name.startsWith('KGC Quiet')) return 'kgcQuiet';
  if (name.startsWith('KGC Project')) return 'kgcProject';
  if (name.startsWith('GSR')) return 'gsr';
  if (name.startsWith('Seminar')) return 'seminar';
  if (name.startsWith('Classroom')) return 'classroom';
  if (name === 'Social Terrace') return 'terrace';
  return 'common';
}

// When each kind of room is busy: open hours (first to last arrival), the peak hour,
// and how full it gets at the peak on a weekday (share of the seats).
const BUSY = {
  kgcQuiet: { from: 9, to: 22, peak: 15, share: 0.55 },
  kgcProject: { from: 10, to: 21, peak: 15, share: 0.7 },
  gsr: { from: 9, to: 21, peak: 14, share: 0.65 },
  seminar: { from: 9, to: 22, peak: 19, share: 0.25 },
  classroom: { from: 9, to: 22, peak: 19, share: 0.2 },
  common: { from: 9, to: 20, peak: 12, share: 0.5 },
  terrace: { from: 8, to: 18, peak: 10, share: 0.4 },
};
const DAYS_OF_DATA = 14; // the chart averages over the weeks it has data for, so two weeks gives the full picture
const AVERAGE_STAY_HOURS = 1.5;
function reviewsFor(spot) {
  const templates = REVIEWS[kindOf(spot.name)];
  const count = 4 + Math.floor(random() * 4); // 4 to 7 reviews
  const chosen = [...templates].sort(() => random() - 0.5).slice(0, Math.min(count, templates.length));
  const authors = [...REVIEWERS].sort(() => random() - 0.5);
  return chosen.map(([rating, noiseLevel, title, content], i) => {
    const createdAt = new Date(Date.now() - (2 + random() * 55) * DAY_MS);
    const others = authors.filter(a => a !== authors[i]);
    return {
      buildingName: BUILDING,
      roomId: spot.name,
      userId: authors[i],
      title,
      content,
      rating,
      noiseLevel,
      upvotes: others.slice(0, Math.floor(random() * 4)),
      downvotes: rating <= 2 ? others.slice(5, 6) : [],
      createdAt,
      updatedAt: createdAt,
      seed: SEED_TAG,
    };
  });
}

// Past check-ins over the last two weeks: weekdays busier than weekends, most of them around the room's peak hour.
function checkInsFor(spot) {
  const busy = BUSY[kindOf(spot.name)];
  const spread = (busy.to - busy.from) / 3;
  const docs = [];
  const now = Date.now();
  for (let daysAgo = 1; daysAgo <= DAYS_OF_DATA; daysAgo++) {
    const sgMidnight = Math.floor((now + SG_OFFSET_MS) / DAY_MS) * DAY_MS - SG_OFFSET_MS - daysAgo * DAY_MS;
    const weekday = new Date(sgMidnight + SG_OFFSET_MS).getUTCDay();
    const dayFactor = weekday === 0 || weekday === 6 ? 0.35 : weekday === 5 ? 0.75 : 1;
    for (let hour = busy.from; hour < busy.to; hour++) {
      // people arriving this hour, so that about share x seats are in the room at the peak
      const bell = Math.exp(-(((hour - busy.peak) / spread) ** 2));
      const expected = (spot.seatCount * busy.share * bell * dayFactor) / AVERAGE_STAY_HOURS;
      const arrivals = Math.floor(expected * (0.7 + random() * 0.6) + random());
      for (let v = 0; v < arrivals; v++) {
        const start = sgMidnight + hour * 3600000 + random() * 3600000;
        const end = Math.min(start + (40 + random() * 100) * 60000, now - 60000);
        if (end > start) docs.push({ spot: spot._id, userId: DUMMY_USER_ID, createdAt: new Date(start), updatedAt: new Date(start), endsAt: new Date(end) });
      }
    }
  }
  return docs;
}

async function main() {
  await mongoose.connect(process.env.DB);
  const reviews = mongoose.connection.db.collection('reviews');

  const oldReviews = await reviews.deleteMany({ seed: SEED_TAG });
  const oldCheckIns = await CheckIn.deleteMany({ userId: DUMMY_USER_ID });
  console.log(`Removed ${oldReviews.deletedCount} old demo reviews and ${oldCheckIns.deletedCount} old demo check-ins.`);
  if (process.argv.includes('--remove')) return;

  const spots = (await StudySpot.findByBuilding(BUILDING)).sort((a, b) => a.name.localeCompare(b.name));
  if (!spots.length) throw new Error(`No study spots in ${BUILDING}. Run npm run seed:spots first.`);

  const reviewDocs = spots.flatMap(reviewsFor);
  const checkInDocs = spots.flatMap(checkInsFor);
  await reviews.insertMany(reviewDocs);
  // insertMany through the raw collection so the made-up createdAt dates are kept
  await CheckIn.collection.insertMany(checkInDocs);
  const kgc = spots.filter(s => s.name.startsWith('KGC')).length;
  console.log(`${BUILDING}: ${spots.length} spots (${kgc} in the KGC Law Library)`);
  console.log(`Added ${reviewDocs.length} demo reviews and ${checkInDocs.length} past check-ins.`);
}

main()
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
