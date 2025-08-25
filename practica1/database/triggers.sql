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
    DECLARE v_name VARCHAR(255);

    START TRANSACTION;

    -- Lock de la obra y obtén el nombre
    SELECT price, current_owner_id, image_name
    INTO v_price, v_owner, v_name
    FROM artworks
    WHERE id = p_artwork_id
        FOR UPDATE;

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

    -- Notificaciones a comprador y vendedor (usando el nombre de la obra)
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (p_buyer_id, 'purchase', 'Compra exitosa',
            CONCAT('Has comprado la obra "', v_name, '" por Q', FORMAT(v_price, 2))),
           (v_owner, 'sale', 'Venta realizada',
            CONCAT('Has vendido la obra "', v_name, '" por Q', FORMAT(v_price, 2)));
    COMMIT;
END$$
DELIMITER ;


/* =========================
   LISTADOS (galería / creadas / mías)
   ========================= */

DROP PROCEDURE IF EXISTS sp_artworks_list;
DELIMITER $$
CREATE PROCEDURE sp_artworks_list(IN p_limit INT, IN p_offset INT)
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN SET p_limit = 100; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN SET p_offset = 0; END IF;

  SELECT
    a.id,
    a.image_name AS name,
    a.image_name,
    a.url,
    a.price,
    a.is_available,
    u.id AS seller_id,
    u.full_name AS seller
  FROM artworks a
  JOIN users u ON u.id = a.current_owner_id
  WHERE a.is_available = 1
  ORDER BY a.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_artworks_created;
DELIMITER $$
CREATE PROCEDURE sp_artworks_created(IN p_owner_id BIGINT UNSIGNED, IN p_limit INT, IN p_offset INT)
BEGIN
  IF p_owner_id IS NULL OR p_owner_id = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ownerId requerido';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN SET p_limit = 100; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN SET p_offset = 0; END IF;

  SELECT
    a.id,
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

DROP PROCEDURE IF EXISTS sp_artworks_mine;
DELIMITER $$
CREATE PROCEDURE sp_artworks_mine(IN p_user_id BIGINT UNSIGNED)
BEGIN
  IF p_user_id IS NULL OR p_user_id = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'userId requerido';
  END IF;

  SELECT
    a.id,
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

/* =========================
   PUBLICACIÓN (INSERT de obra)
   ========================= */

DROP PROCEDURE IF EXISTS sp_artwork_publish;
DELIMITER $$
CREATE PROCEDURE sp_artwork_publish(
  IN p_user_id BIGINT UNSIGNED,
  IN p_name    VARCHAR(255),
  IN p_price   DECIMAL(12,2),
  IN p_url     VARCHAR(500)
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
  VALUES
    (TRIM(p_name), p_user_id, p_user_id, 'uploaded', TRIM(p_url), 1, p_price);

  -- devolver id nuevo de forma universal (mysql2 lo lee en el primer recordset)
  SELECT LAST_INSERT_ID() AS id;
END$$
DELIMITER ;

/* =========================
   AUTH / USERS
   ========================= */

-- Crea usuario con validaciones mínimas; devuelve id
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

-- Setear foto (si existe el usuario)
DROP PROCEDURE IF EXISTS sp_user_set_photo;
DELIMITER $$
CREATE PROCEDURE sp_user_set_photo(IN p_user_id BIGINT UNSIGNED, IN p_photo_key VARCHAR(500))
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
END$$
DELIMITER ;

-- Login: retorna perfil si coincide usuario+hash (MD5 truncado)
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
  WHERE username = TRIM(p_username) AND password_hash = p_hash16
  LIMIT 1;
END$$
DELIMITER ;


