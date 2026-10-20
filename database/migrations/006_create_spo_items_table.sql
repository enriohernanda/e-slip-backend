-- Migration 006: Create spo_items table
CREATE TABLE IF NOT EXISTS spo_items (
    id BIGSERIAL PRIMARY KEY,
    e_slip_id BIGINT NOT NULL REFERENCES e_slips(id) ON DELETE CASCADE,
    spo_number VARCHAR(50) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 4 Audit Fields Standard PMO
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spo_items_slip_id ON spo_items(e_slip_id);
CREATE INDEX IF NOT EXISTS idx_spo_items_spo_number ON spo_items(spo_number);

