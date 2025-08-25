import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import { userService } from '../service/users';
import './EditarPerfil.css';

export default function EditarPerfil() {
    const navigate = useNavigate();
    
    // Estados para el formulario (datos reales del usuario)
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        phone: '',
        email: '',
        photo: null
    });

    // Estado para manejar contraseñas
    const [passwords, setPasswords] = useState({
        current_password: ''
    });



    // Estados de la UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userData, setUserData] = useState(null);
    const [modalConfirmacion, setModalConfirmacion] = useState(false);
    const [campoACambiar, setCampoACambiar] = useState('');
    const [imagenPreview, setImagenPreview] = useState(null);

    // Cargar datos del usuario al iniciar
    useEffect(() => {
        cargarDatosUsuario();
    }, []);

    // Cargar foto cuando los datos del usuario estén listos
    useEffect(() => {
        if (userData?.id) {
            cargarFotoUsuario();
        }
    }, [userData]);

    const cargarDatosUsuario = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.id) {
                navigate('/login');
                return;
            }

            const response = await userService.getUserById(user.id);
            if (response.success) {
                setUserData(response.data);
                setFormData({
                    username: response.data.username || '',
                    full_name: response.data.full_name || '',
                    phone: response.data.phone || '',
                    email: response.data.email || '',
                    photo: null
                });
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            setError('Error cargando los datos del usuario');
        }
    };

    const cargarFotoUsuario = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.id) {
                console.log('No hay usuario en localStorage');
                return;
            }

            console.log('Cargando foto para usuario:', user.id);

            // Primero verificar si el usuario tiene photo_url en localStorage
            if (user.photo_url) {
                console.log('Foto encontrada en localStorage:', user.photo_url);
                setImagenPreview(user.photo_url);
                return;
            }

            // Si no tiene foto en localStorage, intentar cargar desde la API
            console.log('Buscando foto en API...');
            const result = await userService.getUserPhoto(user.id);

            if (result.success && result.url) {
                console.log('Foto cargada desde API:', result.url);
                setImagenPreview(result.url);
                
                // Actualizar localStorage con la foto
                const updatedUser = { ...user, photo_url: result.url };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                // No mostrar error si simplemente no tiene foto (404 es normal)
                console.log('Usuario no tiene foto de perfil (esto es normal)');
                setImagenPreview(null);
            }
        } catch (error) {
            // No mostrar error si es 404 (usuario sin foto)
            if (error.message?.includes('404') || error.status === 404) {
                console.log('Usuario no tiene foto de perfil (esto es normal)');
                setImagenPreview(null);
            } else {
                console.error('Error al cargar la foto del usuario:', error);
            }
        }
    };

    const obtenerIniciales = (fullName) => {
        if (!fullName) return 'U';
        return fullName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Manejar cambios en los campos del formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
                    photo: file  // Guardamos el archivo, no la URL
                }));
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
        setError('');
        setSuccess('');
        // Limpiar contraseña cuando se cierre el modal
        setPasswords({
            current_password: ''
        });
    };

    // Confirmar cambios
    const confirmarCambios = async () => {
        if (!passwords.current_password) {
            setError('Debes ingresar tu contraseña actual');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const user = JSON.parse(localStorage.getItem('user'));

            if (campoACambiar === 'foto') {
                // Subir foto usando POST /users/:id/photo
                const response = await userService.uploadPhoto(user.id, formData.photo);
                if (response.success) {
                    setSuccess('Foto actualizada exitosamente');
                    // Actualizar datos del usuario con datos frescos de la API
                    const updatedUser = await userService.getUserById(user.id);
                    if (updatedUser.success) {
                        localStorage.setItem('user', JSON.stringify(updatedUser.data));
                        setUserData(updatedUser.data);
                        if (updatedUser.data.photo_url) {
                            setImagenPreview(updatedUser.data.photo_url);
                        }
                        // Disparar evento para actualizar Navbar
                        window.dispatchEvent(new CustomEvent('userUpdated'));
                        
                    }
                } else {
                    setError(response.message || 'Error al actualizar la foto');
                }
            } else if (campoACambiar === 'informacion') {
                // Actualizar información usando PUT /users/:id
                const updateData = {
                    username: formData.username,
                    full_name: formData.full_name,
                    current_password: passwords.current_password
                };

                const response = await userService.updateProfile(user.id, updateData);
                if (response.success) {
                    setSuccess('Información actualizada exitosamente');
                    // Actualizar localStorage con datos frescos de la API
                    const updatedUser = await userService.getUserById(user.id);
                    if (updatedUser.success) {
                        localStorage.setItem('user', JSON.stringify(updatedUser.data));
                        setUserData(updatedUser.data);
                        // Actualizar formData con los nuevos datos
                        setFormData(prev => ({
                            ...prev,
                            username: updatedUser.data.username || '',
                            full_name: updatedUser.data.full_name || ''
                        }));
                        // Disparar evento para actualizar Navbar
                        window.dispatchEvent(new CustomEvent('userUpdated'));
                      
                    }
                } else {
                    setError(response.message || 'Error al actualizar la información');
                }
            }
            
            cerrarModal();
        } catch (error) {
            console.error('Error:', error);
            setError('Error interno del servidor');
        } finally {
            setLoading(false);
        }
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
                                {/* Debug temporal - se puede remover después */}
                                {console.log('Estado imagenPreview al renderizar:', imagenPreview)}
                                {imagenPreview ? (
                                    <img 
                                        src={imagenPreview} 
                                        alt="Foto de perfil" 
                                        className="foto-preview"
                                        onLoad={() => console.log('Imagen cargada exitosamente:', imagenPreview)}
                                        onError={() => console.error('Error cargando imagen:', imagenPreview)}
                                    />
                                ) : (
                                    <div className="avatar-iniciales">
                                        {obtenerIniciales(userData?.full_name || 'Usuario')}
                                    </div>
                                )}
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
                                        disabled={loading}
                                    >
                                        {loading ? 'Actualizando...' : 'Actualizar'}
                                    </button>
                            
                            </div>
                            
                      
                        </div>

                        {/* Información personal */}
                        <div className="seccion-info">
                            <h2>Información Personal</h2>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="full_name">Nombre Completo</label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
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
                                Guardar Cambios de Información
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
                            {error && <p className="error-message">{error}</p>}
                            {success && <p className="success-message">{success}</p>}
                            <p>Para confirmar los cambios, ingresa tu contraseña actual:</p>
                            <div className="form-group">
                                <input
                                    type="password"
                                    placeholder="Contraseña actual"
                                    value={passwords.current_password}
                                    onChange={handlePasswordChange}
                                    name="current_password"
                                    className="input-password-confirm"
                                />
                            </div>
                            <div className="modal-actions">
                                <button 
                                    className="btn-confirmar-cambios" 
                                    onClick={confirmarCambios}
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : 'Confirmar Cambios'}
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
