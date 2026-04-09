const Product = require('../models/Product');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category, gender, minPrice, maxPrice, search } = req.query;
    let filter = { isActive: true };

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter)
      .populate('category', 'name gender')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name gender');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/products (admin)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, sizes, brand, color } = req.body;
    if (!name || !description || !price || !category)
      return res.status(400).json({ success: false, message: 'Required fields missing' });

    const images = req.files ? req.files.map(f => f.path) : [];
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes || [];

    const product = await Product.create({
      name, description, price, category,
      sizes: parsedSizes,
      images, brand, color,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/products/:id (admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const { name, description, price, category, sizes, brand, color, isActive } = req.body;
    const newImages = req.files ? req.files.map(f => f.path) : [];

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.brand = brand || product.brand;
    product.color = color || product.color;
    if (isActive !== undefined) product.isActive = isActive;
    if (sizes) product.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    if (newImages.length > 0) product.images = [...product.images, ...newImages];

    const updated = await product.save();
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/products/:id (admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
