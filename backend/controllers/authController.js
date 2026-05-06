const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE || '7d',
});

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || '',
  registrationNo: user.registrationNo,
  branch: user.branch,
  semester: user.semester,
  role: user.role,
  status: user.status,
});

// @desc    Register a new student using registration number and password
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { registrationNo, name, email, password, branch, semester } = req.body;

    if (!registrationNo || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, registration number and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedRegNo = registrationNo.trim().toUpperCase();
    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;

    const existing = await User.findOne({
      $or: [
        { registrationNo: normalizedRegNo },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.registrationNo === normalizedRegNo
          ? 'Registration number already exists'
          : 'Email already exists',
      });
    }

    const user = await User.create({
      registrationNo: normalizedRegNo,
      name: name.trim(),
      email: normalizedEmail,
      password,
      branch,
      semester,
      role: 'student',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userPayload(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user only by registration number and password
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { registrationNo, password } = req.body;

    if (!registrationNo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registration number and password',
      });
    }

    const cleanRegistrationNo = registrationNo.trim().toUpperCase();
    const user = await User.findOne({ registrationNo: cleanRegistrationNo }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid registration number or password',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account is blocked. Contact the administrator.',
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe };
