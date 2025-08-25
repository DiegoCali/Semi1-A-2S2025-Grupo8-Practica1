-- =========================
-- ArtGalleryCloud - BASE SQL
-- Requiere MySQL 8.0+
-- =========================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET sql_safe_updates = 0;

-- Cambia el nombre si usas otro en tu .env
CREATE DATABASE IF NOT EXISTS `Semi_grupo_2322`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `Semi_grupo_2322`;

-- =========================
-- Tabla: users
-- =========================
CREATE TABLE IF NOT EXISTS users
(
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username      VARCHAR(100)    NOT NULL,
    full_name     VARCHAR(200)    NOT NULL,
    password_hash CHAR(16)        NOT NULL, -- md5(...).slice(0,16)
    balance       DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    photo_url     VARCHAR(500)    NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users__username (username),
    CONSTRAINT chk_users__balance_nonneg CHECK (balance >= 0),
    CONSTRAINT chk_users__pwd_len CHECK (CHAR_LENGTH(password_hash) = 16)
) ENGINE = InnoDB;

-- =========================
-- Tabla: artworks
-- =========================
CREATE TABLE IF NOT EXISTS artworks
(
    id                BIGINT UNSIGNED               NOT NULL AUTO_INCREMENT,
    image_name        VARCHAR(255)                  NOT NULL, -- título de la obra
    url               VARCHAR(500)                  NOT NULL, -- key del bucket (Fotos_*/archivo.jpg)
    price             DECIMAL(12, 2)                NOT NULL DEFAULT 0.00,
    is_available      TINYINT(1)                    NOT NULL DEFAULT 1,
    acquisition_type  ENUM ('uploaded','purchased') NOT NULL DEFAULT 'uploaded',
    original_owner_id BIGINT UNSIGNED               NOT NULL,
    current_owner_id  BIGINT UNSIGNED               NOT NULL,
    created_at        TIMESTAMP                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_artworks__url (url),                        -- evita repetir la misma imagen publicada
    KEY ix_artworks__available_created (is_available, created_at DESC),
    KEY ix_artworks__owner_current (current_owner_id, created_at DESC),
    CONSTRAINT fk_artworks__orig_user FOREIGN KEY (original_owner_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_artworks__curr_user FOREIGN KEY (current_owner_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_artworks__price_nonneg CHECK (price >= 0),
    CONSTRAINT chk_artworks__availability CHECK (
        (acquisition_type = 'uploaded' AND is_available IN (0, 1)) OR
        (acquisition_type = 'purchased' AND is_available IN (0))
        )
) ENGINE = InnoDB;

-- =========================
-- Tabla: notifications
-- =========================
CREATE TABLE IF NOT EXISTS notifications
(
    id         BIGINT UNSIGNED                   NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED                   NOT NULL,
    type       ENUM ('purchase','sale','system') NOT NULL DEFAULT 'system',
    title      VARCHAR(200)                      NOT NULL,
    body       VARCHAR(1000)                     NOT NULL,
    is_read    TINYINT(1)                        NOT NULL DEFAULT 0,
    created_at TIMESTAMP                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_notifications__user_created (user_id, created_at DESC),
    CONSTRAINT fk_notifications__user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;
