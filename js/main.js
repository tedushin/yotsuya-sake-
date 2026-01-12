let data = [];
const MAX_PRICE_LIMIT = 20000;
let currentPreviewItems = []; // プレビュー中のアイテムリスト
let currentPreviewTitle = "";

function checkAll() {
  const checkboxes = document.querySelectorAll('.card-container .card input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
}

function uncheckAll() {
  const checkboxes = document.querySelectorAll('.card-container .card input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
}

async function loadData() {
  try {
    const res = await fetch('sake_list.json');
    if (!res.ok) throw new Error('JSONファイルの読み込みに失敗しました。');
    data = await res.json();
    populateOrigins(data);
    filterData();
  } catch (error) {
    console.error(error);
    document.getElementById("card-container").innerText = "商品の読み込みに失敗しました。ファイルを確認してください。";
  }
}

function populateOrigins(items) {
  const originSelect = document.getElementById('search-origin');
  const origins = new Set();
  items.forEach(item => {
    if (item["産地"]) {
      origins.add(item["産地"]);
    }
  });
  Array.from(origins).sort().forEach(origin => {
    const option = document.createElement('option');
    option.value = origin;
    option.textContent = origin;
    originSelect.appendChild(option);
  });
}

function renderCards(items) {
  const container = document.getElementById("card-container");
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = '<p style="width:100%; text-align:center; color:#888;">条件に一致する商品は見つかりませんでした。</p>';
    return;
  }
  items.forEach(item => {
    const originalIndex = data.findIndex(d => d === item);
    const jan = item["720mL500mLJAN"];
    const imageSrc = jan ? `image/${jan}.jpg` : 'image/placeholder.jpg';

    let priceHTML = '';
    const price1800 = Number(item["1800mL価格税抜"]);
    const price720 = Number(item["720mL500mL価格税抜"]);

    if (price1800 > 0) {
      priceHTML += `<p class="price-info">1800ml: ${price1800.toLocaleString()}円</p>`;
    }
    if (price720 > 0) {
      priceHTML += `<p class="price-info">720ml: ${price720.toLocaleString()}円</p>`;
    }

    const card = document.createElement("div");
    card.className = "card";
    // カード全体をクリック可能にする
    card.onclick = function (e) { toggleCardSelection(e, this); };
    card.innerHTML = `
      <input type="checkbox" data-index="${originalIndex}" onclick="event.stopPropagation()"/>
      <div class="card-image-wrapper">
        <img src="${imageSrc}" alt="${item["商品名"]}" class="card-image" onerror="this.onerror=null;this.src='image/placeholder.jpg';">
      </div>
      <h3>${item["商品名"] || "名称不明"}</h3>
      <p><strong>蔵元:</strong> ${item["蔵元"]}</p>
      <p><strong>産地:</strong> ${item["産地"]}</p>
      <p><strong>グレード:</strong> ${item["グレード"]}</p>
      ${priceHTML}
    `;
    container.appendChild(card);
  });
}

// カードクリック時にチェックボックスの状態を反転
function toggleCardSelection(e, card) {
  // 既にcheckbox自体をクリックした場合はstopPropagationでここには来ないはずだが念のため
  if (e.target.type === 'checkbox') return;

  const checkbox = card.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
  }
}

