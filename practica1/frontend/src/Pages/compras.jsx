import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import { artworkService } from '../service/artworks';
import './compras.css';

export default function Compras() {
    // Estado para manejar el modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState(null);
    const [obrasCompradas, setObrasCompradas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Funciones del modal
    const abrirModal = (obra) => {
        setObraSeleccionada(obra);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setObraSeleccionada(null);
    };

    // Función para cargar obras compradas
    const cargarObrasCompradas = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Obtener userId del localStorage
            const userData = JSON.parse(localStorage.getItem('user'));
            console.log('User data:', userData);

            if (!userData || !userData.id) {
                setError('Usuario no autenticado');
                setLoading(false);
                return;
            }

            const result = await artworkService.getMyPurchasedArtworks(userData.id);
            
            if (result.success) {
                console.log('Obras compradas recibidas:', result.data);
                console.log('Cantidad de obras compradas:', result.data.length);
                setObrasCompradas(result.data);
            } else {
                setError(result.error || 'Error al cargar las obras compradas');
            }
        } catch (err) {
            console.error('Error al cargar obras compradas:', err);
            setError('Error al cargar las obras compradas');
        } finally {
            setLoading(false);
        }
    };

    // Cargar obras al montar el componente
    useEffect(() => {
        cargarObrasCompradas();
    }, []);

    return (
        <div className='mi-galeria-page'>
            <Navbar />
            <main className="main-content">
                <section className="content-section">
                    <h1 className="page-title">Mis Compras</h1>
                    
                    {loading && (
                        <div className="loading-message">
                            <p>Cargando tus obras compradas...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-message">
                            <p>Error: {error}</p>
                            <button onClick={cargarObrasCompradas} className="retry-button">
                                Reintentar
                            </button>
                        </div>
                    )}
                    
                    {!loading && !error && (
                        <div className="obras-grid">
                            {obrasCompradas.map((obra) => (
                                <div
                                    key={obra.id}
                                    className="artwork-card"
                                    onClick={() => abrirModal(obra)}
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url(${obra.imagen})`
                                    }}
                                >
                                    {/* Badge de propiedad */}
                                    <div className="ownership-badge">
                                        COMPRADA
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
                                            Q.{obra.precio}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {!loading && !error && obrasCompradas.length === 0 && (
                        <div className="empty-collection">
                            <h3>Aún no tienes obras compradas</h3>
                            <p>Explora la galería principal para adquirir tu primera obra de arte</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Modal para mostrar detalles de la obra (SIN opción de compra) */}
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
                            <p className="modal-precio">Precio pagado: ${obraSeleccionada.precio}</p>
                            
                            {/* Estado de propiedad */}
                            <div className="modal-propiedad">
                                OBRA COMPRADA - DE TU PROPIEDAD
                            </div>
                            
                            {/* Información adicional */}
                            <div className="obra-info-adicional">
                                <p>Esta obra fue adquirida mediante compra y ahora forma parte de tu colección personal.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}