# RUEating Demo Script

## Demo Flow (5-10 minutes)

### 1. Project Introduction (1 minute)
- **Project Name**: RUEating - Food Truck Discovery Platform
- **Technology Stack**: Docker + Node.js + PostgreSQL
- **Goal**: Containerized food truck discovery and recommendation platform MVP

### 2. Architecture Presentation (2 minutes)
```bash
# Show Docker container status
docker-compose ps

# Show project structure
ls -la
```

**Key Points**:
- Containerized deployment (Docker Compose)
- Microservices architecture (API + Database)
- Automated initialization

### 3. Database Design (2 minutes)
```bash
# Connect directly to database to view structure
docker-compose exec db psql -U postgres -d rueating -c "\d food_truck"

# View data
docker-compose exec db psql -U postgres -d rueating -c "SELECT * FROM food_truck LIMIT 3;"
```

**Key Points**:
- PostgreSQL table design
- Data type selection (SERIAL, TEXT[], DECIMAL)
- Index optimization

### 4. API Functionality Demo (3 minutes)

#### 4.1 Health Check
```bash
curl http://localhost:3000/health
```

#### 4.2 Query All Food Trucks
```bash
curl http://localhost:3000/trucks
```

#### 4.3 Add New Food Truck
```bash
curl -X POST http://localhost:3000/trucks \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo Truck", "cuisine_tags": ["Demo", "Test"], "price_tier": "$$", "avg_rating": 4.5}'
```

#### 4.4 Query Specific Food Truck
```bash
curl http://localhost:3000/trucks/1
```

### 5. Web UI Presentation (2 minutes)
- Open browser: http://localhost:3000
- Show statistics
- Show food truck list
- Add a new food truck live
- Show real-time updates

### 6. Technical Highlights Summary (1 minute)
- Containerized deployment
- Database design
- RESTful API
- Frontend-backend separation
- Data persistence
- Error handling
- Scalable architecture

## Backup Commands

### If Web UI has issues
```bash
# Check container logs
docker-compose logs app
docker-compose logs db

# Restart services
docker-compose restart app
```

### If need to restart
```bash
# Stop all services
docker-compose down

# Restart
docker-compose up --build
```

## Expected Results

### API Response Example
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "truck_id": 1,
      "name": "Taco Fiesta",
      "cuisine_tags": ["Mexican", "Latin"],
      "price_tier": "$$",
      "avg_rating": "4.20",
      "created_at": "2025-10-20T00:53:33.495Z"
    }
  ]
}
```

### Database Query Result
```
 total_trucks 
--------------
            7
(1 row)
```

## Academic Value Demonstration

1. **Database Management**: Table design, indexes, constraints
2. **Software Engineering**: Containerization, API design, error handling
3. **System Architecture**: Microservices, frontend-backend separation
4. **Practicality**: Real business scenario application
