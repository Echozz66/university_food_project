/* 
================================================================================
【AI辅助决策模块 - 接入说明】

本文件说明如何在【大运干饭地图】中接入AI辅助决策功能。

================================================================================
【模块结构】

在 index.html 中已预留以下接口:

1. 按钮绑定: onclick="openAIDecision()"
2. 函数位置: 约第 430-445 行
3. 可用数据: 
   - restaurants: 所有餐厅的JSON数组
   - currentSchool: 当前选中的学校代码
   - map: 高德地图实例
   - showInfoWindow(): 显示餐厅信息
   - switchSchool(): 切换学校筛选

================================================================================
【基础版本 - 随机推荐】

在 openAIDecision() 函数中添加以下代码:

function openAIDecision() {
    const currentList = currentSchool === 'all' 
        ? restaurants 
        : restaurants.filter(r => r.school === currentSchool);
    
    if (currentList.length === 0) {
        alert('暂无餐厅数据');
        return;
    }
    
    // 随机选择一家
    const randomIndex = Math.floor(Math.random() * currentList.length);
    const selected = currentList[randomIndex];
    
    // 聚焦到选中的餐厅
    focusOnRestaurant(selected);
    
    console.log('AI推荐:', selected.name);
}

================================================================================
【进阶版本 - 偏好推荐】

根据用户偏好（价格、距离、口味）进行智能推荐:

function openAIDecision() {
    const currentList = currentSchool === 'all' 
        ? restaurants 
        : restaurants.filter(r => r.school === currentSchool);
    
    // 用户偏好设置（可通过弹窗让用户选择）
    const preferences = {
        maxPrice: 30,           // 最高人均价格
        maxWalkTime: 15,        // 最长步行时间
        preferType: '快餐'      // 偏好类型
    };
    
    // 过滤符合条件的餐厅
    const filtered = currentList.filter(r => 
        r.price <= preferences.maxPrice && 
        r.walkTime <= preferences.maxWalkTime
    );
    
    if (filtered.length === 0) {
        // 如果没有完全符合的，显示最接近的
        focusOnRestaurant(currentList[0]);
    } else {
        // 随机选择
        const randomIndex = Math.floor(Math.random() * filtered.length);
        focusOnRestaurant(filtered[randomIndex]);
    }
}

================================================================================
【高级版本 - 接入外部AI API】

可接入 ChatGPT、Claude 等AI服务:

async function openAIDecision() {
    const currentList = currentSchool === 'all' 
        ? restaurants 
        : restaurants.filter(r => r.school === currentSchool);
    
    // 构建提示词
    const prompt = `我想要在深圳大运大学城吃饭，${currentSchool === 'all' ? '不限学校' : '在' + getSchoolName(currentSchool)}，
    请根据以下餐厅列表推荐一家:
    ${currentList.map(r => `${r.name}, 人均¥${r.price}, 步行${r.walkTime}分钟, 推荐${r.recommend}`).join('\n')}
    
    请只回复餐厅名称。`;
    
    try {
        // 调用AI API（需替换为实际的API调用）
        const response = await fetch('YOUR_AI_API_URL', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        
        const result = await response.json();
        const restaurantName = result.choices[0].text.trim();
        
        // 查找对应餐厅
        const matched = currentList.find(r => r.name.includes(restaurantName));
        if (matched) {
            focusOnRestaurant(matched);
        }
    } catch (error) {
        console.error('AI推荐失败:', error);
        alert('AI推荐暂时不可用，已为您随机选择');
        const random = currentList[Math.floor(Math.random() * currentList.length)];
        focusOnRestaurant(random);
    }
}

================================================================================
【如何启用】

方法1: 直接修改 index.html 中的 openAIDecision() 函数

方法2: 创建新文件 ai-decision.js，在其中定义函数，
       然后在 index.html 末尾添加: <script src="ai-decision.js"></script>

================================================================================
*/
