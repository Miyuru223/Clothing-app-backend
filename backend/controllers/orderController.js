const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Status progression order — cannot go backward
const STATUS_ORDER = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

const isValidProgression = (currentStatus, newStatus) => {
  // Cancelling is always allowed (if not already delivered/shipped)
  if (newStatus === 'Cancelled') return true;
  
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  
  // New status must be strictly after current status
  return newIndex > currentIndex;
};

// POST /api/orders
const placeOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    if (!shippingAddress || !shippingAddress.street)
      return res.status(400).json({ success: false, message: 'Shipping address is required' });

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images price');
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty' });

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.images[0] || '',
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalPrice: cart.totalPrice,
      paymentMethod: paymentMethod || 'Cash on Delivery',
    });

    cart.items = [];
    await cart.save();
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/my
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/all (admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('deliveryAgent', 'name agentId contactNo')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id (owner or admin)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('deliveryAgent', 'name agentId contactNo');
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/orders/:id/status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [...STATUS_ORDER, 'Cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    // Block if already delivered or cancelled
    if (order.status === 'Delivered')
      return res.status(400).json({ success: false, message: 'Cannot change status of a delivered order' });
    if (order.status === 'Cancelled')
      return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled order' });

    // Block backward movement
    if (!isValidProgression(order.status, status))
      return res.status(400).json({
        success: false,
        message: `Cannot move order from "${order.status}" back to "${status}". Orders can only move forward.`,
      });

    // Block cancel if shipped or beyond
    if (status === 'Cancelled' && ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that is already shipped or out for delivery' });

    order.status = status;
    if (status === 'Delivered') {
      order.isPaid = true;
      order.deliveredAt = new Date();
      // Free up the delivery agent
      if (order.deliveryAgent) {
        const DeliveryAgent = require('../models/DeliveryAgent');
        await DeliveryAgent.findByIdAndUpdate(order.deliveryAgent, {
          isAvailable: true,
          currentOrder: null,
        });
      }
    }

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/orders/:id/address (owner - pending only)
const updateOrderAddress = async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    if (!shippingAddress || !shippingAddress.street)
      return res.status(400).json({ success: false, message: 'Shipping address is required' });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (order.status !== 'Pending')
      return res.status(400).json({ success: false, message: 'You can only edit address for Pending orders' });

    order.shippingAddress = shippingAddress;
    await order.save();
    res.json({ success: true, message: 'Address updated successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/orders/:id (cancel - owner only)
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

    if (order.status === 'Cancelled')
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });

    order.status = 'Cancelled';
    await order.save();
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  placeOrder, getMyOrders, getOrderById,
  getAllOrders, updateOrderStatus, updateOrderAddress, cancelOrder
};