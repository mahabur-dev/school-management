ALTER TABLE "schools"
ADD COLUMN "contact_email" VARCHAR(254),
ADD COLUMN "phone_number" VARCHAR(32),
ADD COLUMN "website_url" VARCHAR(500),
ADD COLUMN "address_line_1" VARCHAR(180),
ADD COLUMN "address_line_2" VARCHAR(180),
ADD COLUMN "city" VARCHAR(100),
ADD COLUMN "state_or_province" VARCHAR(100),
ADD COLUMN "postal_code" VARCHAR(24),
ADD COLUMN "country" VARCHAR(100);
