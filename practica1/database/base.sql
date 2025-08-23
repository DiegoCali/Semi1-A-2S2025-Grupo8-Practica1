-- =========================
-- Reset completo y creación
-- =========================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS artworks;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE DATABASE IF NOT EXISTS Semi_grupo_2322
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE Semi_grupo_2322;

-- =========================
-- 1) Tabla de usuarios
-- =========================
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  full_name       VARCHAR(120) NOT NULL,
  -- IMPORTANTE: tu backend compara MD5 hex recortado a 16 chars
  password_hash   VARCHAR(16)  NOT NULL,
  balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_username (username)
) ENGINE=InnoDB;

-- =========================
-- 2) Obras de arte
-- =========================
CREATE TABLE artworks (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_owner_id    BIGINT UNSIGNED NOT NULL,
  current_owner_id     BIGINT UNSIGNED NOT NULL,
  acquisition_type     ENUM('uploaded','purchased') NOT NULL,
  -- Guarda SOLO la "key" (ruta relativa) del bucket. Ej: Fotos_Publicadas/archivo.jpg
  url                  VARCHAR(500) NOT NULL,
  is_available         TINYINT(1) NOT NULL DEFAULT 1,
  price                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_art_original_owner
    FOREIGN KEY (original_owner_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_art_current_owner
    FOREIGN KEY (current_owner_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT uq_art_url UNIQUE (url),
  CONSTRAINT chk_art_price_nonneg CHECK (price >= 0),

  KEY idx_art_original_owner (original_owner_id),
  KEY idx_art_current_owner (current_owner_id),
  KEY idx_art_is_available (is_available)
) ENGINE=InnoDB;

-- =========================
-- 3) Notificaciones
-- =========================
CREATE TABLE notifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         ENUM('system','purchase','sale','general') NOT NULL DEFAULT 'general',
  title        VARCHAR(150) NULL,
  body         TEXT NOT NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  KEY idx_notif_user (user_id),
  KEY idx_notif_is_read (is_read)
) ENGINE=InnoDB;

-- =========================
-- 4) Seeds compatibles con tu login (MD5 -> 16 chars)
-- =========================
-- alice / alice123  |  bob / bob123
INSERT INTO users (username, full_name, password_hash, balance) VALUES
  ('alice','Alice Pérez', SUBSTRING(MD5('alice123'),1,16), 100.00),
  ('bob',  'Bob Gómez',   SUBSTRING(MD5('bob123'),1,16),    50.00);

-- Una obra publicada por Alice (disponible)
-- Recuerda: en local la imagen vive en ./uploads/Fotos_Publicadas/..., y la API sirve /static/...
-- En cloud, el mismo valor será la key del objeto en S3.
INSERT INTO artworks (original_owner_id, current_owner_id, acquisition_type, url, is_available, price)
VALUES (1, 1, 'uploaded', 'Fotos_Publicadas/seed-ejemplo.jpg', 1, 25.00);

-- Notificaciones de bienvenida
INSERT INTO notifications (user_id, type, title, body) VALUES
  (1, 'system', 'Bienvenida', 'Tu cuenta fue creada.'),
  (2, 'system', 'Bienvenida', 'Tu cuenta fue creada.');

-- =========================
-- 5) Consultas útiles (referencia)
-- =========================
-- Obras disponibles (vendedor actual y precio)
-- SELECT a.id, a.url, a.price, u.username AS seller
-- FROM artworks a
-- JOIN users u ON u.id = a.current_owner_id
-- WHERE a.is_available = 1
-- ORDER BY a.price ASC;

-- Inventario de un usuario
-- SELECT a.id, a.url, a.is_available, a.price
-- FROM artworks a
-- WHERE a.current_owner_id = 2;
