// 集中管理所有設定值；一律從環境變數讀取，並提供合理預設值。
// 教學重點：設定與程式邏輯分離，敏感資訊（JWT 密鑰、預設密碼）可由 .env 覆寫。
require('dotenv').config({ quiet: true });

const config = {
  // 伺服器
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT 設定
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // 存放 JWT 的 cookie 名稱
  cookieName: process.env.COOKIE_NAME || 'token',

  // 預設帳號（seed 用）；可由環境變數覆寫
  seedUser: {
    name: process.env.SEED_USER_NAME || 'Demo User',
    email: process.env.SEED_USER_EMAIL || 'demo@example.com',
    password: process.env.SEED_USER_PASSWORD || 'demo1234',
  },
};

module.exports = config;
