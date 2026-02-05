let currentQuestionSet = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let nextImageLoadPromise = null;

// LIFF Configuration
const LIFF_ID = '1660786685-eGqvIyOV';
let liffInitialized = false;

// 防止 iOS Safari 的雙指縮放
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('touchmove', function (e) {
    // 允許在詳解 modal 內滾動
    if (e.target.closest('.explanation-modal-content')) {
        return;
    }

    // 在答題階段禁止滾動
    if (!document.body.classList.contains('show-results')) {
        e.preventDefault();
    }
}, { passive: false });

// 從 URL 獲取題組 ID (支援一般 URL 和 LIFF URL)
function getQuestionSetId() {
    // First try current URL params
    let urlParams = new URLSearchParams(window.location.search);
    let setId = urlParams.get('set');

    // If running in LIFF, also check LIFF URL
    if (!setId && typeof liff !== 'undefined' && liffInitialized) {
        try {
            const liffUrl = liff.getDecodedIDToken()?.liff?.url || '';
            if (liffUrl) {
                const liffParams = new URLSearchParams(new URL(liffUrl).search);
                setId = liffParams.get('set');
            }
        } catch (e) {
            console.log('LIFF URL parsing error:', e);
        }
    }

    return setId || 'entrance'; // 預設使用 entrance
}

