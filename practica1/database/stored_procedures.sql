-- ==========================================
-- STORED PROCEDURES - ArtGalleryCloud
-- MySQL 8.0+
-- ==========================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
USE `Semi_grupo_2322`;

-- ------------------------------------------------
-- AUTH / USERS BÁSICOS
-- ------------------------------------------------

-- Crea usuario; valida entradas; UNIQUE(username) se maneja con ER_DUP_ENTRY
DROP PROCEDURE IF EXISTS sp_user_create;
DELIMITER $$
CREATE PROCEDURE sp_user_create(
    IN p_username VARCHAR(100),
    IN p_full_name VARCHAR(200),
    IN p_password_hash CHAR(16)
)
BEGIN
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'username requerido';
    END IF;
    IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'full_name requerido';
    END IF;
    IF p_password_hash IS NULL OR CHAR_LENGTH(p_password_hash) <> 16 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'password_hash debe ser de 16 chars (MD5 truncado)';
    END IF;

    INSERT INTO users (username, full_name, password_hash, balance, photo_url)
    VALUES (TRIM(p_username), TRIM(p_full_name), p_password_hash, 0.00, NULL);

    SELECT LAST_INSERT_ID() AS id;
END$$
DELIMITER ;

-- Setear foto de perfil por KEY (S3/local)
DROP PROCEDURE IF EXISTS sp_set_user_photo;
DELIMITER $$
CREATE PROCEDURE sp_set_user_photo(IN p_user_id BIGINT UNSIGNED, IN p_photo_key VARCHAR(500))
BEGIN
    IF p_user_id IS NULL OR p_user_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'user_id requerido';
    END IF;
    IF p_photo_key IS NULL OR TRIM(p_photo_key) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'photo_key requerido';
    END IF;

    UPDATE users SET photo_url = TRIM(p_photo_key) WHERE id = p_user_id;
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no existe';
    END IF;

    SELECT 'OK' AS status;
END$$
DELIMITER ;

-- Alias por compatibilidad (si llamaste sp_user_set_photo en auth.js)
DROP PROCEDURE IF EXISTS sp_user_set_photo;
DELIMITER $$
CREATE PROCEDURE sp_user_set_photo(IN p_user_id BIGINT UNSIGNED, IN p_photo_key VARCHAR(500))
BEGIN
    CALL sp_set_user_photo(p_user_id, p_photo_key);
END$$
DELIMITER ;

-- Login: devuelve perfil si coincide username + hash16
DROP PROCEDURE IF EXISTS sp_auth_login;
DELIMITER $$
CREATE PROCEDURE sp_auth_login(IN p_username VARCHAR(100), IN p_hash16 CHAR(16))
BEGIN
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'username requerido';
    END IF;
    IF p_hash16 IS NULL OR CHAR_LENGTH(p_hash16) <> 16 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'hash inválido';
    END IF;

    SELECT id, username, full_name, balance
    FROM users
    WHERE username = TRIM(p_username)
      AND password_hash = p_hash16
    LIMIT 1;
END$$
DELIMITER ;

-- ------------------------------------------------
-- USERS: PERFIL / BALANCE / FOTO / NOTIFICACIONES
-- ------------------------------------------------

-- Perfil por id
DROP PROCEDURE IF EXISTS sp_get_user_profile;
DELIMITER $$
CREATE PROCEDURE sp_get_user_profile(IN p_user_id BIGINT UNSIGNED)
BEGIN
    SELECT id, username, full_name, balance, photo_url
    FROM users
    WHERE id = p_user_id
    LIMIT 1;
END$$
DELIMITER ;

-- Sumar saldo y devolver nuevo saldo
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

    SELECT balance AS new_balance FROM users WHERE id = p_user_id;
END$$
DELIMITER ;

