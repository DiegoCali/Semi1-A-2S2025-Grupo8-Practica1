import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../service/users';
import './Navbar.css';

export default function Navbar() {
    const [menuPerfil, setMenuPerfil] = useState(false);
    const [usuario, setUsuario] = useState(null);
    const navigate = useNavigate();
    
    // Cargar datos del usuario del localStorage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUsuario(JSON.parse(userData));
        }

        // Función para recargar datos del usuario desde la API
        const recargarDatosUsuario = async () => {
            try {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    const response = await userService.getUserById(user.id);
                    if (response.success) {
                        setUsuario(response.data);
                        localStorage.setItem('user', JSON.stringify(response.data));
                                }
                }
            } catch (error) {
                console.error('Error recargando datos del usuario:', error);
            }
        };

        // Escuchar evento de actualización de usuario
        const handleUserUpdated = (event) => {
            // En lugar de usar event.detail, recargar desde API para obtener TODOS los datos
            recargarDatosUsuario();
        };

        window.addEventListener('userUpdated', handleUserUpdated);

        // Cleanup del listener
        return () => {
            window.removeEventListener('userUpdated', handleUserUpdated);
        };
    }, []);

    // Función para obtener las iniciales del nombre completo
    const obtenerIniciales = (nombreCompleto) => {
        if (!nombreCompleto) return 'U';
        
        const nombres = nombreCompleto.split(' ');
        if (nombres.length >= 2) {
            return (nombres[0][0] + nombres[nombres.length - 1][0]).toUpperCase();
        }
        return nombreCompleto[0].toUpperCase();
    };

    const toggleMenuPerfil = () => {
        setMenuPerfil(!menuPerfil);
    };

    const cerrarSesion = () => {
        // Limpiar localStorage y redirigir al login
        localStorage.removeItem('user');
        navigate('/login');
    };



    // Si no hay usuario logueado, no mostrar el navbar o mostrar versión básica
    if (!usuario) {
        return (
            <nav className="navbar">
                <div className="navbar-container">
                    <div className="navbar-brand">
                        <Link to="/login">ArtGallery</Link>
                    </div>
                </div>
            </nav>
        );
    }

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
                    <Link to="/cargar-obras" className="nav-link">Subir Obra</Link>
                    <Link to="/mis-compras" className="nav-link">Mis Compras</Link>
                </div>

                {/* Sección de usuario */}
                <div className="navbar-user">
                    <div className="user-saldo">
                        <span className="saldo-label">Saldo:</span>
                        <span className="saldo-amount">Q.{parseFloat(usuario.balance).toLocaleString()}</span>
                    </div>
                    
                    <div className="user-profile" onClick={toggleMenuPerfil}>
                        <div className="user-initials">
                            {obtenerIniciales(usuario.full_name)}
                        </div>
                        <span className="user-name">{usuario.full_name}</span>
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
