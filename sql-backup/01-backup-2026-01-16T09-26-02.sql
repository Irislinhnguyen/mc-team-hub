-- Backup current table
CREATE TABLE `GI_publisher.updated_product_name_backup_2026-01-16T09-26-02`
AS
SELECT *
FROM `GI_publisher.updated_product_name`;

-- Verify backup
SELECT COUNT(*) as backup_count FROM `GI_publisher.updated_product_name_backup_2026-01-16T09-26-02`;