function filterData() {
  const keyword = document.getElementById("search-keyword").value.toLowerCase();
  const selectedOrigin = document.getElementById("search-origin").value;
  const maxPrice = Number(document.getElementById("search-price").value);
  const priceDisplay = document.getElementById("price-display");
  if (maxPrice >= MAX_PRICE_LIMIT) {
    priceDisplay.textContent = "上限なし";
  } else {
    priceDisplay.textContent = `${maxPrice.toLocaleString()}円 以下`;
  }
  const filtered = data.filter(item => {
    // 1. 定番除外チェック & 非表示チェック(管理画面連携)
    if (!item["商品名"] || item["商品名"].includes("定番商品はございません")) return false;
    if (item.isHidden === true) return false;

    const nameMatch = item["商品名"]?.toLowerCase().includes(keyword);
    const breweryMatch = item["蔵元"]?.toLowerCase().includes(keyword);
    const janFields = ["1800mL　JAN", "720mL500mLJAN", "360mL300mL180mL　JAN"];
    const janMatch = janFields.some(field => {
      const val = item[field];
      return val && String(val).replace(/\s+/g, '').includes(keyword);
    });
    if (!(nameMatch || breweryMatch || janMatch)) return false;
    if (selectedOrigin && item["産地"] !== selectedOrigin) return false;
    if (maxPrice < MAX_PRICE_LIMIT) {
      const price1800 = Number(item["1800mL価格税抜"]) || 999999;
      const price720 = Number(item["720mL500mL価格税抜"]) || 999999;
      const valid1800 = (price1800 > 0 && price1800 <= maxPrice);
      const valid720 = (price720 > 0 && price720 <= maxPrice);
      if (!valid1800 && !valid720) return false;
    }
    return true;
  });
  renderCards(filtered);
}

document.getElementById("search-keyword").addEventListener("input", filterData);
document.getElementById("search-origin").addEventListener("change", filterData);
document.getElementById("search-price").addEventListener("input", filterData);

// ---------------------------------------------------------
// プレビュー＆PDF生成ロジック
// ---------------------------------------------------------

// モーダル要素
const modal = document.getElementById('preview-modal');
const modalBody = document.getElementById('preview-content');
const addresseeInput = document.getElementById('addressee-input');

// 宛名入力のイベントリスナー（リアルタイム反映）
addresseeInput.addEventListener('input', (e) => {
  updatePreviewAddressee(e.target.value);
});

function openPreview(items, title) {
  currentPreviewItems = items;
  currentPreviewTitle = title;

  modal.classList.add('active');
  renderPreviewPages();
}

function closePreview() {
  modal.classList.remove('active');
}

function updatePreviewAddressee(text) {
  const addresseeEls = document.querySelectorAll('.estimate-addressee-text');
  addresseeEls.forEach(el => {
    // 空の場合は表示を消すか、プレースホルダーを表示するか
    el.textContent = text ? text : "";
    // 「御中」などはCSSのspanで制御済みだが、必要ならここでロジックを入れる
  });
}

