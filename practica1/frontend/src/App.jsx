import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Pages/Home'
import Galeria from './Pages/Galeria'
import MiGaleria from './Pages/mi-galeria'
import Perfil from './Pages/perfil'
import EditarPerfil from './Pages/EditarPerfil'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Home />} />
        <Route path="/galeria" element={<Galeria />} />
        <Route path="/mi-galeria" element={<MiGaleria />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/editar-perfil" element={<EditarPerfil />} />
      </Routes>
    </Router>
  )
}

export default App
