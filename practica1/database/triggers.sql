USE Semi_grupo_2322;

-- 1) Bienvenida al crear usuario
DROP TRIGGER IF EXISTS trg_users_ai_welcome;
DELIMITER $$
CREATE TRIGGER trg_users_ai_welcome
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (NEW.id, 'system', 'Bienvenida', CONCAT('Tu cuenta fue creada el ', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i')));
END$$
DELIMITER ;

-- 2) Notificar cuando se publica (sube) una obra
DROP TRIGGER IF EXISTS trg_artworks_ai_uploaded;
DELIMITER $$
CREATE TRIGGER trg_artworks_ai_uploaded
AFTER INSERT ON artworks
FOR EACH ROW
BEGIN
  IF NEW.acquisition_type = 'uploaded' THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.original_owner_id,
      'general',
      'Obra publicada',
      CONCAT('Publicaste la obra #', NEW.id, ' a Q', FORMAT(NEW.price,2), '.')
    );
  END IF;
END$$
DELIMITER ;

-- 3) Notificar compra y venta cuando cambia de dueño por compra
DROP TRIGGER IF EXISTS trg_artworks_au_purchase;
DELIMITER $$
CREATE TRIGGER trg_artworks_au_purchase
AFTER UPDATE ON artworks
FOR EACH ROW
BEGIN
  -- Compra efectiva: cambia el dueño y/or se marca no disponible, con tipo 'purchased'
  IF NEW.acquisition_type = 'purchased'
     AND (NEW.current_owner_id <> OLD.current_owner_id OR (OLD.is_available = 1 AND NEW.is_available = 0)) THEN

    -- Notificación al comprador
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.current_owner_id,
      'purchase',
      'Compra exitosa',
      CONCAT('Adquiriste la obra #', NEW.id, ' por Q', FORMAT(NEW.price,2), '.')
    );

    -- Notificación al vendedor (dueño anterior)
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      OLD.current_owner_id,
      'sale',
      'Has vendido una obra',
      CONCAT('Vendiste la obra #', NEW.id, ' por Q', FORMAT(NEW.price,2), '.')
    );
  END IF;
END$$
DELIMITER ;

-- 4) Notificar recarga de saldo (solo incrementos, para no duplicar con compras)
DROP TRIGGER IF EXISTS trg_users_au_balance_topup;
DELIMITER $$
CREATE TRIGGER trg_users_au_balance_topup
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.balance > OLD.balance THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.id,
      'general',
      'Saldo recargado',
      CONCAT('Se acreditaron Q', FORMAT(NEW.balance - OLD.balance,2), ' a tu cuenta.')
    );
  END IF;
END$$
DELIMITER ;

-- 5) (Opcional) Notificar edición de perfil (usuario/nombre)
DROP TRIGGER IF EXISTS trg_users_au_profile_changed;
DELIMITER $$
CREATE TRIGGER trg_users_au_profile_changed
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.username <> OLD.username OR NEW.full_name <> OLD.full_name THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (NEW.id, 'system', 'Perfil actualizado', 'Tu información de perfil fue actualizada.');
  END IF;
END$$
DELIMITER ;
