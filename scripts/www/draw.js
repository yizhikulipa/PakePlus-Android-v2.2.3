// ==========================================
// 专业画板 - 6种笔刷 / 图层 / 撤销 / 导出
// ==========================================
let drawCanvas, drawCtx;
let isDrawing = false;
let currentTool = 'pencil';
let brushSize = 5;
let brushColor = '#000000';
let layers = [];
let currentLayerIndex = 0;
let undoStack = [];
let points = [];
let lastX, lastY;

function initDraw() {
    drawCanvas = document.getElementById('drawCanvas');
    if (!drawCanvas) return;
    drawCtx = drawCanvas.getContext('2d');

    resizeDrawCanvas();
    window.addEventListener('resize', resizeDrawCanvas);

    // 指针事件
    drawCanvas.onpointerdown = drawStart;
    drawCanvas.onpointermove = drawMove;
    drawCanvas.onpointerup = drawEnd;
    drawCanvas.onpointerleave = drawEnd;
    drawCanvas.onpointercancel = drawEnd;

    if (layers.length === 0) createLayer(true);
    bindDrawTools();
    renderAllLayers();
}

function resizeDrawCanvas() {
    if (!drawCanvas) return;
    const wrap = drawCanvas.parentElement;
    const w = wrap.clientWidth || 480;
    const h = Math.max(400, window.innerHeight - 140);
    const dpr = window.devicePixelRatio || 1;

    // 保存旧图层数据
    const oldLayers = layers.map(l => {
        const tmp = document.createElement('canvas');
        tmp.width = l.width;
        tmp.height = l.height;
        tmp.getContext('2d').drawImage(l, 0, 0);
        return tmp;
    });

    drawCanvas.width = w * dpr;
    drawCanvas.height = h * dpr;
    drawCanvas.style.width = w + 'px';
    drawCanvas.style.height = h + 'px';
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.scale(dpr, dpr);

    // 重建图层
    layers = oldLayers.map(old => {
        const lc = document.createElement('canvas');
        lc.width = w;
        lc.height = h;
        lc.getContext('2d').drawImage(old, 0, 0, w, h);
        return lc;
    });
    if (layers.length === 0) createLayer(true);
    renderAllLayers();
}

function createLayer(fillWhite) {
    const lc = document.createElement('canvas');
    lc.width = drawCanvas.width / (window.devicePixelRatio || 1);
    lc.height = drawCanvas.height / (window.devicePixelRatio || 1);
    if (fillWhite) {
        const lctx = lc.getContext('2d');
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(0, 0, lc.width, lc.height);
    }
    layers.push(lc);
    currentLayerIndex = layers.length - 1;
}

function getLayerCtx() {
    if (layers.length === 0) createLayer(true);
    if (currentLayerIndex >= layers.length) currentLayerIndex = layers.length - 1;
    return layers[currentLayerIndex].getContext('2d');
}

function renderAllLayers() {
    if (!drawCtx) return;
    const w = drawCanvas.width / (window.devicePixelRatio || 1);
    const h = drawCanvas.height / (window.devicePixelRatio || 1);
    drawCtx.clearRect(0, 0, w, h);
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, w, h);
    layers.forEach(l => drawCtx.drawImage(l, 0, 0, w, h));
}

function saveUndoState() {
    const lc = layers[currentLayerIndex];
    if (!lc) return;
    const lctx = lc.getContext('2d');
    const data = lctx.getImageData(0, 0, lc.width, lc.height);
    undoStack.push({ index: currentLayerIndex, data: data });
    if (undoStack.length > 30) undoStack.shift();
}

function undo() {
    if (undoStack.length === 0) return;
    const state = undoStack.pop();
    if (!layers[state.index]) return;
    const lctx = layers[state.index].getContext('2d');
    lctx.putImageData(state.data, 0, 0);
    renderAllLayers();
}

// ---------- 绘图事件 ----------
function drawStart(e) {
    e.preventDefault();
    isDrawing = true;
    saveUndoState();

    const pos = getDrawPos(e);
    lastX = pos.x;
    lastY = pos.y;
    points = [{ x: pos.x, y: pos.y, t: Date.now() }];

    const lctx = getLayerCtx();
    lctx.save();
    applyBrush(lctx);
    lctx.beginPath();
    lctx.arc(pos.x, pos.y, getBrushSize() / 2, 0, Math.PI * 2);
    lctx.fill();
    lctx.restore();
    renderAllLayers();
}

function drawMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getDrawPos(e);
    points.push({ x: pos.x, y: pos.y, t: Date.now() });
    if (points.length > 5) points.shift();

    const lctx = getLayerCtx();
    lctx.save();
    applyBrush(lctx);

    if (points.length >= 3 && currentTool !== 'crayon') {
        const p0 = points[points.length - 3];
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        const cpx = p1.x + (p2.x - p0.x) * 0.15;
        const cpy = p1.y + (p2.y - p0.y) * 0.15;
        lctx.beginPath();
        lctx.moveTo(p1.x, p1.y);
        lctx.quadraticCurveTo(cpx, cpy, p2.x, p2.y);
        lctx.stroke();
    } else {
        lctx.beginPath();
        lctx.moveTo(lastX, lastY);
        lctx.lineTo(pos.x, pos.y);
        lctx.stroke();
    }

    lctx.restore();
    lastX = pos.x;
    lastY = pos.y;
    renderAllLayers();
}

