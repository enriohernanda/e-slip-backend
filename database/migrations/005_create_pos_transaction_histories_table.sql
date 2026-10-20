-- Migration 005: Create pos_transaction_histories table
CREATE TABLE IF NOT EXISTS pos_transaction_histories (
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
    
    -- 4 Audit Fields Standard PMO
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_histories_barcode ON pos_transaction_histories(barcode);
CREATE INDEX IF NOT EXISTS idx_pos_histories_slip_id ON pos_transaction_histories(e_slip_id);
CREATE INDEX IF NOT EXISTS idx_pos_histories_receipt ON pos_transaction_histories(receipt_number);
CREATE INDEX IF NOT EXISTS idx_pos_histories_created_at ON pos_transaction_histories(created_at DESC);

