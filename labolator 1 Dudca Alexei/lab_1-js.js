class Calculator {
    constructor(displayId) {
        this.display = document.getElementById(displayId);
        this.currentInput = '';
        this.memory = 0; // Инициализация памяти
        this.MAX_DECIMAL_PLACES = 2; // Максимальное количество знаков после запятой
        this.resetNext = false; // Флаг для сброса ввода после операций памяти или результата
        this.buttonClick = this.buttonClick.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.initializeButtons();
        this.initializeKeyboard();
    }

    initializeButtons() {
        // Выбираем все кнопки, включая кнопки памяти и логарифма
        const buttons = document.querySelectorAll('.number, .del, .reset, .egal');
        buttons.forEach(button => {
            button.addEventListener('click', this.buttonClick);
        });
    }

    initializeKeyboard() {
        // Добавляем обработчик событий для клавиатуры
        document.addEventListener('keydown', this.handleKeyPress);
    }

    handleKeyPress(event) {
        const key = event.key;
        // Предотвращаем дефолтное поведение для некоторых клавиш (например, Enter)
        if (['Enter', 'Backspace', 'Escape'].includes(key)) {
            event.preventDefault();
        }

        // Определяем, какую кнопку нажал пользователь
        let button;
        switch (key) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                button = key;
                break;
            case '+':
            case '-':
            case '*':
            case '/':
            case '^':
                button = key;
                break;
            case '.':
                button = '.';
                break;
            case 'Enter':
                button = '=';
                break;
            case 'Backspace':
                button = 'DEL';
                break;
            case 'Escape':
                button = 'RESET';
                break;
            case '%':
                button = '%';
                break;
            case 's':
            case 'S':
                button = 'sin';
                break;
            case 'c':
            case 'C':
                button = 'cos';
                break;
            case 't':
            case 'T':
                button = 'tan';
                break;
            case 'l':
            case 'L':
                // Определяем, нажата ли клавиша Shift для различения 'log' и 'ln'
                if (event.shiftKey) {
                    button = 'Log';
                } else {
                    button = 'ln';
                }
                break;
            case 'h':
            case 'H':
                button = 'Hex';
                break;
            case 'm':
            case 'M':
                // Определяем комбинации с модификаторами
                if (event.ctrlKey) { // Ctrl + M
                    button = 'M+';
                }
                break;
            default:
                return; // Игнорируем другие клавиши
        }

        // Найти кнопку на странице по тексту (без учета регистра)
        const calculatorButton = Array.from(document.querySelectorAll('.number, .del, .reset, .egal')).find(btn => btn.textContent.trim().toLowerCase() === button.toLowerCase());

        if (calculatorButton) {
            calculatorButton.click();
        }
    }

    buttonClick(event) {
        const buttonText = event.target.textContent.trim();

        if (event.target.classList.contains('number')) {
            switch (buttonText.toLowerCase()) {
                case '^2':
                    this.square();
                    break;
                case '√':
                    this.squareRoot();
                    break;
                case '%':
                    this.percentage();
                    break;
                case 'sin':
                    this.sin();
                    break;
                case 'cos':
                    this.cos();
                    break;
                case 'tan':
                    this.tan();
                    break;
                case 'mc':
                    this.memoryClear();
                    break;
                case 'm+':
                    this.memoryAdd();
                    break;
                case 'm-':
                    this.memorySubtract();
                    break;
                case 'mr':
                    this.memoryRecall();
                    break;
                case 'ln':
                    this.ln();
                    break;
                case 'log':
                    this.log();
                    break;
                case 'hex':
                    this.hex();
                    break;
                default:
                    this.appendInput(buttonText);
            }
        } else if (event.target.classList.contains('del')) {
            this.deleteNumber();
        } else if (event.target.classList.contains('reset')) {
            this.resetInput();
        } else if (event.target.classList.contains('egal')) {
            this.calcResult();
        }
    }

    appendInput(value) {
        if (this.resetNext) {
            // Если после операции памяти или результата вводится новое число, сбрасываем текущий ввод
            this.currentInput = '';
            this.resetNext = false;
        }

        // Предотвращаем ввод нескольких операторов подряд
        const operators = ['+', '-', '*', '/', '^'];
        const lastChar = this.currentInput.slice(-1);

        if (operators.includes(value)) {
            if (this.currentInput === '' && value !== '-') {
                // Не разрешаем начинать выражение с оператора, кроме минуса
                return;
            }
            if (operators.includes(lastChar)) {
                // Заменяем последний оператор новым
                this.currentInput = this.currentInput.slice(0, -1) + value;
                this.updateDisplay();
                return;
            }
        }

        // Ограничение на один десятичный разделитель в числе
        if (value === '.') {
            // Разделяем выражение на части по операторам
            const parts = this.currentInput.split(/[\+\-\*\/\^]/);
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('.')) {
                return; // Если уже есть точка в текущем числе, не добавляем
            }
        }

        this.currentInput += value;
        this.updateDisplay();
    }

    deleteNumber() {
        this.currentInput = this.currentInput.slice(0, -1);
        this.updateDisplay();
    }

    resetInput() {
        this.currentInput = '';
        this.updateDisplay();
    }

    validationInfo() {
        this.display.textContent = 'Ошибка';
        this.currentInput = '';
        this.resetNext = true;
    }

    calcResult() {
        try {
            // Замена символов для обработки
            let expression = this.currentInput
                .replace(/√/g, 'Math.sqrt')
                .replace(/sin/g, 'Math.sin')
                .replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan')
                .replace(/%/g, '/100');

            // Обработка степени, например, "5^2" превращаем в "Math.pow(5,2)"
            expression = expression.replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g, 'Math.pow($1,$3)');

            // Добавляем перевод градусов в радианы для тригонометрических функций
            expression = expression.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (match, func, angle) => {
                return `Math.${func}(${angle} * Math.PI / 180)`;
            });

            // Безопасная оценка выражения
            let result = Function('"use strict";return (' + expression + ')')();

            // Ограничиваем количество десятичных знаков
            result = this.formatNumber(result);

            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true; // Сбрасываем ввод при следующем вводе
        } catch (error) {
            validationInfo();
        }
    }

    square() {
        try {
            const value = eval(this.currentInput);
            let result = Math.pow(value, 2);
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    squareRoot() {
        try {
            const value = eval(this.currentInput);
            if (value < 0) throw new Error('Некорректное значение');
            let result = Math.sqrt(value);
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    percentage() {
        try {
            const value = eval(this.currentInput);
            let result = value / 100;
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    sin() {
        try {
            const value = eval(this.currentInput);
            const radians = value * Math.PI / 180;
            let result = Math.sin(radians);
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    cos() {
        try {
            const value = eval(this.currentInput);
            const radians = value * Math.PI / 180;
            let result = Math.cos(radians);
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    tan() {
        try {
            const value = eval(this.currentInput);
            const radians = value * Math.PI / 180;
            let result = Math.tan(radians);
            if (!isFinite(result)) throw new Error('Неопределено');
            result = this.formatNumber(result);
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }


    // Добавленные методы для функции Hex
    hex() {
        try {
            const value = eval(this.currentInput);
            if (!Number.isInteger(value)) {
                throw new Error('Только целые числа');
            }
            let result = value.toString(16).toUpperCase(); // Конвертация в шестнадцатеричную систему
            this.display.textContent = result;
            this.currentInput = result.toString();
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    // Методы для работы с памятью

    memoryClear() { // MC
        this.memory = 0;
        this.updateDisplay();
    }

    memoryAdd() { // M+
        try {
            const value = eval(this.currentInput);
            this.memory += value;
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    memorySubtract() { // M-
        try {
            const value = eval(this.currentInput);
            this.memory -= value;
            this.resetNext = true;
        } catch (error) {
            validationInfo();
        }
    }

    memoryRecall() { // MR
        if (this.memory !== 0) {
            this.currentInput = this.formatNumber(this.memory).toString();
            this.updateDisplay();
            this.resetNext = true;
        }
    }

    formatNumber(number) {
        if (!isFinite(number)) { // Проверка на бесконечность или NaN
            return 'Ошибка';
        }
        // Округление до MAX_DECIMAL_PLACES десятичных знаков
        let formattedNumber = Number(number.toFixed(this.MAX_DECIMAL_PLACES));
        formattedNumber = formattedNumber.toString();
        // Удаление лишних нулей
        if (formattedNumber.includes('.')) {
            formattedNumber = formattedNumber.replace(/\.?0+$/, '');
        }
        return formattedNumber;
    }

    updateDisplay() {
        this.display.textContent = this.currentInput || '0';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const calculator = new Calculator('display');
});
