import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export function socketAuth(socket, next) {
  try {
    const cookies = cookie.parse(socket.request.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
      socket.user = { id: `anon-${socket.id}`, name: "Anonymous", email: null };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Contains userId, email, name
    next();
  } catch (error) {
    socket.user = { id: `anon-${socket.id}`, name: "Anonymous", email: null };
    return next();
  }
}
