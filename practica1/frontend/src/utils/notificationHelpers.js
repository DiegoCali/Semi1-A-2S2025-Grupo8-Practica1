import eventBus, { NOTIFICATION_EVENTS } from '../utils/eventBus';

// Funciones helper para manejar notificaciones
export const notificationHelpers = {
    // Refrescar notificaciones inmediatamente
    refreshNotifications: () => {
        eventBus.emit(NOTIFICATION_EVENTS.REFRESH);
    },

    // Indicar que hay una nueva notificación
    notifyNewNotification: (notification) => {
        eventBus.emit(NOTIFICATION_EVENTS.NEW_NOTIFICATION, notification);
    },

    // Marcar como leída
    markAsRead: (notificationId) => {
        eventBus.emit(NOTIFICATION_EVENTS.MARK_READ, notificationId);
    }
};

export default notificationHelpers;
