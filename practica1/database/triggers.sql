-- =========================
-- ArtGalleryCloud - TRIGGERS & PROCS
-- Requiere MySQL 8.0+
-- =========================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET sql_safe_updates = 0;

USE `Semi_grupo_2322`;

-- Limpieza idempotente
DROP TRIGGER IF EXISTS trg_users_before_ins;
DROP TRIGGER IF EXISTS trg_users_before_upd;
DROP TRIGGER IF EXISTS trg_artworks_before_ins;
DROP TRIGGER IF EXISTS trg_artworks_before_upd;
DROP TRIGGER IF EXISTS trg_notifications_before_ins;

-- ======================================
-- USERS: normaliza y valida
-- ======================================
DELIMITER $$

CREATE TRIGGER trg_users_before_ins
    BEFORE INSERT
    ON users
    FOR EACH ROW
BEGIN
    SET NEW.username = TRIM(NEW.username);
    SET NEW.full_name = TRIM(NEW.full_name);

    IF NEW.balance IS NULL THEN SET NEW.balance = 0.00; END IF;
    IF NEW.balance < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Balance no puede ser negativo';
    END IF;

    IF CHAR_LENGTH(NEW.password_hash) <> 16 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'password_hash debe tener 16 chars (MD5 truncado)';
    END IF;
END$$

CREATE TRIGGER trg_users_before_upd
    BEFORE UPDATE
    ON users
    FOR EACH ROW
BEGIN
    SET NEW.username = TRIM(NEW.username);
    SET NEW.full_name = TRIM(NEW.full_name);

    IF NEW.balance < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Balance no puede ser negativo';
    END IF;

    IF NEW.password_hash IS NOT NULL AND CHAR_LENGTH(NEW.password_hash) <> 16 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'password_hash debe tener 16 chars (MD5 truncado)';
    END IF;
END$$

-- ======================================
-- ARTWORKS: reglas de publicación/compra
-- ======================================
CREATE TRIGGER trg_artworks_before_ins
    BEFORE INSERT
    ON artworks
    FOR EACH ROW
BEGIN
    SET NEW.image_name = TRIM(NEW.image_name);

    IF NEW.price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El precio no puede ser negativo';
    END IF;

    -- Si se sube por el autor, queda disponible y dueño actual=original
    IF NEW.acquisition_type IS NULL OR NEW.acquisition_type = 'uploaded' THEN
        SET NEW.acquisition_type = 'uploaded';
        SET NEW.is_available = 1;
        SET NEW.current_owner_id = NEW.original_owner_id;
    END IF;
END$$

CREATE TRIGGER trg_artworks_before_upd
    BEFORE UPDATE
    ON artworks
    FOR EACH ROW
BEGIN
    SET NEW.image_name = TRIM(NEW.image_name);

    IF NEW.price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El precio no puede ser negativo';
    END IF;

    -- Pasar de disponible->no disponible implica compra
    IF OLD.is_available = 1 AND NEW.is_available = 0 THEN
        SET NEW.acquisition_type = 'purchased';

        -- Debe cambiar de propietario
        IF NEW.current_owner_id = OLD.current_owner_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede marcar como comprada sin cambiar de propietario';
        END IF;

        -- El autor original no puede recomprar su propia obra en esta transición
        IF NEW.current_owner_id = OLD.original_owner_id THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El autor original no puede comprar su propia obra';
        END IF;
    END IF;

    -- Coherencia: purchased => no disponible
    IF NEW.acquisition_type = 'purchased' AND NEW.is_available <> 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una obra comprada no puede estar disponible';
    END IF;
END$$

-- ======================================
-- NOTIFICATIONS: saneo básico
-- ======================================
CREATE TRIGGER trg_notifications_before_ins
    BEFORE INSERT
    ON notifications
    FOR EACH ROW
BEGIN
    SET NEW.title = TRIM(NEW.title);
    SET NEW.body = TRIM(NEW.body);
    IF NEW.is_read IS NULL THEN SET NEW.is_read = 0; END IF;
END$$

DELIMITER ;

-- ======================================
-- STORED PROCEDURES (para migrar lógica)
-- No son requeridos por el backend actual,
-- pero permiten mover llamadas JS a SQL.
-- ======================================

-- Sumar saldo de forma segura
DROP PROCEDURE IF EXISTS sp_add_balance;
DELIMITER $$
CREATE PROCEDURE sp_add_balance(IN p_user_id BIGINT UNSIGNED, IN p_amount DECIMAL(12, 2))
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto debe ser > 0';
    END IF;

    UPDATE users SET balance = balance + p_amount WHERE id = p_user_id;
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no existe';
    END IF;
END$$
DELIMITER ;

-- Compra transaccional (equivalente al endpoint)
DROP PROCEDURE IF EXISTS sp_purchase;
DELIMITER $$
CREATE PROCEDURE sp_purchase(IN p_buyer_id BIGINT UNSIGNED, IN p_artwork_id BIGINT UNSIGNED)
BEGIN
    DECLARE v_price DECIMAL(12, 2);
    DECLARE v_owner BIGINT UNSIGNED;

    START TRANSACTION;

    -- Lock de la obra
    SELECT price, current_owner_id
    INTO v_price, v_owner
    FROM artworks
    WHERE id = p_artwork_id
        FOR
    UPDATE;

    IF v_price IS NULL THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La obra no existe';
    END IF;

    -- Debe estar disponible
    IF (SELECT is_available FROM artworks WHERE id = p_artwork_id) = 0 THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La obra no está disponible';
    END IF;

    -- Evitar auto-compra
    IF v_owner = p_buyer_id THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No puedes comprar tu propia obra';
    END IF;

    -- Lock de buyer y seller
    SELECT balance FROM users WHERE id = p_buyer_id FOR UPDATE;
    SELECT balance FROM users WHERE id = v_owner FOR UPDATE;

    IF (SELECT balance FROM users WHERE id = p_buyer_id) < v_price THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente';
    END IF;

    -- Movimientos
    UPDATE users SET balance = balance - v_price WHERE id = p_buyer_id;
    UPDATE users SET balance = balance + v_price WHERE id = v_owner;

    -- Transferencia de propiedad
    UPDATE artworks
    SET current_owner_id = p_buyer_id,
        acquisition_type = 'purchased',
        is_available     = 0
    WHERE id = p_artwork_id;

    -- Notificaciones a comprador y vendedor
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (p_buyer_id, 'purchase', 'Compra exitosa',
            CONCAT('Has comprado la obra #', p_artwork_id, ' por Q', FORMAT(v_price, 2))),
           (v_owner, 'sale', 'Venta realizada',
            CONCAT('Has vendido la obra #', p_artwork_id, ' por Q', FORMAT(v_price, 2)));
    COMMIT;
END$$
DELIMITER ;
