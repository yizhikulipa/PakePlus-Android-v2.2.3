// 自定义对话框（替代alert/confirm/prompt）
window._modalCallback = null;

function showModal(title, options = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modalOverlay');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        const okBtn = document.getElementById('modalOk');
        const cancelBtn = document.getElementById('modalCancel');

        titleEl.textContent = title;

        if (options.input) {
            bodyEl.innerHTML = `<input type="text" id="modalInput" placeholder="${options.placeholder || ''}" value="${options.value || ''}">`;
            setTimeout(() => document.getElementById('modalInput')?.focus(), 100);
        } else if (options.html) {
            bodyEl.innerHTML = options.html;
        } else {
            bodyEl.innerHTML = `<p style="color:#ccc;line-height:1.7">${options.message || ''}</p>`;
        }

        overlay.classList.add('show');

        function cleanup() {
            overlay.classList.remove('show');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onOk() {
            const inputEl = document.getElementById('modalInput');
            const value = inputEl ? inputEl.value : true;
            cleanup();
            resolve(value);
        }

        function onCancel() {
            cleanup();
            resolve(null);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);

        if (options.autoClose) {
            setTimeout(onOk, options.autoClose);
        }
    });
}

function showToast(msg, duration = 1800) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:#e94560;color:#fff;padding:10px 22px;border-radius:25px;
        z-index:9999;font-size:14px;pointer-events:none;
        animation:toastIn ${duration}ms ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// Toast动画
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastIn {
        0%{opacity:0;transform:translateX(-50%) translateY(20px)}
        15%{opacity:1;transform:translateX(-50%) translateY(0)}
        85%{opacity:1;transform:translateX(-50%) translateY(0)}
        100%{opacity:0;transform:translateX(-50%) translateY(-20px)}
    }
`;
document.head.appendChild(toastStyle);