-- =====================================================
--  LIMA FASHION — MySQL Database Schema
--  Run this file first to create the database & tables
-- =====================================================

CREATE DATABASE IF NOT EXISTS lima_fashion_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lima_fashion_db;

-- ─────────────────────────────────────────────────────
--  TABLE: products
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    category    ENUM('WOMEN','MEN','CHILDREN') NOT NULL,
    price       DECIMAL(10, 2)  NOT NULL,
    badge       VARCHAR(50)     DEFAULT NULL,
    size_type   VARCHAR(20)     DEFAULT 'none',
    images      JSON            DEFAULT NULL,     -- array of base64 or file paths
    stock_total INT             DEFAULT 0,
    stock_unassigned INT        DEFAULT 0,
    stock_ho    INT             DEFAULT 0,
    stock_accra INT             DEFAULT 0,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: customers
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    fname       VARCHAR(100)    NOT NULL,
    lname       VARCHAR(100)    NOT NULL,
    phone       VARCHAR(30)     DEFAULT NULL,
    email       VARCHAR(255)    DEFAULT NULL,
    address     VARCHAR(255)    DEFAULT NULL,
    city        VARCHAR(100)    DEFAULT NULL,
    region      VARCHAR(100)    DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: orders
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              VARCHAR(30)     PRIMARY KEY,           -- e.g. ORD-1714000000000
    customer_id     INT             DEFAULT NULL,
    customer_data   JSON            DEFAULT NULL,          -- snapshot at time of order
    items           JSON            NOT NULL,              -- array of {name, qty, price}
    total           DECIMAL(10, 2)  NOT NULL,
    region          VARCHAR(100)    NOT NULL,
    status          ENUM('Pending','Walk in Sale','Delivered','Canceled') DEFAULT 'Pending',
    payment_method  VARCHAR(50)     DEFAULT NULL,
    notes           TEXT            DEFAULT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: settings
--  Key/value store for all admin configuration
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    `key`       VARCHAR(100)    PRIMARY KEY,
    `value`     TEXT            DEFAULT NULL,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: enquiries  (from mainpage contact/enquiry form)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    phone       VARCHAR(30)     DEFAULT NULL,
    email       VARCHAR(255)    DEFAULT NULL,
    product_id  INT             DEFAULT NULL,
    message     TEXT            DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: admin_users
--  Regional admin accounts (Ho / Accra) — managed by super admin only
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(100)    NOT NULL UNIQUE,
    password    VARCHAR(255)    NOT NULL,               -- SHA-256 hex hash
    account     ENUM('ho','accra') NOT NULL,            -- which regional dashboard
    full_name   VARCHAR(200)    DEFAULT NULL,
    email       VARCHAR(255)    DEFAULT NULL,
    created_by  VARCHAR(100)    DEFAULT 'superadmin',
    is_active   TINYINT(1)      DEFAULT 1,
    last_login  TIMESTAMP       DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────
--  TABLE: activity_log
--  Audit trail of key events across both regions
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    region      VARCHAR(50)     DEFAULT NULL,
    action_type VARCHAR(100)    NOT NULL,
    description TEXT            DEFAULT NULL,
    actor       VARCHAR(100)    DEFAULT NULL,
    reference   VARCHAR(100)    DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
