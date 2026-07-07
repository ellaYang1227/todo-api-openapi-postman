// 擴充 zod，讓 schema 可以呼叫 .openapi(...) 附加 OpenAPI metadata。
// 必須在任何 schema 定義（呼叫 .openapi()）之前執行一次，
// 所以整個專案要用到「可產文件的 zod」時都從這個檔案 require，不要直接 require('zod')。
const { z } = require('zod');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

module.exports = { z };