function renderPreviewPages() {
  modalBody.innerHTML = ""; // クリア
  const itemsPerPage = 10; // ★10個固定
  const totalPages = Math.ceil(currentPreviewItems.length / itemsPerPage) || 1; // 0件でも1ページは出すなら || 1
  let totalAmount = 0;

  currentPreviewItems.forEach(item => {
    const price = Number(item["1800mL価格税抜"]) || 0;
    totalAmount += price;
  });

  const addresseeValue = addresseeInput.value;

  for (let i = 0; i < totalPages; i++) {
    const pageIndex = i + 1;
    const chunk = currentPreviewItems.slice(i * itemsPerPage, pageIndex * itemsPerPage);

    // 10個になるまでデータを埋める（空データ）
    const filledChunk = [...chunk];
    while (filledChunk.length < itemsPerPage) {
      filledChunk.push(null); // nullで埋める
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    const pageDiv = document.createElement('div');
    pageDiv.className = 'preview-page';
    pageDiv.id = `preview-page-${i}`; // IDを振っておく（PDF化のため）

    let pageHTML = `
          <div class="estimate-header">
            <h2>株式会社よつや ${currentPreviewTitle}</h2>
          </div>
          <div class="estimate-meta">
            <div class="estimate-addressee">
                <span class="estimate-addressee-text">${addresseeValue}</span>
                <span>御中</span>
            </div>
            <div style="text-align: right;">
                <div>発行日: ${dateStr}</div>
                ${currentPreviewTitle === "御見積書" ? `<div>対象期間: 発行より1ヶ月間有効</div>` : ''}
            </div>
          </div>
          <div class="estimate-grid">
        `;

    filledChunk.forEach(item => {
      if (item) {
        // 商品データがある場合
        const jan = item["720mL500mLJAN"];
        const imageSrc = jan ? `image/${jan}.jpg` : 'image/placeholder.jpg';

        let pdfPriceHTML = '';
        const price1800_pdf = Number(item["1800mL価格税抜"]);
        const price720_pdf = Number(item["720mL500mL価格税抜"]);

        if (price1800_pdf > 0) {
          pdfPriceHTML += `<p class="price-info">1800ml: ${price1800_pdf.toLocaleString()}円</p>`;
        }
        if (price720_pdf > 0) {
          pdfPriceHTML += `<p class="price-info">720ml: ${price720_pdf.toLocaleString()}円</p>`;
        }

        pageHTML += `
                <div class="estimate-item-pdf">
                  <div class="sanchi-label">${item["産地"] || ""}</div>
                  <div style="flex-shrink: 0; width: 100px; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2px 0;">
                    <img src="${imageSrc}" alt="商品画像" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.onerror=null;this.src='image/placeholder.jpg';">
                  </div>
                  <div class="info">
                    <h3>${item["商品名"]}</h3>
                    <p><strong>蔵元:</strong> ${item["蔵元"] || "不明"}</p>
                    <p><strong>グレード:</strong> ${item["グレード"] || "不明"}</p>
                    ${pdfPriceHTML}
                    <p class="comment">${item["コメント"] || ""}</p>
                  </div>
                </div>`;
      } else {
        // 空枠の場合
        pageHTML += `<div class="estimate-item-pdf empty"></div>`;
      }
    });

    pageHTML += '</div>'; // end grid

    // 最終ページのフッターに合計など
    // ※常に10枠固定なので、ページ最下部に余裕があるはず
    // フッターは絶対配置ではなく、Gridの下に通常配置でOK

    // 最終ページのフッターに合計など
    // ※常に10枠固定なので、ページ最下部に余裕があるはず
    // フッターは絶対配置ではなく、Gridの下に通常配置でOK

    // 合計金額表示は削除されました


    pageHTML += `
          <div class="estimate-footer">
            <span>株式会社よつや 外商部</span>
            <span>Page ${pageIndex} / ${totalPages}</span>
          </div>`;

    pageDiv.innerHTML = pageHTML;
    modalBody.appendChild(pageDiv);
  }
}

async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pages = modalBody.querySelectorAll('.preview-page');

  // ダウンロードボタンを一時的に無効化（連打防止）
  const downloadBtn = document.querySelector('.btn-primary');
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = "生成中...";
  downloadBtn.disabled = true;

  try {
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      // html2canvasの設定最適化
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: pages[i].scrollWidth,
        windowHeight: pages[i].scrollHeight
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    const fileNameDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    pdf.save(`${currentPreviewTitle}_${fileNameDate}.pdf`);

  } catch (err) {
    console.error(err);
    alert("PDF生成中にエラーが発生しました。");
  } finally {
    downloadBtn.textContent = originalText;
    downloadBtn.disabled = false;
  }
}


// ボタンアクションの変更
async function generatePDF() {
  const checkedBoxes = document.querySelectorAll(".card input:checked");
  if (checkedBoxes.length === 0) {
    alert("商品を選択してください。");
    return;
  }
  const selectedItems = Array.from(checkedBoxes).map(cb => data[cb.dataset.index]);
  // プレビューを開く
  openPreview(selectedItems, "御見積書");
}

async function generateFullListPDF() {
  const allItems = data.filter(item =>
    item["商品名"] && !item["商品名"].includes("定番商品はございません")
  );
  if (confirm(`全${allItems.length}件の商品リストのプレビューを作成します。よろしいですか？`)) {
    // プレビューを開く
    openPreview(allItems, "商品リスト");
  }
}

// ページ読み込み完了時にデータをロード
document.addEventListener('DOMContentLoaded', loadData);
