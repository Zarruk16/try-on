import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ModelPreview from './ModelPreview'

export default function Home(){
  const navigate = useNavigate()
  const fileInputRef = useRef()
  const [uploadedUrl, setUploadedUrl] = useState(null)

  const onModelClick = (entry) => { navigate('/try/custom', { state: { url: entry.url, mode: entry.mode } }) }
  const onUploadClick = () => { fileInputRef.current?.click() }
  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setUploadedUrl(url)
  }
  const startCustom = (mode) => {
    if (!uploadedUrl) return
    navigate('/try/custom', { state: { url: uploadedUrl, mode } })
  }

  // discover glb assets inside project
  const wristMods = import.meta.glob('../../assets/VTO/*.glb', { eager: true })
  const footMods = import.meta.glob('../../assets/bareFootVTO/*.glb', { eager: true })

  const wristItems = Object.entries(wristMods)
    .filter(([p]) => !/empty\.glb$/i.test(p) && !/ring/i.test(p))
    .map(([p, m]) => ({ id: p, name: p.split('/').pop(), mode: 'wrist', url: m.default }))

  const footItems = Object.entries(footMods)
    .filter(([p]) => !/occluder\.glb$/i.test(p))
    .map(([p, m]) => ({ id: p, name: p.split('/').pop(), mode: 'foot', url: m.default }))

  const items = [...wristItems, ...footItems]

  return (
    <div className="min-h-screen appBg text-[#ffffff]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6">Choose a model</h1>
        <div className="cardsGrid">
          {items.map(it => (
            <div key={it.id} className="group rounded-[12px] p-[15px]  border border-zinc-800 bg-zinc-900 text-white overflow-hidden shadow-sm hover:shadow-lg transition-all">
              <div className='rounded-[10rem] pb-[10px]'>
                <ModelPreview url={it.url}  />
              </div>
              <div className="px-4 pt-4">
                <div className="text-xs font-medium tracking-wide text-zinc-600">{it.mode.toUpperCase()}</div>
                <div className="mt-1 text-lg font-semibold truncate">{it.name}</div>
              </div>
              <button onClick={() => onModelClick(it)} className="w-full px-4 py-[6px] text-[20px] font-medium bg-white text-zinc-900 hover:bg-zinc-200 rounded-[12px]">Try on</button>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Add 3D model</h2>
          <div className="flex items-center gap-3">
            <button onClick={onUploadClick} className="px-4 py-2 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 shadow-sm">Upload .glb</button>
            <input ref={fileInputRef} type="file" accept=".glb,.gltf" className="hidden" onChange={onFileChange} />
            {uploadedUrl && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/90">Select mode:</span>
                <button onClick={() => startCustom('wrist')} className="px-3 py-1 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 text-sm shadow-sm">Wrist</button>
                <button onClick={() => startCustom('foot')} className="px-3 py-1 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 text-sm shadow-sm">Foot</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}