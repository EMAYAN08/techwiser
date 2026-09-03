import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportComparisonToPDF(comparison: any, isDark: boolean = true) {
  const { products, keyDifferences, aiSummary } = comparison;

  // 1) Support new backend schema format
  let groupedSpecs = comparison.groupedSpecs;

  // 2) Fallback to old mock format (product.specs)
  if (!groupedSpecs && products[0]?.specs) {
    groupedSpecs = {};
    const productA = products[0];
    for (let i = 0; i < productA.specs.length; i++) {
      const lead = productA.specs[i];
      if (!lead || lead.category === 'Overview') continue;
      
      if (!groupedSpecs[lead.category]) {
        groupedSpecs[lead.category] = [];
      }
      
      const values = products.map((p: any) => p.specs[i]?.value || "—");
      
      // Figure out winner from the old format
      const winnerIndex = products.findIndex((p: any) => p.specs[i]?.isWinner);
      
      groupedSpecs[lead.category].push({
        label: lead.label,
        values,
        winnerIndex: winnerIndex >= 0 ? winnerIndex : -1
      });
    }
  }

  groupedSpecs = groupedSpecs || {};
  
  // Create columns based on number of products
  const colWidth = 100 / (products.length + 1);

  const themeVars = isDark ? `
    --bg: #0A0A0A;
    --surface: #141414;
    --border: #2A2A2A;
    --text: #FFFFFF;
    --text-sec: rgba(255,255,255,0.6);
    --ai: #A259FF;
    --ai-bg: rgba(162, 89, 255, 0.1);
    --success: #10B981;
    --success-bg: rgba(16, 185, 129, 0.1);
  ` : `
    --bg: #F9FAFB;
    --surface: #FFFFFF;
    --border: #E5E7EB;
    --text: #111827;
    --text-sec: #4B5563;
    --ai: #A259FF;
    --ai-bg: #f4f0ff;
    --success: #10B981;
    --success-bg: #e6f4ea;
  `;

  // Generate HTML for Products Header
  const headerHtml = `
    <div class="product-row">
      <div class="col" style="width: ${colWidth}%;"></div>
      ${products.map((p: any) => `
        <div class="col product-card" style="width: ${colWidth}%;">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="product-image" />` : ''}
          <div class="product-name">${p.name}</div>
          <div class="product-price">${p.price || ''}</div>
          <div class="retailer-badge">${p.retailer}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Generate HTML for Overview
  const overviewHtml = `
    <div class="section">
      <h2 class="section-title">Overview</h2>
      <div class="ai-summary">
        <strong>AI Verdict:</strong><br/>${aiSummary}
      </div>
      ${keyDifferences && keyDifferences.length > 0 ? `
        <div class="differences card">
          <h3 style="margin-top:0; color: var(--text-sec); font-size: 12px; text-transform: uppercase;">Key Differences</h3>
          ${keyDifferences.map((diff: any, i: number) => `
            <div class="diff-row" style="${i === keyDifferences.length - 1 ? 'border-bottom: none;' : ''}">
              <div class="diff-label" style="width: ${colWidth}%;">${diff.label}</div>
              ${diff.values.map((val: string, idx: number) => `
                <div class="diff-value" style="width: ${colWidth}%; ${diff.winnerIndex === idx ? 'color: var(--success); font-weight: bold;' : ''}">
                  ${val}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Generate HTML for Categories (each on a new page)
  const categoriesHtml = Object.entries(groupedSpecs).map(([category, specs]: [string, any]) => {
    return `
      <div class="page-break"></div>
      <div class="section">
        <h2 class="section-title">${category}</h2>
        
        ${headerHtml}
        
        <div class="specs-table card">
          ${specs.map((spec: any, i: number) => `
            <div class="spec-row" style="${i === specs.length - 1 ? 'border-bottom: none;' : ''}">
              <div class="spec-label" style="width: ${colWidth}%;">${spec.label}</div>
              ${products.map((p: any, idx: number) => {
                const val = spec.values && spec.values[idx] ? spec.values[idx] : "—";
                const isWinner = spec.winnerIndex === idx;
                return `
                  <div class="spec-value ${isWinner ? 'winner' : ''}" style="width: ${colWidth}%;">
                    ${val} ${isWinner ? '<br/><span class="winner-badge">WINNER</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            ${themeVars}
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: var(--text);
            margin: 0;
            padding: 40px;
            background: var(--bg);
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 30px;
            color: var(--text);
            letter-spacing: -0.5px;
          }
          .page-break {
            page-break-before: always;
          }
          .section {
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
            color: var(--text);
          }
          .product-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--border);
            padding-bottom: 15px;
          }
          .col {
            padding: 0 10px;
            box-sizing: border-box;
          }
          .product-card {
            text-align: center;
          }
          .product-image {
            max-width: 80px;
            max-height: 80px;
            object-fit: contain;
            margin-bottom: 10px;
            background: #fff;
            border-radius: 8px;
            padding: 4px;
          }
          .product-name {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 6px;
            color: var(--text);
          }
          .product-price {
            color: var(--success);
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .retailer-badge {
            font-size: 9px;
            color: #fff;
            text-transform: uppercase;
            font-weight: 700;
            background: #333;
            display: inline-block;
            padding: 3px 6px;
            border-radius: 4px;
          }
          .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 20px;
          }
          .ai-summary {
            background: var(--ai-bg);
            padding: 16px;
            border-radius: 12px;
            border-left: 4px solid var(--ai);
            margin-bottom: 24px;
            line-height: 1.6;
            font-size: 14px;
            color: var(--text-sec);
          }
          .ai-summary strong {
            color: var(--ai);
            display: block;
            margin-bottom: 6px;
            font-size: 15px;
          }
          .differences {
            margin-top: 20px;
          }
          .diff-row, .spec-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid var(--border);
            padding: 14px 0;
          }
          .diff-label, .spec-label {
            font-weight: 600;
            font-size: 13px;
            color: var(--text-sec);
          }
          .diff-value, .spec-value {
            font-size: 13px;
            line-height: 1.5;
            color: var(--text);
          }
          .winner {
            color: var(--success);
            font-weight: 600;
          }
          .winner-badge {
            display: inline-block;
            background: var(--success-bg);
            color: var(--success);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="title">SpecMatch Comparison Report</div>
        
        ${headerHtml}
        ${overviewHtml}
        ${categoriesHtml}
        
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error("Failed to generate/share PDF", error);
  }
}

export async function exportProductToPDF(product: any, isDark: boolean = true) {
  const specsList = product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : (product.specs || []);

  const themeVars = isDark ? `
    --bg: #0A0A0A;
    --surface: #141414;
    --border: #2A2A2A;
    --text: #FFFFFF;
    --text-sec: rgba(255,255,255,0.6);
    --ai: #A259FF;
    --ai-bg: rgba(162, 89, 255, 0.1);
    --success: #10B981;
    --primary: #2383E2;
    --primary-bg: rgba(35, 131, 226, 0.1);
  ` : `
    --bg: #F9FAFB;
    --surface: #FFFFFF;
    --border: #E5E7EB;
    --text: #111827;
    --text-sec: #4B5563;
    --ai: #A259FF;
    --ai-bg: #f4f0ff;
    --success: #10B981;
    --primary: #2383E2;
    --primary-bg: #f0f7ff;
  `;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            ${themeVars}
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: var(--text);
            margin: 0;
            padding: 40px;
            background: var(--bg);
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text);
            letter-spacing: -0.5px;
          }
          .brand {
            font-size: 14px;
            color: var(--text-sec);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .price-retailer {
            font-size: 18px;
            color: var(--success);
            font-weight: 700;
            margin-bottom: 30px;
          }
          .retailer-badge {
            background: #333;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 12px;
            vertical-align: middle;
            text-transform: uppercase;
          }
          .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--text);
          }
          .ai-summary {
            background: var(--ai-bg);
            padding: 16px;
            border-radius: 12px;
            border-left: 4px solid var(--ai);
            line-height: 1.6;
            font-size: 14px;
            color: var(--text-sec);
            border: 1px solid rgba(162, 89, 255, 0.2);
          }
          .ai-title {
            color: var(--ai);
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 8px;
          }
          .spec-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid var(--border);
            padding: 14px 0;
          }
          .spec-label {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-sec);
            width: 40%;
            padding-right: 20px;
          }
          .spec-value {
            font-size: 14px;
            font-weight: 500;
            width: 60%;
            line-height: 1.5;
            color: var(--text);
            text-align: right;
          }
          .list-item {
            margin-bottom: 8px;
            font-size: 15px;
            line-height: 1.6;
            color: var(--text-sec);
          }
          .insight-box {
            background: var(--primary-bg);
            padding: 16px;
            border-radius: 12px;
            border: 1px solid rgba(35, 131, 226, 0.2);
            border-left: 4px solid var(--primary);
            font-size: 15px;
            line-height: 1.6;
            color: var(--text-sec);
          }
          .insight-title {
            color: var(--primary);
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        ${product.brand ? `<div class="brand">${product.brand}</div>` : ''}
        <div class="title">${product.name}</div>
        <div class="price-retailer">
          ${product.price || ''} <span class="retailer-badge">${product.retailer}</span>
        </div>
        
        ${product.aiSummary ? `
          <div class="ai-summary">
            <div class="ai-title">AI Summary</div>
            <div>${product.aiSummary}</div>
          </div>
        ` : ''}
        
        ${product.description ? `
          <div class="card">
            <div class="section-title">Overview</div>
            <div style="font-size: 15px; line-height: 1.6; color: var(--text-sec);">${product.description}</div>
          </div>
        ` : ''}
        
        ${product.whatsInTheBox && product.whatsInTheBox.length > 0 ? `
          <div class="card">
            <div class="section-title">What's in the Box</div>
            <ul style="padding-left: 20px; margin: 0;">
              ${product.whatsInTheBox.map((item: string) => `<li class="list-item">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${product.userInsights ? `
          <div class="insight-box" style="margin-bottom: 20px;">
            <div class="insight-title">User Insights</div>
            <div>${product.userInsights}</div>
          </div>
        ` : ''}
        
        <div class="card">
          <div class="section-title">Specifications</div>
          ${specsList.map((spec: any, i: number) => `
            <div class="spec-row" style="${i === specsList.length - 1 ? 'border-bottom: none;' : ''}">
              <div class="spec-label">${spec.label}</div>
              <div class="spec-value">${spec.value}</div>
            </div>
          `).join('')}
        </div>
        
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error("Failed to generate/share PDF", error);
  }
}

