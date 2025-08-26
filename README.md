# Proyectos de laboratorio grupo 8

## Documentacion practica 1

## base de datos

La base de datos está diseñada para soportar una **galería de arte digital en la nube**, donde los usuarios pueden:

- Registrarse e iniciar sesión.
- Visualizar obras de arte disponibles.
- Comprar obras (si tienen saldo suficiente).
- Administrar su perfil (datos, foto de perfil, saldo).
- Revisar las obras adquiridas.

El sistema se implementa sobre **Amazon RDS**, y las imágenes no se guardan directamente en la base de datos, sino mediante **URLs de S3**.

---

### Tablas Principales

#### `usuarios`

Contiene los datos de los usuarios de la plataforma.

| Campo          | Tipo          | Restricciones                              | Descripción                           |
|----------------|--------------|---------------------------------------------|---------------------------------------|
| `id_usuario`   | INT          | PK, AUTO_INCREMENT                         | Identificador único                   |
| `usuario`      | VARCHAR(50)  | UNIQUE, NOT NULL                           | Nombre de usuario                     |
| `nombre`       | VARCHAR(100) | NOT NULL                                   | Nombre completo                       |
| `password`     | VARCHAR(255) | NOT NULL                                   | Contraseña encriptada con **MD5**     |
| `foto_perfil`  | VARCHAR(255) | NULL                                       | URL en S3 de la foto de perfil        |
| `saldo`        | DECIMAL(10,2)| DEFAULT 0                                  | Saldo disponible del usuario          |

---

#### `obras`

Registra las obras de arte disponibles en la galería.

| Campo           | Tipo          | Restricciones             | Descripción                             |
|-----------------|--------------|----------------------------|-----------------------------------------|
| `id_obra`       | INT          | PK, AUTO_INCREMENT        | Identificador único de la obra          |
| `titulo`        | VARCHAR(100) | NOT NULL                  | Título de la obra                       |
| `autor`         | VARCHAR(100) | NOT NULL                  | Autor de la obra                        |
| `anio`          | YEAR         | NOT NULL                  | Año de publicación                      |
| `url_imagen`    | VARCHAR(255) | NOT NULL                  | Ruta en S3 de la obra (`Fotos_Publicadas`) |
| `precio`        | DECIMAL(10,2)| NOT NULL                  | Precio de la obra                       |
| `disponible`    | BOOLEAN      | DEFAULT TRUE              | Disponibilidad para compra              |

---

#### `compras`

Historial de adquisiciones realizadas por los usuarios.

| Campo           | Tipo          | Restricciones      | Descripción                           |
|-----------------|--------------|--------------------|---------------------------------------|
| `id_compra`     | INT          | PK, AUTO_INCREMENT | Identificador único de la compra      |
| `id_usuario`    | INT          | FK → `usuarios`    | Usuario que realiza la compra         |
| `id_obra`       | INT          | FK → `obras`       | Obra adquirida                        |
| `fecha`         | DATETIME     | DEFAULT NOW()      | Fecha de la transacción               |
| `monto`         | DECIMAL(10,2)| NOT NULL           | Valor pagado                          |

---

### Procedimientos Almacenados (`stored_procedures.sql`)

#### `sp_registrar_usuario(usuario, nombre, password, foto)`

- Valida que no exista un usuario con el mismo nombre.
- Inserta el nuevo registro con la contraseña encriptada en **MD5**.
- Inicializa el saldo en 0.

#### `sp_login(usuario, password)`

- Valida credenciales comparando el **hash MD5**.
- Retorna los datos básicos del usuario si la autenticación es correcta.

#### `sp_adquirir_obra(id_usuario, id_obra)`

- Verifica que la obra esté disponible.
- Revisa que el usuario tenga saldo suficiente.
- Registra la compra en `compras`.
- Actualiza el saldo del usuario.
- Marca la obra como **no disponible**.

#### `sp_aumentar_saldo(id_usuario, monto)`

- Incrementa el saldo del usuario.
- Retorna el nuevo saldo.

---

### Triggers (`triggers.sql`)

#### `trg_validar_saldo`

- Antes de insertar en `compras`, verifica que el usuario tenga el saldo suficiente.
- Lanza error si no cumple.

#### `trg_actualizar_saldo`

- Después de una compra, descuenta el saldo del usuario automáticamente.

#### `trg_bloquear_usuario_duplicado`

- Evita que se inserte un usuario con nombre repetido.

---

### Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    usuarios {
        INT id_usuario PK
        VARCHAR usuario UNIQUE
        VARCHAR nombre
        VARCHAR password
        VARCHAR foto_perfil
        DECIMAL saldo
    }

    obras {
        INT id_obra PK
        VARCHAR titulo
        VARCHAR autor
        YEAR anio
        VARCHAR url_imagen
        DECIMAL precio
        BOOLEAN disponible
    }

    compras {
        INT id_compra PK
        INT id_usuario FK
        INT id_obra FK
        DATETIME fecha
        DECIMAL monto
    }

    usuarios ||--o{ compras : realiza
    obras ||--o{ compras : pertenece
```

---

### Consideraciones

- Las contraseñas **no se almacenan en texto plano**, se usa **MD5**.
- Las imágenes no están en la BD, solo la **URL en S3**.
- Los procedimientos y triggers aseguran la **integridad de las transacciones**.
- Todas las funciones principales de la aplicación (login, registro, compra, perfil) dependen de esta estructura.
