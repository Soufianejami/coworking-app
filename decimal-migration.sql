-- Modifier les colonnes de la table products
ALTER TABLE products ALTER COLUMN price TYPE double precision;

-- Modifier les colonnes de la table transactions
ALTER TABLE transactions ALTER COLUMN amount TYPE double precision;

-- Modifier les colonnes de la table daily_stats
ALTER TABLE daily_stats ALTER COLUMN total_revenue TYPE double precision;
ALTER TABLE daily_stats ALTER COLUMN entries_revenue TYPE double precision;
ALTER TABLE daily_stats ALTER COLUMN subscriptions_revenue TYPE double precision;
ALTER TABLE daily_stats ALTER COLUMN cafe_revenue TYPE double precision;

-- Modifier les colonnes de la table expenses
ALTER TABLE expenses ALTER COLUMN amount TYPE double precision;

-- Modifier les colonnes de la table inventory
ALTER TABLE inventory ALTER COLUMN quantity TYPE double precision;
ALTER TABLE inventory ALTER COLUMN min_threshold TYPE double precision;
ALTER TABLE inventory ALTER COLUMN purchase_price TYPE double precision;

-- Modifier les colonnes de la table stock_movements
ALTER TABLE stock_movements ALTER COLUMN quantity TYPE double precision;

-- Modifier les colonnes de la table ingredients
ALTER TABLE ingredients ALTER COLUMN purchase_price TYPE double precision;
ALTER TABLE ingredients ALTER COLUMN quantity_in_stock TYPE double precision;
ALTER TABLE ingredients ALTER COLUMN min_threshold TYPE double precision;

-- Modifier les colonnes de la table recipe_ingredients
ALTER TABLE recipe_ingredients ALTER COLUMN quantity TYPE double precision;

-- Modifier les colonnes de la table ingredient_movements
ALTER TABLE ingredient_movements ALTER COLUMN quantity TYPE double precision;