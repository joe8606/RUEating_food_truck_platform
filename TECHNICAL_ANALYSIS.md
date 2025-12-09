# RUEating Vendor 功能技術調整分析

## 📊 架構可行性評估

### ✅ **數據庫架構 - 完全可行**
現有數據庫架構已經支持所有必要功能，**無需修改數據庫結構**：

- ✅ `food_truck` 表已有 `owner_user_id` 字段（第31行）
- ✅ `location_ping` 表已完整，支持 PostGIS（第42-64行）
- ✅ `menu_version` 和 `menu_item` 表已完整（第66-87行）
- ✅ `schedule` 表已完整（第110-119行）
- ✅ `order` 和 `order_item` 表已完整（第121-143行）
- ✅ 所有必要的索引已建立（第160-196行）

**結論：數據庫架構完全支持，無需修改**

---

## 🔧 需要調整的技術點

### **1. 高優先級調整**

#### **1.1 位置更新 API** ⚠️ **需要新增**
**問題：**
- 前端有位置更新表單，但沒有對應的 API 端點
- 位置數據存在 `location_ping` 表中，但沒有 API 來插入/更新

**技術調整：**
```javascript
// 需要新增端點：POST /trucks/:id/location
// 功能：
// - 接收 latitude, longitude, accuracy, source
// - 插入新的 location_ping 記錄
// - 將舊的 active 記錄設為 inactive
// - 使用 PostGIS 自動計算 geom 字段（已有 trigger）
```

**數據庫支持：** ✅ 完全支持（已有 trigger 自動處理 geom）

---

#### **1.2 創建 Truck 時添加 owner_user_id** ⚠️ **需要修改**
**問題：**
- `POST /trucks` 端點（第122-159行）沒有處理 `owner_user_id`
- SQL INSERT 語句（第141-145行）缺少 `owner_user_id` 字段
- 導致新創建的 truck 沒有 owner，無法被 vendor 管理

**技術調整：**
```javascript
// 修改 POST /trucks 端點：
// 1. 從 req.body 獲取 owner_user_id（或從認證中間件獲取）
// 2. 驗證 owner_user_id 是否存在於 user 表
// 3. 在 INSERT 語句中包含 owner_user_id
```

**數據庫支持：** ✅ 完全支持（已有外鍵約束）

---

#### **1.3 訂單查看功能** ⚠️ **需要新增**
**問題：**
- 現有 `/orders` 端點（第548-624行）是按 customer 查詢
- Vendor 需要按 truck_id 查詢訂單
- 需要支持訂單狀態更新

**技術調整：**
```javascript
// 需要新增端點：
// 1. GET /trucks/:id/orders - 獲取特定 truck 的所有訂單
// 2. GET /vendors/:vendor_id/orders - 獲取 vendor 所有 trucks 的訂單
// 3. PUT /orders/:id/status - 更新訂單狀態
```

**數據庫支持：** ✅ 完全支持（order 表已有 status 字段和索引）

---

### **2. 中優先級調整**

#### **2.1 菜單管理功能** ⚠️ **需要新增**
**問題：**
- 現有 `/trucks/:id/details` 可以查看菜單，但無法管理
- 沒有創建、更新、刪除菜單項目的 API

**技術調整：**
```javascript
// 需要新增端點：
// 1. POST /trucks/:id/menu/items - 創建新菜單項目
// 2. PUT /menu-items/:id - 更新菜單項目（價格、可用性等）
// 3. DELETE /menu-items/:id - 刪除菜單項目
// 4. POST /trucks/:id/menu/version - 創建新菜單版本（價格變更時）
```

**數據庫支持：** ✅ 完全支持（menu_version 和 menu_item 表已完整）

---

#### **2.2 營業時間管理** ⚠️ **需要新增**
**問題：**
- 現有 `/trucks/:id/details` 可以查看 schedule，但無法管理
- 沒有創建、更新、刪除營業時間的 API

**技術調整：**
```javascript
// 需要新增端點：
// 1. GET /trucks/:id/schedule - 獲取營業時間（已有邏輯，需提取）
// 2. POST /trucks/:id/schedule - 創建營業時間記錄
// 3. PUT /schedule/:id - 更新營業時間
// 4. DELETE /schedule/:id - 刪除營業時間
```

**數據庫支持：** ✅ 完全支持（schedule 表已完整）

---

#### **2.3 編輯 Truck 功能** ⚠️ **需要新增**
**問題：**
- 現有 `GET /trucks/:id` 可以查看，但沒有 `PUT /trucks/:id` 來編輯
- Vendor 無法更新 truck 的基本信息

**技術調整：**
```javascript
// 需要新增端點：PUT /trucks/:id
// 功能：
// - 更新 name, cuisine_tags, price_tier
// - 驗證權限（確保是 owner）
// - 返回更新後的數據
```

**數據庫支持：** ✅ 完全支持（food_truck 表結構支持更新）

---

### **3. 輔助功能調整**

#### **3.1 Vendor 專用 API** ⚠️ **需要新增**
**問題：**
- 前端使用 `/trucks/all-with-location` 然後在前端過濾
- 效率低，且沒有使用數據庫的 owner_user_id 索引

**技術調整：**
```javascript
// 需要新增端點：GET /vendors/:vendor_id/trucks
// 功能：
// - 直接從數據庫查詢 owner_user_id = vendor_id 的 trucks
// - 利用現有索引 idx_food_truck_owner（第161行）
// - 返回包含位置信息的完整 truck 列表
```

**數據庫支持：** ✅ 完全支持（已有索引）

