import React, { useState } from 'react';
import Navbar from '../Components/Navbar';
import './MiGaleria.css';

export default function MiGaleria() {
    // Estado para manejar el modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState(null);

    // Funciones del modal
    const abrirModal = (obra) => {
        setObraSeleccionada(obra);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setObraSeleccionada(null);
    };

    // Datos de obras adquiridas (simuladas - después vendrán del backend)
    const obrasAdquiridas = [
        { id: 1, titulo: "La Mona Lisa", autor: "Leonardo da Vinci", anio: 1503, fechaCompra: "2025-01-15", imagen: "https://picsum.photos/300/400?random=1" },
        { id: 4, titulo: "Guernica", autor: "Pablo Picasso", anio: 1937, fechaCompra: "2025-01-20", imagen: "https://picsum.photos/300/400?random=4" },
        { id: 6, titulo: "El Pensador", autor: "Auguste Rodin", anio: 1902, fechaCompra: "2025-02-01", imagen: "https://picsum.photos/300/400?random=6" },
        { id: 9, titulo: "El Beso", autor: "Gustav Klimt", anio: 1908, fechaCompra: "2025-02-10", imagen: "https://picsum.photos/300/400?random=9" },
        { id: 11, titulo: "Las Señoritas de Avignon", autor: "Pablo Picasso", anio: 1907, fechaCompra: "2025-02-15", imagen: "https://picsum.photos/300/400?random=11" },
        { id: 16, titulo: "Mujer con Sombrilla", autor: "Claude Monet", anio: 1875, fechaCompra: "2025-02-20", imagen: "https://picsum.photos/300/400?random=16" },
    ];

    return (
        <div className='mi-galeria-page'>
            <Navbar />
            <main className="main-content">
                <section className="content-section">
                    <h1 className="page-title">Mi Galería</h1>
                    
                    <div className="obras-grid">
                        {obrasAdquiridas.map((obra) => (
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
                                    MI OBRA
                                </div>

                                {/* Overlay de información */}
                                <div className="card-overlay">
                                    <div className="card-title">
                                        {obra.titulo}
                                    </div>
                                    <div className="card-author">
                                        {obra.autor} • {obra.anio}
                                    </div>
                                    <div className="card-purchase-date">
                                        Adquirida: {new Date(obra.fechaCompra).toLocaleDateString('es-ES')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {obrasAdquiridas.length === 0 && (
                        <div className="empty-collection">
                            <h3>Aún no tienes obras en tu colección</h3>
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
                            <p className="modal-fecha-compra">
                                Adquirida el: {new Date(obraSeleccionada.fechaCompra).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            
                            {/* Estado de propiedad */}
                            <div className="modal-propiedad">
                                OBRA DE TU PROPIEDAD
                            </div>
                            
                            {/* Información adicional */}
                            <div className="obra-info-adicional">
                                <p>Esta obra forma parte de tu colección personal. Puedes disfrutarla en cualquier momento desde tu galería privada.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}