import { Layout, Row, Col, Typography, Space } from 'antd'

export default function Footer(){
  return (
    <Layout.Footer>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>Try-on Test</Typography.Title>
            <Typography.Paragraph style={{ maxWidth: 480 }}>
              Experience the future of online shopping with our virtual try-on experience.
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text style={{ fontWeight: 600 }}>Explore</Typography.Text>
            <Space direction="vertical" size={8} style={{ display: 'flex', marginTop: 12 }}>
              <Typography.Link href="#">New Arrivals</Typography.Link>
              <Typography.Link href="#">Best Sellers</Typography.Link>
              <Typography.Link href="#">Virtual Try-On</Typography.Link>
              <Typography.Link href="#">Size Guide</Typography.Link>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text style={{ fontWeight: 600 }}>Support</Typography.Text>
            <Space direction="vertical" size={8} style={{ display: 'flex', marginTop: 12 }}>
              <Typography.Link href="#">Help Center</Typography.Link>
              <Typography.Link href="#">Returns</Typography.Link>
              <Typography.Link href="#">Shipping Info</Typography.Link>
              <Typography.Link href="#">Contact Us</Typography.Link>
            </Space>
          </Col>
        </Row>
        <div style={{ borderTop: '1px solid #202020', marginTop: 24, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text>
            © 2026 Zarruk Code. All rights reserved.
          </Typography.Text>
          <Space size={16}>
            <Typography.Link href="#">Privacy Policy</Typography.Link>
            <Typography.Link href="#">Terms of Service</Typography.Link>
            <Typography.Link href="#">Cookie Policy</Typography.Link>
          </Space>
        </div>
      </div>
    </Layout.Footer>
  )
}