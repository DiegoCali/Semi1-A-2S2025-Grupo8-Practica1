import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import { userService } from '../service/users';
import { notificationHelpers } from '../utils/notificationHelpers';
import './Perfil.css';

export default function Perfil() {
    const [montoAumentar, setMontoAumentar] = useState('');
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        cargarDatosUsuario();
        cargarFotoUsuario();
    }, []);

    const cargarDatosUsuario = async () => {
        setLoading(true);
        setError('');
        
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }

            const user = JSON.parse(userData);
            
            // Obtener datos actualizados del servidor
            const result = await userService.getUserById(user.id);
            
            if (result.success) {
                // Verificar si ya hay foto cargada desde localStorage
                const cachedPhoto = localStorage.getItem('photo');
                const updatedUser = {
                    ...result.data,
                    photo_url: cachedPhoto || result.data.photo_url
                };
                
                setUsuario(updatedUser);
                localStorage.setItem('user', JSON.stringify(result.data));
            } else {
                setError('Error al cargar datos del usuario');
                setUsuario(user); 
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const cargarFotoUsuario = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;

            const user = JSON.parse(userData);
            
            // Primero verificar si ya existe la foto en localStorage
            const cachedPhoto = localStorage.getItem('photo');
            console.log('Foto en caché:', cachedPhoto);
            if (cachedPhoto) {
                setUsuario((prev) => ({ ...prev, photo_url: cachedPhoto }));
                return;
            }

            // Si no está en localStorage, hacer la petición al backend
            const result = await userService.getUserPhoto(user.id);
            if (result.success) {
                localStorage.setItem(`photo`, result.url);
                setUsuario((prev) => ({ ...prev, photo_url: result.url }));
            } else {
                console.error('Error al cargar la foto del usuario:', result.error);
            }
        } catch (error) {
            console.error('Error al cargar la foto del usuario:', error);
        }
    };

    const obtenerIniciales = (nombreCompleto) => {
        if (!nombreCompleto) return 'U';
        const nombres = nombreCompleto.split(' ');
        if (nombres.length >= 2) {
            return (nombres[0][0] + nombres[nombres.length - 1][0]).toUpperCase();
        }
        return nombreCompleto[0].toUpperCase();
    };

    // Mostrar notificación
    const mostrarNotificacion = (mensaje, tipo) => {
        setNotification({ mensaje, tipo });
        
        // Auto-hide después de 4 segundos
        setTimeout(() => {
            if (document.querySelector('.notification')) {
                document.querySelector('.notification').classList.add('slide-out');
                setTimeout(() => setNotification(null), 300);
            }
        }, 4000);
    };

    const confirmarAumento = async () => {
        if (!montoAumentar || parseFloat(montoAumentar) <= 0) {
            mostrarNotificacion('Por favor ingresa una cantidad válida mayor a 0', 'error');
            return;
        }

        try {
            const result = await userService.addBalance(usuario.id, parseFloat(montoAumentar));
            
            if (result.success && result.data.ok) {
                mostrarNotificacion(`Saldo agregado exitosamente! Nuevo saldo: $${parseFloat(result.data.balance).toLocaleString()}`, 'success');
                setMontoAumentar('');
                
                // Actualizar notificaciones inmediatamente
                setTimeout(() => {
                    notificationHelpers.refreshNotifications();
                }, 1000);
                
                // Recargar datos del usuario
                cargarDatosUsuario();
                // Disparar evento para actualizar Navbar
                window.dispatchEvent(new CustomEvent('userUpdated'));
            } else {
                mostrarNotificacion('Error al agregar saldo: ' + (result.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error al agregar saldo:', error);
            mostrarNotificacion('Error de conexión al agregar saldo', 'error');
        }
    };

    const limpiarFormulario = () => {
        setMontoAumentar('');
    };

    // Mostrar loading
    if (loading) {
        return (
            <div className='perfil-page'>
                <Navbar/>
                <main className="main-content">
                    <div className="loading-container">
                        <p>Cargando perfil...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Mostrar error si no hay usuario
    if (!usuario) {
        return (
            <div className='perfil-page'>
                <Navbar/>
                <main className="main-content">
                    <div className="error-container">
                        <p>Error al cargar el perfil</p>
                        <button onClick={cargarDatosUsuario}>Reintentar</button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className='perfil-page'>
            <Navbar/>
            {error && (
                <div className="error-banner">
                    <p>{error}</p>
                </div>
            )}
            <main className="main-content">
                <div className="perfil-header">
                    <div className="foto-usuario">
                        {usuario.photo_url ? (
                            <img src={usuario.photo_url} alt={usuario.full_name} />
                        ) : (
                            <div className="avatar-iniciales">
                                {obtenerIniciales(usuario.full_name)}
                            </div>
                        )}
                    </div>
                    <div className="info-usuario">
                        <h1 className="nombre-completo">{usuario.full_name}</h1>
                        <p className="username">@{usuario.username}</p>
                    </div>
                </div>

                {/* Formulario de saldo integrado */}
                <div className="saldo-form">
                    <h3>Saldo Disponible</h3>
                    <p className="saldo-actual">Q.{parseFloat(usuario.balance || 0).toLocaleString()}</p>
                    
                    <p>Ingresa el monto que deseas agregar a tu saldo:</p>
                    <div className="input-group">
                        <input
                            type="number"
                            placeholder="0"
                            value={montoAumentar}
                            onChange={(e) => setMontoAumentar(e.target.value)}
                            className="input-monto"
                            min="1"
                        />
                    </div>
                    
                    <div className="montos-sugeridos">
                        <p>Montos sugeridos:</p>
                        <div className="sugeridos-grid">
                            {[10000, 25000, 50000, 100000].map(monto => (
                                <button 
                                    key={monto}
                                    className={`btn-sugerido ${montoAumentar === monto.toString() ? 'active' : ''}`}
                                    onClick={() => setMontoAumentar(monto.toString())}
                                >
                                    Q.{monto.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            className="btn-confirmar" 
                            onClick={confirmarAumento} 
                            disabled={!montoAumentar}
                        >
                            Confirmar Aumento
                        </button>
                        <button 
                            className="btn-cancelar" 
                            onClick={limpiarFormulario}
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            </main>

            {/* Notificación flotante */}
            {notification && (
                <div className={`notification ${notification.tipo}`}>
                    <div className="notification-content">
                        <span className="notification-message">
                            {notification.mensaje}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}