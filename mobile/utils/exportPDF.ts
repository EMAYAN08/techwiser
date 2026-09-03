import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportComparisonToPDF(comparison: any) {
  const { products, keyDifferences, aiSummary } = comparison;

  // Extract groupedSpecs for categories
  let groupedSpecs = comparison.groupedSpecs || {};
  
  // Create columns based on number of products
  const colWidth = 100 / (products.length + 1);

  // Generate HTML for Products Header
  const headerHtml = `
    <div class="product-row">
      <div class="col" style="width: ${colWidth}%;"></div>
      ${products.map((p: any) => `
        <div class="col product-card" style="width: ${colWidth}%;">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="product-image" />` : ''}
          <div class="product-name">${p.name}</div>
          <div class="product-price">${p.price || ''}</div>
          <div class="retailer">${p.retailer}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Generate HTML for Overview
  const overviewHtml = `
    <div class="section">
      <h2 class="section-title">Overview</h2>
      <div class="ai-summary">
        <strong>AI Verdict:</strong> ${aiSummary}
      </div>
      ${keyDifferences && keyDifferences.length > 0 ? `
        <div class="differences">
          <h3>Key Differences</h3>
          ${keyDifferences.map((diff: any) => `
            <div class="diff-row">
              <div class="diff-label" style="width: ${colWidth}%;">${diff.label}</div>
              ${diff.values.map((val: string) => `
                <div class="diff-value" style="width: ${colWidth}%;">${val}</div>
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
        
        <div class="specs-table">
          ${specs.map((spec: any) => `
            <div class="spec-row">
              <div class="spec-label" style="width: ${colWidth}%;">${spec.label}</div>
              ${products.map((p: any, i: number) => {
                const val = spec.values && spec.values[i] ? spec.values[i] : "—";
                const isWinner = spec.winnerIndex === i;
                return `
                  <div class="spec-value ${isWinner ? 'winner' : ''}" style="width: ${colWidth}%;">
                    ${val} ${isWinner ? '<span class="winner-badge">WINNER</span>' : ''}
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
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            color: #000;
          }
          .page-break {
            page-break-before: always;
          }
          .section {
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
            color: #333;
          }
          .product-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
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
          }
          .product-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .product-price {
            color: #555;
            font-size: 13px;
          }
          .retailer {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .ai-summary {
            background: #f5f7fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2383E2;
            margin-bottom: 20px;
            line-height: 1.5;
            font-size: 14px;
          }
          .differences {
            margin-top: 20px;
          }
          .diff-row, .spec-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid #eee;
            padding: 12px 0;
          }
          .diff-label, .spec-label {
            font-weight: bold;
            font-size: 13px;
            color: #555;
          }
          .diff-value, .spec-value {
            font-size: 13px;
            line-height: 1.4;
          }
          .winner {
            color: #0c8a38;
            font-weight: 600;
          }
          .winner-badge {
            display: inline-block;
            background: #e6f4ea;
            color: #0c8a38;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
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

export async function exportProductToPDF(product: any) {
  const specsList = product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : (product.specs || []);

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #000;
          }
          .brand {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .price-retailer {
            font-size: 16px;
            color: #0c8a38;
            font-weight: bold;
            margin-bottom: 30px;
          }
          .retailer-badge {
            background: #eee;
            color: #333;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            vertical-align: middle;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 12px;
            border-bottom: 2px solid #eee;
            padding-bottom: 6px;
            color: #333;
          }
          .ai-summary {
            background: #f4f0ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #9b51e0;
            margin-bottom: 20px;
            line-height: 1.5;
            font-size: 14px;
          }
          .spec-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid #eee;
            padding: 10px 0;
          }
          .spec-label {
            font-weight: bold;
            font-size: 13px;
            color: #555;
            width: 40%;
            padding-right: 20px;
          }
          .spec-value {
            font-size: 13px;
            width: 60%;
            line-height: 1.4;
          }
          .list-item {
            margin-bottom: 6px;
            font-size: 14px;
            line-height: 1.5;
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
          <div class="section">
            <div class="section-title">AI Summary</div>
            <div class="ai-summary">${product.aiSummary}</div>
          </div>
        ` : ''}
        
        ${product.description ? `
          <div class="section">
            <div class="section-title">Overview</div>
            <div style="font-size: 14px; line-height: 1.5;">${product.description}</div>
          </div>
        ` : ''}
        
        ${product.whatsInTheBox && product.whatsInTheBox.length > 0 ? `
          <div class="section">
            <div class="section-title">What's in the Box</div>
            <ul>
              ${product.whatsInTheBox.map((item: string) => `<li class="list-item">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${product.userInsights ? `
          <div class="section">
            <div class="section-title">User Insights</div>
            <div style="font-size: 14px; line-height: 1.5; background: #f0f7ff; padding: 15px; border-left: 4px solid #2383E2;">
              ${product.userInsights}
            </div>
          </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">Specifications</div>
          ${specsList.map((spec: any) => `
            <div class="spec-row">
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

