-- =============================================
-- CRIAÇÃO DAS TABELAS DO SISTEMA DE GESTÃO DE ATIVOS
-- Execute este script no MySQL
-- =============================================

-- 1. Tabela de Dispositivos (Assets)
CREATE TABLE IF NOT EXISTS `devices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` VARCHAR(36) NOT NULL COMMENT 'GUID único gerado pelo agente',
  `service_tag` VARCHAR(50) NULL COMMENT 'Service Tag Dell/HP/Lenovo pré-cadastrada',
  `hostname` VARCHAR(255) NULL,
  `serial_bios` VARCHAR(100) NULL,
  `system_uuid` VARCHAR(100) NULL,
  `primary_mac_address` VARCHAR(17) NULL,

  -- Status do enrollment
  `status` ENUM('pending', 'standby', 'active', 'blocked') NOT NULL DEFAULT 'pending' COMMENT 'pending=aguardando cadastro, standby=cadastrado aguardando ativação, active=ativo, blocked=bloqueado',
  `is_activated` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Se TRUE, o agente pode coletar dados',

  -- Sistema Operacional
  `os_name` VARCHAR(255) NULL,
  `os_version` VARCHAR(100) NULL,
  `os_build` VARCHAR(50) NULL,
  `os_architecture` VARCHAR(20) NULL,

  -- Agente
  `agent_version` VARCHAR(20) NULL,
  `agent_token` VARCHAR(500) NULL COMMENT 'JWT para autenticação do agente',
  `refresh_token` VARCHAR(500) NULL,

  -- Usuário e domínio
  `current_user` VARCHAR(255) NULL,
  `domain` VARCHAR(255) NULL,

  -- Métricas de tempo real (atualizadas via heartbeat/snapshot)
  `last_cpu_percent` FLOAT NULL,
  `last_ram_percent` FLOAT NULL,
  `last_disk_free_gb` FLOAT NULL,
  `uptime_seconds` BIGINT NULL,

  -- Timestamps
  `last_heartbeat_at` DATETIME NULL,
  `last_inventory_at` DATETIME NULL,
  `last_snapshot_at` DATETIME NULL,
  `enrolled_at` DATETIME NULL,
  `activated_at` DATETIME NULL,
  `blocked_at` DATETIME NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_device_id_unique` (`device_id`),
  UNIQUE KEY `devices_service_tag_unique` (`service_tag`),
  INDEX `devices_status_idx` (`status`),
  INDEX `devices_hostname_idx` (`hostname`),
  INDEX `devices_serial_bios_idx` (`serial_bios`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Hardware do Dispositivo
CREATE TABLE IF NOT EXISTS `device_hardware` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL,

  -- CPU
  `cpu_model` VARCHAR(255) NULL,
  `cpu_cores` INT NULL,
  `cpu_threads` INT NULL,
  `cpu_max_clock_mhz` INT NULL,
  `cpu_architecture` VARCHAR(20) NULL,

  -- RAM
  `ram_total_gb` DECIMAL(10,2) NULL,
  `ram_slots_used` INT NULL,
  `ram_slots_total` INT NULL,

  -- GPU
  `gpu_model` VARCHAR(255) NULL,
  `gpu_memory_gb` DECIMAL(10,2) NULL,

  -- Placa-mãe
  `motherboard_manufacturer` VARCHAR(255) NULL,
  `motherboard_model` VARCHAR(255) NULL,
  `bios_version` VARCHAR(100) NULL,
  `bios_date` VARCHAR(50) NULL,

  -- Timestamps
  `collected_at` DATETIME NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `device_hardware_device_id_idx` (`device_id`),
  CONSTRAINT `device_hardware_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Discos do Dispositivo
CREATE TABLE IF NOT EXISTS `device_disks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL,

  `drive_letter` VARCHAR(10) NULL,
  `volume_label` VARCHAR(255) NULL,
  `disk_type` VARCHAR(50) NULL COMMENT 'SSD, HDD, etc',
  `file_system` VARCHAR(20) NULL,
  `total_gb` DECIMAL(10,2) NOT NULL,
  `free_gb` DECIMAL(10,2) NOT NULL,
  `used_percent` DECIMAL(5,2) NOT NULL,
  `serial_number` VARCHAR(100) NULL,
  `model` VARCHAR(255) NULL,

  `collected_at` DATETIME NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `device_disks_device_id_idx` (`device_id`),
  CONSTRAINT `device_disks_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Interfaces de Rede do Dispositivo
