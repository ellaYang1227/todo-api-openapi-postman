// 集中定義所有會出現在 OpenAPI 文件裡的 zod schema。
// 每個 schema 都用 registry.register(name, schema) 註冊成 components/schemas/{name}，
// 讓 paths.js 可以直接重複使用（並在文件裡以 $ref 呈現）。
const { z } = require('./zod');
const { registry } = require('./registry');

// ---------- 共用 ----------

const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    message: z.string().openapi({ example: '發生錯誤' }),
  }).openapi('ErrorResponse')
);

const MessageResponseSchema = registry.register(
  'MessageResponse',
  z.object({
    message: z.string().openapi({ example: '已登出' }),
  }).openapi('MessageResponse')
);

// ---------- Auth ----------

const PublicUserSchema = registry.register(
  'PublicUser',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    name: z.string().openapi({ example: 'Demo User' }),
    email: z.email().openapi({ example: 'demo@example.com' }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
  }).openapi('PublicUser')
);

const RegisterRequestSchema = registry.register(
  'RegisterRequest',
  z.object({
    name: z.string({ error: 'name 為必填' }).min(1, 'name 為必填').openapi({ example: 'Demo User' }),
    email: z.email({ error: 'email 格式不正確' }).openapi({ example: 'demo@example.com' }),
    password: z
      .string({ error: 'password 為必填' })
      .min(6, '密碼長度至少 6 碼')
      .openapi({ example: 'demo1234' }),
  }).openapi('RegisterRequest')
);

const LoginRequestSchema = registry.register(
  'LoginRequest',
  z.object({
    email: z.email({ error: 'email 格式不正確' }).openapi({ example: 'demo@example.com' }),
    password: z
      .string({ error: 'password 為必填' })
      .min(1, 'password 為必填')
      .openapi({ example: 'demo1234' }),
  }).openapi('LoginRequest')
);

const AuthResponseSchema = registry.register(
  'AuthResponse',
  z.object({
    user: PublicUserSchema,
    token: z.string().openapi({ description: 'JWT，可放在 Authorization: Bearer 使用' }),
  }).openapi('AuthResponse')
);

const MeResponseSchema = registry.register(
  'MeResponse',
  z.object({
    user: PublicUserSchema,
  }).openapi('MeResponse')
);

// ---------- Todos ----------

const TodoSchema = registry.register(
  'Todo',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    userId: z.number().int().openapi({ example: 1 }),
    title: z.string().openapi({ example: '完成 Todo List API 練習' }),
    completed: z.boolean().openapi({ example: false }),
    createdAt: z.iso.datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    updatedAt: z.iso.datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
  }).openapi('Todo')
);

const TodoCreateRequestSchema = registry.register(
  'TodoCreateRequest',
  z.object({
    title: z
      .string({ error: 'title 為必填' })
      .trim()
      .min(1, 'title 為必填')
      .openapi({ example: '買牛奶' }),
    completed: z.boolean().optional().openapi({ example: false }),
  }).openapi('TodoCreateRequest')
);

const TodoUpdateRequestSchema = registry.register(
  'TodoUpdateRequest',
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'title 不可為空字串')
        .optional()
        .openapi({ example: '買牛奶（更新）' }),
      completed: z.boolean().optional().openapi({ example: true }),
    })
    .refine((data) => data.title !== undefined || data.completed !== undefined, {
      message: '請至少提供 title 或 completed',
    })
    .openapi('TodoUpdateRequest')
);

const TodoResponseSchema = registry.register(
  'TodoResponse',
  z.object({
    todo: TodoSchema,
  }).openapi('TodoResponse')
);

const TodosListResponseSchema = registry.register(
  'TodosListResponse',
  z.object({
    todos: z.array(TodoSchema),
  }).openapi('TodosListResponse')
);

// 路徑參數在 URL 上一律是字串，實際的數字轉換交給 controller / store 處理，
// 這裡用字串 + 數字格式的正則來標註文件（避免 z.coerce 造成 required/nullable 產生錯誤的 schema）。
const TodoIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'id 必須是數字')
    .openapi({
      param: { name: 'id', in: 'path', required: true },
      example: '1',
      description: 'Todo ID',
    }),
});

module.exports = {
  ErrorResponseSchema,
  MessageResponseSchema,
  PublicUserSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  MeResponseSchema,
  TodoSchema,
  TodoCreateRequestSchema,
  TodoUpdateRequestSchema,
  TodoResponseSchema,
  TodosListResponseSchema,
  TodoIdParamSchema,
};
