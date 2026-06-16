const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'HOSTEL_ISSUE_DEV_SECRET';

function roleForUsername(username) {
  return username.toLowerCase().startsWith('admin') ? 'ADMIN' : 'RESIDENT';
}

function signToken(username) {
  return jwt.sign({ username, role: roleForUsername(username) }, JWT_SECRET, {
    expiresIn: '8h'
  });
}

function authMiddleware(req) {
  const auth = req.headers.authorization || '';

  if (!auth.startsWith('Bearer ')) {
    return {};
  }

  try {
    const token = auth.replace('Bearer ', '');
    const { username, role } = jwt.verify(token, JWT_SECRET);
    return { user: username, role };
  } catch (error) {
    console.warn('Invalid token');
    return {};
  }
}

module.exports = {
  authMiddleware,
  roleForUsername,
  signToken
};
