import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../service/notifications';
import './NotificationBell.css';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        
        // Cargar notificaciones cada 30 segundos
        const interval = setInterval(loadNotifications, 30000);
        
        // Limpiar intervalo al desmontar
        return () => clearInterval(interval);
    }, []);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;

            const user = JSON.parse(userData);
            const result = await notificationService.getUserNotifications(user.id);

            if (result.success) {
                setNotifications(result.data);
                const unread = result.data.filter(notif => !notif.is_read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;

            const user = JSON.parse(userData);
            const result = await notificationService.markNotificationAsRead(user.id, notificationId);

            if (result.success) {
                // Actualizar el estado local
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, is_read: true }
                            : notif
                    )
                );
                
                // Recalcular contador
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marcando notificación como leída:', error);
        }
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Hoy';
        } else if (diffDays === 2) {
            return 'Ayer';
        } else if (diffDays <= 7) {
            return `Hace ${diffDays - 1} días`;
        } else {
            return date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    };



    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button 
                className="bell-button" 
                onClick={toggleDropdown}
                aria-label="Notificaciones"
            >
                <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="m13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notificaciones</h3>
                        {unreadCount > 0 && (
                            <span className="unread-count">{unreadCount} sin leer</span>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">
                                <p>Cargando...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="no-notifications">
                                <p>No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications
                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                .map(notification => (
                                    <div 
                                        key={notification.id} 
                                        className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                    >
                                     
                                        <div className="notification-content">
                                            <h4 className="notification-title">
                                                {notification.title}
                                            </h4>
                                            <p className="notification-body">
                                                {notification.body}
                                            </p>
                                            <span className="notification-time">
                                                {formatDate(notification.created_at)}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <button 
                                className="view-all-btn"
                                onClick={() => setIsOpen(false)}
                            >
                                Ver todas
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
