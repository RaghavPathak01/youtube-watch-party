import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export function socketAuth(socket, next) {
  try {
    const cookies = cookie.parse(socket.request.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
      return next(new Error('Authentication required: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Contains userId, email, name
    next();
  } catch (error) {
    return next(new Error('Authentication failed: Invalid or expired token'));
  }
}
