// 前端：登入 / 註冊。
// 因為 token 存在 httpOnly cookie，前端只需呼叫 API，成功後導向 /todos。
// fetch 預設會帶上同源 cookie（這裡明確寫出 credentials 以利教學）。

const errorBox = document.getElementById('error');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || '發生錯誤');
  }
  return data;
}

// 登入表單
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    try {
      await postJSON('/api/auth/login', {
        email: loginForm.email.value,
        password: loginForm.password.value,
      });
      window.location.href = '/todos';
    } catch (err) {
      showError(err.message);
    }
  });
}

// 註冊表單
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    try {
      await postJSON('/api/auth/register', {
        name: registerForm.name.value,
        email: registerForm.email.value,
        password: registerForm.password.value,
      });
      window.location.href = '/todos';
    } catch (err) {
      showError(err.message);
    }
  });
}
