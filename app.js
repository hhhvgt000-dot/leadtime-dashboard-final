// Chart instance
let distChartInstance = null;
let currentData = null;
let fileListConfig = null;
let currentViewType = 'daily';

// The 8 Distribution segments
const DIST_LABELS = ['~30일', '31~60일', '61~90일', '91~120일', '121~150일', '151~180일', '181~210일', '211일~'];
const DIST_COLORS = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#10b981', '#84cc16', '#eab308' // Extra color inserted
];

const DEPT_ORDER = ['동남아1팀', '동남아2팀', '필리핀/말레이시아파트', '태국파트', '중국팀', '일본팀', '국내팀', '서유럽팀', '스페인/북유럽팀', '동유럽팀', '지중해/인도/아프리카팀', '프리미엄팀', '미주팀', '남태평양팀', '부산지점', '대구지점', '크루즈/테마팀'];
const PRICE_ORDER = ['50만 미만', '50~100만 미만', '100~200만 미만', '200~300만 미만', '300만~'];

function sortDataByOrder(dataList, orderArray, field = 'name') {
    if (!dataList) return [];
    return [...dataList].sort((a, b) => {
        let idxA = orderArray.indexOf(a[field]);
        let idxB = orderArray.indexOf(b[field]);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
    });
}

function filterProdTable() {
    if (!currentData || !currentData.prod) return;
    
    const searchInput = document.getElementById('prod-search');
    const deptFilter = document.getElementById('prod-dept-filter');
    
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const deptValue = deptFilter ? deptFilter.value : '';
    
    let filtered = currentData.prod;
    
    if (query) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }
    if (deptValue) {
        filtered = filtered.filter(p => (p.dept || '알수없음') === deptValue);
    }
    
    filtered = sortDataByOrder(filtered, DEPT_ORDER, 'dept');
    renderTable('prod-table-body', filtered, true, true);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`data_config.json?v=${timestamp}`);
        fileListConfig = await res.json();
    } catch(e) {
        console.error("데이터 구성을 불러오는 데 실패했습니다.", e);
    }

    initViewToggles();
    if (fileListConfig) {
        updateDropdown('daily'); // default
    }

    document.getElementById('search-btn').addEventListener('click', loadData);

    // 상품 필터 이벤트 추가
    const prodSearch = document.getElementById('prod-search');
    if (prodSearch) {
        prodSearch.addEventListener('input', filterProdTable);
    }
    const prodDeptFilter = document.getElementById('prod-dept-filter');
    if (prodDeptFilter) {
        prodDeptFilter.addEventListener('change', filterProdTable);
    }

    // Initial Data Load
    if (fileListConfig) {
        loadData();
    }
});

function initViewToggles() {
    const btns = document.querySelectorAll('.view-type-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btns.forEach(b => {
                b.classList.remove('active', 'text-white');
                b.classList.add('text-slate-500');
            });
            const target = e.currentTarget;
            target.classList.add('active', 'text-white');
            target.classList.remove('text-slate-500');

            currentViewType = target.dataset.type;
            updateDropdown(currentViewType);
        });
    });
}

function updateDropdown(type) {
    if (!fileListConfig) return;
    const dropdown = document.getElementById('period-dropdown');
    dropdown.innerHTML = '';

    let options = [];
    if (type === 'daily') {
        const dailyFiles = fileListConfig['데일리'] || [];
        options = dailyFiles
            .filter(f => !f.includes('25년') && !f.startsWith('2025'))
            .map(f => f.split(' ')[0])
            .reverse(); 
    } else if (type === 'weekly') {
        const weeklyFiles = fileListConfig['주간'] || [];
        options = weeklyFiles
            .filter(f => !f.includes('25년'))
            .map(f => f.replace('.json', ''))
            .reverse();
    } else if (type === 'monthly') {
        const monthlyFiles = fileListConfig['월간'] || [];
        options = monthlyFiles
            .filter(f => !f.includes('25년'))
            .map(f => f.replace('.json', ''))
            .reverse();
    } else if (type === 'yearly') {
        const yearlyFiles = fileListConfig['연간'] || [];
        options = yearlyFiles
            .filter(f => !f.includes('25년'))
            .map(f => f.replace('.json', ''))
            .reverse();
    }

    // remove duplicates
    options = [...new Set(options)];

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        dropdown.appendChild(option);
    });
}

