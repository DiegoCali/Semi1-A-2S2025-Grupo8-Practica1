import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
    const [menuPerfil, setMenuPerfil] = useState(false);
    
    // Datos de usuario simulados (después vendrán del estado global)
    const usuario = {
        nombre: "Usuario Demo",
        saldo: 150000,
        foto: "https://picsum.photos/40/40?random=user"
    };

    const toggleMenuPerfil = () => {
        setMenuPerfil(!menuPerfil);
    };

    const cerrarSesion = () => {
        // Función vacía - aquí irá la lógica de cerrar sesión
        console.log('Cerrando sesión...');
        // TODO: Implementar lógica de cierre de sesión
    };

    const aumentarSaldo = () => {
        // Función vacía - aquí irá la lógica para aumentar saldo
        console.log('Aumentando saldo...');
        // TODO: Implementar lógica para aumentar saldo
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo/Brand */}
                <div className="navbar-brand">
                    <Link to="/galeria">ArtGallery</Link>
                </div>

                {/* Links principales */}
                <div className="navbar-links">
                    <Link to="/galeria" className="nav-link">Galería</Link>
                    <Link to="/mi-galeria" className="nav-link">Mis Obras</Link>
                </div>

                {/* Sección de usuario */}
                <div className="navbar-user">
                    <div className="user-saldo">
                        <span className="saldo-label">Saldo:</span>
                        <span className="saldo-amount">${usuario.saldo.toLocaleString()}</span>
                    </div>
                    
                    <div className="user-profile" onClick={toggleMenuPerfil}>
                        <img src={usuario.foto} alt="Perfil" className="user-avatar" />
                        <span className="user-name">{usuario.nombre}</span>
                        <span className={`dropdown-arrow ${menuPerfil ? 'open' : ''}`}>▼</span>
                    </div>

                    {/* Menú desplegable del perfil */}
                    {menuPerfil && (
                        <div className="profile-dropdown">
                            <Link to="/perfil" className="dropdown-item">
                                Perfil
                            </Link>
                            <Link to="/editar-perfil" className="dropdown-item">
                                Editar Perfil
                            </Link>
                            <div className="dropdown-divider"></div>
                           
                            <button onClick={cerrarSesion} className="dropdown-item dropdown-button logout">
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
