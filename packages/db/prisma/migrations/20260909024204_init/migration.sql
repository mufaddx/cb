-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `email_verified_at` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_codes` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `purpose` ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_2FA') NOT NULL,
    `code_hash` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_codes_user_id_purpose_idx`(`user_id`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `billing_address` JSON NULL,
    `gstin` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `logo_key` VARCHAR(191) NULL,
    `onboarding_step` INTEGER NOT NULL DEFAULT 0,
    `onboarding_complete` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `brands_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creators` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `profile_photo_key` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `languages` JSON NULL,
    `availability` ENUM('AVAILABLE', 'BUSY', 'PAUSED') NOT NULL DEFAULT 'AVAILABLE',
    `campaign_preferences` JSON NULL,
    `content_formats` JSON NULL,
    `kyc_status` VARCHAR(191) NOT NULL DEFAULT 'NOT_STARTED',
    `quality_score` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `completion_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `retention_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `risk_score` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `onboarding_step` INTEGER NOT NULL DEFAULT 0,
    `onboarding_complete` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `creators_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creator_categories` (
    `creator_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`creator_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brand_categories` (
    `brand_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`brand_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instagram_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `ig_user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `profile_image_key` VARCHAR(191) NULL,
    `access_token_encrypted` TEXT NOT NULL,
    `token_expires_at` DATETIME(3) NULL,
    `status` ENUM('NOT_CONNECTED', 'CONNECTED', 'NEEDS_RECONNECTION', 'SYNC_FAILED') NOT NULL DEFAULT 'CONNECTED',
    `connected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_synced_at` DATETIME(3) NULL,

    UNIQUE INDEX `instagram_accounts_creator_id_key`(`creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instagram_metric_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `instagram_account_id` VARCHAR(191) NOT NULL,
    `followers` INTEGER NOT NULL,
    `avg_reach` INTEGER NULL,
    `avg_views` INTEGER NULL,
    `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `instagram_metric_snapshots_instagram_account_id_captured_at_idx`(`instagram_account_id`, `captured_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `brand_id` VARCHAR(191) NOT NULL,
    `type` ENUM('CLIPPING', 'CREATOR_CONTENT', 'PRODUCT_REVIEW') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `objective` VARCHAR(191) NULL,
    `category_id` VARCHAR(191) NULL,
    `subcategory` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'INSTAGRAM',
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'LIVE', 'MATCHING', 'IN_PROGRESS', 'CONTENT_REVIEW', 'VERIFICATION', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
    `brief_json` JSON NULL,
    `targeting_metric` ENUM('FOLLOWER_COUNT', 'AVERAGE_REACH') NULL,
    `usage_right_types` JSON NULL,
    `usage_duration` VARCHAR(191) NULL,
    `exclusivity_on` BOOLEAN NOT NULL DEFAULT false,
    `exclusivity_json` JSON NULL,
    `retention_days` INTEGER NOT NULL DEFAULT 30,
    `disclosure_required` BOOLEAN NOT NULL DEFAULT true,
    `restricted_category` VARCHAR(191) NULL,
    `requires_manual_review` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `live_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,

    UNIQUE INDEX `campaigns_code_key`(`code`),
    INDEX `campaigns_brand_id_status_idx`(`brand_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_targeting_slabs` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `min_value` INTEGER NOT NULL,
    `max_value` INTEGER NULL,
    `payout_amount` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reserved` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_pricing_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `platform_fee` DECIMAL(12, 2) NOT NULL,
    `tax_amount` DECIMAL(12, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `snapshot_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_slabs` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_type` ENUM('CLIPPING', 'CREATOR_CONTENT', 'PRODUCT_REVIEW') NOT NULL,
    `metric` ENUM('FOLLOWER_COUNT', 'AVERAGE_REACH') NOT NULL,
    `min_value` INTEGER NOT NULL,
    `max_value` INTEGER NULL,
    `payout_amount` DECIMAL(12, 2) NOT NULL,
    `fee_amount` DECIMAL(12, 2) NOT NULL,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_rules` (
    `id` VARCHAR(191) NOT NULL,
    `tax_type` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(6, 3) NOT NULL,
    `threshold` DECIMAL(12, 2) NULL,
    `transaction_type` VARCHAR(191) NOT NULL,
    `applicable_party` VARCHAR(191) NOT NULL,
    `jurisdiction` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `invoice_treatment` VARCHAR(191) NULL,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_offers` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `slab_id` VARCHAR(191) NULL,
    `payout_amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('OFFERED', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'OFFERED',
    `offered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `viewed_at` DATETIME(3) NULL,
    `responded_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `campaign_offers_creator_id_status_idx`(`creator_id`, `status`),
    UNIQUE INDEX `campaign_offers_campaign_id_creator_id_key`(`campaign_id`, `creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `offer_id` VARCHAR(191) NOT NULL,
    `status` ENUM('OFFERED', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'POST_PENDING', 'POST_SUBMITTED', 'VERIFICATION', 'VERIFIED', 'FAILED', 'PAYABLE', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'ACCEPTED',
    `payout_amount` DECIMAL(12, 2) NOT NULL,
    `post_url` VARCHAR(191) NULL,
    `post_screenshot_key` VARCHAR(191) NULL,
    `post_submitted_at` DATETIME(3) NULL,
    `retention_status` ENUM('NOT_APPLICABLE', 'PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'NOT_APPLICABLE',
    `retention_required_until` DATETIME(3) NULL,
    `accepted_at` DATETIME(3) NULL,
    `verified_at` DATETIME(3) NULL,
    `payable_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campaign_assignments_offer_id_key`(`offer_id`),
    INDEX `campaign_assignments_campaign_id_status_idx`(`campaign_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `brand_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `images` JSON NULL,
    `price` DECIMAL(12, 2) NULL,
    `variants` JSON NULL,
    `inventory` INTEGER NOT NULL DEFAULT 0,
    `shipping_info` JSON NULL,
    `category` VARCHAR(191) NULL,
    `product_url` VARCHAR(191) NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_products` (
    `campaign_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`campaign_id`, `product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_addresses` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `line1` VARCHAR(191) NOT NULL,
    `line2` VARCHAR(191) NULL,
    `landmark` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shipping_addresses_assignment_id_key`(`assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `status` ENUM('ADDRESS_PENDING', 'ADDRESS_SUBMITTED', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'RECEIVED') NOT NULL DEFAULT 'ADDRESS_PENDING',
    `courier` VARCHAR(191) NULL,
    `tracking_number` VARCHAR(191) NULL,
    `shipped_at` DATETIME(3) NULL,
    `expected_delivery_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `received_at` DATETIME(3) NULL,
    `receipt_proof_key` VARCHAR(191) NULL,
    `issue_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipments_assignment_id_key`(`assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `file_key` VARCHAR(191) NOT NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(191) NULL,

    INDEX `content_submissions_assignment_id_version_idx`(`assignment_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `feedback` TEXT NOT NULL,
    `deadline` DATETIME(3) NULL,
    `requested_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `check_type` VARCHAR(191) NOT NULL,
    `result` ENUM('PASS', 'FAIL', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `automated` BOOLEAN NOT NULL DEFAULT false,
    `evidence_json` JSON NULL,
    `checked_by` VARCHAR(191) NULL,
    `checked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retention_checks` (
    `id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `day_number` INTEGER NOT NULL,
    `check_date` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `evidence_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `retention_checks_assignment_id_idx`(`assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` VARCHAR(191) NOT NULL,
    `owner_type` ENUM('BRAND', 'CREATOR') NOT NULL,
    `brand_id` VARCHAR(191) NULL,
    `creator_id` VARCHAR(191) NULL,
    `available_balance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `reserved_balance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_brand_id_key`(`brand_id`),
    UNIQUE INDEX `wallets_creator_id_key`(`creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `wallet_id` VARCHAR(191) NOT NULL,
    `type` ENUM('DEPOSIT', 'RESERVE', 'RELEASE', 'SPEND', 'CREATOR_EARNING', 'REFUND', 'WITHDRAWAL', 'ADJUSTMENT', 'TAX', 'FEE', 'REVERSAL') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `balance_after` DECIMAL(14, 2) NOT NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `campaign_id` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wallet_transactions_wallet_id_created_at_idx`(`wallet_id`, `created_at`),
    INDEX `wallet_transactions_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `brand_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `provider_order_id` VARCHAR(191) NULL,
    `provider_payment_id` VARCHAR(191) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` ENUM('CREATED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'CREATED',
    `idempotency_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_idempotency_key_key`(`idempotency_key`),
    INDEX `payments_brand_id_status_idx`(`brand_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_events` (
    `id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NOT NULL,
    `provider_event_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload_json` JSON NOT NULL,
    `signature_valid` BOOLEAN NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    UNIQUE INDEX `payment_events_provider_provider_event_id_key`(`provider`, `provider_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
    `initiated_by` VARCHAR(191) NOT NULL,
    `provider_refund_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `wallet_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `upi_id` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `reference_number` VARCHAR(191) NULL,
    `proof_key` VARCHAR(191) NULL,
    `rejection_reason` TEXT NULL,

    INDEX `withdrawals_creator_id_status_idx`(`creator_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kyc_records` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `document_number_encrypted` VARCHAR(191) NOT NULL,
    `document_key` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED') NOT NULL DEFAULT 'SUBMITTED',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `rejection_reason` TEXT NULL,

    INDEX `kyc_records_creator_id_status_idx`(`creator_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agreements` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `brand_id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `terms_version` VARCHAR(191) NOT NULL,
    `content_json` JSON NOT NULL,
    `document_key` VARCHAR(191) NOT NULL,
    `document_hash` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `agreements_assignment_id_key`(`assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agreement_acceptances` (
    `id` VARCHAR(191) NOT NULL,
    `agreement_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `document_hash` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `owner_user_id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `assignment_id` VARCHAR(191) NULL,
    `object_key` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,

    INDEX `documents_owner_user_id_type_idx`(`owner_user_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NULL,
    `sender_type` ENUM('BRAND', 'CREATOR', 'ADMIN', 'SYSTEM') NOT NULL,
    `body` TEXT NOT NULL,
    `attachment_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_campaign_id_created_at_idx`(`campaign_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disputes` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `opened_by_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'EVIDENCE_REQUESTED', 'DECISION', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `decision` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fraud_flags` (
    `id` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `flag_type` VARCHAR(191) NOT NULL,
    `risk_score` DECIMAL(5, 2) NOT NULL,
    `evidence_json` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_by` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,

    INDEX `fraud_flags_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `actor_role` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_actor_id_created_at_idx`(`actor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_codes` ADD CONSTRAINT `otp_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creators` ADD CONSTRAINT `creators_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_categories` ADD CONSTRAINT `creator_categories_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_categories` ADD CONSTRAINT `creator_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_categories` ADD CONSTRAINT `brand_categories_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_categories` ADD CONSTRAINT `brand_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_accounts` ADD CONSTRAINT `instagram_accounts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_metric_snapshots` ADD CONSTRAINT `instagram_metric_snapshots_instagram_account_id_fkey` FOREIGN KEY (`instagram_account_id`) REFERENCES `instagram_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_targeting_slabs` ADD CONSTRAINT `campaign_targeting_slabs_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_pricing_snapshots` ADD CONSTRAINT `campaign_pricing_snapshots_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_offers` ADD CONSTRAINT `campaign_offers_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_offers` ADD CONSTRAINT `campaign_offers_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_offers` ADD CONSTRAINT `campaign_offers_slab_id_fkey` FOREIGN KEY (`slab_id`) REFERENCES `campaign_targeting_slabs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_assignments` ADD CONSTRAINT `campaign_assignments_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_assignments` ADD CONSTRAINT `campaign_assignments_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_assignments` ADD CONSTRAINT `campaign_assignments_offer_id_fkey` FOREIGN KEY (`offer_id`) REFERENCES `campaign_offers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_products` ADD CONSTRAINT `campaign_products_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_products` ADD CONSTRAINT `campaign_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_addresses` ADD CONSTRAINT `shipping_addresses_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_addresses` ADD CONSTRAINT `shipping_addresses_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_submissions` ADD CONSTRAINT `content_submissions_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_revisions` ADD CONSTRAINT `content_revisions_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `content_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_verifications` ADD CONSTRAINT `post_verifications_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retention_checks` ADD CONSTRAINT `retention_checks_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_events` ADD CONSTRAINT `payment_events_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kyc_records` ADD CONSTRAINT `kyc_records_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreements` ADD CONSTRAINT `agreements_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreements` ADD CONSTRAINT `agreements_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `campaign_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement_acceptances` ADD CONSTRAINT `agreement_acceptances_agreement_id_fkey` FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement_acceptances` ADD CONSTRAINT `agreement_acceptances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
