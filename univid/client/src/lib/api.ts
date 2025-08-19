const BASE = 'http://localhost:4000'

export const api = {
  async register(username: string, email: string, password: string) {
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    if (!r.ok) throw new Error('register failed')
    const data = await r.json()
    localStorage.setItem('token', data.token)
    return data.user as { id: string, username: string, email: string }
  },
  async login(email: string, password: string) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!r.ok) throw new Error('login failed')
    const data = await r.json()
    localStorage.setItem('token', data.token)
    return data.user as { id: string, username: string, email: string }
  },
  async me(token: string) {
    const r = await fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error('me failed')
    const data = await r.json()
    return data as { id: string, username: string, email: string }
  },
  async listPosts() {
    const r = await fetch(`${BASE}/api/posts`)
    if (!r.ok) throw new Error('list posts failed')
    return r.json() as Promise<Post[]>
  },
  async createPost(url: string, title: string, description: string) {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('missing token')
    const r = await fetch(`${BASE}/api/posts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, title, description })
    })
    if (!r.ok) throw new Error('create post failed')
    return r.json() as Promise<Post>
  },
  async likePost(id: string) {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('missing token')
    const r = await fetch(`${BASE}/api/posts/${id}/like`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (!r.ok) throw new Error('like failed')
    return r.json() as Promise<Post>
  },
  async commentPost(id: string, text: string) {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('missing token')
    const r = await fetch(`${BASE}/api/posts/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    })
    if (!r.ok) throw new Error('comment failed')
    return r.json() as Promise<Comment>
  },
  async deletePost(id: string) {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('missing token')
    const r = await fetch(`${BASE}/api/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error('delete failed')
    return r.json() as Promise<{ ok: boolean }>
  }
}

export type Comment = {
  id: string
  userId: string
  text: string
  createdAt: string
}

export type Post = {
  id: string
  userId: string
  type: 'embed'
  sourceUrl: string
  title: string
  description: string
  thumbnail: string
  likes: string[]
  comments: Comment[]
  createdAt: string
}

