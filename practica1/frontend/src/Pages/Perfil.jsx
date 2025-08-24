import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import './Perfil.css';

export default function Perfil() {
    const [modalAumentar, setModalAumentar] = useState(false);
    const [montoAumentar, setMontoAumentar] = useState('');

    // Datos de usuario simulados (después vendrán del estado global)
    const usuario = {
        id: 1,
        username: "usuario_demo",
        nombre: "Juan Carlos",
        apellido: "Pérez García",
        email: "juan.perez@artgallery.com",
        foto: "https://picsum.photos/150/150?random=user",
        saldo: 150000,
        fechaRegistro: "2024-08-15",
        obrasAdquiridas: 6
    };


    // Funciones (vacías por ahora)
    const abrirModalAumentar = () => {
        setModalAumentar(true);
    };

    const cerrarModalAumentar = () => {
        setModalAumentar(false);
        setMontoAumentar('');
    };

    const confirmarAumento = () => {
        // Función vacía - aquí irá la lógica para aumentar saldo
        console.log('Aumentando saldo:', montoAumentar);
        // TODO: Implementar lógica de aumento de saldo
        cerrarModalAumentar();
    };

    const editarPerfil = () => {
        // Función vacía - aquí irá la lógica para editar perfil
        console.log('Redirigiendo a edición de perfil');
    }


    return (
        <div className='perfil-page'>
            <Navbar />
            <main className="main-content">
                <div className="perfil-container">
                    {/* Información principal del usuario */}
                    <div className="perfil-header">
                        <div className="foto-usuario">
                            <img src={usuario.foto} alt={`${usuario.nombre} ${usuario.apellido}`} />
                        </div>
                        <div className="info-usuario">
                            <h1 className="nombre-completo">{usuario.nombre} {usuario.apellido}</h1>
                            <p className="username">@{usuario.username}</p>
                            <p className="email">{usuario.email}</p>
                            <p className="fecha-registro">
                                Miembro desde: {new Date(usuario.fechaRegistro).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Saldo y estadísticas */}
                    <div className="perfil-stats">
                        <div className="stat-card saldo-card">
                            <h3>Saldo Disponible</h3>
                            <p className="saldo-amount">${usuario.saldo.toLocaleString()}</p>
                            <button className="btn-aumentar" onClick={abrirModalAumentar}>
                                Aumentar Saldo
                            </button>
                        </div>
                        <button className="btn-aumentar" onClick={editarPerfil}>
                                Editar Perfil
                        </button>
                    </div>

                 

                   
                       
                </div>
            </main>

            {/* Modal para aumentar saldo */}
            {modalAumentar && (
                <div className="modal-overlay" onClick={cerrarModalAumentar}>
                    <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Aumentar Saldo</h3>
                            <button className="modal-close" onClick={cerrarModalAumentar}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Ingresa el monto que deseas agregar a tu saldo:</p>
                            <div className="input-group">
                                <span className="input-symbol">$</span>
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
                                            className="btn-sugerido"
                                            onClick={() => setMontoAumentar(monto.toString())}
                                        >
                                            ${monto.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn-confirmar" onClick={confirmarAumento} disabled={!montoAumentar}>
                                    Confirmar Aumento
                                </button>
                                <button className="btn-cancelar" onClick={cerrarModalAumentar}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}