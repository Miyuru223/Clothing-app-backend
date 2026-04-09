const mongoose = require('mongoose');

const deliveryAgentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  agentId: { type: String, required: true, unique: true, trim: true },
  contactNo: { type: String, required: true, trim: true },
  isAvailable: { type: Boolean, default: true },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
}, { timestamps: true });

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);