// 初始化頁面
async function initializePage() {
    const setId = getQuestionSetId();
    try {
        const response = await fetch(`https://rainbowstudent.wentzao.com/get_challenge_data?challenge=${setId}`);
        if (!response.ok) {
            throw new Error('題組載入失敗');
        }
        const data = await response.json();
        const challengeData = data.challenge_data;

        // 更新網頁標題
        document.title = `文藻美語 - ${challengeData.title}`;
        // 更新頁面標題（h1）
        document.getElementById('pageTitle').textContent = challengeData.title || '準備好挑戰了嗎？';
        // 更新標題圖片
        document.getElementById('headerImage').src = data.image_url;
        // 更新歡迎文字
        document.getElementById('welcomeText').textContent = challengeData.welcomeText || '歡迎來到文藻美語的挑戰題！';

        // 更新背景顏色
        if (challengeData.gradientColorStart && challengeData.gradientColorEnd) {
            document.querySelector('.gradient-background').style.background =
                `linear-gradient(135deg, ${challengeData.gradientColorStart}, ${challengeData.gradientColorEnd})`;

            // [Custom Feature] Set Question Text Shadow to use Gradient End Color
            const questionEl = document.getElementById('question');
            if (questionEl) {
                // Helper to adjust brightness
                const adjustBrightness = (col, amt) => {
                    col = col.replace(/^#/, '');
                    if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
                    let r = parseInt(col.substring(0, 2), 16);
                    let g = parseInt(col.substring(2, 4), 16);
                    let b = parseInt(col.substring(4, 6), 16);
                    r = Math.max(0, Math.min(255, r + amt));
                    g = Math.max(0, Math.min(255, g + amt));
                    b = Math.max(0, Math.min(255, b + amt));
                    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                };

                const darkColor = adjustBrightness(challengeData.gradientColorEnd, -80); // Darken by 80
                // Wider spread for foggy effect
                questionEl.style.textShadow = `2px 2px 10px ${darkColor}, 0 0 60px ${challengeData.gradientColorEnd}`;
            }
        }

        // 儲存題目數據供後續使用
        currentQuestionSet = challengeData;

        // [Custom Feature] Update Checklist Button Text from Config
        if (challengeData.checklistButtonText) {
            const btnText = document.querySelector('.checklist-btn-text');
            if (btnText) btnText.textContent = challengeData.checklistButtonText;

            // If button text is empty, maybe hide the button?
            if (challengeData.checklistButtonText === "") {
                document.querySelector('.checklist-btn').style.display = 'none';
            }
        }

        // [Custom Feature] Toggle Zhuyin Font
        if (challengeData.useZhuyinFont) {
            document.body.style.fontFamily = "'BpmfGenSenRounded', Arial, sans-serif";
        } else {
            document.body.style.fontFamily = "'Noto Sans TC', 'Heiti TC', 'Microsoft JhengHei', sans-serif";
        }

    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// 載入題組
async function loadQuestionSet() {
    const setId = getQuestionSetId();
    try {
        const response = await fetch(`https://rainbowstudent.wentzao.com/get_challenge_data?challenge=${setId}`);
        if (!response.ok) {
            throw new Error('題組載入失敗');
        }
        const data = await response.json();
        const challengeData = data.challenge_data;
        currentQuestionSet = challengeData;
        currentQuestions = challengeData.questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('題組載入失敗，請確認網址是否正確');
    }
}

// 在頁面載入時初始化 (含 LIFF)
window.addEventListener('DOMContentLoaded', async () => {
    // 嘗試初始化 LIFF
    if (typeof liff !== 'undefined') {
        try {
            await liff.init({ liffId: LIFF_ID });
            liffInitialized = true;
            console.log('LIFF initialized successfully');

            // 如果在外部瀏覽器開啟，可在此處理
            if (liff.isInClient()) {
                console.log('Running in LINE app');
            }
        } catch (error) {
            console.log('LIFF initialization failed or not in LINE:', error);
        }
    }

    // 繼續初始化頁面
    await initializePage();
});

// Toast 通知函數
function showToast(message, type = 'success') {
    // 移除現有的 toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 觸發動畫
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 2.5秒後自動消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 2500);
}

// 開始測驗
async function startQuiz() {
    await loadQuestionSet();
    if (!currentQuestions || currentQuestions.length === 0) {
        return;
    }

    // 預載入第一題圖片
    if (currentQuestions[0].image) {
        const preloadImage = new Image();
        preloadImage.src = currentQuestions[0].image;
    }

    document.getElementById('headerImage').classList.add('quiz-mode');
    document.getElementById('welcomeScreen').style.display = 'none';

    // Show fixed UI elements
    document.body.classList.add('game-active');

    const gameContainer = document.getElementById('gameContainer');
    gameContainer.style.display = 'block';
    setTimeout(() => {
        gameContainer.classList.add('show');
    }, 50);

    currentQuestionIndex = 0;
    score = 0;
    updateQuestion();

    // Start floating items animation
    setInterval(createFloatingItem, 3000);
    createFloatingItem();
}

// Add floating background items
const floatingItems = document.querySelector('.floating-items');
const items = ['📚', '✏️', '🎨', '🔢', '📐', '✂️', '🎯', '🎲', '🎮', '🧩', '🔍', '💡', '🌟', '⭐', '✨'];

function createFloatingItem() {
    // Limit max floating items to prevent lag
    if (floatingItems.children.length >= 15) return;

    const item = document.createElement('div');
    item.className = `floating-item ${Math.random() > 0.6 ? 'slow' : Math.random() > 0.3 ? '' : 'fast'}`;
    item.textContent = items[Math.floor(Math.random() * items.length)];
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${Math.random() * 20 + 20}px`;

    // Remove the element when animation ends
    item.addEventListener('animationend', () => {
        item.remove();
    });

    floatingItems.appendChild(item);
}

function preloadNextImage(index) {
    if (index < currentQuestions.length) {
        const nextQ = currentQuestions[index];
        if (nextQ.image) {
            nextImageLoadPromise = new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = nextQ.image;
            });
        } else {
            nextImageLoadPromise = Promise.resolve();
        }
    } else {
        nextImageLoadPromise = Promise.resolve();
    }
}

function updateQuestion() {
    const progressPercent = (currentQuestionIndex / currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = `${progressPercent}%`;

    if (currentQuestionIndex < currentQuestions.length) {
        const question = currentQuestions[currentQuestionIndex];
        const questionImage = document.getElementById('questionImage');

        // 先設置新圖片，然後更新問題文字
        questionImage.src = question.image;
        questionImage.style.display = 'block';
        const questionEl = document.getElementById('question');
        questionEl.textContent = question.question;
        questionEl.classList.remove('hide');
        questionEl.style.removeProperty('display'); // Restore visibility

        document.getElementById('result').textContent = '';

        // 預載入下一題圖片
        preloadNextImage(currentQuestionIndex + 1);
    } else {
        showFinalResult();
    }
}

function checkAnswer(answer) {
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = answer === question.correctAnswer;

    if (isCorrect) {
        score++;
    }

    // [Custom Feature] Instant Explanation
    if (currentQuestionSet && currentQuestionSet.showInstantExplanation) {
        showInstantExplanationInline(isCorrect, question.explanation, () => {
            proceedToNextQuestion();
        });
    } else {
        proceedToNextQuestion();
    }
}

function proceedToNextQuestion() {
    // 使用全域變數中的預載入 Promise
    let imageLoadPromise = nextImageLoadPromise || Promise.resolve();

    // 淡出當前題目內容
    const quizContent = document.querySelector('.quiz-content');
    const mobileOptions = document.querySelector('.mobile-options');
    quizContent.classList.add('fade-out');
    mobileOptions.classList.add('fade-out');

    // 等待淡出動畫 (300ms) 和圖片載入完成
    Promise.all([
        new Promise(r => setTimeout(r, 300)),
        imageLoadPromise
    ]).then(() => {
        currentQuestionIndex++;
        updateQuestion();
        // 淡入新題目內容
        quizContent.classList.remove('fade-out');
        mobileOptions.classList.remove('fade-out');
    });
}

function showInstantExplanationInline(isCorrect, explanation, callback) {
    const question = currentQuestions[currentQuestionIndex];

    // Get the correct answer text (O or X)
    const correctAnswerText = question.correctAnswer ? 'O' : 'X';
    const color = question.correctAnswer ? "#4CAF50" : "#F44336";

    // Create modal overlay with very high z-index
    const overlay = document.createElement('div');
    overlay.className = 'instant-explanation-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        padding: 80px 20px 20px 20px;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    overlay.innerHTML = `
        <div class="explanation-modal-content" style="
            background: white;
            color: #333;
            padding: 35px 20px;
            border-radius: 24px;
            max-width: 95%;
            width: 100%;
            max-width: 450px;
            text-align: center;
            transform: scale(0.8);
            transition: transform 0.3s ease;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        ">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px;">
                <h2 style="color: ${color}; margin: 0; font-size: 32px; font-weight: 600;">答案是</h2>
                <span style="font-size: 72px; font-weight: bold; color: ${color}; text-shadow: 0 0 30px ${color}50; font-family: Arial, Helvetica, sans-serif;">${correctAnswerText}</span>
            </div>
            <div style="text-align: left; background: #f8f9fa; padding: 20px; border-radius: 16px; margin-bottom: 24px; max-height: 45vh; overflow-y: auto;">
                <h4 style="margin: 0 0 12px 0; color: #888; font-size: 15px; font-weight: 500;">詳解</h4>
                <div style="font-size: 18px; line-height: 1.7; white-space: pre-line; color: #333;">${explanation || "沒有詳解說明。"}</div>
            </div>
            <button class="next-btn" style="
                background: ${color}; 
                color: white; 
                border: none; 
                padding: 16px 50px; 
                border-radius: 50px; 
                font-size: 20px;
                font-weight: 600;
                cursor: pointer; 
                box-shadow: 0 8px 25px ${color}50;
                transition: transform 0.2s, box-shadow 0.2s;
            ">
                ${currentQuestionIndex + 1 < currentQuestions.length ? '下一題' : '看結果'} →
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.explanation-modal-content').style.transform = 'scale(1)';
    });

    const nextBtn = overlay.querySelector('.next-btn');
    nextBtn.onmouseover = () => {
        nextBtn.style.transform = 'scale(1.05)';
        nextBtn.style.boxShadow = `0 8px 25px ${color}80`;
    };
    nextBtn.onmouseout = () => {
        nextBtn.style.transform = 'scale(1)';
        nextBtn.style.boxShadow = `0 6px 20px ${color}60`;
    };
    nextBtn.onclick = () => {
        overlay.style.opacity = '0';
        overlay.querySelector('.explanation-modal-content').style.transform = 'scale(0.8)';
        setTimeout(() => {
            overlay.remove();
            callback();
        }, 300);
    };
}

