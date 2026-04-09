const express = require('express');
const router = express.Router();
const {
  placeOrder, getMyOrders, getOrderById,
  getAllOrders, updateOrderStatus, cancelOrder, updateOrderAddress
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, placeOrder);
router.get('/my', protect, getMyOrders);
router.get('/all', protect, adminOnly, getAllOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/address', protect, updateOrderAddress);   // ← new route
router.delete('/:id', protect, cancelOrder);

module.exports = router;