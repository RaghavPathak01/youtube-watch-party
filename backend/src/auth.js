import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import pool from './db.js';

const router = express.Router();

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth routes
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', authLimiter, async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Normalize email to lowercase
    email = email.trim().toLowerCase();

    // 2. Check if email already exists
    const existingUserResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert user into PostgreSQL
    const insertResult = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name.trim(), email, passwordHash]
    );

    const newUser = insertResult.rows[0];

    // 5. Return safe user information (NO password_hash)
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation for missing fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Lookup user in database
    const userResult = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [normalizedEmail]);
    
    if (userResult.rows.length === 0) {
      // Non-existent email
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // 3. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Wrong password
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Generate JWT
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Set HttpOnly cookie
    res.cookie('token', token, getCookieOptions());

    // 6. Return safe user response
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({
      user: {
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', getCookieOptions());
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
