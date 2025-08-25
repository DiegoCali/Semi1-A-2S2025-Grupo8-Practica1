import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import { artworkService } from '../service/artworks';
import './cargarObras.css';

export default function CargarObras() {
    const navigate = useNavigate();
    
    // Estados para el formulario
    const [formData, setFormData] = useState({
        imagen: null,
        nombre: '',
        precio: ''
    });

    // Estados para la UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imagenPreview, setImagenPreview] = useState(null);
    const [notification, setNotification] = useState(null);

    // Obtener ID del usuario desde localStorage
    const obtenerUserId = () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/login');
            return null;
        }
        return JSON.parse(userData).id;
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

    // Manejar cambio de imagen
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tipo de archivo
            if (!file.type.startsWith('image/')) {
                mostrarNotificacion('Por favor selecciona un archivo de imagen válido', 'error');
                return;
            }

            // Validar tamaño (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                mostrarNotificacion('La imagen no puede ser mayor a 10MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setImagenPreview(event.target.result);
                setFormData(prev => ({
                    ...prev,
                    imagen: file
                }));
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    // Manejar cambio de inputs de texto
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Manejar cambio de precio
    const handlePrecioChange = (e) => {
        const valor = e.target.value;
        // Permitir solo números y punto decimal
        if (valor === '' || /^\d*\.?\d*$/.test(valor)) {
            setFormData(prev => ({
                ...prev,
                precio: valor
            }));
        }
    };

    // Limpiar formulario
    const limpiarFormulario = () => {
        setFormData({
            imagen: null,
            nombre: '',
            precio: ''
        });
        setImagenPreview(null);
        setError('');
        setSuccess('');
        
        // Limpiar input de archivo
        const fileInput = document.getElementById('imagen-input');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    // Subir obra
    const subirObra = async () => {
        // Validaciones
        if (!formData.imagen) {
            mostrarNotificacion('Por favor selecciona una imagen', 'error');
            return;
        }

        if (!formData.nombre.trim()) {
            mostrarNotificacion('Por favor ingresa el nombre de la obra', 'error');
            return;
        }

        if (!formData.precio || parseFloat(formData.precio) < 0) {
            mostrarNotificacion('Por favor ingresa un precio válido (mayor o igual a 0)', 'error');
            return;
        }

        const userId = obtenerUserId();
        if (!userId) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await artworkService.uploadArtwork(
                formData.imagen,
                userId,
                parseFloat(formData.precio),
                formData.nombre
            );

            if (result.success) {
                mostrarNotificacion(`¡Obra "${result.data.name}" subida exitosamente!`, 'success');
                setTimeout(() => {
                    limpiarFormulario();
                }, 2000);
            } else {
                mostrarNotificacion(result.error || 'Error al subir la obra', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error de conexión al subir la obra', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='cargar-obras-page'>
            <Navbar />
            <main className="main-content">
                <div className="cargar-obras-container">
                    <div className="formulario-container">
                        <h1>Subir Nueva Obra de Arte</h1>
                        <p className="descripcion">
                            Comparte tu arte con el mundo. Sube tu obra y establece un precio para la venta.
                        </p>

                        {/* Sección de imagen */}
                        <div className="seccion-imagen">
                            <h3>Imagen de la Obra</h3>
                            <div className="imagen-upload-container">
                                {imagenPreview ? (
                                    <div className="imagen-preview">
                                        <img src={imagenPreview} alt="Preview" />
                                        <button 
                                            className="btn-cambiar-imagen"
                                            onClick={() => document.getElementById('imagen-input').click()}
                                        >
                                            Cambiar Imagen
                                        </button>
                                    </div>
                                ) : (
                                    <div className="imagen-placeholder" onClick={() => document.getElementById('imagen-input').click()}>
                                        <div className="placeholder-content">
                                            <span className="upload-icon">📸</span>
                                            <p>Haz clic para seleccionar una imagen</p>
                                            <small>Formatos: JPG, PNG (máximo 5MB)</small>
                                        </div>
                                    </div>
                                )}
                                <input
                                    id="imagen-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Sección de información de la obra */}
                        <div className="seccion-info">
                            <h3>Información de la Obra</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="nombre">Nombre de la Obra</label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        placeholder="Ej: La Noche Estrellada"
                                        className="input-obra"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección de precio */}
                        <div className="seccion-precio">
                            <h3>Precio de Venta</h3>
                            <div className="precio-input-container">
                                <span className="currency-symbol">Q.</span>
                                <input
                                    type="text"
                                    value={formData.precio}
                                    onChange={handlePrecioChange}
                                    placeholder="0.00"
                                    className="precio-input"
                                />
                            </div>
                            <small className="precio-help">
                                Establece el precio en Quetzales. Puedes usar 0 para obras gratuitas.
                            </small>
                        </div>

                        {/* Botones de acción */}
                        <div className="form-actions">
                            <button 
                                className="btn-subir-obra"
                                onClick={subirObra}
                                disabled={loading || !formData.imagen || !formData.precio}
                            >
                                {loading ? 'Subiendo...' : 'Subir Obra'}
                            </button>
                            <button 
                                className="btn-limpiar"
                                onClick={limpiarFormulario}
                                disabled={loading}
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Notificación flotante */}
            {notification && (
                <div className={`notification ${notification.tipo}`}>
                    <div className="notification-content">
                        <span className="notification-icon">
                            {notification.tipo === 'success' ? '✅' : '❌'}
                        </span>
                        <span className="notification-message">
                            {notification.mensaje}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}