// 把實際的路由（src/routes/*）對應成 OpenAPI path 定義。
// 這個檔案只負責「註冊」，實際產生文件的邏輯在 document.js。
const { registry } = require('./registry');
const {
  ErrorResponseSchema,
  MessageResponseSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  MeResponseSchema,
  TodoCreateRequestSchema,
  TodoUpdateRequestSchema,
  TodoResponseSchema,
  TodosListResponseSchema,
  TodoIdParamSchema,
} = require('./schemas');

// 需要登入的路由都接受 Bearer token 或 cookie 其中一種（OR 關係）
const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];

const jsonBody = (schema) => ({
  content: { 'application/json': { schema } },
});

// ---------- Auth ----------

registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Auth'],
  summary: '註冊新使用者',
  request: { body: { content: { 'application/json': { schema: RegisterRequestSchema } } } },
  responses: {
    201: { description: '註冊成功', ...jsonBody(AuthResponseSchema) },
    400: { description: '輸入格式錯誤', ...jsonBody(ErrorResponseSchema) },
    409: { description: 'email 已被註冊', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: '登入',
  request: { body: { content: { 'application/json': { schema: LoginRequestSchema } } } },
  responses: {
    200: { description: '登入成功', ...jsonBody(AuthResponseSchema) },
    400: { description: '輸入格式錯誤', ...jsonBody(ErrorResponseSchema) },
    401: { description: 'email 或密碼錯誤', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: '登出',
  responses: {
    200: { description: '登出成功', ...jsonBody(MessageResponseSchema) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  summary: '取得目前登入使用者',
  security: authSecurity,
  responses: {
    200: { description: '目前登入的使用者', ...jsonBody(MeResponseSchema) },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
  },
});

// ---------- Todos ----------

registry.registerPath({
  method: 'get',
  path: '/api/todos',
  tags: ['Todos'],
  summary: '取得目前使用者的所有 todo',
  security: authSecurity,
  responses: {
    200: { description: 'todo 清單', ...jsonBody(TodosListResponseSchema) },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/todos',
  tags: ['Todos'],
  summary: '新增一筆 todo',
  security: authSecurity,
  request: { body: { content: { 'application/json': { schema: TodoCreateRequestSchema } } } },
  responses: {
    201: { description: '新增成功', ...jsonBody(TodoResponseSchema) },
    400: { description: 'title 為必填', ...jsonBody(ErrorResponseSchema) },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  summary: '取得單筆 todo',
  security: authSecurity,
  request: { params: TodoIdParamSchema },
  responses: {
    200: { description: '單筆 todo', ...jsonBody(TodoResponseSchema) },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
    404: { description: '找不到此 todo', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  summary: '更新一筆 todo（title / completed 至少擇一）',
  security: authSecurity,
  request: {
    params: TodoIdParamSchema,
    body: { content: { 'application/json': { schema: TodoUpdateRequestSchema } } },
  },
  responses: {
    200: { description: '更新成功', ...jsonBody(TodoResponseSchema) },
    400: { description: '請至少提供 title 或 completed', ...jsonBody(ErrorResponseSchema) },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
    404: { description: '找不到此 todo', ...jsonBody(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  summary: '刪除一筆 todo',
  security: authSecurity,
  request: { params: TodoIdParamSchema },
  responses: {
    204: { description: '刪除成功（無內容）' },
    401: { description: '未登入', ...jsonBody(ErrorResponseSchema) },
    404: { description: '找不到此 todo', ...jsonBody(ErrorResponseSchema) },
  },
});
