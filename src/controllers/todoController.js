// Todo CRUD controller。所有操作都以「目前登入者」為範圍（req.user 由 apiAuth 提供）。
const store = require('../data/store');

// GET /api/todos
function list(req, res) {
  const todos = store.listTodosByUser(req.user.id);
  return res.json({ todos });
}

// GET /api/todos/:id
function getOne(req, res) {
  const todo = store.findTodo(req.user.id, req.params.id);
  if (!todo) {
    return res.status(404).json({ message: '找不到此 todo' });
  }
  return res.json({ todo });
}

// POST /api/todos
// title 必填、非空白已由 validate(TodoCreateRequestSchema) middleware 檢查並 trim 過。
function create(req, res) {
  const { title, completed } = req.body;

  const todo = store.createTodo({
    userId: req.user.id,
    title,
    completed: completed === true,
  });

  return res.status(201).json({ todo });
}

// PUT /api/todos/:id
// body 至少一個欄位、title 非空白已由 validate(TodoUpdateRequestSchema) middleware 檢查並 trim 過。
function update(req, res) {
  const todo = store.findTodo(req.user.id, req.params.id);
  if (!todo) {
    return res.status(404).json({ message: '找不到此 todo' });
  }

  const { title, completed } = req.body;
  store.updateTodo(todo, { title, completed });

  return res.json({ todo });
}

// DELETE /api/todos/:id
function remove(req, res) {
  const deleted = store.deleteTodo(req.user.id, req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: '找不到此 todo' });
  }
  return res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
