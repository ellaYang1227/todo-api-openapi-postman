// 把 openapi.json 轉成 Postman Collection，並產生對應的 Postman Environment。
// 1. 讀專案根目錄的 openapi.json（跑 `npm run docs:build` 產生，確保是最新版）
// 2. 用 openapi-to-postmanv2 轉換成 Collection v2.1（request body 用 example 值，方便直接送出）
// 3. 幫 /api/auth/register、/api/auth/login 這兩個請求：
//    - body 裡的 email / password 換成環境變數 {{email}} / {{password}}
//    - 加上 test script，把回應裡的 token 自動存進環境變數 {{bearerToken}}
//      （collection 的 Bearer Auth 預設就是讀 {{bearerToken}}，登入後其他請求不用手動貼 token）
// 4. 輸出 postman/collection.json 與 postman/environment.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const converter = require('openapi-to-postmanv2');

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'postman');
const COLLECTION_PATH = path.join(OUTPUT_DIR, 'collection.json');
const ENVIRONMENT_PATH = path.join(OUTPUT_DIR, 'environment.json');

const SET_TOKEN_SCRIPT = [
  'if (pm.response.code === 200 || pm.response.code === 201) {',
  '  const body = pm.response.json();',
  '  if (body.token) {',
  "    pm.environment.set('bearerToken', body.token);",
  '  }',
  '}',
];

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

// 把 request body 裡的帳密換成環境變數，並掛上自動存 token 的 test script
function wireUpAuthRequest(collection, name) {
  const item = findRequestByName(collection.item, name);
  if (!item) return;

  if (item.request.body?.mode === 'raw') {
    const data = JSON.parse(item.request.body.raw);
    if ('email' in data) data.email = '{{email}}';
    if ('password' in data) data.password = '{{password}}';
    item.request.body.raw = JSON.stringify(data, null, 2);
  }

  item.event = item.event || [];
  item.event.push({
    listen: 'test',
    script: { type: 'text/javascript', exec: SET_TOKEN_SCRIPT },
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
      wireUpAuthRequest(collection, '註冊新使用者');
      wireUpAuthRequest(collection, '登入');

      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(COLLECTION_PATH, `${JSON.stringify(collection, null, 2)}\n`, 'utf-8');
      fs.writeFileSync(ENVIRONMENT_PATH, `${JSON.stringify(buildEnvironment(), null, 2)}\n`, 'utf-8');

      console.log(`[postman] 已產生 ${path.relative(process.cwd(), COLLECTION_PATH)}`);
      console.log(`[postman] 已產生 ${path.relative(process.cwd(), ENVIRONMENT_PATH)}`);
    }
  );
}

main();
