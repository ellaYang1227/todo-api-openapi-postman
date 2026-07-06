// /api/todos 路由（整個 router 都需要登入）
const express = require('express');
const todoController = require('../controllers/todoController');
const { apiAuth } = require('../middleware/auth');

const router = express.Router();

// 套用在此 router 的所有路由上
router.use(apiAuth);

router.get('/', todoController.list);
router.post('/', todoController.create);
router.get('/:id', todoController.getOne);
router.put('/:id', todoController.update);
router.delete('/:id', todoController.remove);

module.exports = router;
