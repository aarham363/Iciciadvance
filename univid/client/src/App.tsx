import { Route, Routes, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Feed } from './pages/Feed'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { api } from './lib/api'

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string, username: string, email: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.me(token).then(setUser).catch(() => setUser(null))
    }
  }, [])

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">UniVid</Link>
        <nav>
          {user ? (
            <>
              <span className="welcome">Hi, {user.username}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Feed user={user} />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onRegister={setUser} />} />
        </Routes>
      </main>
    </div>
  )
}

