import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import { userService } from '../service/users';
import { notificationHelpers } from '../utils/notificationHelpers';
import './EditarPerfil.css';

export default function EditarPerfil() {
    const navigate = useNavigate();
    
    // Estados para el formulario (datos reales del usuario)
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
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
    const [notification, setNotification] = useState(null);

    // Cargar datos del usuario al iniciar
    useEffect(() => {
        cargarDatosUsuario();
        cargarFotoUsuario();
    }, []);

    const cargarDatosUsuario = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.id) {
                navigate('/login');
                return;
            }

            const response = await userService.getUserById(user.id);
            if (response.success) {
                // Verificar si hay foto en caché
                const cachedPhoto = localStorage.getItem('photo');
                
                setUserData({
                    ...response.data,
                    photo_url: cachedPhoto || response.data.photo_url || null
                });
                
                setFormData({
                    username: response.data.username || '',
                    full_name: response.data.full_name || '',
                    photo: null,
                    photo_url: cachedPhoto || response.data.photo_url || null
                });
                
                // Importante: Actualizar también localStorage con datos frescos
                localStorage.setItem('user', JSON.stringify(response.data));
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            setError('Error cargando los datos del usuario');
        }
    };

    const cargarFotoUsuario = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;

            const user = JSON.parse(userData);
            
            // Primero verificar si ya existe la foto en localStorage
            const cachedPhoto = localStorage.getItem('photo');
            if (cachedPhoto) {
                console.log('Cargando foto desde localStorage:', cachedPhoto);
                setUserData((prev) => ({ ...prev, photo_url: cachedPhoto }));
                return;
            }

            // Si no está en localStorage, hacer la petición al backend
            const result = await userService.getUserPhoto(user.id);

            if (result.success) {
                // Guardar en localStorage para futuras cargas
                localStorage.setItem('photo', result.url);
                // Actualizar el estado userData con la foto
                setUserData((prev) => ({ ...prev, photo_url: result.url }));
                
                // También actualizar localStorage del usuario
                const updatedUser = { ...user, photo_url: result.url };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                console.log('Foto cargada exitosamente:', result.url);
            } else {
                console.log('Usuario no tiene foto de perfil (esto es normal)');
            }
        } catch (error) {
            // No mostrar error si es 404 (usuario sin foto)
            if (error.message?.includes('404') || error.status === 404) {
                console.log('Usuario no tiene foto de perfil (esto es normal)');
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
                // Actualizar userData.photo_url para mostrar preview inmediatamente
                setUserData(prev => ({
                    ...prev,
                    photo_url: event.target.result
                }));
                
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
            mostrarNotificacion('Debes ingresar tu contraseña actual', 'error');
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
                    // Limpiar caché de foto para forzar recarga
                    localStorage.removeItem('photo');
                    
                    mostrarNotificacion('Foto actualizada exitosamente', 'success');
                    // Actualizar datos del usuario con datos frescos de la API
                    const updatedUser = await userService.getUserById(user.id);
                    if (updatedUser.success) {
                        localStorage.setItem('user', JSON.stringify(updatedUser.data));
                        setUserData(updatedUser.data);
                        
                        // Recargar la foto para actualizar el caché
                        await cargarFotoUsuario();
                        
                        // Actualizar notificaciones inmediatamente
                        setTimeout(() => {
                            notificationHelpers.refreshNotifications();
                        }, 1000);
                        
                        // Disparar evento para actualizar Navbar
                        window.dispatchEvent(new CustomEvent('userUpdated'));
                        
                    }
                } else {
                    mostrarNotificacion(response.message || 'Error al actualizar la foto', 'error');
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
                    mostrarNotificacion('Información actualizada exitosamente', 'success');
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
                        
                        // Actualizar notificaciones inmediatamente
                        setTimeout(() => {
                            notificationHelpers.refreshNotifications();
                        }, 1000);
                        
                        // Disparar evento para actualizar Navbar
                        window.dispatchEvent(new CustomEvent('userUpdated'));
                      
                    }
                } else {
                    mostrarNotificacion(response.message || 'Error al actualizar la información', 'error');
                }
            }
            
            cerrarModal();
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error interno del servidor', 'error');
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
                                {/* Usar userData.photo_url igual que en Perfil.jsx */}
                                {console.log('Estado userData.photo_url:', userData?.photo_url)}
                                {userData?.photo_url ? (
                                    <img 
                                        src={userData.photo_url} 
                                        alt="Foto de perfil" 
                                        className="foto-preview"
                                        onLoad={() => console.log('Imagen cargada exitosamente:', userData.photo_url)}
                                        onError={() => console.error('Error cargando imagen:', userData.photo_url)}
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

            {/* Notificación flotante */}
            {notification && (
                <div className={`notification ${notification.tipo}`}>
                    <div className="notification-content">
                        <span className="notification-message">
                            {notification.mensaje}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
