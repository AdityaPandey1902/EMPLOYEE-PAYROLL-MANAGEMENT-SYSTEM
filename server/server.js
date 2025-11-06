// ====== BASIC SETUP ======
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { computePayroll } = require('./payroll/engine');

// ====== APP INITIALIZATION ======
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== MONGO CONNECTION ======
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/payroll', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(console.error);

// ====== MODELS ======
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const PayrollLine = require('./models/PayrollLine');
const User = require('./models/User');

// ====== AUTH LOGIC (JWT) ======
const SECRET = process.env.JWT_SECRET || 'supersecret';

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
}

function auth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).send('No token provided');
    try {
      const payload = jwt.verify(header.split(' ')[1], SECRET);
      if (role && payload.role !== role) return res.status(403).send('Forbidden');
      req.user = payload;
      next();
    } catch (err) {
      res.status(401).send('Invalid or expired token');
    }
  };
}

// ====== AUTH ROUTES ======
app.post('/api/auth/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ message: 'User registered successfully', user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token, role: user.role });
});

// ====== HEALTH CHECK ======
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ====== EMPLOYEE CRUD ======
app.get('/api/employees', auth('ADMIN'), async (_req, res) => {
  const emps = await Employee.find().sort({ createdAt: -1 });
  res.json(emps);
});

app.post('/api/employees', auth('ADMIN'), async (req, res) => {
  const emp = await Employee.create(req.body);
  res.json(emp);
});

app.put('/api/employees/:id', auth('ADMIN'), async (req, res) => {
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(emp);
});

// ====== ATTENDANCE IMPORT (CSV) ======
const upload = multer({ dest: 'uploads/' });
app.post('/api/attendance/import', auth('ADMIN'), upload.single('file'), async (req, res) => {
  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', d => rows.push(d))
    .on('end', async () => {
      for (const r of rows) {
        await Attendance.findOneAndUpdate(
          { employeeId: r.employeeId, month: r.month },
          {
            workingDays: Number(r.workingDays),
            payableDays: Number(r.payableDays),
            lopDays: Number(r.lopDays),
            overtimeHours: Number(r.overtimeHours)
          },
          { upsert: true, new: true }
        );
      }
      fs.unlinkSync(req.file.path);
      res.json({ imported: rows.length });
    });
});

// ====== PAYROLL RUN ======
app.post('/api/payroll/run/:month', auth('ADMIN'), async (req, res) => {
  const { month } = req.params;
  const employees = await Employee.find({ status: 'ACTIVE' });
  const config = req.body.config || {
    pf: { employeeRate: 0.12, basicCap: 15000 },
    esi: { employeeRate: 0.0075, wageCeiling: 21000 },
    pt: { state: 'KA', slabs: [{ upto: 15000, amount: 0 }, { above: 15000, amount: 200 }] },
    tds: { regime: 'new', slabs: [{ upto: 300000, rate: 0 }, { rate: 0.05 }] }
  };

  let count = 0;
  for (const e of employees) {
    const att = await Attendance.findOne({ employeeId: e._id, month });
    const input = {
      components: {
        basic: e.basic, hra: e.hra, special: e.special,
        conveyance: e.conveyance, lta: e.lta, others: e.others
      },
      ctcMonthly: (e.basic || 0) + (e.hra || 0) + (e.special || 0),
      attendance: att || { month, calendarDays: 30, payableDays: 30, lopDays: 0, overtimeHours: 0 },
      config
    };
    const result = computePayroll(input);
    const payslipNo = `PSL-${month}-${e.code}`;
    await PayrollLine.findOneAndUpdate(
      { employeeId: e._id, month },
      { ...result, payslipNo },
      { upsert: true, new: true }
    );
    count++;
  }
  res.json({ message: 'Payroll run complete', count });
});

// ====== PAYSLIP PDF ======
app.get('/api/payslip/:lineId/pdf', auth(), async (req, res) => {
  const line = await PayrollLine.findById(req.params.lineId).populate('employeeId');
  if (!line) return res.status(404).send('Payslip not found');

  const html = `
  <html><body style="font-family:sans-serif;padding:16px;">
    <h2>Payslip: ${line.payslipNo}</h2>
    <p><b>Employee:</b> ${line.employeeId.name} (${line.employeeId.code})</p>
    <h3>Earnings</h3>
    <table border="1" cellspacing="0" cellpadding="4">
      ${line.earnings.map(e => `<tr><td>${e.label}</td><td>₹${e.amount}</td></tr>`).join('')}
    </table>
    <h3>Deductions</h3>
    <table border="1" cellspacing="0" cellpadding="4">
      ${line.deductions.map(d => `<tr><td>${d.label}</td><td>₹${d.amount}</td></tr>`).join('')}
    </table>
    <h3>Gross: ₹${line.gross} | Net: ₹${line.net}</h3>
  </body></html>`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename=${line.payslipNo}.pdf`
  });
  res.send(pdf);
});

// ====== MISC ROUTES ======
app.get('/api/payroll/lines/:month', auth('ADMIN'), async (req, res) => {
  const lines = await PayrollLine.find({ month: req.params.month }).populate('employeeId');
  res.json(lines);
});

// ====== SERVER START ======
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`🚀 Payroll API running on http://localhost:${PORT}`));
