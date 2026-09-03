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
