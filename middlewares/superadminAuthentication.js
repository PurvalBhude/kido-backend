import jwt from 'jsonwebtoken';

const superadminAuthentication = (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Superadmin only.',
      });
    }

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

export default superadminAuthentication;
