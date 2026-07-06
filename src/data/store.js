// 記憶體資料儲存層。
// 教學重點：把「資料存取」獨立成一層，controller 只呼叫這裡的函式，
// 之後若要換成真正的資料庫，只要改這個檔案即可。
//
// 注意：資料存在記憶體中，伺服器重啟後會清空並重新 seed。

const users = []; // { id, name, email, passwordHash, createdAt }
const todos = []; // { id, userId, title, completed, createdAt, updatedAt }

// 各自獨立的自動遞增 id 計數器
let userIdSeq = 1;
let todoIdSeq = 1;

// ---------- Users ----------

function findUserByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  return users.find((u) => u.email === normalized);
}

function findUserById(id) {
  return users.find((u) => u.id === Number(id));
}

function createUser({ name, email, passwordHash }) {
  const user = {
    id: userIdSeq++,
    name,
    email: String(email).trim().toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// 回傳給前端 / API 時用，移除敏感欄位（passwordHash）
function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

// ---------- Todos ----------

function listTodosByUser(userId) {
  return todos.filter((t) => t.userId === Number(userId));
}

function findTodo(userId, todoId) {
  return todos.find(
    (t) => t.id === Number(todoId) && t.userId === Number(userId)
  );
}

function createTodo({ userId, title, completed = false }) {
  const now = new Date().toISOString();
  const todo = {
    id: todoIdSeq++,
    userId: Number(userId),
    title,
    completed: Boolean(completed),
    createdAt: now,
    updatedAt: now,
  };
  todos.push(todo);
  return todo;
}

function updateTodo(todo, changes) {
  if (changes.title !== undefined) todo.title = changes.title;
  if (changes.completed !== undefined) todo.completed = Boolean(changes.completed);
  todo.updatedAt = new Date().toISOString();
  return todo;
}

function deleteTodo(userId, todoId) {
  const index = todos.findIndex(
    (t) => t.id === Number(todoId) && t.userId === Number(userId)
  );
  if (index === -1) return false;
  todos.splice(index, 1);
  return true;
}

module.exports = {
  // 直接存取（seed 使用）
  users,
  todos,
  // users
  findUserByEmail,
  findUserById,
  createUser,
  toPublicUser,
  // todos
  listTodosByUser,
  findTodo,
  createTodo,
  updateTodo,
  deleteTodo,
};
