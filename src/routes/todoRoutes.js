// /api/todos 路由（整個 router 都需要登入）
const express = require('express');
const todoController = require('../controllers/todoController');
const { apiAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  TodoCreateRequestSchema,
  TodoUpdateRequestSchema,
  TodoIdParamSchema,
} = require('../openapi/schemas');

const router = express.Router();

// 套用在此 router 的所有路由上
router.use(apiAuth);

router.get('/', todoController.list);
router.post('/', validate(TodoCreateRequestSchema), todoController.create);
router.get('/:id', validate(TodoIdParamSchema, 'params'), todoController.getOne);
router.put(
  '/:id',
  validate(TodoIdParamSchema, 'params'),
  validate(TodoUpdateRequestSchema),
  todoController.update
);
router.delete('/:id', validate(TodoIdParamSchema, 'params'), todoController.remove);

module.exports = router;
