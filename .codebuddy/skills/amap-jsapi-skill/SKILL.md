---
name: amap-jsapi-skill
description: 高德地图 JSAPI v2.0 (WebGL) 开发技能。涵盖地图生命周期管理、强制安全配置、3D 视图控制、覆盖物绘制及 LBS 服务集成。
---

# 高德地图 JSAPI v2.0 开发技能

本技能用于帮助开发者快速集成高德地图 JSAPI v2.0。

## 快速开始

### 1. 引入方式

使用 script 标签直接加载：
```html
<script src="https://webapi.amap.com/maps?v=2.0&key=您的Key"></script>
```

或使用 loader：
```html
<script src="https://webapi.amap.com/loader.js"></script>
```

### 2. 安全密钥配置 (强制)

v2.0 版本必须在加载地图前配置安全密钥：
```javascript
window._AMapSecurityConfig = {
  securityJsCode: '您的安全密钥',
};
```

### 3. 初始化地图

```javascript
const map = new AMap.Map('container', {
  viewMode: '3D',
  zoom: 11,
  center: [116.39, 39.90]
});
```

## 使用方式

1. 根据任务场景选择对应的参考文档（见 references/ 目录）
2. 涉及地图初始化、安全配置请先阅读 map-init.md 和 security.md
3. 涉及标记、图形请阅读 marker.md、vector-graphics.md
4. 涉及路径规划、搜索请阅读 routing.md、search.md
5. 完成代码前检查API用法是否符合文档规范
