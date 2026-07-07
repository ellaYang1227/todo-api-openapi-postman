// 產生 openapi.json：
// 1. 用 zod-to-openapi 從 src/openapi 底下的 schema/path 定義產生文件
// 2. 用 swagger-parser 驗證文件是否符合 OpenAPI 規格（不合法就中止、不寫檔）
// 3. 寫到專案根目錄的 openapi.json，方便匯入 Postman 或給其他工具使用
const fs = require('fs');
const path = require('path');
const SwaggerParser = require('swagger-parser');
const { generateOpenApiDocument } = require('../src/openapi/document');

const OUTPUT_PATH = path.join(__dirname, '..', 'openapi.json');

async function main() {
  const document = generateOpenApiDocument();

  try {
    // SwaggerParser.validate 會直接修改傳入物件（解析 $ref 等），所以用 clone 過的版本驗證
    await SwaggerParser.validate(JSON.parse(JSON.stringify(document)));
  } catch (err) {
    console.error('[openapi] 驗證失敗 ❌');
    console.error(err.message);
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
  console.log(`[openapi] 驗證通過 ✅ 已寫入 ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main();