function drawEnd(e) {
    isDrawing = false;
    points = [];
}

function getDrawPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
        x: (e.clientX - rect.left),
        y: (e.clientY - rect.top)
    };
}

function getBrushSize() {
    let size = brushSize;
    if (currentTool === 'brush' && points.length >= 2) {
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const dt = Math.max(1, p2.t - p1.t);
        const speed = dist / dt;
        const factor = Math.max(0.3, Math.min(1.6, 0.8 / (speed + 0.05)));
        size *= factor;
    }
    if (currentTool === 'water') size *= 2.2;
    if (currentTool === 'marker') size *= 1.7;
    if (currentTool === 'crayon') size *= 1.2;
    if (currentTool === 'eraser') size *= 2.5;
    return Math.max(1, size);
}

function applyBrush(lctx) {
    const size = getBrushSize();
    lctx.lineWidth = size;
    lctx.lineCap = 'round';
    lctx.lineJoin = 'round';
    lctx.globalCompositeOperation = 'source-over';
    lctx.globalAlpha = 1;
    lctx.setLineDash([]);
    lctx.shadowColor = 'transparent';
    lctx.shadowBlur = 0;

    switch (currentTool) {
        case 'pencil':
            lctx.strokeStyle = brushColor;
            lctx.globalAlpha = 0.88;
            lctx.lineWidth = Math.max(1, size * 0.55);
            lctx.setLineDash([1, 1.5]);
            break;
        case 'brush':
            lctx.strokeStyle = brushColor;
            lctx.globalAlpha = 0.65;
            break;
        case 'marker':
            lctx.strokeStyle = brushColor;
            lctx.globalAlpha = 0.4;
            break;
        case 'water':
            lctx.strokeStyle = brushColor;
            lctx.globalAlpha = 0.25;
            lctx.shadowColor = brushColor;
            lctx.shadowBlur = size * 0.6;
            break;
        case 'crayon':
            lctx.strokeStyle = brushColor;
            lctx.globalAlpha = 0.72;
            lctx.setLineDash([3, 2.5]);
            break;
        case 'rainbow':
            const hue = (Date.now() / 25) % 360;
            lctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            lctx.globalAlpha = 0.85;
            break;
        case 'eraser':
            lctx.globalCompositeOperation = 'destination-out';
            lctx.strokeStyle = 'rgba(0,0,0,1)';
            break;
        default:
            lctx.strokeStyle = brushColor;
    }
}

// ---------- 工具栏绑定 ----------
function bindDrawTools() {
    const tb = document.getElementById('drawToolbar');
    if (!tb) return;

    // 笔刷按钮
    tb.querySelectorAll('[data-tool]').forEach(btn => {
        btn.onclick = function () {
            tb.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTool = this.dataset.tool;
        };
    });

    // 大小滑块
    const sizeSlider = document.getElementById('brushSize');
    const sizeLabel = document.getElementById('sizeLabel');
    if (sizeSlider) {
        sizeSlider.oninput = function () {
            brushSize = parseInt(this.value);
            if (sizeLabel) sizeLabel.textContent = brushSize + 'px';
        };
    }

    // 颜色选择器
    const colorPicker = document.getElementById('brushColor');
    if (colorPicker) {
        colorPicker.oninput = function () {
            brushColor = this.value;
        };
    }

    // 图层
    document.getElementById('layerBtn').onclick = function () {
        if (layers.length < 6) {
            createLayer(false);
            showToast('新建图层 ' + layers.length);
        } else {
            currentLayerIndex = (currentLayerIndex + 1) % layers.length;
            showToast('切换图层 ' + (currentLayerIndex + 1));
        }
    };

    // 撤销
    document.getElementById('undoBtn').onclick = function () {
        undo();
        showToast('已撤销');
    };

    // 清空
    document.getElementById('clearBtn').onclick = async function () {
        const ok = await showModal('清空画布', { message: '确定要清空当前图层吗？' });
        if (ok) {
            const lctx = getLayerCtx();
            lctx.clearRect(0, 0, layers[currentLayerIndex].width, layers[currentLayerIndex].height);
            if (currentLayerIndex === 0) {
                lctx.fillStyle = '#ffffff';
                lctx.fillRect(0, 0, layers[currentLayerIndex].width, layers[currentLayerIndex].height);
            }
            renderAllLayers();
            showToast('已清空');
        }
    };

    // 保存
    document.getElementById('saveBtn').onclick = function () {
        exportDrawing('我的画作');
    };

    // 另存为
    document.getElementById('saveAsBtn').onclick = async function () {
        const name = await showModal('另存为', {
            input: true,
            placeholder: '输入文件名',
            value: '画作_' + new Date().toISOString().slice(0, 10)
        });
        if (name) exportDrawing(name);
    };
}

function exportDrawing(filename) {
    const w = drawCanvas.width / (window.devicePixelRatio || 1);
    const h = drawCanvas.height / (window.devicePixelRatio || 1);
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, w, h);
    layers.forEach(l => tctx.drawImage(l, 0, 0, w, h));

    const a = document.createElement('a');
    a.download = filename + '.png';
    a.href = tmp.toDataURL('image/png');
    a.click();
    showToast('已保存：' + filename + '.png');
}