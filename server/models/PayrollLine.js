const mongoose = require('mongoose');

const MoneyItem = new mongoose.Schema({
  code: String,
  label: String,
  amount: Number
}, { _id: false });

const PayrollLineSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true },                      // "YYYY-MM"
  earnings: { type: [MoneyItem], default: [] },
  deductions: { type: [MoneyItem], default: [] },
  gross: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  payslipNo: { type: String, required: true }                   // e.g., PSL-2025-11-EMP001
}, { timestamps: true });

PayrollLineSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('PayrollLine', PayrollLineSchema);
