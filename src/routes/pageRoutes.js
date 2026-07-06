// 頁面路由（EJS 渲染）。
const express = require('express');
const { pageAuth, resolveUser } = require('../middleware/auth');
const store = require('../data/store');

const router = express.Router();

// 首頁導向 /todos
router.get('/', (req, res) => res.redirect('/todos'));

// 登入頁；若已登入直接導向 /todos
router.get('/login', (req, res) => {
  if (resolveUser(req)) return res.redirect('/todos');
  res.render('login');
});

// 註冊頁；若已登入直接導向 /todos
router.get('/register', (req, res) => {
  if (resolveUser(req)) return res.redirect('/todos');
  res.render('register');
});

// Todo 主畫面（需登入）
router.get('/todos', pageAuth, (req, res) => {
  res.render('todos', { user: store.toPublicUser(req.user) });
});

module.exports = router;
