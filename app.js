const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rueating',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// ===== GEOGRAPHIC UTILITIES =====
// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mock location data for food trucks (around Rutgers University, New Brunswick, NJ)
// Format: { truck_id: [latitude, longitude, address, phone, image_url] }
const MOCK_TRUCK_LOCATIONS = {
  'truck_001': [40.5007, -74.4474, 'Rutgers Student Center, New Brunswick, NJ', '(732) 555-0101', 'https://images.unsplash.com/photo-1565299585323-38174c0b5e3a?w=400&h=300&fit=crop'],
  'truck_002': [40.5050, -74.4520, 'College Ave Campus, New Brunswick, NJ', '(732) 555-0102', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop'],
  'truck_003': [40.4950, -74.4420, 'Busch Campus, Piscataway, NJ', '(732) 555-0103', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop'],
  'truck_004': [40.5100, -74.4550, 'George Street, New Brunswick, NJ', '(732) 555-0104', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop'],
  'truck_005': [40.5000, -74.4500, 'Rutgers Plaza, New Brunswick, NJ', '(732) 555-0105', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop'],
  'truck_006': [40.5020, -74.4480, 'Livingston Campus, Piscataway, NJ', '(732) 555-0106', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop'],
  'truck_007': [40.4980, -74.4450, 'Cook-Douglass Campus, New Brunswick, NJ', '(732) 555-0107', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop'],
  'truck_008': [40.5070, -74.4530, 'Downtown New Brunswick, NJ', '(732) 555-0108', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop'],
  'truck_009': [40.5030, -74.4490, 'Rutgers Plaza, New Brunswick, NJ', '(732) 555-0109', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop'],
  'truck_010': [40.4960, -74.4430, 'Busch Campus, Piscataway, NJ', '(732) 555-0110', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop'],
  'truck_011': [40.5090, -74.4540, 'College Ave Campus, New Brunswick, NJ', '(732) 555-0111', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop'],
  'truck_012': [40.5010, -74.4460, 'George Street, New Brunswick, NJ', '(732) 555-0112', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
  'truck_013': [40.5040, -74.4510, 'Rutgers Student Center, New Brunswick, NJ', '(732) 555-0113', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop'],
  'truck_014': [40.4970, -74.4440, 'Livingston Campus, Piscataway, NJ', '(732) 555-0114', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop'],
  'truck_015': [40.5080, -74.4560, 'Downtown New Brunswick, NJ', '(732) 555-0115', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
  'truck_016': [40.4990, -74.4410, 'Cook-Douglass Campus, New Brunswick, NJ', '(732) 555-0116', 'https://images.unsplash.com/photo-1511920170033-83939bb485ea?w=400&h=300&fit=crop'],
  'truck_017': [40.5060, -74.4520, 'Busch Campus, Piscataway, NJ', '(732) 555-0117', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop'],
  'truck_018': [40.5025, -74.4475, 'Rutgers Plaza, New Brunswick, NJ', '(732) 555-0118', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop'],
  'truck_019': [40.5005, -74.4495, 'College Ave Campus, New Brunswick, NJ', '(732) 555-0119', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop'],
  'truck_020': [40.5035, -74.4505, 'George Street, New Brunswick, NJ', '(732) 555-0120', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop'],
};

// Helper function to get truck location (mock data or from database)
function getTruckLocation(truckId) {
  return MOCK_TRUCK_LOCATIONS[truckId] || null;
}

// Helper function to get truck phone number
function getTruckPhone(truckId) {
  const location = MOCK_TRUCK_LOCATIONS[truckId];
  return location ? location[3] : null;
}

// Helper function to get truck image URL
function getTruckImage(truckId) {
  const location = MOCK_TRUCK_LOCATIONS[truckId];
  return location ? location[4] : null;
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RUEating API is running',
    timestamp: new Date().toISOString()
  });
});

// GET /trucks - Retrieve all food trucks
app.get('/trucks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, created_at 
      FROM food_truck 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching trucks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food trucks'
    });
  }
});

// POST /trucks - Add a new food truck
app.post('/trucks', async (req, res) => {
  try {
    const { name, cuisine_tags, price_tier, avg_rating } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }
    
    if (price_tier && !['$', '$$', '$$$', '$$$$'].includes(price_tier)) {
      return res.status(400).json({
        success: false,
        error: 'Price tier must be one of: $, $$, $$$, $$$$'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO food_truck (name, cuisine_tags, price_tier, avg_rating)
      VALUES ($1, $2, $3, $4)
      RETURNING truck_id, name, cuisine_tags, price_tier, avg_rating, created_at
    `, [name, cuisine_tags || [], price_tier || '$$', avg_rating || 0.00]);
    
    res.status(201).json({
      success: true,
      message: 'Food truck added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add food truck'
    });
  }
});

// GET /trucks/nearby - Find nearby food trucks by location
// Query params: lat, lng, radius (in km, default 5km), limit (default 10)
app.get('/trucks/nearby', async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5; // default 5km
    const limit = parseInt(req.query.limit) || 10;
    
    // Validation
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required (lat, lng query parameters)'
      });
    }
    
    if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude values'
      });
    }
    
    // Get all trucks from database
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, created_at, is_open_now
      FROM food_truck 
      ORDER BY avg_rating DESC
    `);
    
    // Add location and distance to each truck
    const trucksWithLocation = result.rows.map(truck => {
      const location = getTruckLocation(truck.truck_id);
      if (!location) {
        return null; // Skip trucks without location data
      }
      
      const [truckLat, truckLng, address, phone, image_url] = location;
      const distance = calculateDistance(userLat, userLng, truckLat, truckLng);
      
      return {
        ...truck,
        latitude: truckLat,
        longitude: truckLng,
        address: address,
        phone: phone,
        image_url: image_url,
        distance: parseFloat(distance.toFixed(2)) // Round to 2 decimal places
      };
    }).filter(truck => truck !== null); // Remove trucks without location
    
    // Filter by radius and sort by distance
    const nearbyTrucks = trucksWithLocation
      .filter(truck => truck.distance <= radius)
      .sort((a, b) => a.distance - b.distance) // Sort by distance (closest first)
      .slice(0, limit);
    
    res.json({
      success: true,
      count: nearbyTrucks.length,
      search_location: {
        latitude: userLat,
        longitude: userLng,
        radius_km: radius
      },
      data: nearbyTrucks
    });
  } catch (error) {
    console.error('Error finding nearby trucks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby food trucks'
    });
  }
});

// GET /trucks/all-with-location - Get all trucks with location data
app.get('/trucks/all-with-location', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, created_at, is_open_now
      FROM food_truck 
      ORDER BY created_at DESC
    `);
    
    // Add location data to each truck
    const trucksWithLocation = result.rows.map(truck => {
      const location = getTruckLocation(truck.truck_id);
      if (location) {
        truck.latitude = location[0];
        truck.longitude = location[1];
        truck.address = location[2];
        truck.phone = location[3];
        truck.image_url = location[4];
      }
      return truck;
    });
    
    res.json({
      success: true,
      count: trucksWithLocation.length,
      data: trucksWithLocation
    });
  } catch (error) {
    console.error('Error fetching trucks with location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food trucks'
    });
  }
});

// GET /trucks/by-cuisine - Search trucks by cuisine type
// Query params: cuisine (required), lat, lng (optional for distance calculation)
app.get('/trucks/by-cuisine', async (req, res) => {
  try {
    const cuisine = req.query.cuisine;
    const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
    const userLng = req.query.lng ? parseFloat(req.query.lng) : null;
    
    if (!cuisine) {
      return res.status(400).json({
        success: false,
        error: 'Cuisine type is required (cuisine query parameter)'
      });
    }
    
    // Search for trucks with matching cuisine tag
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, created_at, is_open_now
      FROM food_truck 
      WHERE $1 = ANY(cuisine_tags)
      ORDER BY avg_rating DESC
    `, [cuisine]);
    
    // Add location and distance data to each truck
    const trucksWithLocation = result.rows.map(truck => {
      const location = getTruckLocation(truck.truck_id);
      if (location) {
        truck.latitude = location[0];
        truck.longitude = location[1];
        truck.address = location[2];
        
        // Calculate distance if user location is provided
        if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
          const distance = calculateDistance(userLat, userLng, location[0], location[1]);
          truck.distance = parseFloat(distance.toFixed(2));
        }
      }
      return truck;
    });
    
    // Sort by distance if available, otherwise by rating
    if (userLat !== null && userLng !== null) {
      trucksWithLocation.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return parseFloat(b.avg_rating) - parseFloat(a.avg_rating);
      });
    }
    
    res.json({
      success: true,
      count: trucksWithLocation.length,
      search_cuisine: cuisine,
      user_location: userLat && userLng ? { latitude: userLat, longitude: userLng } : null,
      data: trucksWithLocation
    });
  } catch (error) {
    console.error('Error searching trucks by cuisine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search food trucks by cuisine'
    });
  }
});

// GET /trucks/cuisine-types - Get all available cuisine types
app.get('/trucks/cuisine-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT unnest(cuisine_tags) as cuisine_type
      FROM food_truck
      ORDER BY cuisine_type
    `);
    
    const cuisineTypes = result.rows.map(row => row.cuisine_type);
    
    res.json({
      success: true,
      count: cuisineTypes.length,
      data: cuisineTypes
    });
  } catch (error) {
    console.error('Error fetching cuisine types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cuisine types'
    });
  }
});

// POST /trucks/:id/reviews - Submit a new review (must be before /trucks/:id)
app.post('/trucks/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, rating, text } = req.body;
    
    // Validation
    if (!user_name || !rating) {
      return res.status(400).json({
        success: false,
        error: 'User name and rating are required'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    // Check if truck exists
    const truckCheck = await pool.query(`
      SELECT truck_id FROM food_truck WHERE truck_id = $1
    `, [id]);
    
    if (truckCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food truck not found'
      });
    }
    
    // Generate review ID
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use a mock user_id (in real app, this would come from authentication)
    const mockUserId = `user_${Date.now()}`;
    
    // Insert review
    const result = await pool.query(`
      INSERT INTO review (review_id, truck_id, user_id, rating, text, status)
      VALUES ($1, $2, $3, $4, $5, 'published')
      RETURNING review_id, truck_id, user_id, rating, text, status, created_at
    `, [reviewId, id, mockUserId, rating, text || null]);
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
});

// POST /trucks/:id/orders - Place an order (must be before /trucks/:id)
app.post('/trucks/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_phone, items } = req.body;
    
    // Validation
    if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and at least one item are required'
      });
    }
    
    // Check if truck exists
    const truckCheck = await pool.query(`
      SELECT truck_id FROM food_truck WHERE truck_id = $1
    `, [id]);
    
    if (truckCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food truck not found'
      });
    }
    
    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total and validate items
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const quantity = parseInt(item.quantity) || 0;
      if (quantity <= 0) continue; // Skip items with 0 quantity
      
      const menuItem = await pool.query(`
        SELECT mi.item_id, mi.name, mi.price, mv.truck_id
        FROM menu_item mi
        JOIN menu_version mv ON mi.menu_id = mv.menu_id
        WHERE mi.item_id = $1 AND mv.truck_id = $2 AND mi.available = true
      `, [item.item_id, id]);
      
      if (menuItem.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Menu item ${item.item_id} not found or not available`
        });
      }
      
      const price = parseFloat(menuItem.rows[0].price);
      const itemTotal = price * quantity;
      total += itemTotal;
      
      orderItems.push({
        item_id: item.item_id,
        name: menuItem.rows[0].name,
        quantity: quantity,
        price: price,
        subtotal: itemTotal
      });
    }
    
    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid items in order'
      });
    }
    
    // Start transaction to insert order and order items
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert order
      await client.query(`
        INSERT INTO "order" (order_id, truck_id, customer_name, customer_phone, total_amount, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [orderId, id, customer_name, customer_phone || null, parseFloat(total.toFixed(2))]);
      
      // Insert order items
      for (const item of orderItems) {
        const orderItemId = `order_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await client.query(`
          INSERT INTO order_item (order_item_id, order_id, item_id, item_name, quantity, unit_price, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [orderItemId, orderId, item.item_id, item.name, item.quantity, item.price, item.subtotal]);
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          order_id: orderId,
          truck_id: id,
          customer_name: customer_name,
          customer_phone: customer_phone || null,
          items: orderItems,
          total: parseFloat(total.toFixed(2)),
          status: 'pending',
          created_at: new Date().toISOString()
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to place order'
    });
  }
});

// GET /orders - Get orders by customer name or phone
app.get('/orders', async (req, res) => {
  try {
    const { customer_name, customer_phone } = req.query;
    
    if (!customer_name && !customer_phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide customer_name or customer_phone'
      });
    }
    
    let query = `
      SELECT 
        o.order_id,
        o.truck_id,
        o.customer_name,
        o.customer_phone,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        ft.name as truck_name
      FROM "order" o
      JOIN food_truck ft ON o.truck_id = ft.truck_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (customer_name) {
      query += ` AND o.customer_name ILIKE $${paramCount}`;
      params.push(`%${customer_name}%`);
      paramCount++;
    }
    
    if (customer_phone) {
      query += ` AND o.customer_phone = $${paramCount}`;
      params.push(customer_phone);
      paramCount++;
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    
    // Get order items for each order
    const orders = await Promise.all(result.rows.map(async (order) => {
      const itemsResult = await pool.query(`
        SELECT 
          item_id,
          item_name,
          quantity,
          unit_price,
          subtotal
        FROM order_item
        WHERE order_id = $1
        ORDER BY item_name
      `, [order.order_id]);
      
      return {
        ...order,
        items: itemsResult.rows
      };
    }));
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// GET /trucks/:id - Get a specific food truck (must be after all specific routes)
app.get('/trucks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, reviews_count, is_open_now, created_at 
      FROM food_truck 
      WHERE truck_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food truck not found'
      });
    }
    
    // Add location data if available
    const truck = result.rows[0];
    const location = getTruckLocation(truck.truck_id);
    if (location) {
      truck.latitude = location[0];
      truck.longitude = location[1];
      truck.address = location[2];
      truck.phone = location[3];
    }
    
    res.json({
      success: true,
      data: truck
    });
  } catch (error) {
    console.error('Error fetching truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food truck'
    });
  }
});

