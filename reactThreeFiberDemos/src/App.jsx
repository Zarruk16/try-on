import { Routes, Route, BrowserRouter as Router } from 'react-router-dom'
import './index.css'

import Home from './js/components/Home'
import TryOn from './js/demos/TryOn'


export default function App(){
  return (
    <Router>
      <Routes>
        <Route path="/try/:modelId" element={<TryOn />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  )
}