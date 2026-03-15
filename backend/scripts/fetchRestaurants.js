/**
 * 从高德API获取港中深周边美食数据
 * 保存到本地JSON文件
 * 
 * 使用方法: node scripts/fetchRestaurants.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 高德API配置
const AMAP_KEY = process.env.AMAP_KEY || 'ec4b58fd70cb41dc49037198d1d569bd';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

// 港中深中心位置
const CENTER = {
  name: '香港中文大学（深圳）',
  lng: 114.2078,
  lat: 22.6893,
  radius: 3000  // 3公里范围内
};

// 搜索关键词列表
const SEARCH_KEYWORDS = ['餐厅', '美食', '小吃', '快餐', '火锅', '烧烤', '奶茶', '咖啡'];

// 数据文件路径
const DATA_FILE = path.join(__dirname, '..', 'data', 'restaurants.json');

/**
 * 从高德API搜索周边美食
 */
async function searchNearby(keyword, offset = 50) {
  try {
    const location = `${CENTER.lng},${CENTER.lat}`;
    
    console.log(`[搜索] 关键词: "${keyword}", 位置: ${location}, 半径: ${CENTER.radius}米`);
    
    const response = await axios.get(`${AMAP_BASE_URL}/place/around`, {
      params: {
        key: AMAP_KEY,
        keywords: keyword,
        location: location,
        radius: CENTER.radius,
        offset: offset,
        page: 1,
        extensions: 'all',
        output: 'JSON'
      },
      timeout: 15000
    });

    if (response.data.status === '1') {
      const pois = response.data.pois || [];
      console.log(`[结果] 找到 ${pois.length} 个地点`);
      return pois;
    } else {
      console.error(`[错误] 高德API返回错误:`, response.data.info);
      return [];
    }
  } catch (error) {
    console.error(`[错误] 搜索失败:`, error.message);
    return [];
  }
}

/**
 * 转换POI数据为餐厅格式
 */
function convertPoiToRestaurant(poi, index) {
  // 解析位置
  let lng = 0, lat = 0;
  if (poi.location) {
    const parts = poi.location.split(',');
    lng = parseFloat(parts[0]) || 0;
    lat = parseFloat(parts[1]) || 0;
  }
  
  // 解析照片
  let photos = [];
  if (poi.photos) {
    photos = Array.isArray(poi.photos) 
      ? poi.photos.map(p => p.url || p).filter(Boolean)
      : [poi.photos];
  }
  
  // 估算步行时间（假设每分钟走80米）
  const distance = parseInt(poi.distance) || 500;
  const walkTime = Math.round(distance / 80);
  
  // 解析价格
  let price = 25;
  if (poi.biz_ext?.cost) {
    price = parseInt(poi.biz_ext.cost);
  } else if (poi.biz_ext?.meal_ordering) {
    // 如果有外卖信息，尝试从中提取价格
    price = 25;
  }
  
  // 解析评分
  let rating = null;
  if (poi.biz_ext?.rating) {
    rating = parseFloat(poi.biz_ext.rating);
  }
  
  return {
    id: `poi_${Date.now()}_${index}`,
    name: poi.name,
    school: 'all',  // 默认识别为通用区域，可手动修改
    lng: lng,
    lat: lat,
    price: price,
    walkTime: walkTime,
    recommend: poi.tag || '热门推荐',
    address: poi.address || poi.name,
    tel: poi.tel || '',
    rating: rating,
    businessHours: poi.business?.time || '',
    distance: distance,
    photos: photos,
    tags: [],  // 预留标签字段
    source: 'amap',
    poiId: poi.id,
    type: poi.type || '',
    typecode: poi.typecode || ''
  };
}

/**
 * 去重餐厅列表（根据名称和位置）
 */
function deduplicateRestaurants(restaurants) {
  const seen = new Set();
  return restaurants.filter(r => {
    const key = `${r.name}_${Math.round(r.lng * 1000)}_${Math.round(r.lat * 1000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 加载现有数据
 */
function loadExistingData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`[加载] 现有数据 ${data.restaurants?.length || 0} 条餐厅记录`);
      return data;
    }
  } catch (error) {
    console.error('[错误] 加载现有数据失败:', error.message);
  }
  return { version: '1.0', restaurants: [] };
}

/**
 * 保存数据到文件
 */
function saveData(data) {
  try {
    // 确保目录存在
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 更新元数据
    data.lastUpdated = new Date().toISOString();
    data.center = CENTER;
    
    // 写入文件
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[保存] 成功保存 ${data.restaurants.length} 条餐厅记录到 ${DATA_FILE}`);
    return true;
  } catch (error) {
    console.error('[错误] 保存数据失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  港中深周边美食数据抓取工具');
  console.log('========================================');
  console.log(`中心位置: ${CENTER.name} (${CENTER.lng}, ${CENTER.lat})`);
  console.log(`搜索半径: ${CENTER.radius}米`);
  console.log('');
  
  // 加载现有数据
  const existingData = loadExistingData();
  let allRestaurants = [...existingData.restaurants];
  
  // 使用第一个关键词搜索（避免调用太多）
  // 如需更多数据，可修改这里使用多个关键词
  const keywordsToSearch = ['餐厅'];  // 只搜索餐厅，减少API调用
  
  for (const keyword of keywordsToSearch) {
    const pois = await searchNearby(keyword, 50);
    
    if (pois.length > 0) {
      const newRestaurants = pois.map((poi, index) => convertPoiToRestaurant(poi, index));
      allRestaurants = allRestaurants.concat(newRestaurants);
      console.log(`[转换] 成功转换 ${newRestaurants.length} 条记录`);
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 去重
  console.log(`[去重] 去重前: ${allRestaurants.length} 条`);
  allRestaurants = deduplicateRestaurants(allRestaurants);
  console.log(`[去重] 去重后: ${allRestaurants.length} 条`);
  
  // 保存数据
  existingData.restaurants = allRestaurants;
  saveData(existingData);
  
  console.log('');
  console.log('========================================');
  console.log('  数据抓取完成！');
  console.log('========================================');
  console.log('');
  console.log('提示:');
  console.log('1. 数据已保存到 backend/data/restaurants.json');
  console.log('2. 你可以手动编辑这个文件添加自定义标签');
  console.log('3. 每个餐厅都有 "tags" 字段，可以添加自定义标签如 ["火锅", "夜宵", "适合聚餐"]');
  console.log('4. 重新运行此脚本会追加新数据（会自动去重）');
}

// 运行主函数
main().catch(error => {
  console.error('程序错误:', error);
  process.exit(1);
});
