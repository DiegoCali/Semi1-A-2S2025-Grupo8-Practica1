const API_BASE =  import.meta.env.VITE_BACKEND_HOST;

export const artworkService = {
    // Función para probar la salud de la API
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { ok: false, error: error.message };
        }
    },

    // Obtener todas las obras con paginación opcional
    async getAllArtworks(limit = 50, offset = 0) {
        try {
            // Probar primero sin parámetros para debugging
            const url = `${API_BASE}/artworks`;
            
            const response = await fetch(url);
            console.log('Response de getAllArtworks:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const artworks = await response.json();
            console.log('All artworks raw data:', artworks);
            
            // Transformar usando los campos reales de la API
            const transformedArtworks = artworks.map(artwork => ({
                // IDs y datos principales usando campos reales
                id: artwork.id,
                precio: parseFloat(artwork.price || 0),
                disponible: !!artwork.is_available,
                
                // URLs de imagen usando campos reales
                imagen: artwork.public_url ? `${artwork.public_url}` : null,
                urlOriginal: artwork.url_key,
                
                // Información del vendedor usando campos reales
                sellerId: artwork.seller_id,
                vendedor: artwork.seller,
                
                // Campos calculados para UI usando campos reales
                titulo: artwork.name || artwork.image_name || `Obra de ${artwork.seller}`,
                autor: artwork.seller,
                anio: new Date().getFullYear(), // No hay campo año en la API
                
                // Debug: mantener datos originales reales
                _original: {
                    id: artwork.id,
                    name: artwork.name,
                    image_name: artwork.image_name,
                    url_key: artwork.url_key,
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
            console.log('Response de getUserArtworks:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const artworks = await response.json();
            console.log('Artworks raw data:', artworks);
            
            // Transformar usando los campos reales de la API
            const transformedArtworks = artworks.map(artwork => {
                console.log('Transformando artwork:', artwork);
                
                return {
                    // Campos principales usando la estructura REAL de la API
                    id: artwork.id,
                    precio: parseFloat(artwork.price || 0),
                    disponible: !!artwork.is_available,
                    imagen: artwork.public_url ? `${artwork.public_url}` : null,
                    tipoAdquisicion: artwork.acquisition_type, // ✅ USAR EL CAMPO REAL "acquisition_type"
                    sellerId: artwork.seller_id,
                    urlKey: artwork.url_key,
                    
                    // Campos calculados para UI usando los campos reales
                    titulo: artwork.name || artwork.image_name || `Obra #${artwork.id}`,
                    nombreImagen: artwork.image_name,
                    autor: artwork.seller || 'Autor desconocido',
                    vendedor: artwork.seller,
                    anio: new Date().getFullYear(), // No hay campo año en la API
                    
                    // Debug: mantener datos originales reales con TODOS los campos
                    _original: {
                        id: artwork.id,
                        name: artwork.name,
                        image_name: artwork.image_name,
                        url_key: artwork.url_key,
                        price: artwork.price,
                        is_available: artwork.is_available,
                        acquisition_type: artwork.acquisition_type,
                        seller_id: artwork.seller_id,
                        seller: artwork.seller,
                        public_url: artwork.public_url
                    }
                };
            });
            
            console.log('Artworks transformados:', transformedArtworks);
            
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

    // Método específico para obtener solo obras creadas (donde soy el autor original)
    async getMyCreatedArtworks(userId, limit = 50, offset = 0) {
        try {
            const response = await fetch(`${API_BASE}/artworks/created?userId=${userId}&limit=${limit}&offset=${offset}`);
            console.log('Response de getMyCreatedArtworks:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const artworks = await response.json();
            console.log('Created artworks raw data:', artworks);
            
            // Transformar usando los campos reales de la API
            const transformedArtworks = artworks.map(artwork => {
                console.log('Transformando created artwork:', artwork);
                
                return {
                    // Campos principales usando la estructura REAL de la API
                    id: artwork.id,
                    precio: parseFloat(artwork.price || 0),
                    disponible: !!artwork.is_available,
                    imagen: artwork.public_url ? `${artwork.public_url}` : null,
                    tipoAdquisicion: artwork.acquisition_type,
                    sellerId: artwork.seller_id,
                    urlKey: artwork.url_key,
                    
                    // Campos calculados para UI
                    titulo: artwork.name || artwork.image_name || `Obra #${artwork.id}`,
                    nombreImagen: artwork.image_name,
                    autor: artwork.seller || 'Autor desconocido',
                    vendedor: artwork.seller,
                    anio: new Date().getFullYear(),
                    
                    // Debug: mantener datos originales
                    _original: {
                        id: artwork.id,
                        name: artwork.name,
                        image_name: artwork.image_name,
                        url_key: artwork.url_key,
                        price: artwork.price,
                        is_available: artwork.is_available,
                        acquisition_type: artwork.acquisition_type,
                        seller_id: artwork.seller_id,
                        seller: artwork.seller,
                        public_url: artwork.public_url
                    }
                };
            });
            
            console.log(`Obras creadas obtenidas directamente: ${transformedArtworks.length}`);
            
            return {
                success: true,
                data: transformedArtworks,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al obtener obras creadas:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    },

    // Método específico para obtener solo obras compradas (de otros autores)
    async getMyPurchasedArtworks(userId) {
        try {
            const result = await this.getUserArtworks(userId);
            if (result.success) {
                // Filtrar por obras donde NO SOY EL AUTOR (seller_id !== userId) 
                // pero están en mi colección (acquisition_type === 'purchased')
                const purchasedArtworks = result.data.filter(artwork => {
                    const isNotMyCreation = artwork.sellerId !== parseInt(userId);
                    const isPurchased = artwork.tipoAdquisicion === 'purchased';
                    const shouldShow = isNotMyCreation && isPurchased;
                    console.log(`Obra ${artwork.id}: sellerId=${artwork.sellerId}, userId=${userId}, isNotMyCreation=${isNotMyCreation}, isPurchased=${isPurchased}, shouldShow=${shouldShow}`);
                    return shouldShow;
                });
                
                console.log(`Obras compradas por mí: ${purchasedArtworks.length}`);
                return {
                    ...result,
                    data: purchasedArtworks
                };
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    },

    // Subir nueva obra
    async uploadArtwork(imageFile, userId, price, name = '') {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('userId', userId.toString());
            formData.append('price', price.toString());
            if (name.trim()) {
                formData.append('name', name.trim());
            }

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
                    name: result.name,
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
