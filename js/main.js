let data = [];

// 地方と都道府県のマッピング定義
const REGIONS = {
  "北海道": ["北海道"],
  "東北": ["青森", "岩手", "宮城", "秋田", "山形", "福島"],
  "関東": ["茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川"],
  "甲信越・北陸": ["新潟", "富山", "石川", "福井", "山梨", "長野"],
  "東海": ["岐阜", "静岡", "愛知", "三重"],
  "近畿": ["滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"],
  "中国": ["鳥取", "島根", "岡山", "広島", "山口"],
  "四国": ["徳島", "香川", "愛媛", "高知"],
  "九州・沖縄": ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"]
};

let currentPreviewItems = []; // プレビュー中のアイテムリスト
let currentPreviewTitle = "";

// 画像読み込みエラー時のフォールバック処理 (jpg -> png -> jpeg -> JPG -> PNG -> placeholder)
window.handleImageError = function (img, jan) {
  const retryExtensions = ['png', 'jpeg', 'JPG', 'PNG'];
  let attempt = parseInt(img.dataset.attempt || 0);

  if (attempt >= retryExtensions.length) {
    img.src = 'image/placeholder.jpg';
    img.onerror = null; // これ以上処理しない
    return;
  }

  const nextExt = retryExtensions[attempt];
  img.src = `image/${jan}.${nextExt}`;
  img.dataset.attempt = attempt + 1;
};

function checkAll() {
  const checkboxes = document.querySelectorAll('.card-container .card input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
}

function uncheckAll() {
  const checkboxes = document.querySelectorAll('.card-container .card input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
}

function loadData() {
  try {
    if (typeof sakeData === 'undefined') {
      throw new Error('データが読み込めませんでした。(js/data.js check)');
    }
    data = sakeData; // グローバル変数から取得
    populateSearchMenus(data);
    filterData();
  } catch (error) {
    console.error(error);
    document.getElementById("card-container").innerHTML = `<p style="color:red; text-align:center;">商品の読み込みに失敗しました。<br>エラー詳細: ${error.message}</p>`;
  }
}

// 地方と都道府県のマッピング定義

function populateSearchMenus(items) {
  const regionSelect = document.getElementById('search-region');
  // 既存の地域オプションをクリア（デフォルトの「地方を選択」は残してもいいが、再生成が楽）
  regionSelect.innerHTML = '<option value="">地方: 全て</option>';

  const availablePrefs = new Set();
  items.forEach(item => {
    if (item["産地"]) availablePrefs.add(item["産地"]);
  });

  const usedPrefs = new Set();

  for (const [regionName, prefectures] of Object.entries(REGIONS)) {
    // この地方に含まれる産地があるか
    const hasPref = prefectures.some(p => availablePrefs.has(p));
    if (hasPref) {
      const option = document.createElement('option');
      option.value = regionName;
      option.textContent = regionName;
      regionSelect.appendChild(option);
      prefectures.forEach(p => usedPrefs.add(p));
    }
  }

  // その他
  let hasOthers = false;
  availablePrefs.forEach(p => {
    if (!usedPrefs.has(p)) hasOthers = true;
  });
  if (hasOthers) {
    const option = document.createElement('option');
    option.value = "その他";
    option.textContent = "その他";
    regionSelect.appendChild(option);
  }

  // 初期状態で県名リストも更新（全県表示）
  updatePrefectureOptions("");
}

function updatePrefectureOptions(regionName) {
  const prefSelect = document.getElementById('search-prefecture');
  prefSelect.innerHTML = '<option value="">県名: 全て</option>';

  const availablePrefs = new Set();
  data.forEach(item => {
    if (item["産地"]) availablePrefs.add(item["産地"]);
  });

  let targetPrefs = [];

  if (regionName === "その他") {
    const allMapped = new Set(Object.values(REGIONS).flat());
    targetPrefs = Array.from(availablePrefs).filter(p => !allMapped.has(p));
  } else if (regionName && REGIONS[regionName]) {
    targetPrefs = REGIONS[regionName].filter(p => availablePrefs.has(p));
  } else {
    // 全て
    targetPrefs = Array.from(availablePrefs).sort(); // 文字コード順
  }

  targetPrefs.forEach(p => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    prefSelect.appendChild(option);
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
        <img src="${imageSrc}" alt="${item["商品名"]}" class="card-image" onerror="handleImageError(this, '${jan}')">
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
  const janInfo = document.getElementById("search-jan").value.trim().replace(/-/g, ''); // ハイフン除去など
  const nameKw = document.getElementById("search-name").value.trim().toLowerCase();
  const breweryKw = document.getElementById("search-brewery").value.trim().toLowerCase();

  const selectedRegion = document.getElementById("search-region").value;
  const selectedPref = document.getElementById("search-prefecture").value;
  const minPriceStr = document.getElementById("search-price-min").value;
  const maxPriceStr = document.getElementById("search-price-max").value;
  const minPrice = minPriceStr ? Number(minPriceStr) : null;
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;

  const filtered = data.filter(item => {
    // 1. 定番除外チェック & 非表示チェック(管理画面連携)
    if (!item["商品名"] || item["商品名"].includes("定番商品はございません")) return false;
    if (item.isHidden === true) return false;

    // --- 検索ロジック (AND条件) ---

    // ① JANコード検索
    if (janInfo) {
      const janFields = ["1800mL　JAN", "720mL500mLJAN", "360mL300mL180mL　JAN"];
      const janMatch = janFields.some(field => {
        const val = item[field];
        return val && String(val).replace(/\s+/g, '').includes(janInfo);
      });
      if (!janMatch) return false;
    }

    // ② 商品名検索
    if (nameKw) {
      if (!item["商品名"]?.toLowerCase().includes(nameKw)) return false;
    }

    // ③ 蔵元名検索
    if (breweryKw) {
      if (!item["蔵元"]?.toLowerCase().includes(breweryKw)) return false;
    }

    // ④ 産地フィルタ
    // ④ 産地フィルタ
    // 地方フィルタ
    if (selectedRegion) {
      if (selectedRegion === "その他") {
        const allMapped = new Set(Object.values(REGIONS).flat());
        if (allMapped.has(item["産地"])) return false;
      } else {
        const targetPrefectures = REGIONS[selectedRegion];
        if (!targetPrefectures || !targetPrefectures.includes(item["産地"])) {
          return false;
        }
      }
    }

    // 県名フィルタ
    if (selectedPref) {
      if (item["産地"] !== selectedPref) return false;
    }

    // 価格フィルタ
    const price1800 = Number(item["1800mL価格税抜"]) || 0;
    const price720 = Number(item["720mL500mL価格税抜"]) || 0;

    const isPriceInRange = (price) => {
      if (price <= 0) return false;
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;
      return true;
    };

    const valid1800 = isPriceInRange(price1800);
    const valid720 = isPriceInRange(price720);

    if (!valid1800 && !valid720) return false;

    return true;
  });
  renderCards(filtered);
}

document.getElementById("search-jan").addEventListener("input", filterData);
document.getElementById("search-name").addEventListener("input", filterData);
document.getElementById("search-brewery").addEventListener("input", filterData);

// 産地検索イベント
document.getElementById("search-region").addEventListener("change", function (e) {
  updatePrefectureOptions(e.target.value);
  filterData();
});
document.getElementById("search-prefecture").addEventListener("change", filterData);

document.getElementById("search-price-min").addEventListener("input", filterData);
document.getElementById("search-price-max").addEventListener("input", filterData);

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
                    <img src="${imageSrc}" alt="商品画像" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="handleImageError(this, '${jan}')">
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
