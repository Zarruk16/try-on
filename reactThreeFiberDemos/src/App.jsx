import { Routes, Route, BrowserRouter as Router, useLocation } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import './index.css'

import Home from './js/components/Home'
import Navbar from './js/components/Navbar'
import Footer from './js/components/Footer'
import Product from './js/pages/Product'
import Cart from './js/pages/Cart'
import Login from './js/pages/Login'
import Signup from './js/pages/Signup'
import TryOn from './js/demos/TryOn'

function Shell(){
  const location = useLocation()
  const isAR = location.pathname.startsWith('/try')
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#2f54eb',
          colorInfo: '#13c2c2',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#f5222d',
          colorBgBase: '#0a0a0a',
          colorTextBase: '#ffffff',
          borderRadius: 12
        },
        components: {
          Layout: {
            headerBg: 'rgba(47,84,235,0.18)',
            footerBg: 'rgba(47,84,235,0.12)'
          },
          Button: {
            borderRadius: 12,
            primaryShadow: '0 8px 24px rgba(47,84,235,0.35)'
          },
          Card: {
            borderRadiusLG: 16
          },
          Tag: {
            borderRadiusSM: 8
          }
        }
      }}
    >
      {!isAR && <Navbar />}
      <div style={{ paddingTop: isAR ? 0 : 72 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/try/:modelId" element={<TryOn />} />
        </Routes>
        {!isAR && <Footer />}
      </div>
    </ConfigProvider>
  )
}

export default function App(){
  return (
    <Router>
      <Shell />
    </Router>
  )
}