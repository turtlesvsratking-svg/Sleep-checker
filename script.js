document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM要素の取得 ---
    const calcBtn = document.getElementById('calc-btn');
    const saveBtn = document.getElementById('save-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const nightShiftCheckbox = document.getElementById('night-shift-mode');
    const inputCard = document.getElementById('input-card');
    
    const normalInputs = document.getElementById('normal-inputs');
    const shadowInputs = document.getElementById('shadow-inputs');
    const adviceOutput = document.getElementById('advice-output');
    const waterEl = document.getElementById('water');
    const checkboxes = document.querySelectorAll('.symptom-check');
    const historyContainer = document.getElementById('history-container');

    // グローバルに今の診断結果データを保持するオブジェクト
    let currentCalculationResult = null;

    // --- 2. 勤務モード切り替え制御 ---
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
        evaluateAndPropose();
    });

    // --- 3. コア診断＆睡眠時間提案ロジック ---
    function evaluateAndPropose() {
        const target = parseFloat(document.getElementById('target-sleep').value);
        const checkedCount = document.querySelectorAll('.symptom-check:checked').length;
        const isShift = nightShiftCheckbox.checked;

        let totalScore = 0;         
        let sleepDebtHours = 0;     
        let recommendedTonight = 0; 
        let inputSummaryStr = "";   // 履歴カード用のインプット要約文字

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

        // コップの可視化反映
        let pct = (totalScore / target) * 100;
        if (pct > 120) pct = 120;
        if (pct < 0) pct = 0;
        waterEl.style.height = `${pct}%`;

        if (isShift) {
            waterEl.style.background = 'linear-gradient(to top, #3f51b5, #7986cb)';
        } else {
            waterEl.style.background = totalScore >= target ? 'linear-gradient(to top, #4caf50, #81c784)' : 'linear-gradient(to top, #ff9800, #ffb74d)';
        }

        // 動的な診断・提案画面の生成
        let htmlOutput = "";
        htmlOutput += `
            <div class="box-target-time ${isShift ? 'shift-mode' : ''}">
                <h4>🎯 あなたが今日の夜に確保すべき睡眠時間:</h4>
                <div class="big-time">${recommendedTonight.toFixed(1)} 時間</div>
                <p style="margin:0.3rem 0 0 0; font-size:0.8rem; color:#555;">
                    ${isShift ? '※夜勤前後の仮眠状況から逆算した、体内時計を戻すための推奨値です。' : '※日頃の目標時間、昨日の不足分、心身のサインを統合して割り出しました。'}
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
                明日の日中に、追加で <strong>${alternativeNapMin}分間</strong> の仮眠（昼寝）をスケジュールに組み込んでください。
            </div>
        `;

        if (checkedCount > 0) {
            let alertMessage = checkedCount >= 3 
                ? `🚨 <strong>睡眠不足アラート（重度）:</strong> 心身のサインが3項目以上出ています。脳のパフォーマンスが低下している状態ですので、今夜の長時間睡眠の確保、または上記の代替仮眠を必ず実践してください。`
                : `⚠️ <strong>自覚症状あり:</strong> 体に軽度の睡眠不足サインが出ています。睡眠負債を溜め込まないよう、早期返済を意識しましょう。`;
            htmlOutput += `<div class="box-symptom-alert">${alertMessage}</div>`;
        }

        adviceOutput.innerHTML = htmlOutput;

        // 次回保存用にオブジェクトとして記録
        currentCalculationResult = {
            isShift: isShift,
            inputSummary: inputSummaryStr,
            recommended: recommendedTonight.toFixed(1),
            checkedSigns: checkedCount
        };
    }

    // --- 4. ローカルストレージ履歴保存機能 ---
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
                <div class="history-meta">自覚症状チェック: ${item.checkedSigns}個</div>
                <div class="history-result">👉 提案就寝: <strong>${item.recommended}時間</strong></div>
            `;
            historyContainer.appendChild(card);
        });

        // 削除ボタンの個別イベント付与
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
        
        // 現在の日付を取得
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const targetValue = parseFloat(document.getElementById('target-sleep').value);

        // 新しい履歴オブジェクトの組み立て
        const newRecord = {
            date: dateStr,
            target: targetValue,
            isShift: currentCalculationResult.isShift,
            inputSummary: currentCalculationResult.inputSummary,
            recommended: currentCalculationResult.recommended,
            checkedSigns: currentCalculationResult.checkedSigns
        };

        // 配列の先頭に追加して保存
        historyData.unshift(newRecord);
        localStorage.setItem('sleepHistory', JSON.stringify(historyData));

        // UIへの通知とリロード
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "✨ 保存しました！";
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

    // イベントリスナーの追加
    calcBtn.addEventListener('click', evaluateAndPropose);
    checkboxes.forEach(cb => cb.addEventListener('change', evaluateAndPropose));
    saveBtn.addEventListener('click', saveHistory);
    clearAllBtn.addEventListener('click', clearAllHistory);

    // --- 5. 解説モーダル開閉制御 ---
    const modal = document.getElementById('guide-modal');
    const openBtn = document.getElementById('open-guide-btn');
    const closeBtn = document.getElementById('close-guide-btn');
    const closeBottomBtn = document.getElementById('close-guide-bottom-btn');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    closeBottomBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    // 初期起動処理
    evaluateAndPropose();
    loadHistory();
});
