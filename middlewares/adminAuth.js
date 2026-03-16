import jwt from 'jsonwebtoken';

/**
 * Middleware: verifies admin JWT from cookie.
 * Attaches adminId and adminRole to req.
 */
const adminAuth = (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;
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

export default adminAuth;
