const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  sizes: [{
    size: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
    stock: { type: Number, default: 0, min: 0 },
  }],
  images: [{ type: String }],
  brand: { type: String, default: '' },
  color: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
