import jwt from 'jsonwebtoken';

/**
 * Generic user JWT middleware (cookie-based).
 * Not currently used in KidsFest — kept for future user-auth flows.
 */
const userAuthentication = (req, res, next) => {
  const token = req.cookies.userToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === 'TokenExpiredError'
          ? 'Token expired. Please login again.'
          : 'Invalid token.',
    });
  }
};

export default userAuthentication;

