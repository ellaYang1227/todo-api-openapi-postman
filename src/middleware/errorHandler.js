// 集中式的 404 與錯誤處理。
// 教學重點：把錯誤回應格式統一，API 路由回 JSON，其餘回簡單訊息。

// 找不到路由
function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: `找不到資源：${req.method} ${req.path}` });
  }
  return res.status(404).send('404 Not Found');
}

// 統一錯誤處理（Express 5 會自動捕捉 async route 拋出的錯誤）
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || 500;
  const message = err.message || '伺服器發生錯誤';
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ message });
  }
  return res.status(status).send(message);
}

module.exports = { notFound, errorHandler };
