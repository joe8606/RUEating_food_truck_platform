const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// GET /trucks/:id - Get a specific food truck
app.get('/trucks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT truck_id, name, cuisine_tags, price_tier, avg_rating, created_at 
      FROM food_truck 
      WHERE truck_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food truck not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching truck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food truck'
    });
  }
});

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
