const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET /api/cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images price');
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/cart/add
const addToCart = async (req, res) => {
  try {
    const { productId, size, quantity = 1 } = req.body;
    if (!productId || !size)
      return res.status(400).json({ success: false, message: 'Product and size are required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const sizeEntry = product.sizes.find(s => s.size === size);
    if (!sizeEntry || sizeEntry.stock < quantity)
      return res.status(400).json({ success: false, message: 'Selected size not available' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existingIdx = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size
    );

    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += Number(quantity);
    } else {
      cart.items.push({ product: productId, size, quantity, price: product.price });
    }

    await cart.save();
    await cart.populate('items.product', 'name images price');
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/cart/update
const updateCartItem = async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const idx = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size
    );
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product', 'name images price');
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/cart/remove/:productId/:size
const removeFromCart = async (req, res) => {
  try {
    const { productId, size } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(
      item => !(item.product.toString() === productId && item.size === size)
    );

    await cart.save();
    res.json({ success: true, message: 'Item removed', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/cart/clear
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) { cart.items = []; await cart.save(); }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
