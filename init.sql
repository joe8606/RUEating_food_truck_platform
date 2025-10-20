-- RUEating Database Initialization Script
-- Creates the food_truck table for the MVP

CREATE TABLE IF NOT EXISTS food_truck (
    truck_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cuisine_tags TEXT[], -- Array of cuisine types
    price_tier VARCHAR(20) CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')),
    avg_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data for demo purposes
INSERT INTO food_truck (name, cuisine_tags, price_tier, avg_rating) VALUES
('Taco Fiesta', ARRAY['Mexican', 'Latin'], '$$', 4.2),
('Burger Palace', ARRAY['American', 'Fast Food'], '$$', 3.8),
('Sushi Express', ARRAY['Japanese', 'Asian'], '$$$', 4.5),
('Pizza Corner', ARRAY['Italian', 'Pizza'], '$$', 4.0),
('Curry House', ARRAY['Indian', 'Spicy'], '$$', 4.3);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_truck_cuisine ON food_truck USING GIN(cuisine_tags);
CREATE INDEX IF NOT EXISTS idx_food_truck_rating ON food_truck(avg_rating);
CREATE INDEX IF NOT EXISTS idx_food_truck_price ON food_truck(price_tier);
