import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import { artworkService } from '../service/artworks';
import './MiGaleria.css';

export default function MiGaleria() {
    // Estado para manejar el modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState(null);
    const [obrasCreadas, setObrasCreadas] = useState([]);
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

    // Función para cargar obras creadas
    const cargarObrasCreadas = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Obtener userId del localStorage
            const userData = JSON.parse(localStorage.getItem('user'));
            console.log('User data en mi-galeria:', userData);
            
            // El objeto user tiene la propiedad 'id', no 'user_id'
            let userId = null;
            if (userData) {
                userId = userData.id; // La propiedad correcta es 'id'
                console.log('userId encontrado:', userId);
            }
            
            if (!userData || !userId) {
                console.log('No hay userData o userId válido');
                console.log('userData:', userData);
                setError('Usuario no autenticado');
                setLoading(false);
                return;
            }

            console.log('Llamando a getMyCreatedArtworks con userId:', userId);
            const result = await artworkService.getMyCreatedArtworks(userId);
            console.log('Resultado de getMyCreatedArtworks:', result);
            
            if (result.success) {
                console.log('Obras creadas recibidas:', result.data);
                console.log('Cantidad de obras creadas:', result.data.length);
                setObrasCreadas(result.data);
            } else {
                console.log('Error en result:', result.error);
                setError(result.error || 'Error al cargar tus obras');
            }
        } catch (err) {
            console.error('Error al cargar obras creadas:', err);
            setError('Error al cargar tus obras');
        } finally {
            setLoading(false);
        }
    };

    // Cargar obras al montar el componente
    useEffect(() => {
        cargarObrasCreadas();
    }, []);

    return (
        <div className='mi-galeria-page'>
            <Navbar />
            <main className="main-content">
                <section className="content-section">
                    <h1 className="page-title">Mi Galería</h1>
                    
                    {loading && (
                        <div className="loading-message">
                            <p>Cargando tus obras creadas...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-message">
                            <p>Error: {error}</p>
                            <button onClick={cargarObrasCreadas} className="retry-button">
                                Reintentar
                            </button>
                        </div>
                    )}
                    
                    {!loading && !error && (
                        <div className="obras-grid">
                            {obrasCreadas.map((obra) => (
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
                                        MI CREACIÓN
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
                                            Q.{obra.precio} {obra.disponible ? '(Disponible)' : '(Vendida)'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {!loading && !error && obrasCreadas.length === 0 && (
                        <div className="empty-collection">
                            <h3>Aún no has creado ninguna obra</h3>
                            <p>Ve a "Cargar Obras" para subir tu primera creación artística</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Modal para mostrar detalles de la obra */}
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
                            <p className="modal-autor">Creador: {obraSeleccionada.autor}</p>
                            <p className="modal-anio">Año: {obraSeleccionada.anio}</p>
                            <p className="modal-precio">Precio: ${obraSeleccionada.precio}</p>
                            <p className="modal-disponibilidad">
                                Estado: {obraSeleccionada.disponible ? 'Disponible para venta' : 'Ya vendida'}
                            </p>
                            
                            {/* Estado de propiedad */}
                            <div className="modal-propiedad">
                                TU CREACIÓN ORIGINAL
                            </div>
                            
                            {/* Información adicional */}
                            <div className="obra-info-adicional">
                                <p>Esta es una de tus creaciones originales. 
                                {obraSeleccionada.disponible 
                                    ? ' Está disponible para que otros usuarios la puedan adquirir.' 
                                    : ' Ya ha sido vendida a otro usuario.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}