// 初始化資料（init file）。
// 教學重點：預設帳號的關鍵欄位可由環境變數覆寫（見 config.seedUser），
// 其餘批量資料（預設 todos）直接寫在這個檔案。
// 啟動時呼叫 seed()，把預設密碼用 bcrypt 雜湊後寫入記憶體 store。

const bcrypt = require('bcryptjs');
const config = require('../config');
const store = require('./store');

// 預設 todos（會掛在預設帳號底下）
const DEFAULT_TODOS = [
  { title: '閱讀 RESTful API 設計原則', completed: true },
  { title: '完成 Todo List API 練習', completed: false },
  { title: '研究 JWT 認證流程', completed: false },
];

function seed() {
  // 用環境變數 / 預設值建立預設帳號
  const { name, email, password } = config.seedUser;
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = store.createUser({ name, email, passwordHash });

  // 建立預設 todos
  DEFAULT_TODOS.forEach((todo) => {
    store.createTodo({ userId: user.id, ...todo });
  });

  console.log(
    `[seed] 已建立預設帳號：${user.email}（密碼：${password}）與 ${DEFAULT_TODOS.length} 筆 todos`
  );
}

module.exports = seed;
