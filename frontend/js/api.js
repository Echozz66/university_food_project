/**
 * 大运干饭地图 - API 客户端
 * 前后端分离版本 - 本地数据源
 */

const API_BASE_URL = 'http://localhost:3000/api';

// API 客户端
const FoodMapAPI = {
    // 健康检查
    async health() {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.json();
    },

    // 获取所有餐厅列表（本地数据）
    async getRestaurants() {
        const response = await fetch(`${API_BASE_URL}/restaurants`);
        return response.json();
    },

    // 获取餐厅详情
    async getRestaurant(id) {
        const response = await fetch(`${API_BASE_URL}/restaurant/${id}`);
        return response.json();
    },

    // 本地搜索餐厅
    async searchRestaurants(keywords = '', school = '') {
        const params = new URLSearchParams({ keywords, school });
        const response = await fetch(`${API_BASE_URL}/search?${params}`);
        return response.json();
    },

    // 按标签筛选餐厅
    async getRestaurantsByTag(tag) {
        const params = new URLSearchParams({ tag });
        const response = await fetch(`${API_BASE_URL}/restaurants/by-tag?${params}`);
        return response.json();
    },

    // 更新餐厅标签
    async updateRestaurantTags(id, tags) {
        const response = await fetch(`${API_BASE_URL}/restaurant/${id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags })
        });
        return response.json();
    },

    // 从高德获取新数据（管理接口）
    async fetchFromAMap(keywords = '餐厅', radius = 3000) {
        const response = await fetch(`${API_BASE_URL}/admin/fetch-from-amap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, radius })
        });
        return response.json();
    },

    // 获取步行路线
    async getWalkingRoute(origin, destination) {
        const response = await fetch(`${API_BASE_URL}/route/walking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination })
        });
        return response.json();
    },

    // 获取骑行路线
    async getRidingRoute(origin, destination) {
        const response = await fetch(`${API_BASE_URL}/route/riding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination })
        });
        return response.json();
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FoodMapAPI;
}
