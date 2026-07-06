// 認證 middleware。
// 教學重點：
// 1. token 來源同時支援「Authorization: Bearer」與「httpOnly cookie」，
//    前者方便 Postman / Swagger 示範，後者給瀏覽器頁面使用。
// 2. 提供兩種守門方式：
//    - apiAuth：給 /api/* 用，未通過回 401 JSON。
//    - pageAuth：給 EJS 頁面用，未通過導向 /login。

const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../data/store');

// 從 request 取出 token：先看 Authorization header，再看 cookie
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  if (req.cookies && req.cookies[config.cookieName]) {
    return req.cookies[config.cookieName];
  }
  return null;
}

// 驗證 token 並回傳對應的 user（失敗回 null）
function resolveUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return store.findUserById(payload.sub) || null;
  } catch (err) {
    return null; // token 無效或過期
  }
}

// 給 API 用：未登入回 401 JSON
function apiAuth(req, res, next) {
  const user = resolveUser(req);
  if (!user) {
    return res.status(401).json({ message: '未授權，請先登入' });
  }
  req.user = user;
  next();
}

// 給頁面用：未登入導向 /login
function pageAuth(req, res, next) {
  const user = resolveUser(req);
  if (!user) {
    return res.redirect('/login');
  }
  req.user = user;
  next();
}

module.exports = { apiAuth, pageAuth, resolveUser };
