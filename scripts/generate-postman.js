// 把 openapi.json 轉成 Postman Collection，並產生對應的 Postman Environment。
// 1. 讀專案根目錄的 openapi.json（跑 `npm run docs:build` 產生，確保是最新版）
// 2. 用 openapi-to-postmanv2 轉換成 Collection v2.1（request body 用 example 值，方便直接送出）
// 3. 幫每一支請求掛上 test script 斷言（狀態碼 + 回應內容），並串接登入流程：
//    - 註冊新使用者：pre-request script 產生一組不重複的 email（避免 Collection Runner
//      重複執行時撞到 409），body 的 email / password 換成 {{email}} / {{password}}，
//      成功後把回應的 token 存進 {{bearerToken}}
//    - 登入：body 同樣吃 {{email}} / {{password}}，成功後把 token 存進 {{bearerToken}}
//      （collection 的 Bearer Auth 預設就是讀 {{bearerToken}}，跑過登入後其他請求不用手動貼 token）
//    - 新增一筆 todo：成功後把回應的 todo id 存進 {{todoId}}，讓後面「單筆 todo」的
//      取得 / 更新 / 刪除請求可以直接串接同一筆剛建立的資料
//    - 「{id}」資料夾另外掛一個 pre-request script：若 {{bearerToken}} / {{todoId}}
//      還是空的（例如只單獨執行這個資料夾，而不是跑整份 Collection），會自動補一次
//      登入、建立一筆 todo，確保單獨執行也不會因為缺資料而失敗
// 4. 輸出 postman/collection.json 與 postman/environment.json，整份 Collection 可在
//    Collection Runner 一鍵跑完（依序：註冊 → 登入 → 登出 → 取得目前使用者 →
//    todos 清單 → 新增 → 取得單筆 → 更新 → 刪除）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const converter = require('openapi-to-postmanv2');

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'postman');
const COLLECTION_PATH = path.join(OUTPUT_DIR, 'collection.json');
const ENVIRONMENT_PATH = path.join(OUTPUT_DIR, 'environment.json');

// 註冊前先換一組不重複的 email，這樣 Collection Runner 重複執行（同一個伺服器 session）
// 也不會因為 email 已被註冊而回 409，導致整輪測試中斷
const REGISTER_PRE_REQUEST_SCRIPT = [
  '// 每次執行都用新 email 註冊，避免重複執行 Runner 時撞到「email 已被註冊」(409)',
  'const uniqueEmail = `demo.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`;',
  "pm.environment.set('email', uniqueEmail);",
];

const SAVE_TOKEN_SCRIPT = [
  "if (pm.response.code === 200 || pm.response.code === 201) {",
  '  const body = pm.response.json();',
  '  if (body.token) {',
  "    pm.environment.set('bearerToken', body.token);",
  '  }',
  '}',
];

// todo 是「屬於目前登入者」的資源，每次註冊都會換一個新使用者，所以光存 todoId 不夠：
// 如果上一輪 Runner 留下的 todoId 是「別的使用者」建立的，用目前的 bearerToken 去查一定
// 會 404（找不到此 todo）。所以同時記錄「建立當下用的是哪個 token」(todoOwnerToken)，
// 之後只有 token 沒變過，才可以放心沿用同一個 todoId。
const SAVE_TODO_ID_SCRIPT = [
  'const body = pm.response.json();',
  'if (body.todo && body.todo.id !== undefined) {',
  "  pm.environment.set('todoId', body.todo.id);",
  "  pm.environment.set('todoOwnerToken', pm.environment.get('bearerToken'));",
  '}',
];

