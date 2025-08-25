// Sistema de eventos para comunicación entre componentes
class EventBus {
    constructor() {
        this.events = {};
    }

    // Suscribirse a un evento
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        // Retornar función para desuscribirse
        return () => {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        };
    }

    // Emitir un evento
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    // Remover todos los listeners de un evento
    off(event) {
        delete this.events[event];
    }
}

// Crear instancia singleton
const eventBus = new EventBus();

// Eventos específicos para notificaciones
export const NOTIFICATION_EVENTS = {
    REFRESH: 'notifications:refresh',
    NEW_NOTIFICATION: 'notifications:new',
    MARK_READ: 'notifications:markRead'
};

export default eventBus;
