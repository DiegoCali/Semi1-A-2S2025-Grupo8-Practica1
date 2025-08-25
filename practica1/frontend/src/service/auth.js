const API_BASE = 'https://h8rtvvc7-3000.use2.devtunnels.ms';

//Endpoint para registro

export const authService = {
    register: async (userData) => {
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
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
