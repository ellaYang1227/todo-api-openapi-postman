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
function create(req, res) {
  const { title, completed } = req.body || {};

  if (!title || String(title).trim() === '') {
    return res.status(400).json({ message: 'title 為必填' });
  }

  const todo = store.createTodo({
    userId: req.user.id,
    title: String(title).trim(),
    completed: completed === true,
  });

  return res.status(201).json({ todo });
}

// PUT /api/todos/:id
function update(req, res) {
  const todo = store.findTodo(req.user.id, req.params.id);
  if (!todo) {
    return res.status(404).json({ message: '找不到此 todo' });
  }

  const { title, completed } = req.body || {};

  // 至少要提供一個可更新的欄位
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ message: '請至少提供 title 或 completed' });
  }
  if (title !== undefined && String(title).trim() === '') {
    return res.status(400).json({ message: 'title 不可為空字串' });
  }

  store.updateTodo(todo, {
    title: title !== undefined ? String(title).trim() : undefined,
    completed,
  });

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