// 掛在「{id}」資料夾上的 pre-request script：讓這個資料夾也能單獨用 Runner 執行
// （不是整份 Collection 依序跑，或是接在很久以前留下的舊環境變數之後）。
// 如果目前沒有 token，就自動補登入；如果現有的 todoId 不是「目前這個使用者」建立的
// （token 對不上，例如上一輪留下的舊資料），就自動補建一筆新的 todo，
// 確保「取得 / 更新 / 刪除單筆 todo」用的一定是目前登入者名下、真實存在的資料。
const ENSURE_TODO_PRE_REQUEST_SCRIPT = [
  'function createTodo(done) {',
  '  pm.sendRequest({',
  "    url: pm.environment.get('baseUrl') + '/api/todos',",
  "    method: 'POST',",
  '    header: {',
  "      'Content-Type': 'application/json',",
  "      Authorization: 'Bearer ' + pm.environment.get('bearerToken'),",
  '    },',
  "    body: { mode: 'raw', raw: JSON.stringify({ title: '買牛奶', completed: false }) },",
  '  }, function (err, res) {',
  '    if (!err && res.code === 201) {',
  '      const body = res.json();',
  '      if (body.todo && body.todo.id !== undefined) {',
  "        pm.environment.set('todoId', body.todo.id);",
  "        pm.environment.set('todoOwnerToken', pm.environment.get('bearerToken'));",
  '      }',
  '    }',
  '    done();',
  '  });',
  '}',
  '',
  'function ensureOwnedTodo(done) {',
  "  const hasOwnedTodo = pm.environment.get('todoId') &&",
  "    pm.environment.get('todoOwnerToken') === pm.environment.get('bearerToken');",
  '  if (hasOwnedTodo) return done();',
  '  createTodo(done);',
  '}',
  '',
  "if (pm.environment.get('bearerToken')) {",
  '  ensureOwnedTodo(function () {});',
  '} else {',
  '  pm.sendRequest({',
  "    url: pm.environment.get('baseUrl') + '/api/auth/login',",
  "    method: 'POST',",
  "    header: { 'Content-Type': 'application/json' },",
  '    body: {',
  "      mode: 'raw',",
  '      raw: JSON.stringify({',
  "        email: pm.environment.get('email'),",
  "        password: pm.environment.get('password'),",
  '      }),',
  '    },',
  '  }, function (err, res) {',
  '    if (!err && res.code === 200) {',
  '      const body = res.json();',
  "      if (body.token) pm.environment.set('bearerToken', body.token);",
  '    }',
  '    ensureOwnedTodo(function () {});',
  '  });',
  '}',
];

// 每支請求要掛的 test script（依 Collection 內的 request 名稱對應）
const TEST_SCRIPTS = {
  註冊新使用者: [
    'pm.test("狀態碼為 201 Created", function () {',
    '  pm.response.to.have.status(201);',
    '});',
    '',
    'pm.test("回應包含 user 與 token", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body).to.have.property("token").that.is.a("string").and.not.empty;',
    '  pm.expect(body.user).to.have.property("id");',
    '  pm.expect(body.user).to.have.property("email", pm.environment.get("email"));',
    '});',
    '',
    ...SAVE_TOKEN_SCRIPT,
  ],
  登入: [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應包含 user 與 token", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body).to.have.property("token").that.is.a("string").and.not.empty;',
    '  pm.expect(body.user).to.have.property("email", pm.environment.get("email"));',
    '});',
    '',
    ...SAVE_TOKEN_SCRIPT,
  ],
  登出: [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應包含登出訊息", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body).to.have.property("message").that.is.a("string").and.not.empty;',
    '});',
  ],
  取得目前登入使用者: [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應為目前登入的使用者", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body.user).to.have.property("email", pm.environment.get("email"));',
    '});',
  ],
  '取得目前使用者的所有 todo': [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應的 todos 為陣列", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body.todos).to.be.an("array");',
    '});',
  ],
  '新增一筆 todo': [
    'pm.test("狀態碼為 201 Created", function () {',
    '  pm.response.to.have.status(201);',
    '});',
    '',
    'pm.test("回應的 todo 內容正確", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body.todo).to.have.property("id");',
    '  pm.expect(body.todo).to.have.property("title", "買牛奶");',
    '  pm.expect(body.todo).to.have.property("completed", false);',
    '});',
    '',
    ...SAVE_TODO_ID_SCRIPT,
  ],
  '取得單筆 todo': [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應的 todo id 與剛建立的一致", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(String(body.todo.id)).to.eql(String(pm.environment.get("todoId")));',
    '});',
  ],
  '更新一筆 todo（title / completed 至少擇一）': [
    'pm.test("狀態碼為 200 OK", function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test("回應的 todo 已更新", function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body.todo).to.have.property("title", "買牛奶（更新）");',
    '  pm.expect(body.todo).to.have.property("completed", true);',
    '});',
  ],
  '刪除一筆 todo': [
    'pm.test("狀態碼為 204 No Content", function () {',
    '  pm.response.to.have.status(204);',
    '});',
    '',
    'pm.test("回應主體為空", function () {',
    '  pm.expect(pm.response.text()).to.be.empty;',
    '});',
  ],
};

function findRequestByName(items, name) {
  for (const item of items) {
    if (item.item) {
      const found = findRequestByName(item.item, name);
      if (found) return found;
    } else if (item.name === name) {
      return item;
    }
  }
  return null;
}

function findFolderByName(items, name) {
  for (const item of items) {
    if (!item.item) continue;
    if (item.name === name) return item;
    const found = findFolderByName(item.item, name);
    if (found) return found;
  }
  return null;
}

