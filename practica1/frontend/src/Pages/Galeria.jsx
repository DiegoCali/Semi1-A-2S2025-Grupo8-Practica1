import React, { useState } from 'react';
import Navbar from '../Components/Navbar';
import './Galeria.css';

export default function Galeria() {
    // Estado para manejar el modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState(null);

    // Funciones del modal (vacías por ahora)
    const abrirModal = (obra) => {
        setObraSeleccionada(obra);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setObraSeleccionada(null);
    };

    const comprarObra = () => {
        // Función vacía - aquí irá la lógica de compra
        console.log('Comprando obra:', obraSeleccionada.titulo);
        // TODO: Implementar lógica de compra
    };

    // Datos falsos para pruebas
    const obrasDeArteFalsas = [
        { id: 1, titulo: "La Mona Lisa", autor: "Leonardo da Vinci", anio: 1503, precio: 50000, disponible: true, imagen: "https://picsum.photos/300/400?random=1" },
        { id: 2, titulo: "La Noche Estrellada", autor: "Vincent van Gogh", anio: 1889, precio: 75000, disponible: false, imagen: "https://picsum.photos/300/400?random=2" },
        { id: 3, titulo: "El Grito", autor: "Edvard Munch", anio: 1893, precio: 45000, disponible: true, imagen: "https://picsum.photos/300/400?random=3" },
        { id: 4, titulo: "Guernica", autor: "Pablo Picasso", anio: 1937, precio: 80000, disponible: true, imagen: "https://picsum.photos/300/400?random=4" },
        { id: 5, titulo: "Las Meninas", autor: "Diego Velázquez", anio: 1656, precio: 65000, disponible: false, imagen: "https://picsum.photos/300/400?random=5" },
        { id: 6, titulo: "El Pensador", autor: "Auguste Rodin", anio: 1902, precio: 35000, disponible: true, imagen: "https://picsum.photos/300/400?random=6" },
        { id: 7, titulo: "La Persistencia de la Memoria", autor: "Salvador Dalí", anio: 1931, precio: 55000, disponible: true, imagen: "https://picsum.photos/300/400?random=7" },
        { id: 8, titulo: "Girl with a Pearl Earring", autor: "Johannes Vermeer", anio: 1665, precio: 40000, disponible: false, imagen: "https://picsum.photos/300/400?random=8" },
        { id: 9, titulo: "El Beso", autor: "Gustav Klimt", anio: 1908, precio: 60000, disponible: true, imagen: "https://picsum.photos/300/400?random=9" },
        { id: 10, titulo: "American Gothic", autor: "Grant Wood", anio: 1930, precio: 30000, disponible: true, imagen: "https://picsum.photos/300/400?random=10" },
        { id: 11, titulo: "Las Señoritas de Avignon", autor: "Pablo Picasso", anio: 1907, precio: 70000, disponible: true, imagen: "https://picsum.photos/300/400?random=11" },
        { id: 12, titulo: "El Nacimiento de Venus", autor: "Sandro Botticelli", anio: 1485, precio: 85000, disponible: false, imagen: "https://picsum.photos/300/400?random=12" },
        { id: 13, titulo: "La Última Cena", autor: "Leonardo da Vinci", anio: 1498, precio: 90000, disponible: true, imagen: "https://picsum.photos/300/400?random=13" },
        { id: 14, titulo: "Los Girasoles", autor: "Vincent van Gogh", anio: 1888, precio: 55000, disponible: true, imagen: "https://picsum.photos/300/400?random=14" },
        { id: 15, titulo: "La Creación de Adán", autor: "Miguel Ángel", anio: 1512, precio: 95000, disponible: false, imagen: "https://picsum.photos/300/400?random=15" },
        { id: 16, titulo: "Mujer con Sombrilla", autor: "Claude Monet", anio: 1875, precio: 42000, disponible: true, imagen: "https://picsum.photos/300/400?random=16" },
        { id: 17, titulo: "El Jardín de las Delicias", autor: "El Bosco", anio: 1515, precio: 78000, disponible: true, imagen: "https://picsum.photos/300/400?random=17" },
        { id: 18, titulo: "La Gran Ola", autor: "Katsushika Hokusai", anio: 1831, precio: 48000, disponible: false, imagen: "https://picsum.photos/300/400?random=18" },
        { id: 19, titulo: "Almuerzo sobre la Hierba", autor: "Édouard Manet", anio: 1863, precio: 52000, disponible: true, imagen: "https://picsum.photos/300/400?random=19" },
        { id: 20, titulo: "La Libertad Guiando al Pueblo", autor: "Eugène Delacroix", anio: 1830, precio: 67000, disponible: true, imagen: "https://picsum.photos/300/400?random=20" },
    ];

    return (
        <div className='galeria-page'>
            <Navbar />
            <main className="main-content">
                <section className="content-section">
                    <div className="obras-grid">
                        {obrasDeArteFalsas.map((obra) => (
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
                                        ${obra.precio}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                                <button className="btn-comprar" onClick={comprarObra}>
                                    ADQUIRIR OBRA
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
