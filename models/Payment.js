const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, enum: ['Cash on Delivery', 'Card', 'Bank Deposit'], required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  amount: { type: Number, required: true },
  slipImage: { type: String, default: '' },
  bankName: { type: String, default: '' },
  referenceNo: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);