// 把 request body 裡的帳密換成環境變數
function useCredentialVariables(collection, name) {
  const item = findRequestByName(collection.item, name);
  if (!item) return;

  if (item.request.body?.mode === 'raw') {
    const data = JSON.parse(item.request.body.raw);
    if ('email' in data) data.email = '{{email}}';
    if ('password' in data) data.password = '{{password}}';
    item.request.body.raw = JSON.stringify(data, null, 2);
  }
}

// 幫指定名稱的請求掛上 test script（取代原本轉換出來的空 event）
function wireUpTests(collection) {
  for (const [name, exec] of Object.entries(TEST_SCRIPTS)) {
    const item = findRequestByName(collection.item, name);
    if (!item || !exec) continue;

    item.event = (item.event || []).filter((e) => e.listen !== 'test');
    item.event.push({
      listen: 'test',
      script: { type: 'text/javascript', exec },
    });
  }
}

// 註冊請求另外掛 pre-request script，跑出不重複的 email
function wireUpRegisterPreRequest(collection) {
  const item = findRequestByName(collection.item, '註冊新使用者');
  if (!item) return;

  item.event = (item.event || []).filter((e) => e.listen !== 'prerequest');
  item.event.unshift({
    listen: 'prerequest',
    script: { type: 'text/javascript', exec: REGISTER_PRE_REQUEST_SCRIPT },
  });
}

// 單筆 todo 的請求（取得 / 更新 / 刪除）原本路徑變數是寫死的範例值 "1"，
// 改成 {{todoId}}，串接「新增一筆 todo」剛建立的那筆資料
function wireUpTodoIdVariable(collection, name) {
  const item = findRequestByName(collection.item, name);
  const variable = item?.request?.url?.variable?.find((v) => v.key === 'id');
  if (variable) variable.value = '{{todoId}}';
}

// 讓「{id}」資料夾自己也能補齊 bearerToken / todoId，單獨用 Runner 跑這個資料夾時不會失敗
function wireUpTodoFolderPreRequest(collection) {
  const folder = findFolderByName(collection.item, '{id}');
  if (!folder) return;

  folder.event = (folder.event || []).filter((e) => e.listen !== 'prerequest');
  folder.event.unshift({
    listen: 'prerequest',
    script: { type: 'text/javascript', exec: ENSURE_TODO_PRE_REQUEST_SCRIPT },
  });
}

function buildEnvironment() {
  return {
    id: crypto.randomUUID(),
    name: 'Todo List RESTful API - Local',
    values: [
      { key: 'baseUrl', value: 'http://localhost:3000', type: 'default', enabled: true },
      { key: 'email', value: 'demo@example.com', type: 'default', enabled: true },
      { key: 'password', value: 'demo1234', type: 'secret', enabled: true },
      { key: 'bearerToken', value: '', type: 'secret', enabled: true },
      { key: 'todoId', value: '', type: 'default', enabled: true },
      { key: 'todoOwnerToken', value: '', type: 'secret', enabled: true },
    ],
    _postman_variable_scope: 'environment',
  };
}

function main() {
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error('[postman] 找不到 openapi.json，請先執行 `npm run docs:build`');
    process.exit(1);
  }
  const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf-8'));

  converter.convert(
    { type: 'json', data: openapi },
    { requestParametersResolution: 'Example', exampleParametersResolution: 'Example' },
    (err, result) => {
      if (err || !result.result) {
        console.error('[postman] 轉換失敗 ❌');
        console.error(err || result.reason);
        process.exit(1);
      }

      const collection = result.output[0].data;

      useCredentialVariables(collection, '註冊新使用者');
      useCredentialVariables(collection, '登入');
      wireUpRegisterPreRequest(collection);
      wireUpTodoIdVariable(collection, '取得單筆 todo');
      wireUpTodoIdVariable(collection, '更新一筆 todo（title / completed 至少擇一）');
      wireUpTodoIdVariable(collection, '刪除一筆 todo');
      wireUpTodoFolderPreRequest(collection);
      wireUpTests(collection);

      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(COLLECTION_PATH, `${JSON.stringify(collection, null, 2)}\n`, 'utf-8');
      fs.writeFileSync(ENVIRONMENT_PATH, `${JSON.stringify(buildEnvironment(), null, 2)}\n`, 'utf-8');

      console.log(`[postman] 已產生 ${path.relative(process.cwd(), COLLECTION_PATH)}`);
      console.log(`[postman] 已產生 ${path.relative(process.cwd(), ENVIRONMENT_PATH)}`);
    }
  );
}

main();
