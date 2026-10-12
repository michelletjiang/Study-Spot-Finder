/* Local-only rehearsal launcher. Never use DEMO_MODE outside a disposable loopback database. */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/user-model');
const { createApp } = require('../server');

if (process.env.DEMO_MODE !== 'true') throw new Error('demo.js requires DEMO_MODE=true');

(async () => {
  // Demo mode always owns an ephemeral loopback database. It never accepts DB from
  // the environment, so a typo cannot cause seed deletes against a remote database.
  const mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
  const db = mongo.getUri('study_spot_demo');
  await mongoose.connect(db);
  const password = await bcrypt.hash('DemoPass123!', 12);
  await User.deleteMany({ email: { $in: ['student.demo@local.test', 'admin.demo@local.test'] } });
  await User.create([
    { username: 'studentdemo', email: 'student.demo@local.test', password, school: ['SCIS'], role: 'Student' },
    { username: 'admindemo', email: 'admin.demo@local.test', password, school: ['SCIS'], role: 'Admin' }
  ]);
  const app = createApp();
  const server = app.listen(Number(process.env.PORT || 8000), '127.0.0.1', () => console.log(`Demo running at http://127.0.0.1:${process.env.PORT || 8000}/`));
  const cleanup = async (code = 0) => {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(code);
  };
  process.once('SIGINT', () => cleanup());
  process.once('SIGTERM', () => cleanup());
})().catch(error => { console.error(error); process.exit(1); });