---

#### **3.2 權限驗證中間件** ⚠️ **需要新增（可選，先做 mock）**
**問題：**
- 目前沒有身份驗證
- 任何用戶都可以訪問任何 vendor 的數據

**技術調整：**
```javascript
// 可以分階段實現：
// 階段1：使用 mock vendor_id（從 query param 或 header）
// 階段2：實現 JWT 認證中間件
// 階段3：添加權限驗證函數
```

**數據庫支持：** ✅ 完全支持（user 表已存在）

---

#### **3.3 營業狀態切換** ⚠️ **需要新增**
**問題：**
- `food_truck` 表有 `is_open_now` 字段，但沒有 API 來切換

**技術調整：**
```javascript
// 需要新增端點：PUT /trucks/:id/status
// 功能：
// - 切換 is_open_now 狀態
// - 驗證權限（確保是 owner）
```

**數據庫支持：** ✅ 完全支持（已有字段和索引）

---

## 📋 技術調整清單

### **必須修改（高優先級）**

| # | 調整項目 | 類型 | 文件 | 行數 | 難度 |
|---|---------|------|------|------|------|
| 1 | 修改 POST /trucks 添加 owner_user_id | 修改 | app.js | 122-159 | ⭐ 簡單 |
| 2 | 新增 POST /trucks/:id/location | 新增 | app.js | - | ⭐⭐ 中等 |
| 3 | 新增 GET /trucks/:id/orders | 新增 | app.js | - | ⭐⭐ 中等 |
| 4 | 新增 GET /vendors/:vendor_id/orders | 新增 | app.js | - | ⭐⭐ 中等 |
| 5 | 新增 PUT /orders/:id/status | 新增 | app.js | - | ⭐ 簡單 |

### **應該添加（中優先級）**

| # | 調整項目 | 類型 | 文件 | 行數 | 難度 |
|---|---------|------|------|------|------|
| 6 | 新增 POST /trucks/:id/menu/items | 新增 | app.js | - | ⭐⭐ 中等 |
| 7 | 新增 PUT /menu-items/:id | 新增 | app.js | - | ⭐ 簡單 |
| 8 | 新增 DELETE /menu-items/:id | 新增 | app.js | - | ⭐ 簡單 |
| 9 | 新增 GET /trucks/:id/schedule | 新增 | app.js | - | ⭐ 簡單 |
| 10 | 新增 POST /trucks/:id/schedule | 新增 | app.js | - | ⭐ 簡單 |
| 11 | 新增 PUT /schedule/:id | 新增 | app.js | - | ⭐ 簡單 |
| 12 | 新增 DELETE /schedule/:id | 新增 | app.js | - | ⭐ 簡單 |
| 13 | 新增 PUT /trucks/:id | 新增 | app.js | - | ⭐ 簡單 |

### **輔助功能（低優先級）**

| # | 調整項目 | 類型 | 文件 | 行數 | 難度 |
|---|---------|------|------|------|------|
| 14 | 新增 GET /vendors/:vendor_id/trucks | 新增 | app.js | - | ⭐ 簡單 |
| 15 | 新增 PUT /trucks/:id/status | 新增 | app.js | - | ⭐ 簡單 |
| 16 | 新增權限驗證中間件（mock） | 新增 | app.js | - | ⭐⭐ 中等 |

---

## ✅ 架構可行性結論

### **完全可行！** 🎉

**理由：**
1. ✅ **數據庫架構完整** - 所有必要的表和字段都已存在
2. ✅ **索引已優化** - 查詢性能有保障
3. ✅ **PostGIS 已配置** - 位置功能可直接使用
4. ✅ **現有代碼結構清晰** - 易於擴展
5. ✅ **無需數據庫遷移** - 所有功能都可以在現有架構上實現

**唯一需要的是：**
- 添加新的 API 端點（約 15-16 個）
- 修改 1 個現有端點（POST /trucks）
- 可選：添加簡單的權限驗證中間件

**預估工作量：**
- 高優先級：2-3 小時
- 中優先級：3-4 小時
- 總計：5-7 小時（不含測試）

---

## 🚀 實施建議

### **階段 1：高優先級（立即實施）**
1. 修改 `POST /trucks` 添加 `owner_user_id`
2. 新增 `POST /trucks/:id/location`
3. 新增 `GET /trucks/:id/orders`
4. 新增 `PUT /orders/:id/status`

### **階段 2：中優先級（接下來）**
5. 新增菜單管理 API（4個端點）
6. 新增營業時間管理 API（4個端點）
7. 新增 `PUT /trucks/:id`

### **階段 3：優化（可選）**
8. 新增 `GET /vendors/:vendor_id/trucks`
9. 新增 `PUT /trucks/:id/status`
10. 添加權限驗證中間件

---

## 📝 注意事項

1. **位置更新邏輯：**
   - 每次更新位置時，應該將舊的 `active` 記錄設為 `inactive`
   - 插入新的 `active` 記錄
   - PostGIS trigger 會自動處理 `geom` 字段

2. **訂單狀態更新：**
   - 需要驗證狀態轉換的合法性（pending → confirmed → preparing → ready → completed）
   - 更新 `updated_at` 時間戳

3. **菜單版本管理：**
   - 價格變更時，應該創建新的 menu_version
   - 將舊版本的 `effective_to` 設為當前時間
   - 保持歷史記錄

4. **權限驗證：**
   - 可以先使用 mock vendor_id（從 query param 或 header）
   - 後續再實現完整的 JWT 認證


