// OpenAPI registry：所有 schema／路由都會註冊到這個共用實例上，
// 最後由 document.js 統一產生 openapi 文件。
const { OpenAPIRegistry } = require('@asteasolutions/zod-to-openapi');
const config = require('../config');

const registry = new OpenAPIRegistry();

// 認證方式一：Authorization: Bearer <token>（Postman / Swagger UI 測試用）
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: '登入／註冊成功後回應中的 token，放在 `Authorization: Bearer <token>`',
});

// 認證方式二：httpOnly cookie（瀏覽器頁面實際使用的方式）
const cookieAuth = registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: config.cookieName,
  description: '登入／註冊成功後由伺服器設定的 httpOnly cookie',
});

module.exports = { registry, bearerAuth, cookieAuth };
