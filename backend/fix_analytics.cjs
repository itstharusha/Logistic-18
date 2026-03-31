const fs = require('fs');

function fixAnalyticsDash() {
    const file = 'c:/Users/ASUS/Desktop/Logistics18/frontend/src/pages/Analytics/AnalyticsDashboardPage.jsx';
    let c = fs.readFileSync(file, 'utf8');
    
    // Remove MOCK_DATA obj
    c = c.replace(/\/\/ ─── MOCK DATA [\s\S]*?(?=export default function AnalyticsDashboardPage)/, '');
    
    c = c.replace(/const \[usingMock, setUsingMock\] = useState\(false\);/, '');
    
    // Remove fallback logic
    c = c.replace(/setUsingMock\(false\);/g, '');
    c = c.replace(/setUsingMock\(true\);/g, '');
    
    c = c.replace(/const riskTrend = useMemo\(\(\) => data\?\.riskTrend \?\? MOCK_DATA\.riskTrend, \[data\]\);/, 'const riskTrend = useMemo(() => data?.riskTrend ?? [], [data]);');
    c = c.replace(/\(\) => data\?\.alertsBySeverity \?\? MOCK_DATA\.alertsBySeverity,/g, '() => data?.alertsBySeverity ?? [],');
    c = c.replace(/\(\) => data\?\.shipmentDelays \?\? MOCK_DATA\.shipmentDelays,/g, '() => data?.shipmentDelays ?? [],');
    c = c.replace(/\(\) => data\?\.inventoryRisk \?\? MOCK_DATA\.inventoryRisk,/g, '() => data?.inventoryRisk ?? [],');
    c = c.replace(/const kpis = useMemo\(\(\) => data\?\.kpis \?\? MOCK_DATA\.kpis, \[data\]\);/, 'const kpis = useMemo(() => data?.kpis ?? {}, [data]);');
    
    // Remove usingMock checks in render
    c = c.replace(/\{usingMock && \([\s\S]*?<\/div>\s*\)\}/, '');
    c = c.replace(/\{reduxError && !usingMock && \(/, '{reduxError && (');
    
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed AnalyticsDashboardPage');
}

function fixKPI() {
    const file = 'c:/Users/ASUS/Desktop/Logistics18/frontend/src/pages/Analytics/KPI-page.jsx';
    let c = fs.readFileSync(file, 'utf8');
    
    // Remove functions generateMockTrend and buildMockKPI
    c = c.replace(/function generateMockTrend[\s\S]*?(?=export default function KPIPage)/, '');
    
    c = c.replace(/const \[usingMock, setUsingMock\] = useState\(false\);/, '');
    c = c.replace(/setUsingMock\(true\);/g, '');
    c = c.replace(/setUsingMock\(false\);/g, '');
    
    // Replace fallback returns - assuming real backend now
    c = c.replace(/return generateMockTrend\(days, metric\);/, 'return Array.isArray(kpiData?.trend) ? kpiData.trend : [];');
    c = c.replace(/return buildMockKPI\(metric\);/, 'return kpiData?.metrics || { current: 0, previous: 0, avg: 0, peak: 0, low: 0, unit: "" };');
    
    // Render
    c = c.replace(/\{\(usingMock \|\| apiError\) && \(/, '{apiError && (');
    c = c.replace(/className=\{`kp-banner \$\{apiError && !usingMock \? 'kp-banner-error' : 'kp-banner-warn'\}`\}/g, 'className="kp-banner kp-banner-error"');
    c = c.replace(/\{usingMock \? 'Showing mock data — backend unavailable' : apiError\}/, '{apiError}');
    
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed KPIPage');
}

fixAnalyticsDash();
fixKPI();
