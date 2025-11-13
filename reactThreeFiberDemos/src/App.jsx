import { Routes, Route, BrowserRouter as Router } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import './index.css'

import Home from './js/components/Home'
import TryOn from './js/demos/TryOn'

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
        <Routes>
          <Route path="/try/:modelId" element={<TryOn />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}