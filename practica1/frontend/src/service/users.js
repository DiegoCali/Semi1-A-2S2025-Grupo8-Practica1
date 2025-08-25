
const API_BASE = import.meta.env.VITE_BACKEND_HOST;

export const userService = {
    // Obtener información completa del usuario
    async getUserById(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const userData = await response.json();
            
            return {
                success: true,
                data: userData,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Agregar saldo al usuario
    async addBalance(userId, amount) {
        try {
            if (!userId || amount <= 0) {
                throw new Error('userId y amount (>0) son requeridos');
            }

            const response = await fetch(`${API_BASE}/users/${userId}/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(amount)
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                success: true,
                data: {
                    ok: result.ok,
                    balance: result.balance
                },
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al agregar saldo:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Actualizar perfil del usuario
    async updateProfile(userId, profileData) {
        try {
            if (!userId || !profileData.current_password) {
                throw new Error('userId y current_password son requeridos');
            }

            const response = await fetch(`${API_BASE}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                success: true,
                data: result,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Subir foto de perfil
    async uploadPhoto(userId, imageFile) {
        try {
            if (!userId || !imageFile) {
                throw new Error('userId y archivo de imagen son requeridos');
            }

            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await fetch(`${API_BASE}/users/${userId}/photo`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                success: true,
                data: {
                    ok: result.ok,
                    photoKey: result.photo_key,
                    publicUrl: result.public_url
                },
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al subir foto:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Obtener foto de perfil del usuario
    async getUserPhoto(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }

            const response = await fetch(`${API_BASE}/users/${userId}/photo`);

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        success: false,
                        error: 'Usuario no tiene foto de perfil',
                        url: null,
                        status: 404
                    };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Si la respuesta es exitosa, construir la URL de la imagen
            const imageUrl = `${API_BASE}/users/${userId}/photo`;

            return {
                success: true,
                url: imageUrl,
                status: response.status
            };
        } catch (error) {
            console.error('Error al obtener foto del usuario:', error);
            return {
                success: false,
                error: error.message,
                url: null
            };
        }
    },

    // Actualizar datos del usuario en localStorage después de cambios
    async refreshUserData(userId) {
        try {
            const result = await this.getUserById(userId);
            
            if (result.success) {
                // Actualizar localStorage con datos frescos
                localStorage.setItem('user', JSON.stringify(result.data));
                return result.data;
            }
            
            return null;
        } catch (error) {
            console.error('Error al refrescar datos del usuario:', error);
            return null;
        }
    }
};
