const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 高德 API 配置（仅用于路线规划）
const AMAP_KEY = process.env.AMAP_KEY || 'ec4b58fd70cb41dc49037198d1d569bd';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data', 'restaurants.json');

// 内存缓存
let restaurantsCache = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 加载餐厅数据（从JSON文件）
 */
function loadRestaurantsFromFile() {
  try {
    // 检查缓存是否有效
    if (restaurantsCache && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
      return restaurantsCache;
    }
    
    // 读取文件
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      restaurantsCache = data.restaurants || [];
      cacheTime = Date.now();
      console.log(`[数据] 从文件加载 ${restaurantsCache.length} 条餐厅记录`);
      return restaurantsCache;
    } else {
      console.error('[错误] 数据文件不存在:', DATA_FILE);
      return [];
    }
  } catch (error) {
    console.error('[错误] 加载数据文件失败:', error.message);
    return [];
  }
}

/**
 * 保存餐厅数据到文件
 */
function saveRestaurantsToFile(restaurants) {
  try {
    let data = { version: '1.0', restaurants: [] };
    
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    
    data.restaurants = restaurants;
    data.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[数据] 保存 ${restaurants.length} 条餐厅记录到文件`);
    
    // 更新缓存
    restaurantsCache = restaurants;
    cacheTime = Date.now();
    return true;
  } catch (error) {
    console.error('[错误] 保存数据文件失败:', error.message);
    return false;
  }
}

// ============ API 路由 ============

// 健康检查
app.get('/api/health', (req, res) => {
  const restaurants = loadRestaurantsFromFile();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    restaurantCount: restaurants.length,
    dataSource: 'local'
  });
});

// 获取餐厅列表
app.get('/api/restaurants', (req, res) => {
  const restaurants = loadRestaurantsFromFile();
  res.json({
    success: true,
    data: restaurants,
    count: restaurants.length,
    source: 'local'
  });
});

// 获取餐厅详情
app.get('/api/restaurant/:id', (req, res) => {
  try {
    const { id } = req.params;
    const restaurants = loadRestaurantsFromFile();
    
    const restaurant = restaurants.find(r => r.id == id || r.id === id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '餐厅未找到'
      });
    }
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('[错误] 获取餐厅详情:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 按标签筛选餐厅
app.get('/api/restaurants/by-tag', (req, res) => {
  try {
    const { tag } = req.query;
    const restaurants = loadRestaurantsFromFile();
    
    if (!tag) {
      return res.json({
        success: true,
        data: restaurants,
        count: restaurants.length
      });
    }
    
    const filtered = restaurants.filter(r => 
      r.tags && r.tags.includes(tag)
    );
    
    res.json({
      success: true,
      data: filtered,
      count: filtered.length,
      tag: tag
    });
  } catch (error) {
    console.error('[错误] 按标签筛选:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 添加/更新餐厅标签
app.post('/api/restaurant/:id/tags', (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'tags 必须是数组'
      });
    }
    
    const restaurants = loadRestaurantsFromFile();
    const index = restaurants.findIndex(r => r.id == id || r.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '餐厅未找到'
      });
    }
    
    // 更新标签
    restaurants[index].tags = tags;
    
    // 保存到文件
    if (saveRestaurantsToFile(restaurants)) {
      res.json({
        success: true,
        data: restaurants[index],
        message: '标签更新成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '保存失败'
      });
    }
  } catch (error) {
    console.error('[错误] 更新标签:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 搜索餐厅（本地搜索，不再调用高德API）
app.get('/api/search', (req, res) => {
  try {
    const { keywords = '', school = '' } = req.query;
    const restaurants = loadRestaurantsFromFile();
    
    console.log(`[搜索] 关键词: "${keywords}", 学校: "${school}"`);
    
    let filtered = restaurants;
    
    // 按关键词筛选
    if (keywords) {
      const lowerKeywords = keywords.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(lowerKeywords) ||
        r.recommend.toLowerCase().includes(lowerKeywords) ||
        r.address.toLowerCase().includes(lowerKeywords) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(lowerKeywords)))
      );
    }
    
    // 按学校筛选
    if (school && school !== 'all') {
      filtered = filtered.filter(r => r.school === school);
    }
    
    res.json({
      success: true,
      data: filtered,
      count: filtered.length,
      total: restaurants.length,
      source: 'local'
    });
  } catch (error) {
    console.error('[错误] 搜索餐厅:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 从高德搜索并保存到本地（管理接口）
app.post('/api/admin/fetch-from-amap', async (req, res) => {
  try {
    const { keywords = '餐厅', radius = 3000 } = req.body;
    
    console.log(`[管理] 从高德获取数据: 关键词="${keywords}", 半径=${radius}米`);
    
    // 港中深中心位置
    const center = { lng: 114.2078, lat: 22.6893 };
    
    const response = await axios.get(`${AMAP_BASE_URL}/place/around`, {
      params: {
        key: AMAP_KEY,
        keywords: keywords,
        location: `${center.lng},${center.lat}`,
        radius: radius,
        offset: 50,
        page: 1,
        extensions: 'all',
        output: 'JSON'
      },
      timeout: 15000
    });

    if (response.data.status === '1') {
      const pois = response.data.pois || [];
      const existingData = loadRestaurantsFromFile();
      
      // 转换POI数据
      const newRestaurants = pois.map((poi, index) => {
        let lng = 0, lat = 0;
        if (poi.location) {
          const parts = poi.location.split(',');
          lng = parseFloat(parts[0]) || 0;
          lat = parseFloat(parts[1]) || 0;
        }
        
        let photos = [];
        if (poi.photos) {
          photos = Array.isArray(poi.photos) 
            ? poi.photos.map(p => p.url || p).filter(Boolean)
            : [poi.photos];
        }
        
        const distance = parseInt(poi.distance) || 500;
        
        return {
          id: `poi_${Date.now()}_${index}`,
          name: poi.name,
          school: 'all',
          lng: lng,
          lat: lat,
          price: poi.biz_ext?.cost ? parseInt(poi.biz_ext.cost) : 25,
          walkTime: Math.round(distance / 80),
          recommend: poi.tag || '热门推荐',
          address: poi.address || poi.name,
          tel: poi.tel || '',
          rating: poi.biz_ext?.rating ? parseFloat(poi.biz_ext.rating) : null,
          businessHours: poi.business?.time || '',
          distance: distance,
          photos: photos,
          tags: [],
          source: 'amap',
          poiId: poi.id
        };
      });
      
      // 合并并去重
      const allRestaurants = [...existingData, ...newRestaurants];
      const seen = new Set();
      const unique = allRestaurants.filter(r => {
        const key = `${r.name}_${Math.round(r.lng * 1000)}_${Math.round(r.lat * 1000)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      // 保存
      if (saveRestaurantsToFile(unique)) {
        res.json({
          success: true,
          message: `成功获取并保存 ${newRestaurants.length} 条新数据`,
          total: unique.length,
          newAdded: newRestaurants.length
        });
      } else {
        res.status(500).json({
          success: false,
          error: '保存数据失败'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: response.data.info || '高德API请求失败'
      });
    }
  } catch (error) {
    console.error('[错误] 从高德获取数据:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 获取步行路线
app.post('/api/route/walking', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: '缺少起点或终点参数'
      });
    }

    const originStr = `${origin.lng},${origin.lat}`;
    const destStr = `${destination.lng},${destination.lat}`;
    
    console.log(`[路线] 步行: ${originStr} -> ${destStr}`);

    const response = await axios.get(`${AMAP_BASE_URL}/direction/walking`, {
      params: {
        key: AMAP_KEY,
        origin: originStr,
        destination: destStr,
        output: 'JSON'
      },
      timeout: 10000
    });

    if (response.data.status === '1' && response.data.route) {
      const path = response.data.route.paths[0];
      res.json({
        success: true,
        data: {
          distance: parseInt(path.distance),
          duration: parseInt(path.duration),
          steps: path.steps.map(step => ({
            instruction: step.instruction,
            road: step.road,
            distance: step.distance,
            duration: step.duration,
            polyline: step.polyline
          }))
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.data.info || '步行路线规划失败'
      });
    }
  } catch (error) {
    console.error('[错误] 步行路线:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 获取骑行路线
app.post('/api/route/riding', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: '缺少起点或终点参数'
      });
    }

    const originStr = `${origin.lng},${origin.lat}`;
    const destStr = `${destination.lng},${destination.lat}`;
    
    console.log(`[路线] 骑行: ${originStr} -> ${destStr}`);

    const response = await axios.get(`${AMAP_BASE_URL}/direction/riding`, {
      params: {
        key: AMAP_KEY,
        origin: originStr,
        destination: destStr,
        output: 'JSON'
      },
      timeout: 10000
    });

    if (response.data.status === '1' && response.data.route) {
      const path = response.data.route.paths[0];
      res.json({
        success: true,
        data: {
          distance: parseInt(path.distance),
          duration: parseInt(path.duration),
          steps: path.steps.map(step => ({
            instruction: step.instruction,
            road: step.road,
            distance: step.distance,
            duration: step.duration,
            polyline: step.polyline
          }))
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.data.info || '骑行路线规划失败'
      });
    }
  } catch (error) {
    console.error('[错误] 骑行路线:', error.message);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  港中深美食地图 - 后端服务');
  console.log('========================================');
  console.log(`🚀 服务器运行: http://localhost:${PORT}`);
  console.log('');
  console.log('API 文档:');
  console.log('  GET  /api/health              - 健康检查');
  console.log('  GET  /api/restaurants         - 获取所有餐厅');
  console.log('  GET  /api/restaurant/:id      - 获取餐厅详情');
  console.log('  GET  /api/search              - 本地搜索餐厅');
  console.log('  GET  /api/restaurants/by-tag  - 按标签筛选');
  console.log('  POST /api/restaurant/:id/tags - 更新餐厅标签');
  console.log('  POST /api/route/walking       - 步行路线');
  console.log('  POST /api/route/riding        - 骑行路线');
  console.log('  POST /api/admin/fetch-from-amap - 从高德获取数据');
  console.log('');
  
  // 启动时加载数据
  const restaurants = loadRestaurantsFromFile();
  console.log(`📦 已加载 ${restaurants.length} 条餐厅记录`);
  console.log('========================================');
});
