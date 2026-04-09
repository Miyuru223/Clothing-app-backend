const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, deleteAccount } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');

router.get('/', protect, getProfile);
router.put('/', protect, upload.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/', protect, deleteAccount);

module.exports = router;
