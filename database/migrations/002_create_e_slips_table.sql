-- Migration 002: Create e_slips table
CREATE TABLE IF NOT EXISTS e_slips (
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
    
    -- Status Timestamp Tracking
    expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- 4 Audit Fields Standard PMO
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eslips_barcode ON e_slips(barcode);
CREATE INDEX IF NOT EXISTS idx_eslips_store_code ON e_slips(store_code);
CREATE INDEX IF NOT EXISTS idx_eslips_outlet_id ON e_slips(outlet_id);
CREATE INDEX IF NOT EXISTS idx_eslips_status ON e_slips(status);
CREATE INDEX IF NOT EXISTS idx_eslips_store_status ON e_slips(store_code, status);
CREATE INDEX IF NOT EXISTS idx_eslips_created_at ON e_slips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eslips_expired_status ON e_slips(status, expired_at);
CREATE INDEX IF NOT EXISTS idx_eslips_user ON e_slips(created_by_user_id);

