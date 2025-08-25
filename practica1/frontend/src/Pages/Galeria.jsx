import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import { artworkService } from '../service/artworks';
import './Galeria.css';

export default function Galeria() {
    // Estado para manejar el modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState(null);
    
    // Estados para las obras y carga
    const [obras, setObras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [purchasing, setPurchasing] = useState(false);
    const [notification, setNotification] = useState(null);

    // Cargar obras al montar el componente
    useEffect(() => {
        cargarObras();
    }, []);

    const cargarObras = async () => {
        setLoading(true);
        setError('');
        
        try {
            const result = await artworkService.getAllArtworks(50, 0); // Cargar 50 obras
            
            if (result.success) {
                if (result.data.length === 0) {
                    console.log('No hay obras disponibles');
                    setObras([]);
                } else {
                    console.log('Obras cargadas:', result.data);
                    setObras(result.data);
                }
            } else {
                console.error('Error del servicio:', result.error);
                setError('Error al cargar las obras: ' + result.error);
                setObras([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
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

    // Funciones del modal (vacías por ahora)
    const abrirModal = (obra) => {
        setObraSeleccionada(obra);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setObraSeleccionada(null);
    };

    const comprarObra = async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Validaciones mejoradas
        if (!user.id) {
            mostrarNotificacion('Debes iniciar sesión para comprar obras', 'error');
            return;
        }

        if (!obraSeleccionada || !obraSeleccionada.disponible) {
            mostrarNotificacion('Esta obra no está disponible', 'error');
            return;
        }

        // Validar que no sea su propia obra
        if (obraSeleccionada.sellerId === user.id) {
            console.log(`Intento de compra bloqueado: Usuario ${user.id} intentó comprar su propia obra ${obraSeleccionada.id}`);
            mostrarNotificacion('No puedes comprar tu propia obra', 'error');
            return;
        }

        // Validar que tenga datos válidos
        if (!obraSeleccionada.id || !user.id) {
            mostrarNotificacion('Error: Datos de usuario u obra inválidos', 'error');
            return;
        }

        setPurchasing(true);
        
        try {
            const result = await artworkService.purchaseArtwork(user.id, obraSeleccionada.id);
            
            if (result.success && result.data && result.data.ok) {
                mostrarNotificacion(`¡Compra exitosa! Has adquirido "${obraSeleccionada.titulo}" por $${obraSeleccionada.precio.toLocaleString()}`, 'success');
                
                // Actualizar el estado local de la obra
                setObras(prevObras => 
                    prevObras.map(obra => 
                        obra.id === obraSeleccionada.id 
                            ? { ...obra, disponible: false }
                            : obra
                    )
                );
                
                // Actualizar obra seleccionada
                setObraSeleccionada(prev => ({ ...prev, disponible: false }));
                
                // Actualizar saldo en localStorage y disparar evento para navbar
                try {
                    const updatedUser = { ...user };
                    const currentBalance = parseFloat(updatedUser.balance || 0);
                    const newBalance = currentBalance - obraSeleccionada.precio;
                    updatedUser.balance = newBalance.toString();
                    
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    // Disparar evento para actualizar Navbar
                    window.dispatchEvent(new CustomEvent('userUpdated'));
                } catch (balanceError) {
                    console.error('Error actualizando saldo local:', balanceError);
                }
                
                // Recargar obras para sincronizar con el servidor
                setTimeout(() => {
                    cargarObras();
                }, 1000);
                
            } else {
                const errorMsg = result.error || result.message || 'Error desconocido en la compra';
                console.error('Error en compra:', errorMsg);
                mostrarNotificacion('Error en la compra: ' + errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error al comprar:', error);
            mostrarNotificacion('Error de conexión al procesar la compra', 'error');
        } finally {
            setPurchasing(false);
        }
    };


    return (
        <div className='galeria-page'>
            <Navbar />
            <main className="main-content">
                <section className="content-section">
                    {/* Mostrar mensaje de error si hay */}
                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                            <button onClick={cargarObras} className="btn-retry">
                                Reintentar
                            </button>
                        </div>
                    )}
                    
                    {/* Mostrar loading */}
                    {loading ? (
                        <div className="loading-container">
                            <p>Cargando obras de arte...</p>
                        </div>
                    ) : (
                        <div className="obras-grid">
                            {obras.map((obra) => (
                                <div
                                    key={obra.id}
                                    className="artwork-card"
                                    onClick={() => abrirModal(obra)}
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url(${obra.imagen})`
                                    }}
                                >
                                    {/* Badge de disponibilidad */}
                                    <div className={`availability-badge ${obra.disponible ? 'available' : 'sold'}`}>
                                        {obra.disponible ? 'DISPONIBLE' : 'VENDIDA'}
                                    </div>

                                    {/* Overlay de información */}
                                    <div className="card-overlay">
                                        <div className="card-title">
                                            {obra.titulo}
                                        </div>
                                        <div className="card-author">
                                            {obra.autor} • {obra.anio}
                                        </div>
                                        <div className="card-price">
                                            ${obra.precio?.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Mostrar mensaje si no hay obras */}
                            {!loading && obras.length === 0 && (
                                <div className="no-obras">
                                    <p>No hay obras disponibles en este momento.</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Modal para mostrar detalles y comprar obra */}
            {modalAbierto && obraSeleccionada && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        {/* Botón para cerrar */}
                        <button className="modal-close" onClick={cerrarModal}>×</button>
                        
                        {/* Imagen de la obra */}
                        <div className="modal-image">
                            <img src={obraSeleccionada.imagen} alt={obraSeleccionada.titulo} />
                        </div>
                        
                        {/* Información de la obra */}
                        <div className="modal-info">
                            <h2 className="modal-titulo">{obraSeleccionada.titulo}</h2>
                            <p className="modal-autor">Autor: {obraSeleccionada.autor}</p>
                            <p className="modal-anio">Año: {obraSeleccionada.anio}</p>
                            <p className="modal-precio">${obraSeleccionada.precio.toLocaleString()}</p>
                            
                            {/* Estado de disponibilidad */}
                            <div className={`modal-disponibilidad ${obraSeleccionada.disponible ? 'disponible' : 'vendida'}`}>
                                {obraSeleccionada.disponible ? 'DISPONIBLE' : 'VENDIDA'}
                            </div>
                            
                            {/* Botón de compra */}
                            {(() => {
                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                const esMiObra = obraSeleccionada.sellerId === user.id;
                                
                                if (esMiObra) {
                                    return (
                                        <button className="btn-mi-obra" disabled>
                                            TU OBRA
                                        </button>
                                    );
                                } else if (obraSeleccionada.disponible) {
                                    return (
                                        <button 
                                            className="btn-comprar" 
                                            onClick={comprarObra}
                                            disabled={purchasing}
                                        >
                                            {purchasing ? 'PROCESANDO...' : 'ADQUIRIR OBRA'}
                                        </button>
                                    );
                                } else {
                                    return (
                                        <button className="btn-no-disponible" disabled>
                                            NO DISPONIBLE
                                        </button>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>
            )}

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
