CREATE DATABASE IF NOT EXISTS Semi_grupo_2322
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE Semi_grupo_2322;

-- =========================
-- 1) Usuarios
-- =========================
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  full_name       VARCHAR(120) NOT NULL,
  password_hash   VARCHAR(16) NOT NULL,       -- guarda md5
  balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,  -- monto de dinero del usuario
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- 2 Obras de arte
-- =========================
-- Registra: dueño original (quien la subió), dueño actual, cómo se adquirió,
-- URL, si está disponible para la compra y su precio.
CREATE TABLE artworks (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_owner_id    BIGINT UNSIGNED NOT NULL,                
  current_owner_id     BIGINT UNSIGNED NOT NULL,                -- dueño actual (puede cambiar con compras)
  acquisition_type     ENUM('uploaded','purchased') NOT NULL,   -- cómo llegó al dueño actual, subido o comprado xd
  url                  VARCHAR(500) NOT NULL,                   -- URL de la imagen de la obra
  is_available         TINYINT(1) NOT NULL DEFAULT 1,           -- 1=disponible para compra, 0=no
  price                DECIMAL(12,2) NOT NULL DEFAULT 0.00,     -- precio de venta (si está disponible)
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_art_original_owner 
    FOREIGN KEY (original_owner_id) REFERENCES users(id) -- vincula el dueño original
    ON DELETE RESTRICT ON UPDATE CASCADE, -- no se puede eliminar un usuario que tenga obras asociadas

  CONSTRAINT fk_art_current_owner
    FOREIGN KEY (current_owner_id) REFERENCES users(id) -- vincula el dueño actual
    ON DELETE RESTRICT ON UPDATE CASCADE, -- no se puede eliminar un usuario que tenga obras asociadas

  CONSTRAINT uq_art_url UNIQUE (url), -- asegura que no haya dos obras con la misma URL

  CONSTRAINT chk_art_price_nonneg CHECK (price >= 0)

) ENGINE=InnoDB;

-- =========================
-- 3) Notificaciones por usuario
-- =========================
CREATE TABLE notifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         ENUM('system','purchase','sale','general') NOT NULL DEFAULT 'general',
  title        VARCHAR(150) NULL,
  body         TEXT NOT NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,  -- 0=no leída, 1=leída
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Ejemplos de uso xd
-- =========================

--Insertar usuarios (NOTA: usa hashes reales en producción)
INSERT INTO users (username, full_name, password_hash, balance)
VALUES ('alice','Alice Pérez','$2y$10$hash...',100.00),
       ('bob','Bob Gómez','$2y$10$hash...',50.00);

--Publicar (subir) una obra por Alice (dueño original y actual = Alice, uploaded)
INSERT INTO artworks (original_owner_id, current_owner_id, acquisition_type, url, is_available, price)
VALUES (1, 1, 'uploaded', 'nose alguna imagen xd.png', 1, 25.00);

--Marcar una compra (Bob compra a Alice):
--1) Transferir propiedad y marcar no disponible (si es venta única)
UPDATE artworks
    SET current_owner_id = 2,
        acquisition_type = 'purchased',
        is_available = 0,
        updated_at = NOW()
  WHERE id = 1 AND is_available = 1;

-- 2) Notificaciones
INSERT INTO notifications (user_id, type, title, body)
VALUES
  (1, 'sale',     'Tu obra se vendió',  'La obra #1 fue comprada por @bob.'),
  (2, 'purchase', 'Compra exitosa',     'Has comprado la obra #1.');

-- Consultar obras disponibles para compra, ordenadas por precio
SELECT a.id, a.url, a.price, u.username AS seller
FROM artworks a
JOIN users u ON u.id = a.current_owner_id
WHERE a.is_available = 1
ORDER BY a.price ASC;

-- Consultar inventario (obras actuales) de un usuario
SELECT a.id, a.url, a.is_available, a.price
FROM artworks a
WHERE a.current_owner_id = 2;

