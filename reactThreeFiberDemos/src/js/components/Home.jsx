import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLoader } from '@react-three/fiber'
import { Typography, Card, Row, Col, Button, Tag, Space } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import ModelPreview from './ModelPreview'
import { useCart } from '../store/cart'
import heroVideo from '../../../assets/video/1126.mp4'

export default function Home(){
  const navigate = useNavigate()
  const { add } = useCart()
  const productsRef = useRef(null)
  

  // discover glb assets inside project
  const wristMods = import.meta.glob('../../assets/VTO/*.glb', { eager: true })
  const footMods = import.meta.glob('../../assets/bareFootVTO/*.glb', { eager: true })

  const toDisplayName = (filename) => {
    const base = filename.replace(/\.glb$/i, '').replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()
    return base.split(' ').filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1).toLowerCase()).join(' ')
  }

  const NAME_OVERRIDES = {
    'ballerinaShoe.glb': 'Ballerina Shoe',
    'converseShoe.glb': 'Converse Shoe',
    'blackShoe.glb': 'Kala Shoe'
  }


  const wristItems = Object.entries(wristMods)
    .filter(([p]) => !/empty\.glb$/i.test(p) && !/ring/i.test(p) && !/wristPlaceHolder2\.glb/i.test(p))
    .map(([p, m]) => {
      const fname = p.split('/').pop()
      const displayName = NAME_OVERRIDES[fname] || toDisplayName(fname)
      return { id: p, displayName, mode: 'wrist', url: m.default }
    })

  const footItems = Object.entries(footMods)
    .filter(([p]) => !/occluder\.glb$/i.test(p))
    .map(([p, m]) => {
      const fname = p.split('/').pop()
      const displayName = NAME_OVERRIDES[fname] || toDisplayName(fname)
      return { id: p, displayName, mode: 'foot', url: m.default }
    })

  const byName = (a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  const items = [...wristItems.sort(byName), ...footItems.sort(byName)]

  const PreloadGLBs = ({ urls }) => {
    urls.forEach((u) => { try { useLoader.preload(GLTFLoader, u) } catch(e){ void e } })
    return null
  }

  useEffect(() => {
    const handler = (e) => {
      const { url, error } = e.detail || {}
      console.warn('GLTF preview error:', url, error)
    }
    window.addEventListener('gltf_parse_error', handler)
    return () => { window.removeEventListener('gltf_parse_error', handler) }
  }, [])

  

  return (
    <div className="min-h-screen appBg" style={{ color: '#ffffff' }}>
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <video
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35, transform: 'translateZ(0)', willChange: 'opacity' }}
        />
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', padding: '0 24px', textAlign: 'center' }}>
            <Typography.Title level={1} style={{ margin: 0, fontWeight: 800, textAlign: 'center', fontSize: 48 }}>
              Virtual Try-On of 
              <span className="flip" style={{ marginLeft: 12 }}>
                <div>
                  <div>Shoes</div>
                  <div>Watch</div>
                  <div>Sneakers</div>
                </div>
              </span>
            </Typography.Title>
            <Typography.Paragraph style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
              Try sneakers and accessories virtually with interactive 3D previews.
            </Typography.Paragraph>
          <div style={{ bottom: 24, left: 0, right: 0, display: 'flex', gap: 12, justifyContent: 'center', paddingTop: '24px' }}>
            <Button type="primary" size="large" onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>Shop Now</Button>
            <Link to="/login"><Button type="primary" size="large">Join</Button></Link>
          </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }} ref={productsRef}>
        <PreloadGLBs urls={items.map(i => i.url)} />
        <Typography.Title level={3} style={{ marginBottom: 16, marginTop: 50 }}>Choose a model</Typography.Title>
        <Row gutter={[16, 24]}>
          {items.map(it => (
            <Col key={it.id} xs={24} sm={12} md={8} xl={6}>
              <Card
                hoverable
                styles={{ body: { padding: 12 } }}
                cover={<div style={{ padding: 12 }}><ModelPreview url={it.url} mode={it.mode} /></div>}
                actions={[
                  <Button type="primary" icon={<EyeOutlined />} onClick={() => navigate('/try/custom', { state: { url: it.url, mode: it.mode } })} key="try">Try On</Button>,
                  <Button onClick={() => add({ id: it.id, name: it.displayName, price: it.mode==='foot'?7500:6500, mode: it.mode, url: it.url, qty: 1 })} key="cart">Add to Cart</Button>
                ]}
              >
                <Space direction="vertical" size={10}>
                  <div>
                    <Typography.Text style={{ fontSize: 22, fontWeight: 700 }} ellipsis>{it.displayName}</Typography.Text>
                    <div className="text-lg font-bold text-white mt-1">৳{(it.mode==='foot'?7500:6500).toLocaleString()}</div>
                  </div>
                  <Tag color={it.mode === 'wrist' ? 'cyan' : 'purple'}>{it.mode}</Tag>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
