const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const drawColorInput = document.getElementById('draw-color');
const bgColorInput = document.getElementById('bg-color');
const brushSizeInput = document.getElementById('brush-size'); // Новое поле для размера кисти
let drawColor = drawColorInput.value;
let bgColor = bgColorInput.value;
let brushSize = parseInt(brushSizeInput.value); // Хранение размера кисти

let activeTool = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

class Tool {
    constructor(name) {
        this.name = name;
    }
    use() {
        console.log(`${this.name} is being used.`);
    }
}

class Brush extends Tool {
    constructor(size, color) {
        super('Кисть');
        this.size = size;
        this.color = color;
    }

    draw(x, y) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSmoothLine(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / (this.size / 2));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            this.draw(x, y);
        }
    }
}

class Rectangle extends Tool {
    constructor() {
        super('Прямоугольник');
        this.startX = 0;
        this.startY = 0;
        this.width = 0;
        this.height = 0;
    }

    startDraw(x, y) {
        this.startX = x;
        this.startY = y;
    }

    updateDimensions(x, y) {
        this.width = x - this.startX;
        this.height = y - this.startY;
    }

    draw() {
        ctx.fillStyle = drawColor; // Устанавливаем цвет заливки
        ctx.fillRect(this.startX, this.startY, this.width, this.height);
    }
}

class Ellipse extends Tool {
    constructor() {
        super('Эллипс');
        this.startX = 0;
        this.startY = 0;
        this.radiusX = 0;
        this.radiusY = 0;
    }

    startDraw(x, y) {
        this.startX = x;
        this.startY = y;
    }

    updateDimensions(x, y) {
        this.radiusX = Math.abs(x - this.startX) / 2;
        this.radiusY = Math.abs(y - this.startY) / 2;
    }

    draw() {
        const centerX = this.startX + this.radiusX;
        const centerY = this.startY + this.radiusY;

        ctx.fillStyle = drawColor; // Устанавливаем цвет заливки
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
        ctx.fill(); // Заполняем эллипс цветом
    }
}

// Класс инструмента заливки
class Fill extends Tool {
    constructor() {
        super('Заливка');
    }

    floodFill(x, y, fillColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const targetColor = this.getPixelColor(imageData, x, y);
        if (this.colorsMatch(targetColor, fillColor)) return; // Если цвет совпадает, ничего не делаем

        const pixels = [{ x, y }];
        const width = imageData.width;
        const height = imageData.height;

        while (pixels.length > 0) {
            const pixel = pixels.pop();
            const currentColor = this.getPixelColor(imageData, pixel.x, pixel.y);

            if (this.colorsMatch(currentColor, targetColor)) {
                this.setPixelColor(imageData, pixel.x, pixel.y, fillColor);

                if (pixel.x + 1 < width) pixels.push({ x: pixel.x + 1, y: pixel.y });
                if (pixel.x - 1 >= 0) pixels.push({ x: pixel.x - 1, y: pixel.y });
                if (pixel.y + 1 < height) pixels.push({ x: pixel.x, y: pixel.y + 1 });
                if (pixel.y - 1 >= 0) pixels.push({ x: pixel.x, y: pixel.y - 1 });
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    getPixelColor(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return [
            imageData.data[index],
            imageData.data[index + 1],
            imageData.data[index + 2],
            imageData.data[index + 3]
        ];
    }

    setPixelColor(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = parseInt(color.slice(1, 3), 16);
        imageData.data[index + 1] = parseInt(color.slice(3, 5), 16);
        imageData.data[index + 2] = parseInt(color.slice(5, 7), 16);
        imageData.data[index + 3] = 255; // Полная непрозрачность
    }

    colorsMatch(color1, color2) {
        return color1[0] === color2[0] && color1[1] === color2[1] &&
               color1[2] === color2[2] && color1[3] === color2[3];
    }
}

class BezierBrush extends Tool {
    constructor(size, color) {
        super('Кривая Безье');
        this.size = size;
        this.color = color;
        this.points = []; // Массив для хранения точек рисования
        this.drawingBezier = false;
    }

    addPoint(x, y) {
        this.points.push({ x, y });
        if (this.points.length > 3) this.points.shift(); // Оставляем только последние 3 точки для сглаживания
    }

    drawSmoothLine() {
        if (this.points.length < 3) return;

        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);

        // Квадратичные кривые Безье для сглаживания
        for (let i = 1; i < this.points.length - 1; i++) {
            const midPointX = (this.points[i].x + this.points[i + 1].x) / 2;
            const midPointY = (this.points[i].y + this.points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, midPointX, midPointY);
        }
        this.ctx.stroke();
    }

    // Функция для поиска ближайшей контрольной точки
    getControlPointAt(x, y) {
        for (const curve of this.bezierCurves) {
            for (const point of curve) {
                if (Math.hypot(point.x - x, point.y - y) < 10) {
                    return point;
                }
            }
        }
        return null;
    }

    // Функция для рисования кривой Безье
    drawBezier(curve) {
        if (curve.length < 3) return;

        const [p0, p1, p2] = curve;

        this.ctx.beginPath();
        this.ctx.moveTo(p0.x, p0.y);
        this.ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); // Кривая второго порядка
        this.ctx.strokeStyle = this.colorPicker.value;
        this.ctx.lineWidth = this.thicknessRange.value;
        this.ctx.stroke();
        this.ctx.closePath();

        if (this.drawingBezier) {
            this.ctx.fillStyle = "red";
            [p0, p1, p2].forEach((point) => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.closePath();
            });
        }
    }
}



