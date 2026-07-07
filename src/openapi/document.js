// 匯總 registry（schemas + paths 都已註冊完成後）產生最終的 OpenAPI 文件物件。
const { OpenApiGeneratorV3 } = require('@asteasolutions/zod-to-openapi');
const { registry } = require('./registry');

// 觸發 schema／path 的註冊（require 只會執行一次，之後皆從 cache 讀取）
require('./schemas');
require('./paths');

function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Todo List RESTful API',
      version: '1.0.0',
      description:
        '教學用 Todo List RESTful API 文件（JWT 認證，資料存於記憶體，伺服器重啟後會清空）。',
    },
    servers: [{ url: '/', description: '目前伺服器' }],
    tags: [
      { name: 'Auth', description: '註冊、登入、登出、取得目前使用者' },
      { name: 'Todos', description: 'Todo 的 CRUD（僅能操作自己的資料）' },
    ],
  });
}

module.exports = { generateOpenApiDocument };
