import { useCart } from '../store/cart'
import { Typography, List, Card, Button, Divider, Space, InputNumber, Empty, Row, Col, Layout, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart(){
  const navigate = useNavigate()
  const { items, remove, total, clear, updateQuantity } = useCart()
  const hasItems = items.length > 0

  const handleCheckout = () => {
    if (!hasItems) {
      message.warning('Your cart is empty. Add items before checkout.')
      return
    }
    navigate('/checkout')
  }

  const handleClearCart = () => {
    clear()
    message.success('Cart cleared successfully')
  }
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent', color: '#fff' }}>
      <Layout.Content>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          <Typography.Title level={2} style={{ marginBottom: 16 }}>Cart</Typography.Title>

          {!hasItems && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
              <Empty description={<span style={{ color: '#fff' }}>Your cart is empty</span>}>
                <Link to="/"><Button type="primary" size="large">Browse Products</Button></Link>
              </Empty>
            </div>
          )}

          {hasItems && (
            <Row gutter={[24, 24]}>
              <Col xs={24} md={16}>
                <Card bordered style={{ background: 'transparent', borderColor: 'rgba(124,58,237,0.45)' }}>
                  <List
                    itemLayout="horizontal"
                    dataSource={items}
                    renderItem={(it, idx) => (
                      <List.Item
                        actions={[
                          <Space key="qty">
                            <span style={{ color: 'rgba(255,255,255,0.85)' }}>Qty</span>
                            <InputNumber min={1} value={it.qty || 1} onChange={(v) => updateQuantity(idx, v)} />
                          </Space>,
                          <Button danger onClick={() => remove(idx)} key="remove">Remove</Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={<Typography.Text strong style={{ color: '#fff' }}>{it.name}</Typography.Text>}
                          description={
                            <Typography.Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                              ₦{((it.price || 0)).toFixed(2)} × {(it.qty || 1)} = ₦{(((it.price || 0) * (it.qty || 1))).toFixed(2)}
                            </Typography.Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title={<Typography.Title level={4} style={{ margin: 0 }}>Order Summary</Typography.Title>} bordered style={{ borderColor: 'rgba(124,58,237,0.45)' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)' }}>
                      <span>Subtotal</span>
                      <span>₦{total.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)' }}>
                      <span>Estimated Tax</span>
                      <span>₦0.00</span>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Total</span>
                      <span>₦{total.toFixed(2)}</span>
                    </div>
                    <Button type="primary" size="large" disabled={!hasItems} onClick={handleCheckout}>Checkout</Button>
                    <Button size="large" disabled={!hasItems} onClick={handleClearCart}>Clear Cart</Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      </Layout.Content>
    </Layout>
  )
}