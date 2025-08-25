-- ===============================================
-- INSERTS DIRECTOS PARA OBRAS DE ARTE FAMOSAS
-- ===============================================
-- Basado en la estructura real de la tabla artworks
-- Ejecutar después de tener usuarios (alice=1, bob=2)

USE Semi_grupo_2322;

-- Verificar que existen los usuarios
SELECT id, username, full_name FROM users WHERE id IN (1,2);

-- ===============================================
-- INSERTS DE OBRAS DE ARTE
-- ===============================================

-- 1. La Mona Lisa (Leonardo da Vinci) - Usuario Alice (id=1)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'Fotos_Publicadas/mona_lisa.jpg', 
    1, 15000000.00
);

-- 2. La Noche Estrellada (Van Gogh) - Usuario Alice (id=1)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'Fotos_Publicadas/noche_estrellada.jpg', 
    1, 8500000.00
);

-- 3. El Grito (Edvard Munch) - Usuario Bob (id=2)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    2, 2, 'uploaded', 
    'Fotos_Publicadas/el_grito.jpg', 
    1, 12000000.00
);

-- 4. La Persistencia de la Memoria (Dalí) - Usuario Alice (id=1)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'Fotos_Publicadas/persistencia_memoria.jpg', 
    1, 6500000.00
);

-- 5. Las Meninas (Velázquez) - Usuario Bob (id=2)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    2, 2, 'uploaded', 
    'Fotos_Publicadas/las_meninas.jpg', 
    1, 20000000.00
);

-- 6. La Joven de la Perla (Vermeer) - Usuario Alice (id=1)
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'Fotos_Publicadas/joven_perla.jpg', 
    1, 9200000.00
);

-- ===============================================
-- CONSULTAS DE VERIFICACIÓN
-- ===============================================

-- Ver todas las obras creadas
SELECT 
    a.id,
    a.url,
    a.price,
    a.is_available,
    u.username AS current_owner,
    a.acquisition_type,
    a.created_at
FROM artworks a
JOIN users u ON u.id = a.current_owner_id
ORDER BY a.id DESC;

-- Obras disponibles para compra con información del vendedor
SELECT 
    a.id,
    a.url,
    CONCAT('Q.', FORMAT(a.price, 2)) AS precio_formateado,
    u.username AS vendedor,
    u.full_name AS nombre_vendedor
FROM artworks a
JOIN users u ON u.id = a.current_owner_id
WHERE a.is_available = 1
ORDER BY a.price DESC;

-- Inventario por usuario
SELECT 
    u.username,
    u.full_name,
    COUNT(a.id) AS total_obras,
    SUM(CASE WHEN a.is_available = 1 THEN 1 ELSE 0 END) AS obras_disponibles,
    CONCAT('Q.', FORMAT(SUM(a.price), 2)) AS valor_total
FROM users u
LEFT JOIN artworks a ON a.current_owner_id = u.id
GROUP BY u.id, u.username, u.full_name;

-- Obras más caras
SELECT 
    a.url,
    CONCAT('Q.', FORMAT(a.price, 2)) AS precio,
    u.username AS propietario
FROM artworks a
JOIN users u ON u.id = a.current_owner_id
ORDER BY a.price DESC
LIMIT 3;