function getFilenames(type, selection) {
    let currFile = null;
    let prevFile = null;
    
    if (type === 'daily') {
        currFile = fileListConfig['데일리'].find(f => f.startsWith(selection));
        if (currFile) {
            const match = currFile.match(/\((.*?)\)/);
            if(match) {
                let tag = match[1]; 
                const currYearStr = tag.match(/^\d+/)[0]; 
                const prevYearStr = (parseInt(currYearStr) - 1).toString();
                tag = tag.replace(currYearStr + '년', prevYearStr + '년');
                prevFile = fileListConfig['데일리'].find(f => f.includes(`(${tag})`));
            }
        }
        return {
            curr: currFile ? `데일리/${currFile}` : null,
            prev: prevFile ? `데일리/${prevFile}` : null
        };
    } else if (['weekly', 'monthly', 'yearly'].includes(type)) {
        const ext = '.json';
        const currYearStr = selection.match(/^\d+/)[0];
        const prevYearStr = (parseInt(currYearStr) - 1).toString();
        const prevSelection = selection.replace(currYearStr + '년', prevYearStr + '년');
        
        let folder = '';
        if (type === 'weekly') folder = '주간';
        if (type === 'monthly') folder = '월간';
        if (type === 'yearly') folder = '연간';
        
        currFile = `${folder}/${selection}${ext}`;
        prevFile = `${folder}/${prevSelection}${ext}`;
        return { curr: currFile, prev: prevFile };
    }
    return { curr: null, prev: null };
}

function mergeData(curr, prev) {
    const emptyKpi = { leadTime: 0, count: 0, price: 0, dist: [0,0,0,0,0,0,0,0] };
    const currKpi = curr?.kpi || emptyKpi;
    const kpi = {
        ...currKpi,
        leadTimePrev: prev?.kpi?.leadTime || 0,
        countPrev: prev?.kpi?.count || 0,
        pricePrev: prev?.kpi?.price || 0,
        distPrev: prev?.kpi?.dist || [currKpi.dist[0], currKpi.dist[1], currKpi.dist[2], currKpi.dist[3], currKpi.dist[4], currKpi.dist[5], currKpi.dist[6], currKpi.dist[7] || 0],
    };

    const mergeList = (currList, prevList) => {
        return (currList || []).map(c => {
            const match = (prevList || []).find(p => p.name === c.name);
            return {
                ...c,
                leadTimePrev: match?.leadTime || 0,
                countPrev: match?.count || 0,
                pricePrev: match?.price || 0,
                distPrev: match?.dist || (c.dist ? [...c.dist] : [0,0,0,0,0,0,0,0])
            };
        });
    };
    
    return {
        kpi,
        dept: mergeList(curr?.dept, prev?.dept),
        prod: mergeList(curr?.prod, prev?.prod),
        price: mergeList(curr?.price, prev?.price)
    };
}

async function fetchJsonData(filePath) {
    if (!filePath) return null;
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`${filePath}?v=${timestamp}`);
        if(!res.ok) return null;
        return await res.json();
    } catch(e) {
        console.warn(`Failed to read config/json ${filePath}: ${e}`);
        return null;
    }
}

