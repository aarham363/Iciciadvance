import { FormEvent, useEffect, useMemo, useState } from 'react'
import ReactPlayer from 'react-player'
import { api, Post } from '../lib/api'

export function Feed({ user }: { user: { id: string, username: string, email: string } | null }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const sorted = useMemo(() => posts.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [posts])

  async function load() {
    try {
      const data = await api.listPosts()
      setPosts(data)
    } catch {
      setError('Failed to load posts')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) {
      setError('Login to post')
      return
    }
    setError('')
    try {
      const created = await api.createPost(url, title, description)
      setPosts((p) => [created, ...p])
      setUrl(''); setTitle(''); setDescription('')
    } catch {
      setError('Failed to create post')
    }
  }

  async function toggleLike(id: string) {
    try {
      const updated = await api.likePost(id)
      setPosts((prev) => prev.map((p) => p.id === id ? updated : p))
    } catch {}
  }

  async function addComment(id: string, text: string) {
    if (!text.trim()) return
    try {
      await api.commentPost(id, text)
      await load()
    } catch {}
  }

  async function deletePost(id: string) {
    try {
      await api.deletePost(id)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {}
  }

  return (
    <div className="feed">
      <section className="composer">
        <h2>Share a video link</h2>
        <form onSubmit={submit}>
          <input placeholder="Paste YouTube/Vimeo/Twitch link" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={!user}>Post</button>
          {!user && <span className="hint">Login to post</span>}
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="posts">
        {sorted.map((p) => (
          <article className="post" key={p.id}>
            <h3>{p.title || 'Untitled'}</h3>
            <div className="player">
              <ReactPlayer url={p.sourceUrl} controls width="100%" height="360px" />
            </div>
            <p className="desc">{p.description}</p>
            <div className="meta">
              <button onClick={() => toggleLike(p.id)}>❤ {p.likes.length}</button>
              {user && user.id === p.userId && <button onClick={() => deletePost(p.id)}>Delete</button>}
              <span className="timestamp">{new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <details>
              <summary>Comments ({p.comments.length})</summary>
              <ul className="comments">
                {p.comments.map((c) => (
                  <li key={c.id}><span className="when">{new Date(c.createdAt).toLocaleString()}</span> {c.text}</li>
                ))}
              </ul>
              {user && <CommentForm onAdd={(text) => addComment(p.id, text)} />}
            </details>
          </article>
        ))}
      </section>
    </div>
  )
}

function CommentForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <form className="comment-form" onSubmit={(e) => { e.preventDefault(); onAdd(text); setText('') }}>
      <input placeholder="Write a comment" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}

