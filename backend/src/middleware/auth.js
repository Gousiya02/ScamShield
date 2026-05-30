import jwt from 'jsonwebtoken';
import { dbService } from '../models/dbService.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anti_scam_super_secure_secret_key_123!');

      // Get user from database
      const user = await dbService.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('JWT validation error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Optional auth that attaches user but doesn't block requests
export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anti_scam_super_secure_secret_key_123!');
      const user = await dbService.findUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Don't error out, just proceed anonymously
    }
  }
  next();
};
