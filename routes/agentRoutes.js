const express = require('express');
const router = express.Router();
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/agents
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const agents = await DeliveryAgent.find().sort({ createdAt: -1 });
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/agents/available
router.get('/available', protect, adminOnly, async (req, res) => {
  try {
    const agents = await DeliveryAgent.find({ isAvailable: true });
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/agents
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, agentId, contactNo } = req.body;
    if (!name || !agentId || !contactNo)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const existing = await DeliveryAgent.findOne({ agentId });
    if (existing)
      return res.status(400).json({ success: false, message: 'Agent ID already exists' });

    const agent = await DeliveryAgent.create({ name, agentId, contactNo });
    res.status(201).json({ success: true, agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/agents/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, agentId, contactNo, isAvailable } = req.body;
    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent)
      return res.status(404).json({ success: false, message: 'Agent not found' });

    if (name) agent.name = name;
    if (agentId) agent.agentId = agentId;
    if (contactNo) agent.contactNo = contactNo;
    if (isAvailable !== undefined) agent.isAvailable = isAvailable;

    const updated = await agent.save();
    res.json({ success: true, agent: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent)
      return res.status(404).json({ success: false, message: 'Agent not found' });
    await agent.deleteOne();
    res.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/agents/assign — assign agent + set status to "Out for Delivery"
router.post('/assign', protect, adminOnly, async (req, res) => {
  try {
    const { agentId, orderId } = req.body;
    if (!agentId || !orderId)
      return res.status(400).json({ success: false, message: 'Agent and order are required' });

    const agent = await DeliveryAgent.findById(agentId);
    if (!agent)
      return res.status(404).json({ success: false, message: 'Agent not found' });

    if (!agent.isAvailable)
      return res.status(400).json({ success: false, message: 'Agent is not available' });

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    // Free previous agent if reassigning
    if (order.deliveryAgent && order.deliveryAgent.toString() !== agentId) {
      await DeliveryAgent.findByIdAndUpdate(order.deliveryAgent, {
        isAvailable: true,
        currentOrder: null,
      });
    }

    // Assign agent and set status to Out for Delivery
    order.deliveryAgent = agentId;
    order.status = 'Out for Delivery';
    await order.save();

    // Mark agent as on duty
    agent.isAvailable = false;
    agent.currentOrder = orderId;
    await agent.save();

    await order.populate('deliveryAgent', 'name agentId contactNo');
    res.json({ success: true, message: 'Agent assigned — Out for Delivery', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;