function formatCurrency(num, allowDecimal = false) {
    if (!allowDecimal) {
        return Math.round(num).toLocaleString('ko-KR');
    }
    if (num % 1 !== 0) {
        return num.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(num).toLocaleString('ko-KR');
}

function getChangeData(curr, prev, isPrice = false, isDecimal = false) {
    const diff = curr - prev;
    if (Math.abs(diff) < 0.01) return { html: '<span class="text-slate-400">-</span>', colorClass: 'text-slate-400' };

    const isUp = diff > 0;
    const colorClass = isUp ? 'text-red-500' : 'text-blue-500';
    const bgClass = isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
    const icon = isUp ? '▲' : '▼';

    let absDiff = Math.abs(diff);
    if (isDecimal) absDiff = absDiff.toFixed(1);

    const textVal = isPrice ? formatCurrency(Math.round(absDiff)) : formatCurrency(isDecimal ? parseFloat(absDiff) : Math.round(absDiff), isDecimal);

    return {
        html: `<span class="${colorClass}">${icon} ${textVal}</span>`,
        badgeHtml: `<span class="${bgClass} px-1.5 py-0.5 rounded text-[11px]">${icon} ${textVal}</span>`,
        colorClass
    };
}

async function loadData() {
    document.querySelectorAll('.kpi-card span').forEach(el => el.classList.remove('kpi-value-animate'));

    const btn = document.getElementById('search-btn');
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 로딩중...`;
    btn.disabled = true;

    const dropdown = document.getElementById('period-dropdown');
    const selection = dropdown.value;
    
    if(!selection) {
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> 조회`;
        btn.disabled = false;
        return;
    }

    const { curr, prev } = getFilenames(currentViewType, selection);
    
    try {
        const [currDataArray, prevDataArray] = await Promise.all([
            fetchJsonData(curr),
            fetchJsonData(prev)
        ]);
        
        if (!currDataArray) {
            alert(`해당 시기의 데이터 파일을 찾을 수 없습니다: ${curr}`);
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> 조회`;
            btn.disabled = false;
            return;
        }
        
        currentData = mergeData(currDataArray, prevDataArray);

        renderKPIs(currentData.kpi);
        renderChart(currentData.kpi);
        
        const sortedDept = sortDataByOrder(currentData.dept, DEPT_ORDER);
        renderTable('dept-table-body', sortedDept, true);
        
        const sortedPrice = sortDataByOrder(currentData.price, PRICE_ORDER);
        renderTable('price-table-body', sortedPrice, false);

        // 부서 필터 목록 생성
        const deptFilter = document.getElementById('prod-dept-filter');
        if (deptFilter && currentData.prod) {
            const currentVal = deptFilter.value;
            deptFilter.innerHTML = '<option value="">전체 부서</option>';
            const uniqueDepts = [...new Set(currentData.prod.map(p => p.dept || '알수없음'))];
            uniqueDepts.sort((a, b) => {
                let idxA = DEPT_ORDER.indexOf(a);
                let idxB = DEPT_ORDER.indexOf(b);
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                return idxA - idxB;
            });
            uniqueDepts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                deptFilter.appendChild(opt);
            });
            
            // 기존 선택값이 새 목록에도 있으면 유지
            const optionExists = Array.from(deptFilter.options).some(opt => opt.value === currentVal);
            if (currentVal && optionExists) {
                deptFilter.value = currentVal;
            }
        }

        filterProdTable();

    } catch(err) {
        console.error(err);
        alert("데이터를 불러오는 중 오류가 발생했습니다: " + err.message);
    }

    btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> 조회`;
    btn.disabled = false;
}

function renderKPIs(kpi) {
    document.getElementById('kpi-leadtime').textContent = kpi.leadTime.toFixed(1);
    document.getElementById('kpi-leadtime-prev').textContent = kpi.leadTimePrev.toFixed(1);
    const ltChange = getChangeData(kpi.leadTime, kpi.leadTimePrev, false, true);
    document.getElementById('kpi-leadtime-change').innerHTML = ltChange.badgeHtml;

    document.getElementById('kpi-count').textContent = formatCurrency(kpi.count);
    document.getElementById('kpi-count-prev').textContent = formatCurrency(kpi.countPrev);
    const countChange = getChangeData(kpi.count, kpi.countPrev, false, false);
    document.getElementById('kpi-count-change').innerHTML = countChange.badgeHtml;

    document.getElementById('kpi-price').textContent = formatCurrency(kpi.price);
    document.getElementById('kpi-price-prev').textContent = formatCurrency(kpi.pricePrev);
    const priceChange = getChangeData(kpi.price, kpi.pricePrev, true, false);
    document.getElementById('kpi-price-change').innerHTML = priceChange.badgeHtml;

    setTimeout(() => {
        document.querySelectorAll('.kpi-card span').forEach(el => el.classList.add('kpi-value-animate'));
    }, 10);
}

function renderChart(kpi) {
    const ctx = document.getElementById('distributionChart').getContext('2d');

    if (distChartInstance) distChartInstance.destroy();

    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#60a5fa');

    distChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DIST_LABELS,
            datasets: [
                {
                    label: '당해년도',
                    data: kpi.dist,
                    backgroundColor: gradient,
                    borderRadius: 4,
                    borderWidth: 0,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                },
                {
                    label: '전년도',
                    data: kpi.distPrev,
                    backgroundColor: '#cbd5e1',
                    borderRadius: 4,
                    borderWidth: 0,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 13, family: "'Inter', sans-serif" },
                    bodyFont: { size: 14, family: "'Inter', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + context.parsed.y + '%';
                        }
                    }
                },
                datalabels: {
                    display: function (context) {
                        return context.datasetIndex === 0;
                    },
                    anchor: 'end',
                    align: 'top',
                    color: '#64748b',
                    font: { weight: 'bold', family: "'Inter', sans-serif", size: 10 },
                    formatter: function (value) { return value.toFixed(1) + '%'; }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    border: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif" },
                        color: '#94a3b8',
                        callback: function (value) { return value + '%'; }
                    }
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", weight: '500' },
                        color: '#64748b'
                    }
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderTable(tbodyId, rowData, showPrice = true, showDept = false) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    rowData.forEach(row => {
        const tr = document.createElement('tr');

        const ltChange = getChangeData(row.leadTime, row.leadTimePrev, false, true);
        const countChange = getChangeData(row.count, row.countPrev, false, false);
        const priceChange = getChangeData(row.price, row.pricePrev, true, false);

        let distColumnsHtml = '';
        row.dist.forEach((currVal, idx) => {
            const prevVal = row.distPrev[idx];
            const diff = currVal - prevVal;

            let diffHtml = '';
            if (Math.abs(diff) < 0.1) {
                diffHtml = `<span class="text-slate-500/70">-</span>`;
            } else {
                const isUp = diff > 0;
                const colorClass = isUp ? 'text-red-500' : 'text-blue-600';
                const icon = isUp ? '▲' : '▼';
                diffHtml = `<span class="${colorClass}">${icon} ${Math.abs(diff).toFixed(1)}%p</span>`;
            }

            const alpha = Math.min(0.5, (currVal / 100) * 1.2);
            const bgColor = `rgba(59, 130, 246, ${alpha})`;

            distColumnsHtml += `
                <td class="px-2 py-3 align-middle text-center border-l border-white/50" style="background-color: ${bgColor};">
                    <div class="text-slate-800 font-semibold text-sm">${currVal.toFixed(1)}%</div>
                    <div class="text-[11px] mt-0.5 font-bold">${diffHtml}</div>
                </td>
            `;
        });

        tr.innerHTML = `
            <td class="px-4 py-3 font-semibold text-slate-800 align-top">${row.name}</td>
            ${showDept ? `<td class="px-4 py-3 align-top text-center text-slate-600 text-[13px] font-medium">${row.dept || '-'}</td>` : ''}
            <td class="px-4 py-3 align-top text-right">
                <div class="text-slate-700 font-medium">${row.leadTime.toFixed(1)}일</div>
                <div class="text-[11px] mt-0.5 font-bold">${ltChange.html}</div>
            </td>
            <td class="px-4 py-3 align-top text-right">
                <div class="text-slate-700 font-medium">${formatCurrency(row.count)}명</div>
                <div class="text-[11px] mt-0.5 font-bold">${countChange.html}</div>
            </td>
            ${showPrice ? `
            <td class="px-4 py-3 align-top text-right">
                <div class="text-slate-700 font-medium">₩${formatCurrency(row.price)}</div>
                <div class="text-[11px] mt-0.5 font-bold">${priceChange.html}</div>
            </td>
            ` : ''}
            ${distColumnsHtml}
        `;
        tbody.appendChild(tr);
    });
}
