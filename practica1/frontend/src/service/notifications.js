const API_BASE = 'https://h8rtvvc7-3000.use2.devtunnels.ms';

export const notificationService = {
    // Obtener todas las notificaciones del usuario
    async getUserNotifications(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}/notifications`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const notifications = await response.json();
            console.log('Notificaciones obtenidas:', notifications);
            
            return {
                success: true,
                data: notifications,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al obtener notificaciones:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    },

    // Marcar una notificación como leída
    async markNotificationAsRead(userId, notificationId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Notificación marcada como leída:', result);
            
            return {
                success: true,
                data: result,
                status: response.status
            };
            
        } catch (error) {
            console.error('Error al marcar notificación como leída:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    },

    // Contar notificaciones no leídas
    async getUnreadCount(userId) {
        try {
            const result = await this.getUserNotifications(userId);
            
            if (result.success) {
                const unreadCount = result.data.filter(notification => !notification.is_read).length;
                return {
                    success: true,
                    count: unreadCount,
                    data: result.data
                };
            }
            
            return {
                success: false,
                count: 0,
                data: []
            };
            
        } catch (error) {
            console.error('Error al contar notificaciones no leídas:', error);
            return {
                success: false,
                count: 0,
                data: []
            };
        }
    }
};
