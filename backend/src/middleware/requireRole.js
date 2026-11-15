// backend/src/middleware/requireRole.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'burger-bombs-secret-key-123';

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ 
          error: `Role '${decoded.role}' is not permitted to perform this action` 
        });
      }

      req.staff = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}