function showFinalResult() {
    const percentage = (score / currentQuestions.length) * 100;
    document.body.classList.add('show-results');
    document.body.classList.remove('game-active'); // Hide fixed UI elements

    // 先隱藏問題容器
    const questionElement = document.getElementById('question');
    questionElement.classList.add('hide');

    setTimeout(() => {
        questionElement.textContent = '';
        questionElement.style.display = 'none'; // Completely hide it

        // 確保標題圖片位置不變並恢復大小
        const headerImage = document.getElementById('headerImage');
        headerImage.classList.remove('quiz-mode');
        headerImage.style.position = 'relative';
        headerImage.style.zIndex = '10';

        // Show result content AFTER question is gone to avoid jump
        const resultElement = document.getElementById('result');
        let starsHtml = '';
        for (let i = 0; i < 3; i++) {
            if (percentage === 100) {
                starsHtml += `<div class="star show"><img src="star.png"></div>`;
            } else if (percentage >= 60 && i < 2) {
                starsHtml += `<div class="star show"><img src="star.png"></div>`;
            } else if (percentage >= 30 && i < 1) {
                starsHtml += `<div class="star show"><img src="star.png"></div>`;
            } else {
                starsHtml += `<div class="star"><img src="star.png" style="opacity: 0.3; filter: grayscale(100%);"></div>`;
            }
        }

        // Generate Result HTML
        let feedbackText = '';
        if (currentQuestionSet && currentQuestionSet.feedbacks) {
            // Find the feedback that matches the score percentage
            // Sort by minPercentage descending to find the highest match
            const sortedFeedbacks = [...currentQuestionSet.feedbacks].sort((a, b) => b.minPercentage - a.minPercentage);
            const feedback = sortedFeedbacks.find(f => percentage >= f.minPercentage);
            if (feedback) {
                feedbackText = feedback.text;
            } else {
                // Default fallback
                if (percentage === 100) feedbackText = "太厲害了！全部答對！";
                else if (percentage >= 80) feedbackText = "很棒喔！繼續加油！";
                else if (percentage >= 60) feedbackText = "及格了！再接再厲！";
                else feedbackText = "差一點點，再試一次！";
            }
        } else {
            if (percentage === 100) feedbackText = "太厲害了！全部答對！";
            else if (percentage >= 80) feedbackText = "很棒喔！繼續加油！";
            else if (percentage >= 60) feedbackText = "及格了！再接再厲！";
            else feedbackText = "差一點點，再試一次！";
        }


        // 詳解區域
        let explanationsHtml = '';
        explanationsHtml = `<div class="explanation-section" style="width: 100%; max-width: 500px; margin-top: 20px;">`;
        currentQuestions.forEach((q, index) => {
            const color = q.correctAnswer ? "#4CAF50" : "#F44336";
            const answerText = q.correctAnswer ? "O" : "X";

            explanationsHtml += `
                <div class="explanation-card">
                    <div class="card-header">
                        <span>第 ${index + 1} 題</span>
                        <span style="color: ${color}; font-size: 20px; font-weight: bold;">${answerText}</span>
                    </div>
                    <div class="card-question">${q.question}</div>
                    <div class="card-explanation">${q.explanation || "沒有詳解"}</div>
                </div>
            `;
        });
        explanationsHtml += `</div>`;

        // [Custom Feature] Button Text Logic
        const btnText = currentQuestionSet.checklistButtonText;
        const hasBtnText = btnText && btnText.trim().length > 0;
        const finalBtnText = hasBtnText ? btnText : '領取應備物品清單';
        const btnDisplay = hasBtnText ? 'flex' : 'none';


        resultElement.innerHTML = `
            <div class="stars-container">
                ${starsHtml}
            </div>
            <div class="score-text">得分: ${score} / ${currentQuestions.length}</div>
            <div class="feedback-text">${feedbackText}</div>
            <div class="action-buttons">
                <button class="share-btn" onclick="shareToFriends()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    <span class="share-btn-text">分享給朋友</span>
                </button>
                <button class="reveal-btn" onclick="revealExplanations()">點我看詳解</button>
                <button class="checklist-btn" onclick="showChecklistModal()" style="display: ${btnDisplay}">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"></path>
                        <rect x="9" y="3" width="6" height="4" rx="2"></rect>
                        <path d="M9 14l2 2 4-4"></path>
                    </svg>
                    <span class="checklist-btn-text">${finalBtnText}</span>
                </button>
            </div>
            ${explanationsHtml}
        `;

        resultElement.classList.add('show');
        // Re-integrate legacy animation logic
        document.querySelectorAll('.star').forEach((star, index) => {
            setTimeout(() => {
                if (index < document.querySelectorAll('.star').length) {
                    star.classList.add('show');
                }
            }, index * 300);
        });

        setTimeout(() => {
            const scoreText = document.querySelector('.score-text');
            if (scoreText) scoreText.classList.add('show');
        }, 1000);

        setTimeout(() => {
            const feedbackText = document.querySelector('.feedback-text');
            if (feedbackText) feedbackText.classList.add('show');
        }, 1300);

        setTimeout(() => {
            const actionButtons = document.querySelector('.action-buttons');
            if (actionButtons) actionButtons.classList.add('show');
        }, 1600);

        // Clean up visibility of other elements immediately (or after short delay to match fade)
        // Already handled by classes but ensuring display:none helps
        document.querySelector('.quiz-content').style.display = 'none';
        document.querySelector('.mobile-options').style.display = 'none';
        document.querySelector('.progress').style.display = 'none';
    }, 500); // End of main setTimeout
}

