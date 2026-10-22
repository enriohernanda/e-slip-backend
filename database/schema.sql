CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS spo_items CASCADE;
DROP TABLE IF EXISTS pos_transaction_histories CASCADE;
DROP TABLE IF EXISTS e_slip_status_logs CASCADE;
DROP TABLE IF EXISTS e_slip_items CASCADE;
DROP TABLE IF EXISTS e_slips CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    nik VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    store_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);

CREATE INDEX idx_users_store_code ON users(store_code);
CREATE INDEX idx_users_active ON users(is_active);

CREATE TABLE e_slips (
    id BIGSERIAL PRIMARY KEY,
    slip_number VARCHAR(20) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    shipping_address TEXT,
    is_spo BOOLEAN NOT NULL DEFAULT FALSE,
    spo_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' 
        CHECK (status IN ('Open', 'Locked', 'Paid', 'Expired', 'Cancelled')),
    store_code VARCHAR(20) NOT NULL,
    outlet_id VARCHAR(10) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX idx_eslips_barcode ON e_slips(barcode);
CREATE INDEX idx_eslips_store_code ON e_slips(store_code);
CREATE INDEX idx_eslips_outlet_id ON e_slips(outlet_id);
CREATE INDEX idx_eslips_status ON e_slips(status);
CREATE INDEX idx_eslips_store_status ON e_slips(store_code, status);
CREATE INDEX idx_eslips_created_at ON e_slips(created_at DESC);
CREATE INDEX idx_eslips_expired_status ON e_slips(status, expired_at);
CREATE INDEX idx_eslips_user ON e_slips(created_by_user_id);

CREATE TABLE e_slip_items (
    id BIGSERIAL PRIMARY KEY,
    e_slip_id BIGINT NOT NULL REFERENCES e_slips(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    original_price DECIMAL(15, 2) NOT NULL CHECK (original_price >= 0),
    discount_price DECIMAL(15, 2),
    effective_price DECIMAL(15, 2) NOT NULL CHECK (effective_price >= 0),
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX idx_eslip_items_slip_id ON e_slip_items(e_slip_id);
CREATE INDEX idx_eslip_items_sku ON e_slip_items(sku);

CREATE TABLE e_slip_status_logs (
    id BIGSERIAL PRIMARY KEY,
    e_slip_id BIGINT NOT NULL REFERENCES e_slips(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    change_source VARCHAR(20) NOT NULL CHECK (change_source IN ('SALES_APP', 'POS', 'SYSTEM_JOB')),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX idx_status_logs_slip_id ON e_slip_status_logs(e_slip_id);
CREATE INDEX idx_status_logs_created_at ON e_slip_status_logs(created_at DESC);

CREATE TABLE pos_transaction_histories (
    id BIGSERIAL PRIMARY KEY,
    e_slip_id BIGINT REFERENCES e_slips(id) ON DELETE SET NULL,
    barcode VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INQUIRY', 'PAYMENT')),
    pos_terminal_id VARCHAR(50) NOT NULL,
    pos_store_code VARCHAR(20) NOT NULL,
    pos_outlet_id VARCHAR(10) NOT NULL,
    cashier_id VARCHAR(50) NOT NULL,
    receipt_number VARCHAR(50),
    response_status VARCHAR(30) NOT NULL 
        CHECK (response_status IN ('SUCCESS', 'FAILED', 'OUTLET_MISMATCH', 'NOT_FOUND', 'EXPIRED')),
    response_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX idx_pos_histories_barcode ON pos_transaction_histories(barcode);
CREATE INDEX idx_pos_histories_slip_id ON pos_transaction_histories(e_slip_id);
CREATE INDEX idx_pos_histories_receipt ON pos_transaction_histories(receipt_number);
CREATE INDEX idx_pos_histories_created_at ON pos_transaction_histories(created_at DESC);

CREATE TABLE spo_items (
    id BIGSERIAL PRIMARY KEY,
    e_slip_id BIGINT NOT NULL REFERENCES e_slips(id) ON DELETE CASCADE,
    spo_number VARCHAR(50) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX idx_spo_items_slip_id ON spo_items(e_slip_id);
CREATE INDEX idx_spo_items_spo_number ON spo_items(spo_number);
