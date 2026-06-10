-- =====================================================
--  LIMA FASHION — Seed Data
--  Run AFTER schema.sql to populate default products & settings
-- =====================================================

USE lima_fashion_db;

-- ─────────────────────────────────────────────────────
--  DEFAULT PRODUCTS (8 items matching the original JS defaults)
-- ─────────────────────────────────────────────────────
INSERT INTO products (name, category, price, badge, images) VALUES
('Silk Evening Dress',       'WOMEN',    349.00, 'HOT',         JSON_ARRAY()),
('Tailored Linen Suit',      'MEN',      529.00, 'NEW',         JSON_ARRAY()),
('Floral Midi Dress',        'WOMEN',    279.00, 'BEST SELLER', JSON_ARRAY()),
('Classic Oxford Shirt',     'MEN',      189.00, NULL,          JSON_ARRAY()),
('Kids Party Dress',         'CHILDREN', 149.00, 'NEW',         JSON_ARRAY()),
('Boys Chino Set',           'CHILDREN', 129.00, NULL,          JSON_ARRAY()),
('Boho Print Blouse',        'WOMEN',    219.00, NULL,          JSON_ARRAY()),
('Slim Fit Trousers',        'MEN',      249.00, 'HOT',         JSON_ARRAY());

-- ─────────────────────────────────────────────────────
--  DEFAULT SETTINGS
-- ─────────────────────────────────────────────────────
INSERT INTO settings (`key`, `value`) VALUES
('store_name',      'Lime.Fashion'),
('tagline',         'Style That Speaks For You'),
('support_email',   'hello@limefashion.gh'),
('phone',           '+233 24 000 0000'),
('whatsapp',        '+233 24 000 0000'),
('currency',        'Ghana Cedi (GH₵)'),
('city',            'Accra'),
('country',         'Ghana'),
('timezone',        'Africa/Accra (GMT+0)'),
('date_format',     'DD/MM/YYYY'),
('std_delivery_fee','30'),
('exp_delivery_fee','60'),
('free_threshold',  '500'),
('eta_accra',       '1–2 Business Days'),
('eta_other',       '3–5 Business Days'),
('min_order',       '50'),
('max_items',       '20'),
('vat_rate',        '15'),
('returns_window',  '7'),
('refund_days',     '5'),
('momo_name',       'Lime Fashion Ghana'),
('momo_number',     '024 000 0000'),
('momo_network',    'MTN Mobile Money'),
('bank_name',       'Ecobank Ghana'),
('bank_account',    '1234567890123'),
('bank_acct_name',  'Lime Fashion Ltd'),
('bank_swift',      'ECOCGHAC'),
('seo_title',       'Lime Fashion — Style That Speaks'),
('seo_description', 'Shop the latest fashion for men, women and children at Lime Fashion Ghana. Premium quality, fast delivery across all regions.'),
('seo_keywords',    'fashion ghana, lime fashion, clothing accra, dresses'),
('ga_id',           'G-XXXXXXXXXX'),
('fb_pixel',        ''),
('active_template', 'midnight-luxe'),
('hero_headline',   'Style That Speaks For You'),
('hero_subtext',    'Discover premium fashion for men, women and children.')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
