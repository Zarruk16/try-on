import { Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography, Space } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'

export default function Navbar(){
  const location = useLocation()
  const selected = location.pathname.startsWith('/cart') ? ['cart'] : location.pathname.startsWith('/login') ? ['login'] : ['home']
  return (
    <div style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}>
      <Layout.Header
        style={{
          background: 'linear-gradient(90deg, #2e1065 0%, #0a0a0a 50%, #1e3a8a 100%)',
          borderBottom: '1px solid rgba(124,58,237,0.35)',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Typography.Text style={{ fontWeight: 800, fontSize: 22, color: '#ffffff' }}>Chrono Stride</Typography.Text>
          <Space size={24} style={{ display: 'flex', alignItems: 'center' }}>
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={selected}
              items={[
                { key: 'home', label: <Link to="/">Home</Link> },
                { key: 'login', label: <Link to="/login">Login</Link> },
                { key: 'cart', label: <Link to="/cart">Cart</Link> },
              ]}
              style={{ background: 'transparent', borderBottom: 'none' }}
            />
            <Link to="/cart">
              <Button type="primary" icon={<ShoppingCartOutlined />}>Cart</Button>
            </Link>
          </Space>
        </div>
      </Layout.Header>
    </div>
  )
}