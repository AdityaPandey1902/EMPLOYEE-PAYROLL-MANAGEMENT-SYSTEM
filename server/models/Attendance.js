const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // e.g., "2025-11"
  workingDays: { type: Number, default: 30 },
  payableDays: { type: Number, default: 30 },
  lopDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 }
}, { timestamps: true });

AttendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
