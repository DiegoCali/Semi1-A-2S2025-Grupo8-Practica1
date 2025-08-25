import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import './EditarPerfil.css';

export default function EditarPerfil() {
    // Estados para el formulario
    const [formData, setFormData] = useState({
        username: "usuario_demo",
        nombreCompleto: "Juan Carlos Pérez García",
        foto: "https://picsum.photos/150/150?random=user"
    });

    const [passwords, setPasswords] = useState({
        actual: '',
        nueva: '',
        confirmar: ''
    });

    const [cambiosRealizados, setCambiosRealizados] = useState(false);
    const [modalConfirmacion, setModalConfirmacion] = useState(false);
    const [campoACambiar, setCampoACambiar] = useState('');
    const [imagenPreview, setImagenPreview] = useState(formData.foto);

    // Manejar cambios en los campos del formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setCambiosRealizados(true);
    };

    // Manejar cambios en las contraseñas
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Manejar cambio de imagen
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImagenPreview(event.target.result);
                setFormData(prev => ({
                    ...prev,
                    foto: event.target.result
                }));
                setCambiosRealizados(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // Abrir modal de confirmación
    const abrirModalConfirmacion = (campo) => {
        setCampoACambiar(campo);
        setModalConfirmacion(true);
    };

    // Cerrar modal
    const cerrarModal = () => {
        setModalConfirmacion(false);
        setCampoACambiar('');
        setPasswords({ actual: '', nueva: '', confirmar: '' });
    };

    // Confirmar cambios
    const confirmarCambios = () => {
        if (!passwords.actual) {
            alert('Debes ingresar tu contraseña actual');
            return;
        }

        // Función vacía - aquí irá la lógica de validación y guardado
        console.log('Guardando cambios para:', campoACambiar);
        console.log('Datos del formulario:', formData);
        console.log('Contraseña actual:', passwords.actual);
        
        // TODO: Implementar lógica de guardado
        
        setCambiosRealizados(false);
        cerrarModal();
        alert('Cambios guardados exitosamente');
    };

    // Cambiar contraseña
    const cambiarContrasena = () => {
        if (!passwords.actual || !passwords.nueva || !passwords.confirmar) {
            alert('Debes completar todos los campos de contraseña');
            return;
        }

        if (passwords.nueva !== passwords.confirmar) {
            alert('Las nuevas contraseñas no coinciden');
            return;
        }

        if (passwords.nueva.length < 6) {
            alert('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        // Función vacía - aquí irá la lógica de cambio de contraseña
        console.log('Cambiando contraseña...');
        // TODO: Implementar lógica de cambio de contraseña
        
        setPasswords({ actual: '', nueva: '', confirmar: '' });
        alert('Contraseña cambiada exitosamente');
    };

    return (
        <div className='editar-perfil-page'>
            <Navbar />
            <main className="main-content">
                <div className="editar-container">
                    <div className="formulario-container">
                        {/* Sección de foto */}
                        <div className="seccion-foto">
                            <h2>Foto de Perfil</h2>
                            <div className="foto-container">
                                <img src={imagenPreview} alt="Foto de perfil" className="foto-preview" />
                                <div className="foto-controls">
                                    <label htmlFor="nueva-foto" className="btn-cambiar-foto">
                                        Cambiar Foto
                                    </label>
                                    <input
                                        type="file"
                                        id="nueva-foto"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />

                                </div>
                            <button 
                                className="btn-guardar-info"
                                onClick={() => abrirModalConfirmacion('foto')}
                            >
                                Actualizar
                            </button>
                            </div>
                            
                      
                        </div>

                        {/* Información personal */}
                        <div className="seccion-info">
                            <h2>Información Personal</h2>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="nombreCompleto">Nombre Completo</label>
                                    <input
                                        type="text"
                                        id="nombreCompleto"
                                        name="nombreCompleto"
                                        value={formData.nombreCompleto}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                 <div className="form-group">
                                    <label htmlFor="username">Usuario</label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                    />
                                </div>

                              
                            </div>
                            
                            {/* Botón siempre visible */}
                            <button 
                                className="btn-guardar-info"
                                onClick={() => abrirModalConfirmacion('informacion')}
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de confirmación */}
            {modalConfirmacion && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-content-confirm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirmar Cambios</h3>
                            <button className="modal-close" onClick={cerrarModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Para confirmar los cambios, ingresa tu contraseña actual:</p>
                            <div className="form-group">
                                <input
                                    type="password"
                                    placeholder="Contraseña actual"
                                    value={passwords.actual}
                                    onChange={handlePasswordChange}
                                    name="actual"
                                    className="input-password-confirm"
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-confirmar-cambios" onClick={confirmarCambios}>
                                    Confirmar Cambios
                                </button>
                                <button className="btn-cancelar-cambios" onClick={cerrarModal}>
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
