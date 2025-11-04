import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成日期範圍
function generateDateRange(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // 確保時間為 00:00:00
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // 確保包含結束日期
  
  let current = new Date(start);
  // 確保包含結束日期
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    
    // 如果已經是最後一天，跳出循環
    const currentDateStr = `${year}-${month}-${day}`;
    if (currentDateStr === endDate) {
      break;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  // 確保最後一天被包含
  const lastDateStr = endDate;
  if (dates.length === 0 || dates[dates.length - 1] !== lastDateStr) {
    dates.push(lastDateStr);
  }
  
  return dates;
}

// 生成模擬數據
function generateSeriesData(seriesNames, length, baseValues = {}) {
  const series = {};
  seriesNames.forEach((name, index) => {
    const baseValue = baseValues[name] || 100 + index * 20;
    const data = [];
    for (let i = 0; i < length; i++) {
      // 添加趨勢、季節性和波動
      const trend = (i / length) * 50;
      const seasonal = Math.sin((i / 365) * 2 * Math.PI) * 20;
      const weekly = i % 7 >= 5 ? -10 : 0;
      const noise = (Math.random() - 0.5) * 30;
      const value = Math.max(0, Math.round(baseValue + trend + seasonal + weekly + noise));
      data.push(value);
    }
    series[name] = data;
  });
  return series;
}

// 讀取並擴展 testData_5.json
function extendTestData5() {
  console.log('讀取 testData_5.json...');
  const filePath = path.join(__dirname, '../public/data/testData_5.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const originalCategories = data.categories || [];
  const originalStartDate = originalCategories[0];
  const targetEndDate = '2024-12-31';
  
  // 生成完整的日期範圍（從原始開始日期到 2024-12-31）
  console.log(`生成日期範圍：${originalStartDate} ~ ${targetEndDate}...`);
  const fullCategories = generateDateRange(originalStartDate, targetEndDate);
  const fullLength = fullCategories.length;
  
  // 建立原始日期到索引的映射
  const originalDateToIndex = new Map();
  originalCategories.forEach((date, index) => {
    originalDateToIndex.set(date, index);
  });
  
  // 擴展各個系列的數據
  const seriesNames = data.seriesNames || Object.keys(data.series || {});
  const extendedSeries = {};
  
  seriesNames.forEach((name) => {
    const originalData = data.series[name] || [];
    const extendedData = [];
    
    // 獲取平均值和最後一個值，用於補值
    const avg = originalData.length > 0
      ? Math.max(1, Math.round(originalData.reduce((a, b) => a + b, 0) / originalData.length))
      : 100;
    const lastVal = originalData.length > 0 ? originalData[originalData.length - 1] : avg;
    const firstVal = originalData.length > 0 ? originalData[0] : avg;
    
    fullCategories.forEach((date, index) => {
      const originalIndex = originalDateToIndex.get(date);
      if (originalIndex !== undefined && originalIndex < originalData.length) {
        // 使用原始數據
        extendedData.push(originalData[originalIndex]);
      } else {
        // 補值：使用平滑趨勢 + 季節性 + 小噪聲
        const yearlyTrend = (index / fullLength) * 40;
        const seasonal = Math.sin((index / 365) * 2 * Math.PI) * 15;
        const weekly = index % 7 >= 5 ? -4 : 0;
        const base = index < fullLength / 2 ? firstVal : lastVal;
        const noise = (Math.random() - 0.5) * 10;
        extendedData.push(
          Math.max(0, Math.round(base + yearlyTrend + seasonal + weekly + noise))
        );
      }
    });
    
    extendedSeries[name] = extendedData;
  });
  
  // 構建新的數據結構
  const newData = {
    categories: fullCategories,
    series: extendedSeries,
    seriesNames: seriesNames
  };
  
  console.log(`寫入擴展後的 testData_5.json（${fullLength} 筆資料）...`);
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');
  console.log('✓ testData_5.json 完成');
}

// 生成 testData_8.json（8萬筆）
function generateTestData8() {
  console.log('生成 testData_8.json（80000 筆資料）...');
  
  const targetEndDate = '2024-12-31';
  const targetCount = 80000;
  const daysBack = targetCount - 1; // 80000 筆資料，包含結束日期
  
  const startDate = new Date(targetEndDate);
  startDate.setDate(startDate.getDate() - daysBack);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  console.log(`日期範圍：${startDateStr} ~ ${targetEndDate}`);
  
  const categories = generateDateRange(startDateStr, targetEndDate);
  
  // 確保以 2024-12-31 結束，並且正好是 80000 筆
  // 如果最後一筆不是 2024-12-31，替換它
  if (categories.length > 0 && categories[categories.length - 1] !== targetEndDate) {
    categories[categories.length - 1] = targetEndDate;
  }
  
  // 確保正好是 80000 筆
  if (categories.length > targetCount) {
    // 如果超過目標數量，截斷，但確保最後一筆是 2024-12-31
    categories.splice(0, categories.length - targetCount);
    if (categories[0] && categories[0] !== targetEndDate) {
      // 重新計算起始日期
      const endDate = new Date(targetEndDate);
      endDate.setDate(endDate.getDate() - (targetCount - 1));
      const startDateStr = endDate.toISOString().split('T')[0];
      categories = generateDateRange(startDateStr, targetEndDate);
    }
  } else if (categories.length < targetCount) {
    // 如果少於目標數量，向前延伸
    let firstDate = new Date(categories[0]);
    const needed = targetCount - categories.length;
    for (let i = 0; i < needed; i++) {
      firstDate.setDate(firstDate.getDate() - 1);
      const year = firstDate.getFullYear();
      const month = String(firstDate.getMonth() + 1).padStart(2, '0');
      const day = String(firstDate.getDate()).padStart(2, '0');
      categories.unshift(`${year}-${month}-${day}`);
    }
  }
  
  // 最終確保最後一筆是 2024-12-31
  if (categories[categories.length - 1] !== targetEndDate) {
    categories[categories.length - 1] = targetEndDate;
  }
  
  const seriesNames = ['電子產品', '服飾', '食品', '運動'];
  const baseValues = {
    '電子產品': 110,
    '服飾': 130,
    '食品': 150,
    '運動': 120
  };
  
  const series = generateSeriesData(seriesNames, categories.length, baseValues);
  
  const data = {
    categories,
    series,
    seriesNames
  };
  
  const filePath = path.join(__dirname, '../public/data/testData_8.json');
  console.log(`寫入 testData_8.json（${categories.length} 筆）...`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ testData_8.json 完成');
}

// 生成 testData_10.json（10萬筆）
function generateTestData10() {
  console.log('生成 testData_10.json（100000 筆資料）...');
  
  const targetEndDate = '2024-12-31';
  const targetCount = 100000;
  const daysBack = targetCount - 1; // 100000 筆資料，包含結束日期
  
  const startDate = new Date(targetEndDate);
  startDate.setDate(startDate.getDate() - daysBack);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  console.log(`日期範圍：${startDateStr} ~ ${targetEndDate}`);
  
  const categories = generateDateRange(startDateStr, targetEndDate);
  
  // 確保以 2024-12-31 結束，並且正好是 100000 筆
  // 如果最後一筆不是 2024-12-31，替換它
  if (categories.length > 0 && categories[categories.length - 1] !== targetEndDate) {
    categories[categories.length - 1] = targetEndDate;
  }
  
  // 確保正好是 100000 筆
  if (categories.length > targetCount) {
    // 如果超過目標數量，截斷，但確保最後一筆是 2024-12-31
    categories.splice(0, categories.length - targetCount);
    if (categories[0] && categories[0] !== targetEndDate) {
      // 重新計算起始日期
      const endDate = new Date(targetEndDate);
      endDate.setDate(endDate.getDate() - (targetCount - 1));
      const startDateStr = endDate.toISOString().split('T')[0];
      categories = generateDateRange(startDateStr, targetEndDate);
    }
  } else if (categories.length < targetCount) {
    // 如果少於目標數量，向前延伸
    let firstDate = new Date(categories[0]);
    const needed = targetCount - categories.length;
    for (let i = 0; i < needed; i++) {
      firstDate.setDate(firstDate.getDate() - 1);
      const year = firstDate.getFullYear();
      const month = String(firstDate.getMonth() + 1).padStart(2, '0');
      const day = String(firstDate.getDate()).padStart(2, '0');
      categories.unshift(`${year}-${month}-${day}`);
    }
  }
  
  // 最終確保最後一筆是 2024-12-31
  if (categories[categories.length - 1] !== targetEndDate) {
    categories[categories.length - 1] = targetEndDate;
  }
  
  const seriesNames = ['電子產品', '服飾', '食品', '運動'];
  const baseValues = {
    '電子產品': 110,
    '服飾': 130,
    '食品': 150,
    '運動': 120
  };
  
  const series = generateSeriesData(seriesNames, categories.length, baseValues);
  
  const data = {
    categories,
    series,
    seriesNames
  };
  
  const filePath = path.join(__dirname, '../public/data/testData_10.json');
  console.log(`寫入 testData_10.json（${categories.length} 筆）...`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ testData_10.json 完成');
}

// 生成 testData_100.json（100萬筆）
function generateTestData100() {
  console.log('生成 testData_100.json（1000000 筆資料）...');
  
  const targetEndDate = '2024-12-31';
  const targetCount = 1000000;
  const daysBack = targetCount - 1; // 1000000 筆資料，包含結束日期
  
  const startDate = new Date(targetEndDate);
  startDate.setDate(startDate.getDate() - daysBack);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  console.log(`日期範圍：${startDateStr} ~ ${targetEndDate}`);
  console.log('注意：生成 100 萬筆數據可能需要較長時間...');
  
  // 生成日期範圍（分批處理以避免記憶體問題）
  let categories = [];
  let currentDate = new Date(startDate);
  const endDate = new Date(targetEndDate);
  
  console.log('正在生成日期範圍...');
  let progress = 0;
  const batchSize = 10000;
  
  while (currentDate <= endDate && categories.length < targetCount) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    categories.push(`${year}-${month}-${day}`);
    
    // 每 10000 筆顯示一次進度
    if (categories.length % batchSize === 0) {
      progress = Math.floor((categories.length / targetCount) * 100);
      console.log(`  日期範圍進度: ${progress}% (${categories.length}/${targetCount})`);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    
    // 如果達到目標數量，停止
    if (categories.length >= targetCount) {
      break;
    }
  }
  
  // 確保正好是 1000000 筆
  if (categories.length > targetCount) {
    categories = categories.slice(0, targetCount);
  } else if (categories.length < targetCount) {
    // 如果少於目標數量，向前延伸
    let firstDate = new Date(categories[0]);
    const needed = targetCount - categories.length;
    for (let i = 0; i < needed; i++) {
      firstDate.setDate(firstDate.getDate() - 1);
      const year = firstDate.getFullYear();
      const month = String(firstDate.getMonth() + 1).padStart(2, '0');
      const day = String(firstDate.getDate()).padStart(2, '0');
      categories.unshift(`${year}-${month}-${day}`);
    }
  }
  
  // 最終確保最後一筆是 2024-12-31
  if (categories[categories.length - 1] !== targetEndDate) {
    categories[categories.length - 1] = targetEndDate;
  }
  
  console.log(`日期範圍生成完成：${categories.length} 筆`);
  
  const seriesNames = ['電子產品', '服飾', '食品', '運動'];
  const baseValues = {
    '電子產品': 110,
    '服飾': 130,
    '食品': 150,
    '運動': 120
  };
  
  console.log('正在生成系列數據（這可能需要幾分鐘）...');
  const series = {};
  
  // 分批生成系列數據以避免記憶體問題
  seriesNames.forEach((name, nameIndex) => {
    const baseValue = baseValues[name];
    const data = [];
    const dataBatchSize = 50000; // 每批處理 5 萬筆
    
    console.log(`  正在生成 ${name} 系列數據...`);
    
    for (let i = 0; i < categories.length; i++) {
      // 添加趨勢、季節性和波動
      const trend = (i / categories.length) * 50;
      const seasonal = Math.sin((i / 365) * 2 * Math.PI) * 20;
      const weekly = i % 7 >= 5 ? -10 : 0;
      const noise = (Math.random() - 0.5) * 30;
      const value = Math.max(0, Math.round(baseValue + trend + seasonal + weekly + noise));
      data.push(value);
      
      // 每 5 萬筆顯示一次進度
      if ((i + 1) % dataBatchSize === 0) {
        const progress = Math.floor(((i + 1) / categories.length) * 100);
        console.log(`    ${name} 進度: ${progress}% (${i + 1}/${categories.length})`);
      }
    }
    
    series[name] = data;
    console.log(`  ✓ ${name} 系列生成完成`);
  });
  
  const data = {
    categories,
    series,
    seriesNames
  };
  
  const filePath = path.join(__dirname, '../public/data/testData_100.json');
  console.log(`正在寫入 testData_100.json（${categories.length} 筆）...`);
  console.log('注意：寫入 100 萬筆數據可能需要較長時間...');
  
  // 使用流式寫入以節省記憶體
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log('✓ testData_100.json 完成');
  const fileSize = fs.statSync(filePath).size;
  console.log(`檔案大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
}

// 主執行函數
function main() {
  try {
    console.log('開始處理測試數據檔案...\n');
    
    extendTestData5();
    console.log('');
    
    generateTestData8();
    console.log('');
    
    generateTestData10();
    console.log('');
    
    console.log('✓ 所有檔案處理完成！');
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
}

main();
