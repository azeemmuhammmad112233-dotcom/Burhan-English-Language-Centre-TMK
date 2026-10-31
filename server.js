const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const APPS_FILE = path.join(DATA_DIR, 'applications.json');
const MSGS_FILE = path.join(DATA_DIR, 'messages.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return []; } };
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const upload = multer({ dest: UPLOAD_DIR });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// ---- LOGIN API ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Load custom password if admin changed it
  let adminPass = 'admin123';
  const settings = readJson(SETTINGS_FILE);
  if(settings.adminPassword) adminPass = settings.adminPassword;

  if (username === 'admin' && password === adminPass) {
    return res.json({ ok: true, role: 'admin', name: 'Administrator', id: 'ADM-001' });
  }
  
  if (username === 'student' && password === 'student123') {
    return res.json({ ok: true, role: 'student', name: 'Ali Khan', id: 'STU-001' });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

// ---- SETTINGS API ----
app.post('/api/settings', (req, res) => {
  const { adminPassword, systemUrl } = req.body;
  writeJson(SETTINGS_FILE, { adminPassword, systemUrl });
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  const settings = readJson(SETTINGS_FILE);
  res.json(settings || {});
});

// ---- DASHBOARD DATA API ----
app.get('/api/dashboard-data', (req, res) => {
  const role = req.query.role;
  const studentId = req.query.id;

  const apps = readJson(APPS_FILE);
  
  const mockFees = [{ id: 'STU-001', amount: '5000', status: 'Paid' }, { id: 'STU-002', amount: '5000', status: 'Pending' }];
  const mockSalaries = [{ name: 'Sir Abdul Hameed', amount: '30000', month: 'Oct' }, { name: 'Miss Hina', amount: '20000', month: 'Oct' }];
  const mockAttendance = [{ id: 'STU-001', present: 18, absent: 2 }, { id: 'STU-002', present: 15, absent: 5 }];

  if (role === 'admin') {
    res.json({
      role: 'admin',
      applications: apps,
      fees: mockFees,
      salaries: mockSalaries,
      attendance: mockAttendance
    });
  } else if (role === 'student') {
    const myApp = apps.find(a => a.id === studentId || a.email.includes('student')) || { firstName: 'Ali', lastName: 'Khan', course: 'IELTS', batch: 'Evening' };
    res.json({
      role: 'student',
      profile: myApp,
      fees: mockFees.filter(f => f.id === studentId),
      attendance: mockAttendance.filter(a => a.id === studentId)
    });
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
});

// ---- FORMS ----
app.post('/api/contact', (req, res) => {
  const list = readJson(MSGS_FILE);
  list.push({ id: Date.now().toString(), ...req.body, _ts: new Date().toISOString() });
  writeJson(MSGS_FILE, list);
  res.json({ ok: true });
});

app.post('/api/apply', upload.single('document'), (req, res) => {
  const list = readJson(APPS_FILE);
  list.push({ id: Date.now().toString(), ...req.body, status: 'pending', document: req.file ? req.file.originalname : null, _ts: new Date().toISOString() });
  writeJson(APPS_FILE, list);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));