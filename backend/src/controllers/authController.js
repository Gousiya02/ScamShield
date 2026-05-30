import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../models/dbService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'anti_scam_super_secure_secret_key_123!', {
    expiresIn: '30d'
  });
};

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please add all fields' });
  }

  try {
    // Check if user exists
    const userExists = await dbService.findUserByUsername(username);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const emailExists = await dbService.findUserByEmail(email);
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await dbService.createUser({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      securityScore: 100,
      completedQuizzes: []
    });

    if (user) {
      return res.status(201).json({
        success: true,
        data: {
          _id: user._id || user.id,
          username: user.username,
          email: user.email,
          securityScore: user.securityScore,
          token: generateToken(user._id || user.id)
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ success: false, message: 'Please provide credentials' });
  }

  try {
    // Find user by email or username
    let user = null;
    if (emailOrUsername.includes('@')) {
      user = await dbService.findUserByEmail(emailOrUsername);
    } else {
      user = await dbService.findUserByUsername(emailOrUsername);
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({
      success: true,
      data: {
        _id: user._id || user.id,
        username: user.username,
        email: user.email,
        securityScore: user.securityScore,
        completedQuizzes: user.completedQuizzes || [],
        token: generateToken(user._id || user.id)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: {
        _id: user._id || user.id,
        username: user.username,
        email: user.email,
        securityScore: user.securityScore,
        completedQuizzes: user.completedQuizzes || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