-- Actualizar perfil con validación de contraseña actual y campos opcionales
DROP PROCEDURE IF EXISTS sp_update_user_profile;
DELIMITER $$
CREATE PROCEDURE sp_update_user_profile(
    IN p_user_id BIGINT UNSIGNED,
    IN p_username VARCHAR(100), -- puede ser NULL (no cambiar)
    IN p_full_name VARCHAR(200), -- puede ser NULL (no cambiar)
    IN p_new_password_hash CHAR(16), -- puede ser NULL (no cambiar)
    IN p_current_password_hash CHAR(16) -- requerido
)
proc:
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_dup TINYINT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR 1062 SET v_dup = 1;

    IF p_user_id IS NULL OR p_user_id = 0 THEN
        SELECT 'NOT_FOUND' AS status; LEAVE proc;
    END IF;
    IF p_current_password_hash IS NULL OR CHAR_LENGTH(p_current_password_hash) <> 16 THEN
        SELECT 'INVALID_PASSWORD' AS status; LEAVE proc;
    END IF;

    -- Verificar usuario + contraseña actual
    SELECT COUNT(*)
    INTO v_exists
    FROM users
    WHERE id = p_user_id
      AND password_hash = p_current_password_hash;

    IF v_exists = 0 THEN
        SELECT 'INVALID_PASSWORD' AS status; LEAVE proc;
    END IF;

    -- Si no hay campos por cambiar:
    IF (p_username IS NULL OR TRIM(p_username) = '') AND
       (p_full_name IS NULL OR TRIM(p_full_name) = '') AND
       (p_new_password_hash IS NULL OR CHAR_LENGTH(p_new_password_hash) = 0) THEN
        SELECT 'NO_CHANGES' AS status; LEAVE proc;
    END IF;

    UPDATE users
    SET username      = COALESCE(NULLIF(TRIM(p_username), ''), username),
        full_name     = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
        password_hash = COALESCE(NULLIF(p_new_password_hash, ''), password_hash)
    WHERE id = p_user_id;

    IF v_dup = 1 THEN
        SELECT 'USERNAME_DUP' AS status; LEAVE proc;
    END IF;

    IF ROW_COUNT() = 0 THEN
        SELECT 'NO_CHANGES' AS status; LEAVE proc;
    END IF;

    SELECT 'OK' AS status;
END proc$$
DELIMITER ;

-- Obtener solo la foto (key)
DROP PROCEDURE IF EXISTS sp_get_user_photo;
DELIMITER $$
CREATE PROCEDURE sp_get_user_photo(IN p_user_id BIGINT UNSIGNED)
BEGIN
    SELECT photo_url FROM users WHERE id = p_user_id LIMIT 1;
END$$
DELIMITER ;

-- Listar notificaciones por usuario
DROP PROCEDURE IF EXISTS sp_get_notifications;
DELIMITER $$
CREATE PROCEDURE sp_get_notifications(IN p_user_id BIGINT UNSIGNED)
BEGIN
    SELECT id, type, title, body, is_read, created_at
    FROM notifications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC;
END$$
DELIMITER ;

-- Marcar notificación como leída
DROP PROCEDURE IF EXISTS sp_mark_notification_read;
DELIMITER $$
CREATE PROCEDURE sp_mark_notification_read(IN p_user_id BIGINT UNSIGNED, IN p_notif_id BIGINT UNSIGNED)
BEGIN
    UPDATE notifications
    SET is_read = 1
    WHERE id = p_notif_id
      AND user_id = p_user_id;

    IF ROW_COUNT() = 0 THEN
        SELECT 'NOT_FOUND' AS status;
    ELSE
        SELECT 'OK' AS status;
    END IF;
END$$
DELIMITER ;

-- ------------------------------------------------
-- ARTWORKS: LISTADOS Y PUBLICACIÓN
-- ------------------------------------------------

-- Galería pública paginada
DROP PROCEDURE IF EXISTS sp_artworks_list;
DELIMITER $$
CREATE PROCEDURE sp_artworks_list(IN p_limit INT, IN p_offset INT)
BEGIN
    IF p_limit IS NULL OR p_limit <= 0 THEN SET p_limit = 100; END IF;
    IF p_offset IS NULL OR p_offset < 0 THEN SET p_offset = 0; END IF;

    SELECT a.id,
           a.image_name AS name,
           a.image_name,
           a.url,
           a.price,
           a.is_available,
           u.id         AS seller_id,
           u.full_name  AS seller
    FROM artworks a
             JOIN users u ON u.id = a.current_owner_id
    WHERE a.is_available = 1
    ORDER BY a.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

-- Obras creadas por autor (paginado)
DROP PROCEDURE IF EXISTS sp_artworks_created;
DELIMITER $$
CREATE PROCEDURE sp_artworks_created(IN p_owner_id BIGINT UNSIGNED, IN p_limit INT, IN p_offset INT)
BEGIN
    IF p_owner_id IS NULL OR p_owner_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ownerId requerido';
    END IF;
    IF p_limit IS NULL OR p_limit <= 0 THEN SET p_limit = 100; END IF;
    IF p_offset IS NULL OR p_offset < 0 THEN SET p_offset = 0; END IF;

    SELECT a.id,
           a.image_name AS name,
           a.image_name,
           a.url,
           a.price,
           a.is_available,
           a.acquisition_type,
           a.original_owner_id,
           uo.full_name AS original_owner_full_name,
           a.current_owner_id,
           uc.full_name AS current_owner_full_name,
           a.created_at,
           a.updated_at
    FROM artworks a
             JOIN users uo ON uo.id = a.original_owner_id
             JOIN users uc ON uc.id = a.current_owner_id
    WHERE a.original_owner_id = p_owner_id
    ORDER BY a.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