// GET /trucks/:id/details - Get detailed information about a food truck (menu, reviews, schedule)
app.get('/trucks/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get truck basic info
    const truckResult = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, reviews_count, is_open_now, created_at 
      FROM food_truck 
      WHERE truck_id = $1
    `, [id]);
    
    if (truckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food truck not found'
      });
    }
    
    const truck = truckResult.rows[0];
    
    // Add location, phone, and image
    const location = getTruckLocation(truck.truck_id);
    if (location) {
      truck.latitude = location[0];
      truck.longitude = location[1];
      truck.address = location[2];
      truck.phone = location[3];
      truck.image_url = location[4];
    }
    
    // Get current menu
    const menuResult = await pool.query(`
      SELECT mv.menu_id, mv.version_no, mv.effective_from, mv.effective_to,
             mi.item_id, mi.name, mi.description, mi.price, mi.dietary_tags, mi.available
      FROM menu_version mv
      LEFT JOIN menu_item mi ON mv.menu_id = mi.menu_id
      WHERE mv.truck_id = $1 
        AND (mv.effective_to IS NULL OR mv.effective_to > NOW())
      ORDER BY mv.effective_from DESC, mi.name
    `, [id]);
    
    // Organize menu items
    const menuItems = menuResult.rows.map(row => ({
      item_id: row.item_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      dietary_tags: row.dietary_tags || [],
      available: row.available
    }));
    
    // Get reviews
    const reviewResult = await pool.query(`
      SELECT r.review_id, r.user_id, u.name as user_name, r.rating, r.text, 
             r.upvotes, r.downvotes, r.created_at
      FROM review r
      JOIN "user" u ON r.user_id = u.user_id
      WHERE r.truck_id = $1 AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);
    
    const reviews = reviewResult.rows.map(row => ({
      review_id: row.review_id,
      user_name: row.user_name,
      rating: row.rating,
      text: row.text,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      created_at: row.created_at
    }));
    
    // Get schedule
    const scheduleResult = await pool.query(`
      SELECT schedule_id, day_of_week, start_time, end_time, typical_location
      FROM schedule
      WHERE truck_id = $1
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END
    `, [id]);
    
    const schedule = scheduleResult.rows.map(row => ({
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      typical_location: row.typical_location
    }));
    
    res.json({
      success: true,
      data: {
        ...truck,
        menu: menuItems,
        reviews: reviews,
        schedule: schedule
      }
    });
  } catch (error) {
    console.error('Error fetching truck details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food truck details'
    });
  }
});

// Static file serving (must be after all API routes)
app.use(express.static('public'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`RUEating API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Food trucks: http://localhost:${PORT}/trucks`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
