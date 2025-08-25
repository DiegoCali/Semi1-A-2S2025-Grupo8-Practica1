import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'
import { authService } from '../service/auth';

function Home (){
    // Estados
    const [previewUrl, setPreviewUrl] = useState(null);
    const [registerData, setRegisterData] = useState({
        fullName: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [loginData, setLoginData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
        }
    };

    // Manejar cambios en registro
    const handleRegisterChange = (e) => {
        const { name, value } = e.target;
        setRegisterData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Manejar cambios en login
    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función de registro usando el servicio
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validaciones
        if (!registerData.fullName || !registerData.username || !registerData.password) {
            setError('Todos los campos son obligatorios');
            return;
        }
        
        if (registerData.password !== registerData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const result = await authService.register({
                username: registerData.username,
                full_name: registerData.fullName,
                password: registerData.password
            });

            console.log('Respuesta registro:', result); // Para debugging

            if (result.success && result.ok) {
                alert('¡Registro exitoso! Ahora puedes iniciar sesión');
                setRegisterData({
                    fullName: '',
                    username: '',
                    password: '',
                    confirmPassword: ''
                });
                // Cambiar al panel de login
                const container = document.getElementById('container');
                container.classList.remove("right-panel-active");
                setError('');
            } else {
                setError(result.error || result.message || 'Error en el registro');
            }
        } catch (error) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    // Función de login usando el servicio
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!loginData.username || !loginData.password) {
            setError('Usuario y contraseña son obligatorios');
            return;
        }

        setLoading(true);

        try {
            const result = await authService.login({
                username: loginData.username,
                password: loginData.password
            });

            console.log('Respuesta login:', result); // Para debugging

            if (result.success && result.id) {
                console.log('Login exitoso:', result);
                // Guardar solo los datos del usuario, sin los campos técnicos
                const userData = {
                    id: result.id,
                    username: result.username,
                    full_name: result.full_name,
                    balance: result.balance
                };
                localStorage.setItem('user', JSON.stringify(userData));
                setError('');
                navigate('/galeria');
            } else {
                setError(result.error || result.message || 'Error en el inicio de sesión');
            }
        } catch (error) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const signUpButton = document.getElementById('signUp');
        const signInButton = document.getElementById('signIn');
        const container = document.getElementById('container');

        if (signUpButton && signInButton && container) {
            const handleSignUpClick = () => {
                container.classList.add("right-panel-active");
            };
            
            const handleSignInClick = () => {
                container.classList.remove("right-panel-active");
            };

            signUpButton.addEventListener('click', handleSignUpClick);
            signInButton.addEventListener('click', handleSignInClick);

            // Cleanup function to remove event listeners
            return () => {
                signUpButton.removeEventListener('click', handleSignUpClick);
                signInButton.removeEventListener('click', handleSignInClick);
            };
        }
    }, []);

    return(
        <div className="home-container">
            <div className="container" id="container">
                <div className="form-container sign-up-container">
                    <form onSubmit={handleRegisterSubmit}>
                        <h1>Create Account</h1>
                        {error && <p style={{color: 'red', fontSize: '12px'}}>{error}</p>}
                        <input 
                            type="text" 
                            placeholder="Nombre Completo" 
                            name="fullName"
                            value={registerData.fullName}
                            onChange={handleRegisterChange}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Usuario" 
                            name="username"
                            value={registerData.username}
                            onChange={handleRegisterChange}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Contraseña" 
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Confirmar Contraseña" 
                            name="confirmPassword"
                            value={registerData.confirmPassword}
                            onChange={handleRegisterChange}
                            required
                        />
                        <input type="file" onChange={handleImageChange} accept="image/*" />
                        {previewUrl && (
                            <img src={previewUrl} alt="Vista previa" style={{ marginTop: '10px', maxWidth: '200px' }} />
                        )}
                        <button type="submit" disabled={loading}>
                            {loading ? 'Registrando...' : 'Sign Up'}
                        </button>
                    </form>
                </div>
                <div className="form-container sign-in-container">
                    <form onSubmit={handleLoginSubmit}>
                        <h1>Sign in</h1>
                        {error && <p style={{color: 'red', fontSize: '12px'}}>{error}</p>}
                        <input 
                            type="text" 
                            placeholder="Usuario" 
                            name="username"
                            value={loginData.username}
                            onChange={handleLoginChange}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            name="password"
                            value={loginData.password}
                            onChange={handleLoginChange}
                            required
                        />
                        <a href="#">Forgot your password?</a>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Iniciando...' : 'Sign In'}
                        </button>
                    </form>
                </div>
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>Welcome Back!</h1>
                            <p>To keep connected with us please login with your personal info</p>
                            <button className="ghost" id="signIn">Sign In</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>Hello, Friend!</h1>
                            <p>Enter your personal details and start journey with us</p>
                            <button className="ghost" id="signUp">Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;