-- Mis obras (propietario actual)
DROP PROCEDURE IF EXISTS sp_artworks_mine;
DELIMITER $$
CREATE PROCEDURE sp_artworks_mine(IN p_user_id BIGINT UNSIGNED)
BEGIN
    IF p_user_id IS NULL OR p_user_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'userId requerido';
    END IF;

    SELECT a.id,
           a.image_name AS name,
           a.image_name,
           a.url,
           a.price,
           a.is_available,
           a.acquisition_type,
           a.original_owner_id,
           uo.full_name AS original_owner_full_name
    FROM artworks a
             JOIN users uo ON uo.id = a.original_owner_id
    WHERE a.current_owner_id = p_user_id
    ORDER BY a.created_at DESC;
END$$
DELIMITER ;

-- Publicar obra (INSERT); devuelve id
DROP PROCEDURE IF EXISTS sp_artwork_publish;
DELIMITER $$
CREATE PROCEDURE sp_artwork_publish(
    IN p_user_id BIGINT UNSIGNED,
    IN p_name VARCHAR(255),
    IN p_price DECIMAL(12, 2),
    IN p_url VARCHAR(500)
)
BEGIN
    IF p_user_id IS NULL OR p_user_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'userId requerido';
    END IF;
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'name requerido';
    END IF;
    IF CHAR_LENGTH(p_name) > 255 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'name excede 255 caracteres';
    END IF;
    IF p_price IS NULL OR p_price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'price inválido';
    END IF;
    IF p_url IS NULL OR TRIM(p_url) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'url/key es requerida';
    END IF;

    INSERT INTO artworks
    (image_name, original_owner_id, current_owner_id, acquisition_type, url, is_available, price)
    VALUES (TRIM(p_name), p_user_id, p_user_id, 'uploaded', TRIM(p_url), 1, p_price);

    SELECT LAST_INSERT_ID() AS id;
END$$
DELIMITER ;

-- ------------------------------------------------
-- COMPRA (transacción completa)
-- ------------------------------------------------

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

    -- Lock de buyer y seller (y existencia)
    IF (SELECT COUNT(*) FROM users WHERE id = p_buyer_id) = 0 THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comprador no existe';
    END IF;
    IF (SELECT COUNT(*) FROM users WHERE id = v_owner) = 0 THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vendedor no existe';
    END IF;

    SELECT balance FROM users WHERE id = p_buyer_id FOR UPDATE;
    SELECT balance FROM users WHERE id = v_owner FOR UPDATE;

    IF (SELECT balance FROM users WHERE id = p_buyer_id) < v_price THEN
        ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente';
    END IF;

    -- Movimientos de saldo
    UPDATE users SET balance = balance - v_price WHERE id = p_buyer_id;
    UPDATE users SET balance = balance + v_price WHERE id = v_owner;

    -- Transferir propiedad de la obra
    UPDATE artworks
    SET current_owner_id = p_buyer_id,
        acquisition_type = 'purchased',
        is_available     = 0
    WHERE id = p_artwork_id;

    -- Notificar a ambos
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (p_buyer_id, 'purchase', 'Compra exitosa',
            CONCAT('Has comprado la obra #', p_artwork_id, ' por Q', FORMAT(v_price, 2))),
           (v_owner, 'sale', 'Venta realizada',
            CONCAT('Has vendido la obra #', p_artwork_id, ' por Q', FORMAT(v_price, 2)));
    COMMIT;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_notify;
DELIMITER $$
CREATE PROCEDURE sp_notify(
  IN p_user_id BIGINT UNSIGNED,
  IN p_type ENUM('purchase','sale','system'),
  IN p_title VARCHAR(200),
  IN p_body  VARCHAR(1000)
)
BEGIN
  IF p_user_id IS NULL OR p_user_id = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'user_id requerido';
  END IF;
  IF p_type IS NULL THEN
    SET p_type = 'system';
  END IF;
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'title requerido';
  END IF;
  IF p_body IS NULL OR TRIM(p_body) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'body requerido';
  END IF;

  INSERT INTO notifications(user_id, type, title, body)
  VALUES (p_user_id, p_type, TRIM(p_title), TRIM(p_body));
END$$
DELIMITER ;