function getFeedbackText(percentage) {
    // 根據分數百分比從高到低尋找對應的回饋文字
    const feedback = currentQuestionSet.feedbacks.find(fb => percentage >= fb.minPercentage);
    return feedback ? feedback.text : "謝謝參與測驗！";
}

function revealExplanations() {
    const explanationSection = document.querySelector('.explanation-section');
    explanationSection.classList.add('show');
    // Note: .explanation-cards might not exist with new structure, just use section
    const cards = document.querySelector('.explanation-cards');
    if (cards) cards.classList.add('show');

    // 啟用滾動
    document.body.classList.add('details-visible');

    // 滾動到詳解區域
    explanationSection.scrollIntoView({ behavior: 'smooth' });

    // 等待內容展開動畫完成後再更新滾動條
    setTimeout(updateScrollbar, 500);
}

// 分享給朋友 - Share to LINE Friends or Copy Link
async function shareToFriends() {
    const setId = getQuestionSetId();
    const title = currentQuestionSet?.title || '挑戰題';
    const challengeUrl = `https://liff.line.me/${LIFF_ID}?set=${setId}`;

    // 如果不在 LIFF 環境，複製連結
    if (!liffInitialized || !liff.isInClient()) {
        try {
            await navigator.clipboard.writeText(challengeUrl);
            showToast('連結複製已成功', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = challengeUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('連結複製已成功', 'success');
            } catch (e) {
                showToast('複製失敗，請手動複製', 'info');
            }
            document.body.removeChild(textArea);
        }
        return;
    }

    // Check if shareTargetPicker is available
    if (!liff.isApiAvailable('shareTargetPicker')) {
        // Fallback to copy
        try {
            await navigator.clipboard.writeText(challengeUrl);
            showToast('連結複製已成功', 'success');
        } catch (error) {
            showToast('分享功能不可用', 'info');
        }
        return;
    }

    // Get challenge info for Flex Message
    const imageUrl = document.getElementById('headerImage')?.src || 'https://rainbowstudent.wentzao.com/static/images/logo.png';

    // Create Flex Message
    const flexMessage = {
        type: 'flex',
        altText: `來挑戰「${title}」！`,
        contents: {
            type: 'bubble',
            hero: {
                type: 'image',
                url: imageUrl,
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🎯 挑戰邀請',
                        weight: 'bold',
                        size: 'sm',
                        color: '#1DB446'
                    },
                    {
                        type: 'text',
                        text: title,
                        weight: 'bold',
                        size: 'xl',
                        margin: 'md',
                        wrap: true
                    },
                    {
                        type: 'text',
                        text: '快來測試你的知識！',
                        size: 'sm',
                        color: '#999999',
                        margin: 'md',
                        wrap: true
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        height: 'sm',
                        color: '#02a568',
                        action: {
                            type: 'uri',
                            label: '開始挑戰',
                            uri: challengeUrl
                        }
                    }
                ],
                flex: 0
            }
        }
    };

    try {
        const result = await liff.shareTargetPicker([flexMessage]);
        if (result) {
            // User selected someone to share
            showToast('分享已成功', 'success');
        } else {
            // User cancelled - no toast needed
            console.log('Share cancelled by user');
        }
    } catch (error) {
        console.error('Share error:', error);
        showToast('分享失敗，請稍後再試', 'info');
    }
}

