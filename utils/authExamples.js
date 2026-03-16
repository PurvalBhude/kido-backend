/**
 * Cookie-based authentication examples for reference.
 * Not imported by the main app — purely illustrative.
 */
import jwt from 'jsonwebtoken';
import { setAuthCookie, clearAuthCookie } from './cookieHelper.js';

// USER LOGIN
export const loginExample = async (req, res) => {
  try {
    const user = { userId: '12345', email: 'user@example.com' };

    const token = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    setAuthCookie(res, 'userToken', token);

    res.json({
      success: true,
      message: 'Login successful',
      user: { userId: user.userId, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER LOGOUT
export const logoutExample = async (req, res) => {
  clearAuthCookie(res, 'userToken');
  res.json({ success: true, message: 'Logout successful' });
};

// PROTECTED ROUTE
export const getProfileExample = async (req, res) => {
  const userId = req.userId;
  res.json({ success: true, userId });
};
