-- ===============================================
-- INSERTS DIRECTOS CON URLs DE WIKIPEDIA
-- ===============================================
-- Inserta obras usando URLs directas de imágenes de Wikipedia
-- Sin necesidad de descargar ni subir archivos

USE Semi_grupo_2322;

-- ===============================================
-- INSERTS DE OBRAS DE ARTE CON URLs DIRECTAS
-- ===============================================

-- 1. La Mona Lisa - Leonardo da Vinci
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/687px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', 
    1, 15000000.00
);

-- 2. La Noche Estrellada - Van Gogh
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', 
    1, 8500000.00
);

-- 3. El Grito - Edvard Munch
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    2, 2, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/600px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg', 
    1, 12000000.00
);

-- 4. La Persistencia de la Memoria - Salvador Dalí
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg', 
    1, 6500000.00
);

-- 5. Las Meninas - Diego Velázquez
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    2, 2, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Las_Meninas_01.jpg/800px-Las_Meninas_01.jpg', 
    1, 20000000.00
);

-- 6. La Joven de la Perla - Johannes Vermeer
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    1, 1, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/600px-1665_Girl_with_a_Pearl_Earring.jpg', 
    1, 9200000.00
);

-- 7. Guernica - Pablo Picasso
INSERT INTO artworks (
    original_owner_id, 
    current_owner_id, 
    acquisition_type, 
    url, 
    is_available, 
    price
) VALUES (
    2, 2, 'uploaded', 
    'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg', 
    1, 18000000.00
);

-- ===============================================
-- CONSULTAS DE VERIFICACIÓN
-- ===============================================

-- Ver todas las obras con URLs directas
SELECT 
    a.id,
    a.url,
    CONCAT('Q.', FORMAT(a.price, 2)) AS precio_formateado,
    u.username AS propietario,
    a.is_available AS disponible
FROM artworks a
JOIN users u ON u.id = a.current_owner_id
ORDER BY a.price DESC;

-- Verificar que las URLs funcionan (las imágenes se verán directamente)
SELECT 
    'La Mona Lisa' AS obra,
    a.url AS imagen_url
FROM artworks a 
WHERE a.url LIKE '%Mona_Lisa%'
LIMIT 1;