function showChecklistModal() {
    document.getElementById('checklistModal').classList.add('show');
}

function closeModal() {
    document.getElementById('checklistModal').classList.remove('show');
}

function submitForm(event) {
    event.preventDefault();
    // 這裡可以加入表單提交的邏輯
    alert('感謝您的登記！清單將寄送至您的信箱。');
    closeModal();
}

// 點擊modal外部時關閉
window.onclick = function (event) {
    const modal = document.getElementById('checklistModal');
    if (event.target == modal) {
        closeModal();
    }
}

// Update URL when changing question sets
function changeQuestionSet(setId) {
    const url = new URL(window.location.href);
    url.searchParams.set('set', setId);
    window.history.pushState({}, '', url);
    location.reload();
}

// 添加自定義滾動條功能
function updateScrollbar() {
    const scrollbar = document.querySelector('.custom-scrollbar');
    const thumb = document.querySelector('.custom-scrollbar-thumb');
    const container = document.querySelector('.container');

    if (document.body.classList.contains('show-results')) {
        // 只有當內容高度超過視窗高度時才顯示滾動條
        const contentHeight = container.scrollHeight;
        const windowHeight = window.innerHeight;

        if (contentHeight > windowHeight) {
            const scrollPercent = window.scrollY / (contentHeight - windowHeight);
            const thumbHeight = Math.max(40, windowHeight * (windowHeight / contentHeight));

            thumb.style.height = `${thumbHeight} px`;
            thumb.style.top = `${scrollPercent * (windowHeight - thumbHeight)} px`;
            scrollbar.classList.add('show');
        } else {
            scrollbar.classList.remove('show');
        }
    } else {
        scrollbar.classList.remove('show');
    }
}

