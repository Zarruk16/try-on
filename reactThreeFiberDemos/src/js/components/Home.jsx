import { useNavigate, Link } from 'react-router-dom'
import { Typography, Card, Row, Col, Button, Tag, Space } from 'antd'
import { ShoppingCartOutlined, EyeOutlined } from '@ant-design/icons'
import ModelPreview from './ModelPreview'
import { useCart } from '../store/cart'

export default function Home(){
  const navigate = useNavigate()
  const { add } = useCart()

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

  const items = [...wristItems, ...footItems]
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }))

  return (
    <div className="min-h-screen appBg" style={{ color: '#ffffff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <Typography.Title level={1} style={{ marginBottom: 8, fontWeight: 800 }}>Virtual Try-On</Typography.Title>
          <Typography.Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>
            Try sneakers and accessories virtually with interactive 3D previews.
          </Typography.Paragraph>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/cart">
              <Typography.Link>
                <div style={{
                  display: 'inline-block',
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                  color: '#fff',
                  fontWeight: 600
                }}>Shop Collection</div>
              </Typography.Link>
            </Link>
            <Link to="/login">
              <Typography.Link>
                <div style={{
                  display: 'inline-block',
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '2px solid #7c3aed',
                  color: '#a78bfa',
                  fontWeight: 600
                }}>Join Now</div>
              </Typography.Link>
            </Link>
          </div>
        </div>

        <Typography.Title level={3} style={{ marginBottom: 16 }}>Choose a model</Typography.Title>
        <Row gutter={[16, 24]}>
          {items.map(it => (
            <Col key={it.id} xs={24} sm={12} md={8} xl={6}>
              <Card
                hoverable
                styles={{ body: { padding: 12 } }}
                cover={<div style={{ padding: 12 }}><ModelPreview url={it.url} mode={it.mode} /></div>}
                actions={[
                  <Button type="primary" icon={<EyeOutlined />} onClick={() => navigate('/try/custom', { state: { url: it.url, mode: it.mode } })} key="try">Try On</Button>,
                  <Button icon={<ShoppingCartOutlined />} onClick={() => add({ id: it.id, name: it.displayName, price: it.mode==='foot'?7500:6500, mode: it.mode, url: it.url, qty: 1 })} key="cart">Add to Cart</Button>
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