let savedCanvas = null;

// Обработчики событий для выбора инструментов
document.getElementById('brush-tool').addEventListener('click', () => {
    brushSize = parseInt(brushSizeInput.value); // Получаем текущий размер кисти
    activeTool = new Brush(brushSize, drawColor);
});

document.getElementById('eraser-tool').addEventListener('click', () => {
    brushSize = parseInt(brushSizeInput.value); // Получаем текущий размер кисти
    activeTool = new Brush(brushSize, bgColor); // Ластик работает как кисть с цветом фона
});

// Остальные инструменты
document.getElementById('rectangle-tool').addEventListener('click', () => {
    activeTool = new Rectangle();
});

document.getElementById('ellipse-tool').addEventListener('click', () => {
    activeTool = new Ellipse();
});

document.getElementById('bezier-tool').addEventListener('click', () => {
    activeTool = new BezierCurve();
    activeTool.draw(100, 100, 150, 50, 200, 150, 250, 100);
});
// Добавление инструмента "Заливка" и его логики
document.getElementById('fill-tool').addEventListener('click', () => {
    activeTool = new Fill();
});

// События для изменения цвета
drawColorInput.addEventListener('input', (e) => {
    drawColor = e.target.value;
});

document.getElementById('fill-tool').addEventListener('click', () => {
    activeTool = new Fill();
});

document.getElementById('bezier-tool').addEventListener('click', () => {
    brushSize = parseInt(brushSizeInput.value); // Получаем текущий размер кисти
    activeTool = new BezierBrush(brushSize, drawColor);
});

bgColorInput.addEventListener('input', (e) => {
    bgColor = e.target.value;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// События для рисования
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const x = e.offsetX;
    const y = e.offsetY;
    lastX = x;
    lastY = y;
    if (activeTool instanceof Brush) {
        activeTool.draw(x, y); // Начальная точка
    }
});

// Обработчик для плавного рисования
canvas.addEventListener('mousemove', (e) => {
    if (isDrawing && activeTool instanceof Brush) {
        const x = e.offsetX;
        const y = e.offsetY;
        
        activeTool.drawSmoothLine(lastX, lastY, x, y); // Рисуем плавную линию
        lastX = x;
        lastY = y;
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const x = e.offsetX;
    const y = e.offsetY;

    // Сохраняем текущее состояние холста при начале рисования фигуры
    savedCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (activeTool instanceof Rectangle || activeTool instanceof Ellipse) {
        activeTool.startDraw(x, y);
    } else if (activeTool instanceof Brush) {
        activeTool.draw(x, y);
    }

    lastX = x;
    lastY = y;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const x = e.offsetX;
    const y = e.offsetY;

    if (activeTool instanceof Rectangle || activeTool instanceof Ellipse) {
        // Восстанавливаем сохраненное состояние холста и рисуем текущую фигуру поверх него
        ctx.putImageData(savedCanvas, 0, 0);
        activeTool.updateDimensions(x, y);
        activeTool.draw();
    } else if (activeTool instanceof Brush) {
        activeTool.drawSmoothLine(lastX, lastY, x, y);
        lastX = x;
        lastY = y;
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

// Обработчик события для активации заливки при клике
canvas.addEventListener('mousedown', (e) => {
    if (activeTool instanceof Fill) {
        const x = e.offsetX;
        const y = e.offsetY;
        activeTool.floodFill(x, y, drawColor);
    }
});

// Обработчики для рисования кривой Безье
canvas.addEventListener('mousedown', (e) => {
    if (activeTool instanceof BezierBrush) {
        isDrawing = true;
        const x = e.offsetX;
        const y = e.offsetY;
        activeTool.addPoint(x, y);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing && activeTool instanceof BezierBrush) {
        const x = e.offsetX;
        const y = e.offsetY;
        activeTool.addPoint(x, y);
        activeTool.drawSmoothLine();
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    if (activeTool instanceof BezierBrush) activeTool.points = []; // Очищаем массив точек после завершения рисования
});

// Очищаем canvas
document.getElementById('clear-canvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});



// Сохраняем изображение
document.getElementById('save-image').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my_image.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Открываем изображение
document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const aspectRatio = img.width / img.height;
            let newWidth = canvas.width;
            let newHeight = canvas.height;

            if (img.width > img.height) {
                newHeight = newWidth / aspectRatio;
            } else {
                newWidth = newHeight * aspectRatio;
            }

            const x = (canvas.width - newWidth) / 2;
            const y = (canvas.height - newHeight) / 2;

            ctx.drawImage(img, x, y, newWidth, newHeight);
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
});

// Устанавливаем цвет фона при загрузке
ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);