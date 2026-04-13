// Chart instance
let distChartInstance = null;

// The 7 Distribution segments
const DIST_LABELS = ['~30일', '31~60일', '61~90일', '91~120일', '121~180일', '181~210일', '211일~'];
const DIST_COLORS = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308'
];

document.addEventListener('DOMContentLoaded', () => {
    initViewToggles();
    updateDropdown('daily'); // default

    document.getElementById('search-btn').addEventListener('click', loadData);

    // Initial Data Load
    loadData();
});

function initViewToggles() {
    const btns = document.querySelectorAll('.view-type-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btns.forEach(b => {
                b.classList.remove('active');
                b.classList.add('text-slate-500');
                b.classList.remove('text-white');
            });
            const target = e.currentTarget;
            target.classList.add('active', 'text-white');
            target.classList.remove('text-slate-500');

            updateDropdown(target.dataset.type);
        });
    });
}

function updateDropdown(type) {
    const dropdown = document.getElementById('period-dropdown');
    dropdown.innerHTML = '';

    let options = [];
    if (type === 'daily') {
        options = ['2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11', '2026-05-10'];
    } else if (type === 'weekly') {
        options = ['2026년 20주차', '2026년 19주차', '2026년 18주차', '2026년 17주차'];
    } else if (type === 'monthly') {
        options = ['2026년 5월', '2026년 4월', '2026년 3월', '2026년 2월', '2026년 1월'];
    } else if (type === 'yearly') {
        options = ['2026년', '2025년', '2024년'];
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        dropdown.appendChild(option);
    });
}

function generateMockData() {
    const randomPercent = () => {
        let remaining = 100.0;
        let dist = [];
        for (let i = 0; i < 6; i++) {
            let val = parseFloat((Math.random() * (remaining * 0.4)).toFixed(1));
            dist.push(val);
            remaining -= val;
        }
        dist.push(parseFloat(remaining.toFixed(1)));
        return dist.sort(() => Math.random() - 0.5);
    };

    const makeRow = (name) => {
        const leadTime = parseFloat((10 + Math.random() * 20).toFixed(1));
        const leadTimePrev = parseFloat((leadTime + (Math.random() * 4 - 2)).toFixed(1));

        const count = Math.floor(100 + Math.random() * 900);
        const countPrev = Math.floor(count + (Math.random() * 200 - 100));

        const price = Math.floor(800000 + Math.random() * 1000000);
        const pricePrev = Math.floor(price + (Math.random() * 200000 - 100000));

        return {
            name: name,
            leadTime, leadTimePrev,
            count, countPrev,
            price, pricePrev,
            dist: randomPercent(),
            distPrev: randomPercent()
        };
    };

    const kpiLT = parseFloat((12 + Math.random() * 3).toFixed(1));
    const kpiLTPrev = parseFloat((kpiLT + (Math.random() * 2 - 1)).toFixed(1));

    const kpiCount = Math.floor(1000 + Math.random() * 500);
    const kpiCountPrev = Math.floor(kpiCount + (Math.random() * 200 - 100));

    const kpiPrice = Math.floor(1200000 + Math.random() * 200000);
    const kpiPricePrev = Math.floor(kpiPrice + (Math.random() * 100000 - 50000));

    return {
        kpi: {
            leadTime: kpiLT, leadTimePrev: kpiLTPrev,
            count: kpiCount, countPrev: kpiCountPrev,
            price: kpiPrice, pricePrev: kpiPricePrev,
            dist: randomPercent(),
            distPrev: randomPercent()
        },
        dept: [makeRow('영업1팀'), makeRow('영업2팀'), makeRow('영업3팀'), makeRow('마케팅팀')],
        prod: [makeRow('패키지A'), makeRow('패키지B'), makeRow('자유여행'), makeRow('항공가족'), makeRow('프리미엄')],
        price: [makeRow('50만 미만'), makeRow('50-100만'), makeRow('100-200만'), makeRow('200-300만'), makeRow('300만 이상')]
    };
}

function formatCurrency(num) {
    if (num % 1 !== 0) {
        return num.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return num.toLocaleString('ko-KR');
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

    const textVal = isPrice ? formatCurrency(Math.round(absDiff)) : formatCurrency(isDecimal ? parseFloat(absDiff) : Math.round(absDiff));

    return {
        html: `<span class="${colorClass}">${icon} ${textVal}</span>`,
        badgeHtml: `<span class="${bgClass} px-1.5 py-0.5 rounded text-[11px]">${icon} ${textVal}</span>`,
        colorClass
    };
}

function loadData() {
    document.querySelectorAll('.kpi-card span').forEach(el => el.classList.remove('kpi-value-animate'));

    const btn = document.getElementById('search-btn');
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 로딩중...`;
    btn.disabled = true;

    setTimeout(() => {
        const data = generateMockData();
        renderKPIs(data.kpi);
        renderChart(data.kpi);
        renderTable('dept-table-body', data.dept, true);
        renderTable('prod-table-body', data.prod, true);
        renderTable('price-table-body', data.price, false);

        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> 조회`;
        btn.disabled = false;

    }, 400);
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

function renderTable(tbodyId, rowData, showPrice = true) {
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
                // Using percentage point (%p) format
                diffHtml = `<span class="${colorClass}">${icon} ${Math.abs(diff).toFixed(1)}%p</span>`;
            }

            // 투명도(alpha)를 계산하여 비중이 높을수록 진한 파란색 음영 적용
            // 최대 100% 기준이므로 currVal / 100으로 비율을 구하고 눈에 띄도록 배율 적용
            // (가독성을 위해 alpha 최대값을 0.5 정도로 제한하여 글자가 잘 보이게 함)
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
            <td class="px-4 py-3 align-top text-right">
                <div class="text-slate-700 font-medium">${row.leadTime.toFixed(1)}일</div>
                <div class="text-[11px] mt-0.5 font-bold">${ltChange.html}</div>
            </td>
            <td class="px-4 py-3 align-top text-right">
                <div class="text-slate-700 font-medium">${formatCurrency(row.count)}건</div>
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
