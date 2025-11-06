const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },         // e.g., EMP001
  name: { type: String, required: true },
  email: String,
  department: String,
  designation: String,

  // Pay structure (monthly)
  basic: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  special: { type: Number, default: 0 },
  conveyance: { type: Number, default: 0 },
  lta: { type: Number, default: 0 },
  others: [{ label: String, amount: Number }],

  // Bank & policies (optional)
  bank: { ifsc: String, account: String, upiId: String },
  pfEligible: { type: Boolean, default: true },
  esiEligible: { type: Boolean, default: true },
  ptEligible: { type: Boolean, default: true },
  tdsRegime: { type: String, enum: ['old','new'], default: 'new' },

  // Status
  status: { type: String, enum: ['ACTIVE','EXITED'], default: 'ACTIVE' },
  doj: Date,
  doe: Date
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