CREATE TABLE IF NOT EXISTS `device_network` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL,

  `interface_name` VARCHAR(255) NOT NULL,
  `interface_type` VARCHAR(50) NULL,
  `mac_address` VARCHAR(17) NULL,
  `ipv4_address` VARCHAR(15) NULL,
  `ipv4_subnet` VARCHAR(15) NULL,
  `ipv4_gateway` VARCHAR(15) NULL,
  `ipv6_address` VARCHAR(45) NULL,
  `dns_servers` TEXT NULL COMMENT 'JSON array',
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_dhcp_enabled` BOOLEAN NULL,
  `speed_mbps` INT NULL,
  `wifi_ssid` VARCHAR(255) NULL,

  `collected_at` DATETIME NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `device_network_device_id_idx` (`device_id`),
  CONSTRAINT `device_network_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Software Instalado no Dispositivo
CREATE TABLE IF NOT EXISTS `device_software` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL,

  `name` VARCHAR(255) NOT NULL,
  `version` VARCHAR(100) NULL,
  `publisher` VARCHAR(255) NULL,
  `install_date` VARCHAR(20) NULL,
  `install_location` VARCHAR(500) NULL,
  `size_mb` DECIMAL(10,2) NULL,
  `is_system_component` BOOLEAN NOT NULL DEFAULT FALSE,

  `collected_at` DATETIME NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `device_software_device_id_idx` (`device_id`),
  INDEX `device_software_name_idx` (`name`),
  CONSTRAINT `device_software_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Snapshots em Tempo Real (para histórico)
CREATE TABLE IF NOT EXISTS `device_snapshots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `device_id` INT NOT NULL,

  -- Métricas
  `cpu_usage_percent` FLOAT NULL,
  `cpu_temperature` FLOAT NULL,
  `ram_usage_percent` FLOAT NULL,
  `ram_used_gb` DECIMAL(10,2) NULL,
  `ram_available_gb` DECIMAL(10,2) NULL,
  `gpu_usage_percent` FLOAT NULL,
  `gpu_temperature` FLOAT NULL,

  -- Rede
  `network_bytes_sent` BIGINT NULL,
  `network_bytes_received` BIGINT NULL,
  `network_send_speed_mbps` FLOAT NULL,
  `network_receive_speed_mbps` FLOAT NULL,

  `uptime_seconds` BIGINT NULL,
  `current_user` VARCHAR(255) NULL,

  `collected_at` DATETIME NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `device_snapshots_device_id_idx` (`device_id`),
  INDEX `device_snapshots_collected_at_idx` (`collected_at`),
  CONSTRAINT `device_snapshots_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela de Service Tags pré-cadastradas (antes do enrollment)
CREATE TABLE IF NOT EXISTS `service_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_tag` VARCHAR(50) NOT NULL COMMENT 'Service Tag Dell/HP/Lenovo',
  `description` VARCHAR(255) NULL COMMENT 'Descrição do ativo',
  `location` VARCHAR(255) NULL COMMENT 'Localização física',
  `department` VARCHAR(255) NULL COMMENT 'Departamento responsável',
  `responsible_user` VARCHAR(255) NULL COMMENT 'Usuário responsável',
  `notes` TEXT NULL,

  -- Status
  `is_enrolled` BOOLEAN NOT NULL DEFAULT FALSE,
  `device_id` INT NULL COMMENT 'ID do device após enrollment',

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `service_tags_service_tag_unique` (`service_tag`),
  INDEX `service_tags_device_id_idx` (`device_id`),
  CONSTRAINT `service_tags_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- Execute para verificar se as tabelas foram criadas:
-- SHOW TABLES LIKE 'device%';
-- SHOW TABLES LIKE 'service_tags';
-- DESCRIBE devices;
-- DESCRIBE device_hardware;
-- DESCRIBE service_tags;
