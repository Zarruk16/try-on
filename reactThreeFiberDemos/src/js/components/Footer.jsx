import { Layout, Row, Col, Typography, Space } from 'antd'

export default function Footer(){
  return (
    <Layout.Footer style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(10,10,10,0.6), rgba(59,130,246,0.25))', borderTop: '1px solid rgba(124,58,237,0.35)', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Typography.Title level={4} style={{ color: '#fff', marginBottom: 8 }}>Chrono Stride</Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.75)', maxWidth: 480 }}>
              Experience the future of online shopping with our virtual try-on experience.
            </Typography.Paragraph>
          </Col>
          <Col xs={12} md={6}>
            <Typography.Text style={{ color: '#fff', fontWeight: 600 }}>Explore</Typography.Text>
            <Space direction="vertical" size={8} style={{ display: 'flex', marginTop: 12 }}>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>New Arrivals</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Best Sellers</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Virtual Try-On</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Size Guide</Typography.Link>
            </Space>
          </Col>
          <Col xs={12} md={6}>
            <Typography.Text style={{ color: '#fff', fontWeight: 600 }}>Support</Typography.Text>
            <Space direction="vertical" size={8} style={{ display: 'flex', marginTop: 12 }}>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Help Center</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Returns</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Shipping Info</Typography.Link>
              <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Contact Us</Typography.Link>
            </Space>
          </Col>
        </Row>
        <div style={{ borderTop: '1px solid #202020', marginTop: 24, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.6)' }}>
            © 2024 Chrono Stride. All rights reserved.
          </Typography.Text>
          <Space size={16}>
            <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Privacy Policy</Typography.Link>
            <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Terms of Service</Typography.Link>
            <Typography.Link href="#" style={{ color: 'rgba(255,255,255,0.8)' }}>Cookie Policy</Typography.Link>
          </Space>
        </div>
      </div>
    </Layout.Footer>
  )
}