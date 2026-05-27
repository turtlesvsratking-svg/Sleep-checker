document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM要素の取得 ---
    const calcBtn = document.getElementById('calc-btn');
    const unifiedSaveBtn = document.getElementById('unified-save-btn'); // 統合ボタン
    const clearAllBtn = document.getElementById('clear-all-btn');
    const nightShiftCheckbox = document.getElementById('night-shift-mode');
    const inputCard = document.getElementById('input-card');
    
    const normalInputs = document.getElementById('normal-inputs');
    const shadowInputs = document.getElementById('shadow-inputs');
    const adviceOutput = document.getElementById('advice-output');
    const waterEl = document.getElementById('water');
    const scoreNumDisplay = document.getElementById('score-num-display'); // 10点指標要素
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
        let actualSleepLogged = 0; // カレンダー登録用の実睡眠時間値

        if (!isShift) {
            const night = parseFloat(document.getElementById('night-sleep').value);
            const nap = parseFloat(document.getElementById('nap-sleep').value);
            actualSleepLogged = night;

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
            actualSleepLogged = beforeNap + afterNap;

            totalScore = beforeNap + afterNap;
            sleepDebtHours = target - totalScore;

            let shiftDeficit = target - afterNap;
            if (shiftDeficit < 0) shiftDeficit = 0;

            recommendedTonight = target + shiftDeficit;
            inputSummaryStr = `夜勤前仮眠: ${beforeNap}h / 明け仮眠: ${afterNap}h`;
        }

        // 睡眠不足(負債)がマイナス値（寝溜め・過剰）にならないよう下限ガード
        if (sleepDebtHours < 0) sleepDebtHours = 0;

        // 【10点満点評価の計算ロジック】
        // 睡眠時間割合ベース（最大7点） ＋ 体調チェックの減点無し（最大3点）
        let timeRatio = totalScore / target;
        let baseScore = Math.floor(timeRatio * 7);
        if (baseScore > 7) baseScore = 7;
        
        let healthBonus = 3 - checkedCount;
        if (healthBonus < 0) healthBonus = 0;

        let finalScore = baseScore + healthBonus;
        if (finalScore > 10) finalScore = 10;
        if (finalScore < 0) finalScore = 0;

        // 指標画面の更新
        scoreNumDisplay.innerHTML = `${finalScore}<span class="score-max"> /10点</span>`;

        // コップの可視化反映
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

        // 提案UI構築
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

        resultPlaceholder.classList.add('hidden');
        resultContent.classList.remove('hidden');

        // グローバルに計算結果情報を記憶
        currentCalculationResult = {
            isShift: isShift,
            inputSummary: inputSummaryStr,
            recommended: recommendedTonight.toFixed(1),
            checkedSigns: checkedCount,
            debt: sleepDebtHours.toFixed(1),
            score: finalScore,
            actualSleep: actualSleepLogged.toFixed(1)
        };
    }

    // --- 【重要】1クリックで履歴保存とGoogleカレンダー起動を同時に行う関数 ---
    function handleUnifiedRegistration() {
        if (!currentCalculationResult) return;

        // 1. ローカルストレージ履歴への保存処理
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
            checkedSigns: currentCalculationResult.checkedSigns,
            score: currentCalculationResult.score
        };

        historyData.unshift(newRecord);
        localStorage.setItem('sleepHistory', JSON.stringify(historyData));
        loadHistory(); // 履歴リストをリフレッシュ

        // ボタンのテキスト変更フィードバック演出
        const originalText = unifiedSaveBtn.innerText;
        unifiedSaveBtn.innerText = "✨ 履歴保存完了！カレンダーを開きます...";
        unifiedSaveBtn.style.background = "#4caf50";
        setTimeout(() => {
            unifiedSaveBtn.innerText = originalText;
            unifiedSaveBtn.style.background = "";
        }, 2000);

        // 2. Googleカレンダー登録用URL構築 ＆ 外部ブラウザ遷移
        // 【指定形式化】 睡眠評価(満たされ度の得点) 睡眠時間 睡眠負債 
        const eventTitle = `睡眠評価(${currentCalculationResult.score}点) 睡眠時間:${currentCalculationResult.actualSleep}h 睡眠負債:${currentCalculationResult.debt}h`;

        const description = 
`【おしえてかめさん 起床後診断データ】
-----------------------------------------
■ 勤務サイクル: ${currentCalculationResult.isShift ? '夜勤サイクル' : '通常サイクル'}
■ 詳細内訳: ${currentCalculationResult.inputSummary}
■ 今朝の体調不良チェック数: ${currentCalculationResult.checkedSigns} 個
-----------------------------------------
🐢 かめさんからのおすすめ就寝提案:
👉 今夜は 【 ${currentCalculationResult.recommended} 時間 】 の睡眠を目指しましょう！`;

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const startHour = String(now.getHours()).padStart(2, '0');
        const startMin = String(now.getMinutes()).padStart(2, '0');
        const endHour = String((now.getHours() + 1) % 24).padStart(2, '0');
        
        const dateParam = `${year}${month}${date}T${startHour}${startMin}00Z/${year}${month}${date}T${endHour}${startMin}00Z`;
        const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(description)}&dates=${dateParam}`;

        // 別窓でGoogleカレンダーをオープン
        window.open(gCalUrl, '_blank');
    }

    // --- ローカルストレージ履歴レンダリング ---
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
            
            // 履歴カード側にもスコア（〇点）を小さく残すよう調整
            card.innerHTML = `
                <button class="btn-delete-card" data-index="${index}">&times;</button>
                <div class="history-date">${item.date} [${item.isShift ? '夜勤' : '通常'}] 満たされ度: ${item.score || 0}点</div>
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

    // イベントリスナーのセット
    calcBtn.addEventListener('click', evaluateAndPropose);
    unifiedSaveBtn.addEventListener('click', handleUnifiedRegistration); // 統合処理を紐付け
    clearAllBtn.addEventListener('click', clearAllHistory);

    // 解説モーダル
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
