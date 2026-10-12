/* Local-only rehearsal launcher. Never use DEMO_MODE outside a disposable loopback database. */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { spawn } = require('node:child_process');
const User = require('../models/user-model');
const db = process.env.DB || 'mongodb://127.0.0.1:27017/study_spot_demo';
if (process.env.DEMO_MODE !== 'true') throw new Error('demo.js requires DEMO_MODE=true');
(async () => {
  await mongoose.connect(db);
  const password = await bcrypt.hash('DemoPass123!', 12);
  await User.deleteMany({ email: { $in: ['student.demo@local.test', 'admin.demo@local.test'] } });
  await User.create([
    { username: 'studentdemo', email: 'student.demo@local.test', password, school: ['SCIS'], role: 'Student' },
    { username: 'admindemo', email: 'admin.demo@local.test', password, school: ['SCIS'], role: 'Admin' }
  ]);
  await mongoose.disconnect();
  const child = spawn(process.execPath, ['server.js'], { stdio: 'inherit', env: { ...process.env, DB: db, HOST: '127.0.0.1', PORT: process.env.PORT || '8000' } });
  child.on('exit', code => process.exit(code || 0));
})();
