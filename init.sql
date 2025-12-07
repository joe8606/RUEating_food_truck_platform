-- RUEating Database Schema - Complete Implementation
-- Based on ERD Design with PostGIS Support

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS favorite CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS menu_item CASCADE;
DROP TABLE IF EXISTS menu_version CASCADE;
DROP TABLE IF EXISTS schedule CASCADE;
DROP TABLE IF EXISTS location_ping CASCADE;
DROP TABLE IF EXISTS food_truck CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Create USER table
CREATE TABLE "user" (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create FOOD_TRUCK table
CREATE TABLE food_truck (
    truck_id VARCHAR(50) PRIMARY KEY,
    owner_user_id VARCHAR(50) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cuisine_tags TEXT[], -- Array of cuisine types
    price_tier VARCHAR(20) CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')),
    avg_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    reviews_count INTEGER DEFAULT 0,
    is_open_now BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create LOCATION_PING table with PostGIS support
CREATE TABLE location_ping (
    ping_id VARCHAR(50) PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    
    -- PostGIS geography type for accurate spatial calculations
    geom GEOGRAPHY(POINT, 4326), -- WGS84 coordinate system
    
    -- Raw coordinates for easy querying
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Location quality metrics
    accuracy DECIMAL(8, 2), -- GPS accuracy in meters
    source VARCHAR(20) DEFAULT 'gps', -- gps, network, manual
    
    -- Status and timing
    status VARCHAR(20) DEFAULT 'active',
    ping_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Movement information
    speed_kmh DECIMAL(5, 2), -- Movement speed in km/h
    heading_degrees DECIMAL(5, 2) -- Direction in degrees
);

-- Create MENU_VERSION table
CREATE TABLE menu_version (
    menu_id VARCHAR(50) PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create MENU_ITEM table
CREATE TABLE menu_item (
    item_id VARCHAR(50) PRIMARY KEY,
    menu_id VARCHAR(50) NOT NULL REFERENCES menu_version(menu_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    dietary_tags TEXT[], -- Array of dietary restrictions/allergens
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create REVIEW table
CREATE TABLE review (
    review_id VARCHAR(50) PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create FAVORITE table
CREATE TABLE favorite (
    user_id VARCHAR(50) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, truck_id)
);

-- Create SCHEDULE table
CREATE TABLE schedule (
    schedule_id VARCHAR(50) PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    typical_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ORDER table
CREATE TABLE "order" (
    order_id VARCHAR(50) PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL REFERENCES food_truck(truck_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ORDER_ITEM table
CREATE TABLE order_item (
    order_item_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES "order"(order_id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to automatically update geometry field
CREATE OR REPLACE FUNCTION update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
CREATE TRIGGER trigger_update_geom
    BEFORE INSERT OR UPDATE ON location_ping
    FOR EACH ROW
    EXECUTE FUNCTION update_location_geom();

-- Create indexes for better performance
CREATE INDEX idx_food_truck_owner ON food_truck(owner_user_id);
CREATE INDEX idx_food_truck_cuisine ON food_truck USING GIN(cuisine_tags);
CREATE INDEX idx_food_truck_rating ON food_truck(avg_rating);
CREATE INDEX idx_food_truck_price ON food_truck(price_tier);
CREATE INDEX idx_food_truck_open ON food_truck(is_open_now);

-- PostGIS spatial indexes for location_ping
CREATE INDEX idx_location_ping_geom_gist ON location_ping USING GIST (geom);
CREATE INDEX idx_location_ping_truck_time ON location_ping (truck_id, ping_time DESC);
CREATE INDEX idx_location_ping_status ON location_ping (status) WHERE status = 'active';
CREATE INDEX idx_location_ping_accuracy ON location_ping (accuracy) WHERE accuracy IS NOT NULL;

CREATE INDEX idx_menu_version_truck ON menu_version(truck_id);
CREATE INDEX idx_menu_version_effective ON menu_version(effective_from, effective_to);

CREATE INDEX idx_menu_item_menu ON menu_item(menu_id);
CREATE INDEX idx_menu_item_available ON menu_item(available);
CREATE INDEX idx_menu_item_dietary ON menu_item USING GIN(dietary_tags);

CREATE INDEX idx_review_truck ON review(truck_id);
CREATE INDEX idx_review_user ON review(user_id);
CREATE INDEX idx_review_rating ON review(rating);
CREATE INDEX idx_review_status ON review(status);
CREATE INDEX idx_review_created ON review(created_at);

CREATE INDEX idx_favorite_user ON favorite(user_id);
CREATE INDEX idx_favorite_truck ON favorite(truck_id);

CREATE INDEX idx_schedule_truck ON schedule(truck_id);
CREATE INDEX idx_schedule_day ON schedule(day_of_week);

CREATE INDEX idx_order_truck ON "order"(truck_id);
CREATE INDEX idx_order_status ON "order"(status);
CREATE INDEX idx_order_created ON "order"(created_at);
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_order_item_item ON order_item(item_id);

-- Insert sample data for demonstration
INSERT INTO "user" (user_id, name, email) VALUES
('user_001', 'John Doe', 'john@example.com'),
('user_002', 'Jane Smith', 'jane@example.com'),
('user_003', 'Mike Johnson', 'mike@example.com'),
('user_004', 'Sarah Wilson', 'sarah@example.com'),
('user_005', 'David Brown', 'david@example.com'),
('user_006', 'Emily Chen', 'emily@example.com'),
('user_007', 'Robert Taylor', 'robert@example.com'),
('user_008', 'Lisa Anderson', 'lisa@example.com'),
('user_009', 'James Wilson', 'james@example.com'),
('user_010', 'Maria Garcia', 'maria@example.com'),
('user_011', 'Thomas Lee', 'thomas@example.com'),
('user_012', 'Jennifer Martinez', 'jennifer@example.com'),
('user_013', 'William Davis', 'william@example.com'),
('user_014', 'Patricia White', 'patricia@example.com'),
('user_015', 'Christopher Moore', 'chris@example.com'),
('user_016', 'Linda Jackson', 'linda@example.com'),
('user_017', 'Daniel Harris', 'daniel@example.com'),
('user_018', 'Barbara Thompson', 'barbara@example.com'),
('user_019', 'Matthew Young', 'matthew@example.com'),
('user_020', 'Susan Clark', 'susan@example.com');

INSERT INTO food_truck (truck_id, owner_user_id, name, cuisine_tags, price_tier, avg_rating, reviews_count, is_open_now) VALUES
('truck_001', 'user_001', 'Taco Fiesta', ARRAY['Mexican', 'Latin'], '$$', 4.2, 15, true),
('truck_002', 'user_002', 'Burger Palace', ARRAY['American', 'Fast Food'], '$$', 3.8, 12, true),
('truck_003', 'user_003', 'Sushi Express', ARRAY['Japanese', 'Asian'], '$$$', 4.5, 8, false),
('truck_004', 'user_004', 'Pizza Corner', ARRAY['Italian', 'Pizza'], '$$', 4.0, 20, true),
('truck_005', 'user_005', 'Curry House', ARRAY['Indian', 'Spicy'], '$$', 4.3, 18, true),
('truck_006', 'user_006', 'BBQ Smokehouse', ARRAY['American', 'BBQ'], '$$$', 4.6, 25, true),
('truck_007', 'user_007', 'Noodle Express', ARRAY['Asian', 'Chinese'], '$$', 4.1, 14, true),
('truck_008', 'user_008', 'Falafel King', ARRAY['Middle Eastern', 'Vegetarian'], '$', 4.4, 22, true),
('truck_009', 'user_009', 'Ice Cream Dream', ARRAY['Dessert', 'Ice Cream'], '$', 4.7, 30, true),
('truck_010', 'user_010', 'Thai Spice', ARRAY['Thai', 'Spicy'], '$$', 4.5, 19, true),
('truck_011', 'user_011', 'Korean BBQ', ARRAY['Korean', 'BBQ'], '$$$', 4.3, 16, false),
('truck_012', 'user_012', 'Mediterranean Delight', ARRAY['Mediterranean', 'Healthy'], '$$', 4.2, 17, true),
('truck_013', 'user_013', 'Waffle House', ARRAY['Breakfast', 'Belgian'], '$$', 4.0, 13, true),
('truck_014', 'user_014', 'Seafood Shack', ARRAY['Seafood', 'American'], '$$$', 4.4, 21, true),
('truck_015', 'user_015', 'Vegan Paradise', ARRAY['Vegan', 'Healthy'], '$$', 4.6, 28, true),
('truck_016', 'user_016', 'Coffee & Donuts', ARRAY['Breakfast', 'Coffee'], '$', 4.3, 24, true),
('truck_017', 'user_017', 'Ramen Station', ARRAY['Japanese', 'Ramen'], '$$', 4.5, 20, false),
('truck_018', 'user_018', 'Greek Gyro', ARRAY['Greek', 'Mediterranean'], '$$', 4.1, 15, true),
('truck_019', 'user_019', 'Fried Chicken Express', ARRAY['American', 'Fried'], '$$', 3.9, 11, true),
('truck_020', 'user_020', 'Smoothie Bar', ARRAY['Healthy', 'Smoothies'], '$', 4.2, 18, true);

INSERT INTO location_ping (ping_id, truck_id, latitude, longitude, accuracy, source, status, speed_kmh, heading_degrees, ping_time) VALUES
('ping_001', 'truck_001', 40.5007, -74.4474, 5.0, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_002', 'truck_002', 40.5050, -74.4520, 3.5, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_003', 'truck_003', 40.4950, -74.4420, 8.2, 'network', 'inactive', 0.0, 0.0, NOW() - INTERVAL '2 hours'),
('ping_004', 'truck_004', 40.5100, -74.4550, 4.1, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_005', 'truck_005', 40.5000, -74.4500, 6.3, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_006', 'truck_006', 40.5020, -74.4480, 4.5, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_007', 'truck_007', 40.4980, -74.4450, 5.2, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_008', 'truck_008', 40.5070, -74.4530, 3.8, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_009', 'truck_009', 40.5030, -74.4490, 4.0, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_010', 'truck_010', 40.4960, -74.4430, 5.5, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_011', 'truck_011', 40.5090, -74.4540, 4.3, 'network', 'inactive', 0.0, 0.0, NOW() - INTERVAL '1 hour'),
('ping_012', 'truck_012', 40.5010, -74.4460, 4.7, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_013', 'truck_013', 40.5040, -74.4510, 3.9, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_014', 'truck_014', 40.4970, -74.4440, 5.1, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_015', 'truck_015', 40.5080, -74.4560, 4.2, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_016', 'truck_016', 40.4990, -74.4410, 4.8, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_017', 'truck_017', 40.5060, -74.4520, 4.4, 'network', 'inactive', 0.0, 0.0, NOW() - INTERVAL '30 minutes'),
('ping_018', 'truck_018', 40.5025, -74.4475, 4.6, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_019', 'truck_019', 40.5005, -74.4495, 4.9, 'gps', 'active', 0.0, 0.0, NOW()),
('ping_020', 'truck_020', 40.5035, -74.4505, 4.1, 'gps', 'active', 0.0, 0.0, NOW());

INSERT INTO menu_version (menu_id, truck_id, version_no, effective_from, effective_to, notes) VALUES
('menu_001', 'truck_001', 1, NOW() - INTERVAL '30 days', NULL, 'Initial menu'),
('menu_002', 'truck_002', 1, NOW() - INTERVAL '20 days', NULL, 'Initial menu'),
('menu_003', 'truck_003', 1, NOW() - INTERVAL '15 days', NULL, 'Initial menu'),
('menu_004', 'truck_004', 1, NOW() - INTERVAL '25 days', NULL, 'Initial menu'),
('menu_005', 'truck_005', 1, NOW() - INTERVAL '10 days', NULL, 'Initial menu'),
('menu_006', 'truck_006', 1, NOW() - INTERVAL '28 days', NULL, 'Initial menu'),
('menu_007', 'truck_007', 1, NOW() - INTERVAL '22 days', NULL, 'Initial menu'),
('menu_008', 'truck_008', 1, NOW() - INTERVAL '18 days', NULL, 'Initial menu'),
('menu_009', 'truck_009', 1, NOW() - INTERVAL '12 days', NULL, 'Initial menu'),
('menu_010', 'truck_010', 1, NOW() - INTERVAL '16 days', NULL, 'Initial menu'),
('menu_011', 'truck_011', 1, NOW() - INTERVAL '14 days', NULL, 'Initial menu'),
('menu_012', 'truck_012', 1, NOW() - INTERVAL '24 days', NULL, 'Initial menu'),
('menu_013', 'truck_013', 1, NOW() - INTERVAL '11 days', NULL, 'Initial menu'),
('menu_014', 'truck_014', 1, NOW() - INTERVAL '19 days', NULL, 'Initial menu'),
('menu_015', 'truck_015', 1, NOW() - INTERVAL '13 days', NULL, 'Initial menu'),
('menu_016', 'truck_016', 1, NOW() - INTERVAL '17 days', NULL, 'Initial menu'),
('menu_017', 'truck_017', 1, NOW() - INTERVAL '21 days', NULL, 'Initial menu'),
('menu_018', 'truck_018', 1, NOW() - INTERVAL '15 days', NULL, 'Initial menu'),
('menu_019', 'truck_019', 1, NOW() - INTERVAL '9 days', NULL, 'Initial menu'),
('menu_020', 'truck_020', 1, NOW() - INTERVAL '7 days', NULL, 'Initial menu');

INSERT INTO menu_item (item_id, menu_id, name, description, price, dietary_tags, available) VALUES
('item_001', 'menu_001', 'Beef Tacos', 'Traditional beef tacos with fresh ingredients', 8.99, ARRAY['Gluten-Free'], true),
('item_002', 'menu_001', 'Chicken Burrito', 'Large burrito with chicken, rice, and beans', 10.99, ARRAY['Dairy-Free'], true),
('item_003', 'menu_002', 'Classic Burger', 'Beef burger with lettuce, tomato, and onion', 12.99, ARRAY['Contains Gluten'], true),
('item_004', 'menu_002', 'Veggie Burger', 'Plant-based burger with all the fixings', 11.99, ARRAY['Vegan', 'Gluten-Free'], true),
('item_005', 'menu_003', 'Salmon Roll', 'Fresh salmon sushi roll', 14.99, ARRAY['Contains Fish'], true),
('item_006', 'menu_006', 'BBQ Ribs', 'Slow-cooked pork ribs with BBQ sauce', 16.99, ARRAY['Contains Pork'], true),
('item_007', 'menu_007', 'Beef Noodles', 'Traditional Chinese beef noodle soup', 11.99, ARRAY['Contains Gluten'], true),
('item_008', 'menu_008', 'Falafel Wrap', 'Crispy falafel with tahini sauce', 7.99, ARRAY['Vegan'], true),
('item_009', 'menu_009', 'Vanilla Ice Cream', 'Creamy vanilla ice cream', 4.99, ARRAY['Contains Dairy'], true),
('item_010', 'menu_010', 'Pad Thai', 'Classic Thai stir-fried noodles', 12.99, ARRAY['Contains Peanuts'], true),
('item_011', 'menu_011', 'Bulgogi', 'Marinated Korean beef with rice', 13.99, ARRAY['Contains Gluten'], true),
('item_012', 'menu_011', 'Kimchi Fried Rice', 'Spicy kimchi with fried rice', 11.99, ARRAY['Vegetarian'], true),
('item_013', 'menu_012', 'Greek Salad', 'Fresh vegetables with feta cheese', 9.99, ARRAY['Vegetarian'], true),
('item_014', 'menu_012', 'Gyro Wrap', 'Lamb gyro with tzatziki sauce', 10.99, ARRAY['Contains Gluten'], true),
('item_015', 'menu_013', 'Belgian Waffle', 'Classic Belgian waffle with syrup', 6.99, ARRAY['Contains Gluten', 'Contains Dairy'], true),
('item_016', 'menu_013', 'Chicken & Waffles', 'Fried chicken with waffle', 12.99, ARRAY['Contains Gluten'], true),
('item_017', 'menu_014', 'Fish & Chips', 'Beer-battered fish with fries', 14.99, ARRAY['Contains Fish', 'Contains Gluten'], true),
('item_018', 'menu_014', 'Lobster Roll', 'Fresh lobster on buttered roll', 18.99, ARRAY['Contains Shellfish'], true),
('item_019', 'menu_015', 'Vegan Burger', 'Plant-based burger with vegan cheese', 11.99, ARRAY['Vegan'], true),
('item_020', 'menu_015', 'Quinoa Bowl', 'Quinoa with roasted vegetables', 10.99, ARRAY['Vegan', 'Gluten-Free'], true),
('item_021', 'menu_016', 'Coffee', 'Freshly brewed coffee', 3.99, ARRAY['Vegan'], true),
('item_022', 'menu_016', 'Donut', 'Fresh glazed donut', 2.99, ARRAY['Contains Gluten', 'Contains Dairy'], true),
('item_023', 'menu_017', 'Tonkotsu Ramen', 'Rich pork bone broth ramen', 13.99, ARRAY['Contains Pork', 'Contains Gluten'], true),
('item_024', 'menu_017', 'Miso Ramen', 'Miso-based ramen with vegetables', 12.99, ARRAY['Vegetarian'], true),
('item_025', 'menu_018', 'Greek Gyro', 'Traditional Greek gyro with lamb', 10.99, ARRAY['Contains Gluten'], true),
('item_026', 'menu_018', 'Souvlaki', 'Grilled chicken skewers', 9.99, ARRAY['Gluten-Free'], true),
('item_027', 'menu_019', 'Fried Chicken', 'Crispy fried chicken pieces', 8.99, ARRAY['Contains Gluten'], true),
('item_028', 'menu_019', 'Chicken Tenders', 'Breaded chicken tenders', 9.99, ARRAY['Contains Gluten'], true),
('item_029', 'menu_020', 'Berry Smoothie', 'Mixed berries with yogurt', 5.99, ARRAY['Vegetarian'], true),
('item_030', 'menu_020', 'Green Smoothie', 'Spinach, kale, and fruits', 5.99, ARRAY['Vegan'], true),
('item_031', 'menu_004', 'Margherita Pizza', 'Classic pizza with tomato and mozzarella', 12.99, ARRAY['Vegetarian'], true),
('item_032', 'menu_004', 'Pepperoni Pizza', 'Pizza with pepperoni and cheese', 14.99, ARRAY['Contains Gluten'], true),
('item_033', 'menu_005', 'Chicken Curry', 'Spicy chicken curry with rice', 11.99, ARRAY['Gluten-Free'], true),
('item_034', 'menu_005', 'Vegetable Curry', 'Mixed vegetables in curry sauce', 9.99, ARRAY['Vegan', 'Gluten-Free'], true);

INSERT INTO review (review_id, truck_id, user_id, rating, text, status, upvotes, downvotes) VALUES
('review_001', 'truck_001', 'user_002', 5, 'Amazing tacos! Fresh ingredients and great flavor.', 'published', 3, 0),
('review_002', 'truck_001', 'user_003', 4, 'Good food, but a bit pricey.', 'published', 1, 0),
('review_003', 'truck_002', 'user_001', 3, 'Decent burger, nothing special.', 'published', 0, 1),
('review_004', 'truck_003', 'user_004', 5, 'Best sushi in town!', 'published', 5, 0),
('review_005', 'truck_004', 'user_005', 4, 'Great pizza, fast service.', 'published', 2, 0),
('review_006', 'truck_006', 'user_001', 5, 'Best BBQ I''ve ever had!', 'published', 8, 0),
('review_007', 'truck_007', 'user_002', 4, 'Delicious noodles, very authentic.', 'published', 4, 0),
('review_008', 'truck_008', 'user_003', 5, 'Perfect falafel, great value!', 'published', 6, 0),
('review_009', 'truck_009', 'user_004', 5, 'Ice cream is amazing!', 'published', 10, 0),
('review_010', 'truck_010', 'user_005', 4, 'Spicy and flavorful Thai food.', 'published', 3, 0);

INSERT INTO favorite (user_id, truck_id) VALUES
('user_002', 'truck_001'),
('user_003', 'truck_001'),
('user_001', 'truck_002'),
('user_004', 'truck_003'),
('user_005', 'truck_004');

INSERT INTO schedule (schedule_id, truck_id, day_of_week, start_time, end_time, typical_location) VALUES
('schedule_001', 'truck_001', 'Monday', '10:00', '18:00', 'Rutgers Student Center'),
('schedule_002', 'truck_001', 'Tuesday', '10:00', '18:00', 'College Ave Campus'),
('schedule_003', 'truck_001', 'Wednesday', '10:00', '18:00', 'Busch Campus'),
('schedule_004', 'truck_002', 'Monday', '11:00', '19:00', 'George Street'),
('schedule_005', 'truck_002', 'Friday', '11:00', '19:00', 'Downtown Plaza'),
('schedule_006', 'truck_003', 'Wednesday', '12:00', '20:00', 'Food Court'),
('schedule_007', 'truck_003', 'Saturday', '12:00', '20:00', 'Rutgers Plaza'),
('schedule_008', 'truck_004', 'Friday', '17:00', '23:00', 'Night Market'),
('schedule_009', 'truck_005', 'Monday', '11:00', '19:00', 'Business District'),
('schedule_010', 'truck_005', 'Thursday', '11:00', '19:00', 'University Campus');

-- Create function to update food truck ratings when reviews change
CREATE OR REPLACE FUNCTION update_truck_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE food_truck 
    SET avg_rating = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM review 
        WHERE truck_id = COALESCE(NEW.truck_id, OLD.truck_id)
        AND status = 'published'
    ),
    reviews_count = (
        SELECT COUNT(*)
        FROM review 
        WHERE truck_id = COALESCE(NEW.truck_id, OLD.truck_id)
        AND status = 'published'
    )
    WHERE truck_id = COALESCE(NEW.truck_id, OLD.truck_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update ratings
CREATE TRIGGER trigger_update_rating
    AFTER INSERT OR UPDATE OR DELETE ON review
    FOR EACH ROW
    EXECUTE FUNCTION update_truck_rating();