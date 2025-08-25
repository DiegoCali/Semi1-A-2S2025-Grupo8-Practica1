const API_BASE = 'https://h8rtvvc7-3000.use2.devtunnels.ms';

export const artworkService = {
    // Función para probar la salud de la API
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            const data = await response.json();
            console.log('Health check:', data);
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { ok: false, error: error.message };
        }
    },

    // Obtener todas las obras con paginación opcional
    async getAllArtworks(limit = 20, offset = 0) {
        try {
            // Probar primero sin parámetros para debugging
            const url = `${API_BASE}/artworks`;
            console.log('Fetching from:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('Response:', response);
            const artworks = await response.json();
            console.log('Data from API:', artworks);
            console.log('Array length:', Array.isArray(artworks) ? artworks.length : 'Not an array');
            console.log('First item:', artworks[0]);
            
            // Transformar usando EXACTAMENTE las variables que devuelve laf API
            const transformedArtworks = artworks.map(artwork => ({
                // IDs y datos principales
                id: artwork.id,
                precio: artwork.price,
                disponible: !!artwork.is_available, // Convertir a boolean explícitamente
                
                // URLs de imagen
                imagen: artwork.public_url,
                urlOriginal: artwork.url,
                
                // Información del vendedor  
                sellerId: artwork.seller_id,
                vendedor: artwork.seller, // Usar 'seller' como vendedor
                
                // Campos calculados para UI
                titulo: artwork.title || `Obra de ${artwork.seller}`,
                autor: artwork.seller, // El vendedor actúa como "autor"
                anio: artwork.year || new Date().getFullYear(),
                
                // Debug: mantener datos originales
                _original: {
                    id: artwork.id,
                    url: artwork.url,
                    price: artwork.price,
                    is_available: artwork.is_available,
                    seller_id: artwork.seller_id,
                    seller: artwork.seller,
                    public_url: artwork.public_url
                }
            }));
            
            return {
                success: true,
                data: transformedArtworks,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al obtener artworks:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    },

    // Obtener obras del usuario específico
    async getUserArtworks(userId) {
        try {
            const response = await fetch(`${API_BASE}/artworks/mine?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const artworks = await response.json();
            
            // Transformar usando EXACTAMENTE las variables de /artworks/mine
            const transformedArtworks = artworks.map(artwork => ({
                // Campos principales de la API
                id: artwork.id,
                precio: artwork.price,
                disponible: !!artwork.is_available,
                imagen: artwork.public_url,
                tipoAdquisicion: artwork.acquisition_type, // "uploaded" o "purchased"
                
                // Campos calculados para UI
                titulo: artwork.title || `Mi Obra #${artwork.id}`,
                autor: artwork.acquisition_type === 'uploaded' ? 'Creada por mí' : 'Adquirida',
                anio: artwork.year || new Date().getFullYear(),
                
                // Debug: mantener datos originales  
                _original: {
                    id: artwork.id,
                    url: artwork.url,
                    price: artwork.price,
                    is_available: artwork.is_available,
                    acquisition_type: artwork.acquisition_type,
                    public_url: artwork.public_url
                }
            }));
            
            return {
                success: true,
                data: transformedArtworks,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al obtener mis artworks:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    },

    // Subir nueva obra
    async uploadArtwork(imageFile, userId, price) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('userId', userId.toString());
            formData.append('price', price.toString());

            const response = await fetch(`${API_BASE}/artworks/upload`, {
                method: 'POST',
                body: formData
                // No agregar Content-Type header, fetch lo maneja automáticamente para FormData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                success: true,
                data: {
                    id: result.id,
                    urlKey: result.url_key,
                    publicUrl: result.public_url,
                    precio: result.price
                },
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al subir artwork:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Comprar obra
    async purchaseArtwork(buyerId, artworkId) {
        try {
            const response = await fetch(`${API_BASE}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    buyerId: buyerId,
                    artworkId: artworkId
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
                    artworkId: result.artworkId,
                    buyerId: result.buyerId,
                    sellerId: result.sellerId,
                    precio: result.price
                },
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al comprar artwork:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
};