// 添加滾動條拖曳功能
let isDragging = false;
let startY = 0;
let startScroll = 0;

document.querySelector('.custom-scrollbar-thumb').addEventListener('mousedown', function (e) {
    isDragging = true;
    startY = e.clientY;
    startScroll = window.scrollY;
    document.body.style.userSelect = 'none'; // 防止拖曳時選中文字
});

document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;

    const container = document.querySelector('.container');
    const deltaY = e.clientY - startY;
    const windowHeight = window.innerHeight;
    const contentHeight = container.scrollHeight;

    const scrollRatio = (contentHeight - windowHeight) / (windowHeight - 40); // 40 是最小滾動條高度
    const newScroll = startScroll + (deltaY * scrollRatio);

    window.scrollTo(0, newScroll);
    e.preventDefault();
});

document.addEventListener('mouseup', function () {
    isDragging = false;
    document.body.style.userSelect = '';
});

// 點擊滾動條背景時，直接跳轉到對應位置
document.querySelector('.custom-scrollbar').addEventListener('click', function (e) {
    if (e.target === this) {
        const container = document.querySelector('.container');
        const windowHeight = window.innerHeight;
        const contentHeight = container.scrollHeight;
        const clickRatio = e.clientY / windowHeight;

        window.scrollTo(0, (contentHeight - windowHeight) * clickRatio);
    }
});

// 監聽滾動和調整視窗大小事件
window.addEventListener('scroll', updateScrollbar);
window.addEventListener('resize', updateScrollbar);

// 在顯示結果時初始化滾動條
const originalShowFinalResult = showFinalResult;
showFinalResult = function () {
    originalShowFinalResult.apply(this, arguments);
    // 等待內容渲染完成後再初始化滾動條
    setTimeout(updateScrollbar, 100);
};
