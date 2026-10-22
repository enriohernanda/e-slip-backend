CREATE TABLE IF NOT EXISTS e_slip_items (
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

CREATE INDEX IF NOT EXISTS idx_eslip_items_slip_id ON e_slip_items(e_slip_id);
CREATE INDEX IF NOT EXISTS idx_eslip_items_sku ON e_slip_items(sku);
