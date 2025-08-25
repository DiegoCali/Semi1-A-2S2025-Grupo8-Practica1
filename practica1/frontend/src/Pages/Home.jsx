import { useEffect, useState } from 'react';
import './Home.css'

function Home (){
    const [previewUrl, setPreviewUrl] = useState(null);
    
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
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
                    <form action="#">
                        <h1>Create Account</h1>
                        <input type="text" placeholder="Nombre Completo" />
                        <input type="user" placeholder="Usuario" />
                        <input type="password" placeholder="Contraseña" />
                        <input type="password" placeholder="Confirmar Contraseña" />
                        <input type="file" placeholder="Subir Foto de perfil"   onChange={handleImageChange} />
                           {previewUrl && (
                            <img src={previewUrl} alt="Vista previa" style={{ marginTop: '10px', maxWidth: '200px' }} />
                        )}
                        <button>Sign Up</button>
                    </form>
                </div>
                <div className="form-container sign-in-container">
                    <form action="#">
                        <h1>Sign in</h1>
                        <input type="user" placeholder="Usuario" />
                        <input type="password" placeholder="Password" />
                        <a href="#">Forgot your password?</a>
                        <button>Sign In</button>
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