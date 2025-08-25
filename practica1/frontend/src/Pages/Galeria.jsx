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
                console.log('Obras cargadas desde API:', result.data.length);
                
                if (result.data.length === 0) {
                    console.log('API devuelve array vacío, usando datos de prueba');
                   
                } else {
                    console.log('Obras reales cargadas:', result.data);
                    setObras(result.data);
                }
            } else {
                console.error('Error del servicio:', result.error);
                setError('Error al cargar las obras: ' + result.error);
                // Fallback a datos de prueba
                setObras(obrasDeArteFalsas);
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
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
            alert('Debes iniciar sesión para comprar obras');
            return;
        }

        if (!obraSeleccionada || !obraSeleccionada.disponible) {
            alert('Esta obra no está disponible');
            return;
        }

        // Validar que no sea su propia obra
        if (obraSeleccionada.sellerId === user.id) {
            alert('No puedes comprar tu propia obra');
            return;
        }

        // Validar que tenga datos válidos
        if (!obraSeleccionada.id || !user.id) {
            alert('Error: Datos de usuario u obra inválidos');
            return;
        }

        setPurchasing(true);
        
        try {
            console.log('Iniciando compra:', {
                buyerId: user.id,
                artworkId: obraSeleccionada.id,
                precio: obraSeleccionada.precio
            });

            const result = await artworkService.purchaseArtwork(user.id, obraSeleccionada.id);
            
            console.log('Respuesta de compra:', result);
            
            if (result.success && result.data && result.data.ok) {
                alert(`¡Compra exitosa! Has adquirido "${obraSeleccionada.titulo}" por $${obraSeleccionada.precio.toLocaleString()}`);
                
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
                
                // Recargar obras para sincronizar con el servidor
                setTimeout(() => {
                    cargarObras();
                }, 1000);
                
            } else {
                const errorMsg = result.error || result.message || 'Error desconocido en la compra';
                console.error('Error en compra:', errorMsg);
                alert('Error en la compra: ' + errorMsg);
            }
        } catch (error) {
            console.error('Error al comprar:', error);
            alert('Error de conexión al procesar la compra');
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
                            {obraSeleccionada.disponible ? (
                                <button 
                                    className="btn-comprar" 
                                    onClick={comprarObra}
                                    disabled={purchasing}
                                >
                                    {purchasing ? 'PROCESANDO...' : 'ADQUIRIR OBRA'}
                                </button>
                            ) : (
                                <button className="btn-no-disponible" disabled>
                                    NO DISPONIBLE
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
