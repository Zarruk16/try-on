import { Routes, Route, BrowserRouter as Router } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import './index.css'

import Home from './js/components/Home'
import TryOn from './js/demos/TryOn'
import Navbar from './js/components/Navbar'
import Footer from './js/components/Footer'
import Product from './js/pages/Product'
import Cart from './js/pages/Cart'
import Login from './js/pages/Login'

export default function App(){
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          colorBgBase: '#0a0a0a',
          colorTextBase: '#ffffff',
          borderRadius: 12
        }
      }}
    >
      <Router>
        <Navbar />
        <div style={{ paddingTop: 72 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/try/:modelId" element={<TryOn />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ConfigProvider>
  )
}