import { useState } from 'react'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const onSubmit = (e) => { e.preventDefault() }
  return (
    <div className="max-w-md mx-auto px-6 py-10 text-white">
      <div className="text-2xl font-semibold mb-4">Login</div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
        </div>
        <button className="px-4 py-2 rounded bg-white text-black">Login</button>
      </form>
    </div>
  )
}