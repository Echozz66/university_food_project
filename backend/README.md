# 港中深美食地图 - 后端服务

## 新架构说明

**简化版本**：数据静态存储在本地JSON文件中，不再实时调用高德API搜索餐厅。

### 数据文件

餐厅数据存储在 `data/restaurants.json`，格式如下：

```json
{
  "version": "1.0",
  "lastUpdated": "2025-01-15",
  "center": {
    "name": "香港中文大学（深圳）",
    "lng": 114.2078,
    "lat": 22.6893,
    "radius": 3000
  },
  "restaurants": [
    {
      "id": 1,
      "name": "餐厅名称",
      "school": "cuhksz_up",  // 所属学校区域
      "lng": 114.203031,
      "lat": 22.690157,
      "price": 20,
      "walkTime": 3,
      "recommend": "推荐菜",
      "address": "地址",
      "tel": "电话",
      "rating": 4.5,
      "businessHours": "07:00-21:00",
      "tags": ["标签1", "标签2"],  // 可自定义标签
      "photos": [],
      "source": "manual"  // 数据来源
    }
  ]
}
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/restaurants | 获取所有餐厅 |
| GET | /api/restaurant/:id | 获取餐厅详情 |
| GET | /api/search?keywords=xxx&school=xxx | 本地搜索 |
| GET | /api/restaurants/by-tag?tag=xxx | 按标签筛选 |
| POST | /api/restaurant/:id/tags | 更新标签 |
| POST | /api/route/walking | 步行路线（调用高德） |
| POST | /api/route/riding | 骑行路线（调用高德） |
| POST | /api/admin/fetch-from-amap | 从高德获取新数据 |

### 如何使用

#### 1. 启动后端服务

```bash
cd backend
npm install
npm start
```

服务运行在 http://localhost:3000

#### 2. 从高德获取周边美食数据

**方式一：使用脚本**

```bash
node scripts/fetchRestaurants.js
```

**方式二：调用API（浏览器控制台或Postman）**

```javascript
fetch('http://localhost:3000/api/admin/fetch-from-amap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ keywords: '餐厅', radius: 3000 })
})
.then(r => r.json())
.then(console.log);
```

#### 3. 添加自定义标签

**方式一：直接编辑文件**

打开 `data/restaurants.json`，在对应餐厅的 `tags` 字段添加标签：

```json
"tags": ["火锅", "夜宵", "适合聚餐", "学生优惠"]
```

**方式二：调用API**

```javascript
fetch('http://localhost:3000/api/restaurant/1/tags', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tags: ["火锅", "夜宵"] })
})
.then(r => r.json())
.then(console.log);
```

#### 4. 按标签筛选餐厅

```javascript
fetch('http://localhost:3000/api/restaurants/by-tag?tag=火锅')
.then(r => r.json())
.then(console.log);
```

### 数据管理建议

1. **初始数据**：先运行 `fetchRestaurants.js` 获取一批基础数据
2. **数据清洗**：手动编辑 `restaurants.json` 删除不需要的餐厅
3. **添加标签**：为餐厅添加 `tags` 字段方便分类
4. **定期更新**：重新运行脚本获取新开的餐厅（会自动去重）

### 保留的高德API功能

- 步行路线规划
- 骑行路线规划
- 管理接口：从高德获取周边数据

这些功能仍需高德API Key。
