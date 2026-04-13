const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');

// POST /api/payments/upload-slip — customer uploads bank slip
router.post('/upload-slip', protect, upload.single('slip'), async (req, res) => {
  try {
    const { orderId, bankName, referenceNo } = req.body;
    if (!orderId || !req.file)
      return res.status(400).json({ success: false, message: 'Order ID and slip image are required' });

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    // Check if payment already exists for this order
    let payment = await Payment.findOne({ order: orderId });
    if (payment) {
      // Update existing payment
      payment.slipImage = req.file.path;
      payment.bankName = bankName || payment.bankName;
      payment.referenceNo = referenceNo || payment.referenceNo;
      payment.status = 'Pending';
      await payment.save();
    } else {
      // Create new payment
      payment = await Payment.create({
        order: orderId,
        user: req.user._id,
        method: 'Bank Deposit',
        amount: order.totalPrice,
        slipImage: req.file.path,
        bankName: bankName || '',
        referenceNo: referenceNo || '',
      });
    }

    // Update order payment method
    order.paymentMethod = 'Bank Deposit';
    await order.save();

    res.status(201).json({ success: true, message: 'Slip uploaded successfully', payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments/my — customer views their payments
router.get('/my', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('order', 'status totalPrice createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments/order/:orderId — get payment for specific order
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId });
    if (!payment)
      return res.status(404).json({ success: false, message: 'No payment found for this order' });
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments — admin views all payments
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const payments = await Payment.find(filter)
      .populate('user', 'name email')
      .populate('order', 'status totalPrice createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/payments/:id/review — admin approves or rejects
router.put('/:id/review', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['Approved', 'Rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });

    const payment = await Payment.findById(req.params.id).populate('order');
    if (!payment)
      return res.status(404).json({ success: false, message: 'Payment not found' });

    payment.status = status;
    payment.adminNote = adminNote || '';
    payment.reviewedAt = new Date();
    await payment.save();

    // If approved update order as paid
    if (status === 'Approved') {
      await Order.findByIdAndUpdate(payment.order._id, {
        isPaid: true,
        paidAt: new Date(),
      });
    }

    res.json({ success: true, message: `Payment ${status}`, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;