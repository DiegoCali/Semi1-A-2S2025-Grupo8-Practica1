import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import './Perfil.css';

export default function Perfil() {
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

    const confirmarAumento = () => {
        // Función vacía - aquí irá la lógica para aumentar saldo
        console.log('Aumentando saldo:', montoAumentar);
        // TODO: Implementar lógica de aumento de saldo
        setMontoAumentar('');
    };

    const limpiarFormulario = () => {
        setMontoAumentar('');
    };


    return (
        <div className='perfil-page'>
            <Navbar/>
            <main className="main-content">
                <div className="perfil-header">
                    <div className="foto-usuario">
                        <img src={usuario.foto} alt={`${usuario.nombre} ${usuario.apellido}`} />
                    </div>
                    <div className="info-usuario">
                        <h1 className="nombre-completo">{usuario.nombre} {usuario.apellido}</h1>
                        <p className="username">@{usuario.username}</p>
                    </div>
                </div>

                {/* Formulario de saldo integrado */}
                <div className="saldo-form">
                    <h3>Saldo Disponible</h3>
                    <p className="saldo-actual">Q.{usuario.saldo.toLocaleString()}</p>
                    
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
        </div>
    );
}