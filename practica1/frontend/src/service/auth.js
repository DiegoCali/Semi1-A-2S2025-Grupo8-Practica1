const API_BASE =  import.meta.env.VITE_BACKEND_HOST;

//Endpoint para registro

export const authService = {
    register: async (userData) => {
        try {
            // Si hay imagen, usar FormData
            if (userData.image) {                
                const formData = new FormData();
                formData.append('username', userData.username);
                formData.append('full_name', userData.full_name);
                formData.append('password', userData.password);
                formData.append('image', userData.image);                

                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    body: formData // No agregar Content-Type para FormData
                });
                
                const data = await response.json();
                
                return {
                    ...data,
                    success: response.ok,
                    status: response.status
                };
            } else {
                // Sin imagen, usar JSON normal
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: userData.username,
                        full_name: userData.full_name,
                        password: userData.password
                    })
                });
                
                const data = await response.json();
                
                return {
                    ...data,
                    success: response.ok,
                    status: response.status
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    login: async (credentials) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            // Agregar información sobre si fue exitoso
            return {
                ...data,
                success: response.ok,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
