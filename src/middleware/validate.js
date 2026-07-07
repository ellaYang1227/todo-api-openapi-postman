// 用 zod schema 驗證 request 的 body / params，取代原本 controller 手刻的 if 判斷。
// schema 與 src/openapi/schemas.js 共用，同一份定義同時驅動「文件」與「驗證」。
// 驗證通過後會把 req[source] 換成 zod parse 過的結果（套用 trim、預設值等轉換）。
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues[0]?.message || '輸入格式錯誤';
      return res.status(400).json({ message });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
