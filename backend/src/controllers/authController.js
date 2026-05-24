const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password, displayName } = req.body;
    
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        displayName: displayName || username,
      }
    });
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
    
    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });
    
    await prisma.session.create({
      data: {
        userId: decoded.userId,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken },
        data: { revokedAt: new Date() }
      });
    }
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, refresh, logout };
