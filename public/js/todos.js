// 前端：Todo CRUD。透過 fetch 呼叫 /api/todos，cookie 會自動帶上。

const listEl = document.getElementById('todo-list');
const emptyHint = document.getElementById('empty-hint');
const errorBox = document.getElementById('error');
const addForm = document.getElementById('add-form');
const newTitle = document.getElementById('new-title');
const logoutBtn = document.getElementById('logout-btn');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  setTimeout(() => errorBox.classList.add('hidden'), 3000);
}

// 共用的 API 呼叫；非 2xx 會丟出錯誤
async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  // 未登入時導回登入頁
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('未授權');
  }
  if (res.status === 204) return null; // 刪除成功
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || '發生錯誤');
  return data;
}

// 建立單筆 todo 的 DOM
function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className =
    'bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3';
  li.dataset.id = todo.id;

  // 完成勾選
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.className = 'h-5 w-5 rounded text-indigo-600 cursor-pointer';
  checkbox.addEventListener('change', () => toggleTodo(todo, checkbox.checked));

  // 標題
  const title = document.createElement('span');
  title.textContent = todo.title;
  title.className =
    'flex-1 text-slate-800 ' +
    (todo.completed ? 'line-through text-slate-400' : '');

  // 編輯按鈕
  const editBtn = document.createElement('button');
  editBtn.textContent = '編輯';
  editBtn.className =
    'text-sm text-indigo-600 hover:underline shrink-0';
  editBtn.addEventListener('click', () => startEdit(li, todo));

  // 刪除按鈕
  const delBtn = document.createElement('button');
  delBtn.textContent = '刪除';
  delBtn.className = 'text-sm text-red-500 hover:underline shrink-0';
  delBtn.addEventListener('click', () => removeTodo(todo));

  li.append(checkbox, title, editBtn, delBtn);
  return li;
}

// 進入編輯模式（把標題換成輸入框）
function startEdit(li, todo) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = todo.title;
  input.className =
    'flex-1 rounded-lg border border-slate-300 px-3 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '儲存';
  saveBtn.className = 'text-sm text-green-600 hover:underline shrink-0';
  saveBtn.addEventListener('click', () => saveEdit(todo, input.value));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.className = 'text-sm text-slate-400 hover:underline shrink-0';
  cancelBtn.addEventListener('click', loadTodos);

  // 保留第一個 checkbox，其餘換掉
  const checkbox = li.querySelector('input[type="checkbox"]');
  li.innerHTML = '';
  li.append(checkbox, input, saveBtn, cancelBtn);
  input.focus();
}

// ---------- API 操作 ----------

async function loadTodos() {
  try {
    const { todos } = await api('/api/todos');
    listEl.innerHTML = '';
    if (!todos.length) {
      emptyHint.classList.remove('hidden');
    } else {
      emptyHint.classList.add('hidden');
      todos.forEach((todo) => listEl.appendChild(createTodoItem(todo)));
    }
  } catch (err) {
    showError(err.message);
  }
}

async function addTodo(title) {
  try {
    await api('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    newTitle.value = '';
    loadTodos();
  } catch (err) {
    showError(err.message);
  }
}

async function toggleTodo(todo, completed) {
  try {
    await api(`/api/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
    loadTodos();
  } catch (err) {
    showError(err.message);
  }
}

async function saveEdit(todo, title) {
  if (!title.trim()) return showError('標題不可為空');
  try {
    await api(`/api/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: title.trim() }),
    });
    loadTodos();
  } catch (err) {
    showError(err.message);
  }
}

async function removeTodo(todo) {
  try {
    await api(`/api/todos/${todo.id}`, { method: 'DELETE' });
    loadTodos();
  } catch (err) {
    showError(err.message);
  }
}

// ---------- 事件綁定 ----------

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = newTitle.value.trim();
  if (title) addTodo(title);
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
});

// 初次載入
loadTodos();
