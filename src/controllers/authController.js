// 認證相關 controller：註冊 / 登入 / 登出 / 取得目前使用者。
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../data/store');

// 產生 JWT，payload 放使用者 id（sub = subject）
function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// 把 token 設定成 httpOnly cookie
function setTokenCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 天
  });
}

// 簡單的 email 格式檢查（教學用，不追求完美）
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
function register(req, res) {
  const { name, email, password } = req.body || {};

  // 驗證輸入
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name、email、password 為必填' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'email 格式不正確' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: '密碼長度至少 6 碼' });
  }
  if (store.findUserByEmail(email)) {
    return res.status(409).json({ message: '此 email 已被註冊' });
  }

  // 建立使用者（密碼雜湊）
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = store.createUser({ name, email, passwordHash });

  // 簽發 token 並設定 cookie
  const token = signToken(user);
  setTokenCookie(res, token);

  return res.status(201).json({ user: store.toPublicUser(user), token });
}

// POST /api/auth/login
function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'email、password 為必填' });
  }

  const user = store.findUserByEmail(email);
  // 不論帳號不存在或密碼錯誤，都回相同訊息（避免洩漏帳號是否存在）
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'email 或密碼錯誤' });
  }

  const token = signToken(user);
  setTokenCookie(res, token);

  return res.json({ user: store.toPublicUser(user), token });
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie(config.cookieName);
  return res.json({ message: '已登出' });
}

// GET /api/auth/me（需登入）
function me(req, res) {
  return res.json({ user: store.toPublicUser(req.user) });
}

module.exports = { register, login, logout, me };
