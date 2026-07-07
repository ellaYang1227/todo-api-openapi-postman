# Todo List RESTful API（教學專案）

使用 Node.js + Express + EJS + Tailwind CSS 製作的小型 Todo List，具備 JWT 登入註冊與 Todo CRUD。
**資料存在記憶體**，伺服器重啟後會清空並重新載入預設資料。

## 技術
- Express 5（RESTful API + EJS 樣板）
- JWT（jsonwebtoken）認證，token 存於 **httpOnly cookie**
  （API 認證 middleware 同時支援 `Authorization: Bearer`，方便用 Postman / Swagger 測試）
- bcryptjs 雜湊密碼
- Tailwind CSS v4（CLI 建置）
- 資料存記憶體（無資料庫）
- OpenAPI 文件：`zod` + `@asteasolutions/zod-to-openapi` 從 schema 產生文件、`swagger-parser` 驗證規格、`swagger-ui-express` 提供文件頁面

## 安裝與啟動

```bash
# 1. 安裝套件
npm install

# 2.（可選）設定環境變數
cp .env.example .env

# 3. 建置 Tailwind CSS
npm run build:css

# 4. 啟動
npm start
# 或開發模式（自動重啟 + 監看 CSS）
npm run dev
```

啟動後開啟 http://localhost:3000

### OpenAPI 文件 / Swagger UI
- 瀏覽器開啟 http://localhost:3000/api-docs 可看互動式文件（右上角 **Authorize** 貼上登入回應的 `token` 即可測試需登入的 API）
- http://localhost:3000/openapi.json 是原始 OpenAPI 3.0 JSON（伺服器啟動時即時產生）
- `npm run docs:build` 會另外驗證並輸出一份到專案根目錄的 `openapi.json`（可直接匯入 Postman）
- 文件內容定義在 `src/openapi/`：`schemas.js`（zod schema）、`paths.js`（路由對應）、`document.js`（產生文件）
- 這些 zod schema 同時也是 API 的驗證依據：`src/middleware/validate.js` 會用同一份 schema 檢查 request body / params，取代原本手刻的 `if` 驗證，錯誤時回 `400 { message }`

### 預設測試帳號
- Email：`demo@example.com`
- 密碼：`demo1234`
（可透過 `.env` 的 `SEED_USER_*` 覆寫）

## NPM Scripts
| 指令 | 說明 |
| --- | --- |
| `npm start` | 啟動伺服器 |
| `npm run dev` | 開發模式（nodemon + tailwind watch 同時跑） |
| `npm run build:css` | 建置並壓縮 Tailwind CSS |
| `npm run dev:css` | 只監看建置 CSS |
| `npm run docs:build` | 驗證 OpenAPI 文件並輸出 `openapi.json` |

## API 一覽（前綴 `/api`）

### 認證
| Method | Path | 說明 | 需登入 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 註冊 `{ name, email, password }` | ✗ |
| POST | `/api/auth/login` | 登入 `{ email, password }` | ✗ |
| POST | `/api/auth/logout` | 登出（清除 cookie） | ✗ |
| GET | `/api/auth/me` | 取得目前使用者 | ✓ |

### Todos（皆需登入，且僅能操作自己的資料）
| Method | Path | 說明 |
| --- | --- | --- |
| GET | `/api/todos` | 取得清單 |
| POST | `/api/todos` | 新增 `{ title }` |
| GET | `/api/todos/:id` | 取得單筆 |
| PUT | `/api/todos/:id` | 更新 `{ title?, completed? }` |
| DELETE | `/api/todos/:id` | 刪除 |

### curl 範例
```bash
# 登入並把 cookie 存到檔案
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"demo1234"}'

# 用 cookie 取得 todos
curl -b cookies.txt http://localhost:3000/api/todos

# 或用回應中的 token，以 Bearer 方式呼叫
curl http://localhost:3000/api/todos -H "Authorization: Bearer <token>"
```

## 專案結構
```
src/
├── server.js          進入點：seed + 啟動
├── app.js             Express app 設定（含掛載 Swagger UI）
├── config/            集中讀取環境變數
├── data/              store.js（記憶體資料）、seed.js（預設資料）
├── middleware/        auth.js（JWT 驗證）、validate.js（zod 驗證）、errorHandler.js
├── controllers/       authController.js、todoController.js
├── routes/            authRoutes、todoRoutes、pageRoutes、index
├── openapi/           zod.js、registry.js、schemas.js、paths.js、document.js
├── views/             EJS 樣板
└── styles/input.css   Tailwind 入口
scripts/
└── generate-openapi.js 產生並驗證 openapi.json 的腳本
public/
├── css/output.css     Tailwind 產出（build 後）
└── js/                前端 auth.js、todos.js
openapi.json            執行 `npm run docs:build` 後產生（可匯入 Postman）
```
