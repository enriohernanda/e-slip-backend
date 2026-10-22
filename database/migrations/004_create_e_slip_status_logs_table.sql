CREATE TABLE IF NOT EXISTS e_slip_status_logs (
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

CREATE INDEX IF NOT EXISTS idx_status_logs_slip_id ON e_slip_status_logs(e_slip_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_created_at ON e_slip_status_logs(created_at DESC);
