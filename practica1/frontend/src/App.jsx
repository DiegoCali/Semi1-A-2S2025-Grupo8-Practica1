import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Pages/Home'
import Galeria from './Pages/Galeria'
import MiGaleria from './Pages/mi-galeria'
import Perfil from './Pages/Perfil'
import EditarPerfil from './Pages/EditarPerfil'
import CargarObras from './Pages/cargarObras'
import Compras from './Pages/compras'
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
        <Route path="/cargar-obras" element={<CargarObras />} />
        <Route path="/compras" element={<Compras />} />
      </Routes>
    </Router>
  )
}

export default App
