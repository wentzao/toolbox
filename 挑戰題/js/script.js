let currentQuestionSet = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

// LIFF Configuration
const LIFF_ID = '1660786685-eGqvIyOV';
let liffInitialized = false;

// 防止 iOS Safari 的雙指縮放
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('touchmove', function (e) {
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
        // 更新標題圖片
        document.getElementById('headerImage').src = data.image_url;
        // 更新歡迎文字
        document.getElementById('welcomeText').textContent = challengeData.welcomeText || '歡迎來到文藻美語的挑戰題！';

        // 更新背景顏色
        if (challengeData.gradientColorStart && challengeData.gradientColorEnd) {
            document.querySelector('.gradient-background').style.background =
                `linear-gradient(135deg, ${challengeData.gradientColorStart}, ${challengeData.gradientColorEnd})`;
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
            document.body.style.fontFamily = "'ZihaiKaiTi', Arial, sans-serif";
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

function updateQuestion() {
    const progressPercent = (currentQuestionIndex / currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = `${progressPercent}%`;

    if (currentQuestionIndex < currentQuestions.length) {
        const question = currentQuestions[currentQuestionIndex];
        const questionImage = document.getElementById('questionImage');

        // 先設置新圖片，然後更新問題文字
        questionImage.src = question.image;
        questionImage.style.display = 'block';
        document.getElementById('question').textContent = question.question;

        document.getElementById('result').textContent = '';
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
    // 預先載入下一題的圖片
    if (currentQuestionIndex + 1 < currentQuestions.length) {
        const nextQuestion = currentQuestions[currentQuestionIndex + 1];
        const preloadImage = new Image();
        preloadImage.src = nextQuestion.image;
    }

    // 淡出當前題目內容
    const quizContent = document.querySelector('.quiz-content');
    const mobileOptions = document.querySelector('.mobile-options');
    quizContent.classList.add('fade-out');
    mobileOptions.classList.add('fade-out');

    setTimeout(() => {
        currentQuestionIndex++;
        updateQuestion();
        // 淡入新題目內容
        quizContent.classList.remove('fade-out');
        mobileOptions.classList.remove('fade-out');
    }, 300);
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
            padding: 30px;
            border-radius: 20px;
            max-width: 90%;
            width: 400px;
            text-align: center;
            transform: scale(0.8);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
                <h2 style="color: ${color}; margin: 0; font-size: 28px;">答案是</h2>
                <span style="font-size: 60px; font-weight: bold; color: ${color}; text-shadow: 0 0 20px ${color}40;">${correctAnswerText}</span>
            </div>
            <div style="text-align: left; background: #f5f5f5; padding: 15px; border-radius: 10px; margin-bottom: 20px; max-height: 40vh; overflow-y: auto;">
                <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">詳解：</h4>
                <div style="font-size: 16px; line-height: 1.6; white-space: pre-line;">${explanation || "沒有詳解說明。"}</div>
            </div>
            <button class="next-btn" style="
                background: ${color}; 
                color: white; 
                border: none; 
                padding: 14px 40px; 
                border-radius: 50px; 
                font-size: 18px; 
                cursor: pointer; 
                box-shadow: 0 6px 20px ${color}60;
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

    // 先隱藏問題容器
    const questionElement = document.getElementById('question');
    questionElement.classList.add('hide');
    setTimeout(() => {
        questionElement.textContent = '';
    }, 500);

    // 確保標題圖片位置不變
    const headerImage = document.getElementById('headerImage');
    headerImage.style.position = 'relative';
    headerImage.style.zIndex = '10';

    let explanationHTML = '<div class="explanation-section"><div class="explanation-cards">';
    currentQuestions.forEach((q, index) => {
        const correctSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`;
        const incorrectSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6 M9 9l6 6"/></svg>`;

        explanationHTML += `
            <div class="explanation-card">
                <div class="card-question">
                    <span class="answer-indicator ${q.correctAnswer ? 'correct' : 'incorrect'}">
                        ${q.correctAnswer ? correctSvg : incorrectSvg}
                    </span>
                    ${q.question}
                </div>
                <div class="card-explanation">
                    ${q.explanation}
                </div>
            </div>
        `;
    });
    explanationHTML += `
        <button class="start-btn" onclick="location.reload()" style="width: 200px;">重新開始</button>
    </div></div>`;

    // 計算星星數量
    const starCount = Math.ceil((percentage / 100) * 3);

    // 獲取回饋文字
    const feedback = getFeedbackText(percentage);

    // [Custom Feature] Button Text Logic
    const btnText = currentQuestionSet.checklistButtonText;
    const hasBtnText = btnText && btnText.trim().length > 0;
    const finalBtnText = hasBtnText ? btnText : '領取應備物品清單';
    const btnDisplay = hasBtnText ? 'flex' : 'none';

    // 隱藏問題容器
    document.getElementById('result').innerHTML = `
        <div class="stars-container">
            ${Array(3).fill().map((_, i) => `
                <div class="star${i < starCount ? ' show' : ''}" data-index="${i}">
                    <img src="star.png" alt="Star ${i + 1}">
                </div>
            `).join('')}
        </div>
        <div class="score-text">
            得分：${score}/${currentQuestions.length}
        </div>
        <div class="feedback-text">
            ${feedback}
        </div>
        <div class="action-buttons">
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
        ${explanationHTML}
    `;

    // 動畫效果
    setTimeout(() => {
        document.querySelectorAll('.star').forEach((star, index) => {
            setTimeout(() => {
                if (index < starCount) {
                    star.classList.add('show');
                }
            }, index * 300); // 增加間隔時間讓3D效果更明顯
        });

        setTimeout(() => {
            document.querySelector('.score-text').classList.add('show');
        }, 1000);

        setTimeout(() => {
            document.querySelector('.feedback-text').classList.add('show');
        }, 1300);

        setTimeout(() => {
            document.querySelector('.action-buttons').classList.add('show');
            // If instant explanation is on, we don't necessarily reveal all at end automatically, 
            // or we do? User removed "automatically show full explanation" request.
            // Let's keep it manual reveal for now unless requested.
        }, 1600);
    }, 100);

    document.querySelector('.quiz-content').style.display = 'none';
    document.querySelector('.mobile-options').style.display = 'none';
    document.querySelector('.progress').style.display = 'none';
}

function getFeedbackText(percentage) {
    // 根據分數百分比從高到低尋找對應的回饋文字
    const feedback = currentQuestionSet.feedbacks.find(fb => percentage >= fb.minPercentage);
    return feedback ? feedback.text : "謝謝參與測驗！";
}

function revealExplanations() {
    const explanationSection = document.querySelector('.explanation-section');
    explanationSection.classList.add('show');
    document.querySelector('.explanation-cards').classList.add('show');

    // 滾動到詳解區域
    explanationSection.scrollIntoView({ behavior: 'smooth' });

    // 等待內容展開動畫完成後再更新滾動條
    setTimeout(updateScrollbar, 500);
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

            thumb.style.height = `${thumbHeight}px`;
            thumb.style.top = `${scrollPercent * (windowHeight - thumbHeight)}px`;
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
