import { useNavigate } from 'react-router-dom'
import { Typography, Card, Row, Col, Button, Tag, Space } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import ModelPreview from './ModelPreview'

export default function Home(){
  const navigate = useNavigate()

  const onModelClick = (entry) => { navigate('/try/custom', { state: { url: entry.url, mode: entry.mode } }) }

  // discover glb assets inside project
  const wristMods = import.meta.glob('../../assets/VTO/*.glb', { eager: true })
  const footMods = import.meta.glob('../../assets/bareFootVTO/*.glb', { eager: true })

  const toDisplayName = (filename) => {
    const base = filename.replace(/\.glb$/i, '').replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()
    return base.split(' ').filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1).toLowerCase()).join(' ')
  }

  const NAME_OVERRIDES = {
    'wristPlaceHolder2.glb': 'Wrist Placeholder',
    'ballerinaShoe.glb': 'Ballerina Shoe',
    'converseShoe.glb': 'Converse Shoe',
    'blackShoe.glb': 'Kala Shoe'
  }

  const wristItems = Object.entries(wristMods)
    .filter(([p]) => !/empty\.glb$/i.test(p) && !/ring/i.test(p))
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

  return (
    <div className="min-h-screen appBg" style={{ color: '#ffffff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <Typography.Title level={2} style={{ marginBottom: 24 }}>Choose a model</Typography.Title>
        <Row gutter={[16, 16]}>
          {items.map(it => (
            <Col key={it.id} xs={12} md={8} xl={6}>
              <Card
                hoverable
                styles={{ body: { padding: 12 } }}
                cover={<div style={{ padding: 12 }}><ModelPreview url={it.url} /></div>}
                actions={[
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => onModelClick(it)} key="try">Try on</Button>
                ]}
              >
                <Space direction="vertical" size={10}>
                  <Typography.Text style={{ fontSize: 22, fontWeight: 700 }} ellipsis>{it.displayName}</Typography.Text>
                  <Tag color={it.mode === 'wrist' ? 'purple' : 'cyan'} style={{ width: 'fit-content', fontSize: 16, padding: '6px 12px' }}>
                    {it.mode[0].toUpperCase() + it.mode.slice(1)}
                  </Tag>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}