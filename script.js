document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM要素の取得 ---
    const calcBtn = document.getElementById('calc-btn');
    const saveBtn = document.getElementById('save-btn');
    const gcalBtn = document.getElementById('gcal-btn'); 
    const clearAllBtn = document.getElementById('clear-all-btn');
    const nightShiftCheckbox = document.getElementById('night-shift-mode');
    const inputCard = document.getElementById('input-card');
    
    const normalInputs = document.getElementById('normal-inputs');
    const shadowInputs = document.getElementById('shadow-inputs');
    const adviceOutput = document.getElementById('advice-output');
    const waterEl = document.getElementById('water');
    const historyContainer = document.getElementById('history-container');

    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultContent = document.getElementById('result-content');

    let currentCalculationResult = null;

    // --- 勤務モード切り替え制御 ---
    nightShiftCheckbox.addEventListener('change', () => {
        const isShift = nightShiftCheckbox.checked;
        
        if (isShift) {
            inputCard.classList.add('nightshift-active-border');
            calcBtn.classList.add('nightshift-btn');
            document.querySelector('.nightshift-toggle-box').classList.add('active');
            normalInputs.classList.add('hidden');
            shadowInputs.classList.remove('hidden');
        } else {
            inputCard.classList.remove('nightshift-active-border');
            calcBtn.classList.remove('nightshift-btn');
            document.querySelector('.nightshift-toggle-box').classList.remove('active');
            normalInputs.classList.remove('hidden');
            shadowInputs.classList.add('hidden');
        }
        
        // モードが変わったら前回の結果を一度リセットする
        resultPlaceholder.classList.remove('hidden');
        resultContent.classList.add('hidden');
    });

    // --- コア診断＆睡眠時間提案ロジック ---
    function evaluateAndPropose() {
        const target = parseFloat(document.getElementById('target-sleep').value);
        const checkedCount = document.querySelectorAll('.symptom-check:checked').length;
        const isShift = nightShiftCheckbox.checked;

        let totalScore = 0;         
        let sleepDebtHours = 0;     
        let recommendedTonight = 0; 
        let inputSummaryStr = "";   

        if (!isShift) {
            const night = parseFloat(document.getElementById('night-sleep').value);
            const nap = parseFloat(document.getElementById('nap-sleep').value);

            let effectiveNap = 0;
            if (nap <= 30) {
                effectiveNap = (nap * 3) / 60;
            } else {
                effectiveNap = ((30 * 3) + (nap - 30)) / 60;
            }

            totalScore = night + effectiveNap;
            sleepDebtHours = target - totalScore;

            let symptomBonus = 0;
            if (checkedCount >= 3) symptomBonus = 1.0;
            else if (checkedCount > 0) symptomBonus = 0.5;

            recommendedTonight = target + (sleepDebtHours > 0 ? sleepDebtHours : 0) + symptomBonus;
            inputSummaryStr = `昨晩: ${night}h / 昼寝: ${nap}分`;
            
        } else {
            const beforeNap = parseFloat(document.getElementById('shift-before-nap').value);
            const afterNap = parseFloat(document.getElementById('shift-after-nap').value);

            totalScore = beforeNap + afterNap;
            sleepDebtHours = target - totalScore;

            let shiftDeficit = target - afterNap;
            if (shiftDeficit < 0) shiftDeficit = 0;

            recommendedTonight = target + shiftDeficit;
            inputSummaryStr = `夜勤前仮眠: ${beforeNap}h / 明け仮眠: ${afterNap}h`;
        }

        // コップの満たされ度を視覚化
        let pct = (totalScore / target) * 100;
        if (pct > 120) pct = 120;
        if (pct < 0) pct = 0;
        
        setTimeout(() => {
            waterEl.style.height = `${pct}%`;
        }, 50);

        if (isShift) {
            waterEl.style.background = 'linear-gradient(to top, #3f51b5, #7986cb)';
        } else {
            waterEl.style.background = totalScore >= target ? 'linear-gradient(to top, #4caf50, #81c784)' : 'linear-gradient(to top, #ff9800, #ffb74d)';
        }

        // 提案文章の生成
        let htmlOutput = "";
        htmlOutput += `
            <div class="box-target-time ${isShift ? 'shift-mode' : ''}">
                <h4>🎯 次の睡眠で確保すべき睡眠時間:</h4>
                <div class="big-time">${recommendedTonight.toFixed(1)} 時間</div>
                <p style="margin:0.3rem 0 0 0; font-size:0.8rem; color:#555;">
                    ${isShift ? '※夜勤前後の仮眠状況から逆算した、体内時計を戻すための推奨値です。' : '※目標、昨日の不足分、今朝の体調を統合して割り出しました。'}
                </p>
            </div>
        `;

        let alternativeNapMin = 20; 
        if (sleepDebtHours > 1.5 || checkedCount >= 3) {
            alternativeNapMin = isShift ? 60 : 30;
        }

        htmlOutput += `
            <div class="box-nap-proposal">
                <strong>⏳ そんなに眠る時間が取れないときは？</strong><br>
                今日の日中に、追加で <strong>${alternativeNapMin}分間</strong> の仮眠（昼寝）をスケジュールに組み込んで調整してください。
            </div>
        `;

        if (checkedCount > 0) {
            let alertMessage = checkedCount >= 3 
                ? `🚨 <strong>睡眠不足アラート（重度）:</strong> 体調チェックに3項目以上該当しています。脳の疲労が強いため、今夜は極力スケジュールを前倒しして眠りましょう。`
                : `⚠️ <strong>自覚症状あり:</strong> 体に軽度の睡眠不足サインが出ています。睡眠負債を溜め込まないよう、早期返済を意識しましょう。`;
            htmlOutput += `<div class="box-symptom-alert">${alertMessage}</div>`;
        }

        adviceOutput.innerHTML = htmlOutput;

        // 入力完了に合わせて隠されていた結果エリアを展開
        resultPlaceholder.classList.add('hidden');
        resultContent.classList.remove('hidden');

        // カレンダーURL生成用にオブジェクトを一時記憶
        currentCalculationResult = {
            isShift: isShift,
            inputSummary: inputSummaryStr,
            recommended: recommendedTonight.toFixed(1),
            checkedSigns: checkedCount,
            debt: sleepDebtHours.toFixed(1)
        };
    }

    // --- Googleカレンダーに飛ばす連携URLの構築 ---
    function openGoogleCalendar() {
        if (!currentCalculationResult) return;

        const modeTitle = currentCalculationResult.isShift ? "【夜勤サイクル】" : "【通常サイクル】";
        const debtStatus = currentCalculationResult.debt > 0 ? `(負債:${currentCalculationResult.debt}h)` : "(負債なし✨)";
        const eventTitle = `睡眠ログ ${modeTitle} ${debtStatus}`;

        const description = 
`【おしえてかめさん 睡眠診断結果】
-----------------------------------------
■ 入力データ: ${currentCalculationResult.inputSummary}
■ 今朝の体調チェック該当数: ${currentCalculationResult.checkedSigns} 個
■ 計算された睡眠負債: ${currentCalculationResult.debt} 時間
-----------------------------------------
🐢 かめさんからのメッセージ:
👉 【 ${currentCalculationResult.recommended} 時間 】の睡眠を確保してください。

※事前に作成した睡眠専用カレンダーを選択して保存すれば、きれいに色分け管理できます！`;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        
        const startHour = String(now.getHours()).padStart(2, '0');
        const startMin = String(now.getMinutes()).padStart(2, '0');
        const endHour = String((now.getHours() + 1) % 24).padStart(2, '0');
        
        const dateParam = `${year}${month}${date}T${startHour}${startMin}00Z/${year}${month}${date}T${endHour}${startMin}00Z`;
        const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(description)}&dates=${dateParam}`;

        window.open(gCalUrl, '_blank');
    }

    // --- ローカルストレージ履歴カード管理機能 ---
    function loadHistory() {
        const historyData = JSON.parse(localStorage.getItem('sleepHistory')) || [];
        historyContainer.innerHTML = "";

        if (historyData.length === 0) {
            historyContainer.innerHTML = `<p style="color: #888; font-size: 0.9rem; grid-column: 1/-1; text-align: center; margin: 1rem 0;">保存された履歴カードはありません。</p>`;
            return;
        }

        historyData.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `history-card ${item.isShift ? 'shift-style' : 'normal-style'}`;
            
            card.innerHTML = `
                <button class="btn-delete-card" data-index="${index}">&times;</button>
                <div class="history-date">${item.date} [${item.isShift ? '夜勤サイクル' : '通常サイクル'}]</div>
                <div class="history-meta">${item.inputSummary} (目標: ${item.target}h)</div>
                <div class="history-meta">体調チェック該当: ${item.checkedSigns}個</div>
                <div class="history-result">👉 提案就寝: <strong>${item.recommended}時間</strong></div>
            `;
            historyContainer.appendChild(card);
        });

        document.querySelectorAll('.btn-delete-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                deleteHistoryItem(idx);
            });
        });
    }

    function saveHistory() {
        if (!currentCalculationResult) return;

        const historyData = JSON.parse(localStorage.getItem('sleepHistory')) || [];
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const targetValue = parseFloat(document.getElementById('target-sleep').value);

        const newRecord = {
            date: dateStr,
            target: targetValue,
            isShift: currentCalculationResult.isShift,
            inputSummary: currentCalculationResult.inputSummary,
            recommended: currentCalculationResult.recommended,
            checkedSigns: currentCalculationResult.checkedSigns
        };

        historyData.unshift(newRecord);
        localStorage.setItem('sleepHistory', JSON.stringify(historyData));

        const originalText = saveBtn.innerText;
        saveBtn.innerText = "✨ 保存成功！";
        saveBtn.style.backgroundColor = "#4caf50";
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.backgroundColor = "";
        }, 1500);

        loadHistory();
    }

    function deleteHistoryItem(index) {
        const historyData = JSON.parse(localStorage.getItem('sleepHistory')) || [];
        historyData.splice(index, 1);
        localStorage.setItem('sleepHistory', JSON.stringify(historyData));
        loadHistory();
    }

    function clearAllHistory() {
        if (confirm("これまでの睡眠履歴カードをすべて消去してもよろしいですか？")) {
            localStorage.removeItem('sleepHistory');
            loadHistory();
        }
    }

    // イベント駆動設定
    calcBtn.addEventListener('click', evaluateAndPropose);
    saveBtn.addEventListener('click', saveHistory);
    gcalBtn.addEventListener('click', openGoogleCalendar); 
    clearAllBtn.addEventListener('click', clearAllHistory);

    // 解説モーダル表示制御
    const modal = document.getElementById('guide-modal');
    const openBtn = document.getElementById('open-guide-btn');
    const closeBtn = document.getElementById('close-guide-btn');
    const closeBottomBtn = document.getElementById('close-guide-bottom-btn');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    closeBottomBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    loadHistory();
});
