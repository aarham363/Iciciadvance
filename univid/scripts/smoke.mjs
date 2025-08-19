// End-to-end smoke test of the local API
const BASE = process.env.BASE || 'http://localhost:4000';

function unique() {
  return Math.floor(Date.now() / 1000).toString();
}

async function main() {
  const suffix = unique();
  const username = `user${suffix}`;
  const email = `${username}@local.test`;
  const password = 'pass12345';

  console.log('--- Health');
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log(health);

  console.log('--- Register');
  let reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  if (!reg.ok) {
    console.log('Register failed with', reg.status);
  }
  let regJson = await reg.json().catch(() => ({}));
  let token = regJson.token;
  if (!token) {
    console.log('--- Login');
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginJson = await login.json();
    token = loginJson.token;
  }
  console.log('token:', token ? token.slice(0, 12) + '...' : 'missing');

  console.log('--- Create post');
  const create = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Test Video', description: 'Hello' })
  });
  const post = await create.json();
  console.log({ id: post.id, title: post.title });

  console.log('--- Like');
  const like = await fetch(`${BASE}/api/posts/${post.id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const liked = await like.json();
  console.log({ likeCount: (liked.likes || []).length });

  console.log('--- Comment');
  const comment = await fetch(`${BASE}/api/posts/${post.id}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: 'Nice!' })
  });
  const commentJson = await comment.json();
  console.log({ commentId: commentJson.id, text: commentJson.text });

  console.log('--- List (top 1)');
  const list = await fetch(`${BASE}/api/posts`).then((r) => r.json());
  console.log(list[0] ? { id: list[0].id, title: list[0].title, comments: list[0].comments.length } : { size: list.length });

  console.log('--- Delete');
  const del = await fetch(`${BASE}/api/posts/${post.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const delJson = await del.json();
  console.log(delJson);

  console.log('--- Size after delete');
  const after = await fetch(`${BASE}/api/posts`).then((r) => r.json());
  console.log({ size: after.length });
}

main().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});

