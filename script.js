document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM要素の取得 ---
    const calcBtn = document.getElementById('calc-btn');
    const nightShiftCheckbox = document.getElementById('night-shift-mode');
    const inputCard = document.getElementById('input-card');
    
    const labelNightSleep = document.getElementById('label-night-sleep');
    const labelNapSleep = document.getElementById('label-nap-sleep');
    const dynamicHint = document.getElementById('dynamic-hint');

    // --- 1. 夜勤モード切り替え時のUI制御 ---
    nightShiftCheckbox.addEventListener('change', () => {
        const isNightShift = nightShiftCheckbox.checked;
        
        if (isNightShift) {
            // 夜勤モードON: テーマカラーをインディゴに変更
            inputCard.classList.add('nightshift-active-border');
            calcBtn.classList.add('nightshift-btn');
            document.querySelector('.nightshift-toggle-box').classList.add('active');
            
            labelNightSleep.innerText = "主なまとまった睡眠 (時間):";
            labelNapSleep.innerText = "夜勤前の仮眠、または小まめな睡眠 (分):";
            dynamicHint.innerHTML = "🌙 <strong>夜勤対応モード中:</strong> 夜勤前のまとまった仮眠(90〜120分)や夜勤明けの睡眠も、健康維持の「戦略的睡眠」として等倍以上で正しく評価されます！";
        } else {
            // 通常モード
            inputCard.classList.remove('nightshift-active-border');
            calcBtn.classList.remove('nightshift-btn');
            document.querySelector('.nightshift-toggle-box').classList.remove('active');
            
            labelNightSleep.innerText = "昨晩の睡眠 (時間):";
            labelNapSleep.innerText = "今日の昼寝 (分):";
            dynamicHint.innerHTML = "💡 昼寝の豆知識: 15〜30分の昼寝は、夜間睡眠の約3倍の回復効果があると言われています！";
        }
        calculateSleep();
    });

    // --- 2. 睡眠スコア＆コップ可視化の主ロジック ---
    function calculateSleep() {
        const target = parseFloat(document.getElementById('target-sleep').value);
        const night = parseFloat(document.getElementById('night-sleep').value);
        const nap = parseFloat(document.getElementById('nap-sleep').value);
        const isNightShift = nightShiftCheckbox.checked;

        let effectiveNapHours = 0;

        if (isNightShift) {
            // 【夜勤モード】仮眠制限を解除し等倍でしっかり睡眠時間として換算
            effectiveNapHours = nap / 60;
        } else {
            // 【通常モード】15〜30分は3倍効率、それを超える分は等倍換算
            if (nap <= 30) {
                effectiveNapHours = (nap * 3) / 60; 
            } else {
                effectiveNapHours = ((30 * 3) + (nap - 30)) / 60;
            }
        }

        const totalScore = night + effectiveNapHours;
        
        // コップの水量計算 (0% 〜 120%)
        let pct = (totalScore / target) * 100;
        if (pct > 120) pct = 120;
        if (pct < 0) pct = 0;

        const waterEl = document.getElementById('water');
        waterEl.style.height = `${pct}%`;

        const diff = totalScore - target;
        const resultStatusEl = document.getElementById('result-status');

        if (isNightShift) {
            waterEl.style.background = 'linear-gradient(to top, #3f51b5, #7986cb)'; // 夜勤用の青水
            if (totalScore >= target) {
                resultStatusEl.innerHTML = `
                    <div class="alert info">
                        <strong>夜勤帯の睡眠確保、バッチリです！</strong><br>
                        不規則な中、戦略的に睡眠時間を確保できています。退勤時はサングラスをかけるなどして、光の刺激を避けつつ遮光して休んでくださいね。
                    </div>
                `;
            } else {
                resultStatusEl.innerHTML = `
                    <div class="alert danger">
                        <strong>夜勤による急性睡眠不足を検知 (残り ${Math.abs(diff).toFixed(1)}時間分不足)</strong><br>
                        コップが満たされていません。夜勤明けの睡眠は「分割」でも構いません。1週間の中で少しずつ多めに寝て返済しましょう。
                    </div>
                `;
            }
        } else {
            if (diff >= 0) {
                waterEl.style.background = 'linear-gradient(to top, #4caf50, #81c784)'; // 安全：グリーン
                resultStatusEl.innerHTML = `
                    <div class="alert success">
                        <strong>睡眠貯金バッチリ！ (+${diff.toFixed(1)}時間分)</strong><br>
                        コップが満たされました。この調子で良好なリズムをキープしましょう。
                    </div>
                `;
            } else {
                waterEl.style.background = 'linear-gradient(to top, #ff9800, #ffb74d)'; // 負債：オレンジ
                resultStatusEl.innerHTML = `
                    <div class="alert danger">
                        <strong>睡眠負債が発生中！ (残り ${Math.abs(diff).toFixed(1)}時間不足)</strong><br>
                        コップの水が足りていません。今週末までに小まめな仮眠や早めの就寝で返済を！
                    </div>
                `;
            }
        }
    }

    calcBtn.addEventListener('click', calculateSleep);

    // --- 3. 睡眠不足度セルフチェックシステム ---
    const checkboxes = document.querySelectorAll('.symptom-check');
    const adviceEl = document.getElementById('check-advice');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('.symptom-check:checked').length;
            if (checkedCount > 0) {
                adviceEl.classList.remove('hidden');
                if (checkedCount >= 3) {
                    adviceEl.className = "advice-box severe";
                    adviceEl.innerHTML = `🚨 <strong>警告:</strong> 脳と体に強い疲労（睡眠負債）が蓄積している可能性があります。一刻も早い「1週間以内の返済スケジュール」を立ててください。`;
                } else {
                    adviceEl.className = "advice-box warning";
                    adviceEl.innerHTML = `⚠️ <strong>注意:</strong> 自覚症状が出ています。今日の夜、または次の夜勤前後の仮眠は目標時間プラス1時間の確保を目指しましょう。`;
                }
            } else {
                adviceEl.classList.add('hidden');
            }
        });
    });

    // --- 4. 解説ページ（モーダル）開閉システム ---
    const modal = document.getElementById('guide-modal');
    const openBtn = document.getElementById('open-guide-btn');
    const closeBtn = document.getElementById('close-guide-btn');
    const closeBottomBtn = document.getElementById('close-guide-bottom-btn');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    closeBottomBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // 初期起動時の自動計算を実行
    calculateSleep();
});
