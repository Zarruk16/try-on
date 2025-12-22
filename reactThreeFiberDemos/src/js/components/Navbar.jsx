import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography, Space, Drawer, Grid } from 'antd'
import { ShoppingCartOutlined, MenuOutlined } from '@ant-design/icons'

export default function Navbar(){
  const location = useLocation()
  const selected = location.pathname.startsWith('/cart') ? ['cart'] : location.pathname.startsWith('/login') ? ['login'] : ['home']
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [open, setOpen] = React.useState(false)
  const items = [
    { key: 'home', label: <Link to="/">Home</Link> },
    { key: 'login', label: <Link to="/login">Login</Link> },
    { key: 'cart', label: <Link to="/cart">Cart</Link> },
  ]
  return (
    <div style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}>
      <Layout.Header
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src="/favicon.png" alt="Logo" style={{ height: 32, width: 32, objectFit: 'contain' }} />
            <Typography.Text style={{ fontWeight: 800, fontSize: 22, color: '#ffffff' }}>Chrono Stride</Typography.Text>
          </Link>
          {isMobile ? (
            <Space size={12}>
              <Link to="/cart">
                <Button type="primary" icon={<ShoppingCartOutlined />} />
              </Link>
              <Button icon={<MenuOutlined />} onClick={() => setOpen(true)} />
            </Space>
          ) : (
            <Space size={24} style={{ display: 'flex', alignItems: 'center' }}>
              <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={selected}
                items={items}
                style={{ background: 'transparent', borderBottom: 'none' }}
              />
              <Link to="/cart">
                <Button type="primary" icon={<ShoppingCartOutlined />}>Cart</Button>
              </Link>
            </Space>
          )}
        </div>
      </Layout.Header>
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
      >
        <Menu
          mode="inline"
          selectedKeys={selected}
          items={items}
          onClick={() => setOpen(false)}
        />
      </Drawer>
    </div>
  )
}