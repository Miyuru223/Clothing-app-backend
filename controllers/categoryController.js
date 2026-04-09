const Category = require('../models/Category');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const { gender } = req.query;
    const filter = { isActive: true };
    if (gender) filter.gender = gender;
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/categories/:id
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/categories (admin)
const createCategory = async (req, res) => {
  try {
    const { name, description, gender } = req.body;
    if (!name || !gender)
      return res.status(400).json({ success: false, message: 'Name and gender are required' });

    const image = req.file ? req.file.path : '';
    const category = await Category.create({ name, description, gender, image });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/categories/:id (admin)
const updateCategory = async (req, res) => {
  try {
    const { name, description, gender, isActive } = req.body;
    const image = req.file ? req.file.path : undefined;

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (gender) category.gender = gender;
    if (isActive !== undefined) category.isActive = isActive;
    if (image) category.image = image;

    const updated = await category.save();
    res.json({ success: true, category: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/categories/:id (admin)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
