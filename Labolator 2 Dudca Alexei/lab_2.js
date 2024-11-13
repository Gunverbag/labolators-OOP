class TextEditor {
    constructor(editorContainer) {
        this.editorContainer = editorContainer;
        this.tabs = [];
        this.activeTabId = null;
        this.initTabs(); // Инициализация первой вкладки
    }

    initTabs() {
        this.addTab(); // Создание первой вкладки
    }

    // Создание новой вкладки
    addTab() {
        const newTabId = this.tabs.length + 1; // ID вкладки
        this.tabs.push({ id: newTabId, content: "" }); // Добавляем вкладку в массив
        // Создаем элемент вкладки
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.textContent = `Вкладка ${newTabId}`;
        tab.dataset.tabId = newTabId;
        tab.onclick = () => this.switchTab(newTabId); // Обработчик переключения вкладок

        const tabContainer = document.getElementById('tabContainer');
        tabContainer.appendChild(tab); // Добавляем новую вкладку в контейнер

        if (this.tabs.length === 1) {
            this.switchTab(newTabId); // Переключаемся на первую вкладку автоматически
        }
    }

    // Переключение между вкладками
    switchTab(tabId) {
        const currentEditor = document.getElementById(`editor-${this.activeTabId}`);
        if (currentEditor) {
            const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
            activeTab.content = currentEditor.innerHTML; // Сохраняем контент текущей вкладки
        }

        const newTab = this.tabs.find(tab => tab.id === tabId);
        this.activeTabId = tabId;

        // Обновляем содержимое редактора для активной вкладки
        this.editorContainer.innerHTML = `<div id="editor-${tabId}" contentEditable="true" class="editor">${newTab.content}</div>`;

        // Обновление стилей вкладок
        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tabId == tabId) {
                tab.classList.add('active'); // Добавляем класс активной вкладке
            }
        });
    }

    setBold() {
        document.execCommand('bold');
    }

    setItalic() {
        document.execCommand('italic');
    }

    setFontSize(size) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.fontSize = size + 'px';
            range.surroundContents(span);
        }
    }

    setFontStyle(font) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.fontFamily = font;
            range.surroundContents(span);
        }
    }

    setTextColor(color) {
        document.execCommand('foreColor', false, color);
    }

    alignLeft() {
        document.execCommand('justifyLeft');
    }

    alignCenter() {
        document.execCommand('justifyCenter');
    }

    alignRight() {
        document.execCommand('justifyRight');
    }

    undo() {
        document.execCommand('undo');
    }

    redo() {
        document.execCommand('redo');
    }

    async openFile() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.docx';
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });

                    // Проверяем наличие активной вкладки
                    if (this.activeTabId !== null) {
                        // Получаем активный редактор для текущей вкладки
                        const currentEditor = document.getElementById(`editor-${this.activeTabId}`);

                        if (currentEditor) {
                            // Заменяем содержимое активного редактора на загруженный текст
                            currentEditor.innerHTML = result.value;

                            // Также сохраняем текст в массив вкладок
                            const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
                            if (activeTab) {
                                activeTab.content = result.value;
                            }
                        }
                    } else {
                        console.error("Нет активной вкладки для загрузки файла.");
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        };
        fileInput.click();
    }
    async saveFile() {
        const { Document, Packer, Paragraph, TextRun } = window.docx;

        const currentEditor = document.getElementById(`editor-${this.activeTabId}`);
        const textContent = currentEditor.innerText || currentEditor.textContent;

        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [new TextRun(textContent)],
                        }),
                    ],
                },
            ],
        });

        try {
            const blob = await Packer.toBlob(doc);
            saveAs(blob, "output.docx");
        } catch (error) {
            console.error("Ошибка сохранения файла: ", error);
        }
    }

    // Поиск слова
    searchWord() {
        const word = document.getElementById('searchInput').value;
        if (!word) return;

        this.clearHighlights();

        const findAndMark = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const regex = new RegExp(`(${word})`, 'gi');
                const matches = node.nodeValue.match(regex);

                if (matches) {
                    const span = document.createElement('span');
                    const parts = node.nodeValue.split(regex);

                    parts.forEach(part => {
                        if (regex.test(part)) {
                            const mark = document.createElement('mark');
                            mark.textContent = part;
                            span.appendChild(mark);
                        } else {
                            span.appendChild(document.createTextNode(part));
                        }
                    });

                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                node.childNodes.forEach(childNode => findAndMark(childNode));
            }
        };

        findAndMark(this.editorContainer);
    }

    // Очистка выделений
    clearHighlights() {
        const marks = this.editorContainer.querySelectorAll('mark');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    // Замена слова
    replaceWord() {
        const wordToFind = document.getElementById('searchInput').value;
        const wordToReplace = document.getElementById('replaceInput').value;

        if (!wordToFind || !wordToReplace) return;

        const editorContent = this.editorContainer.innerHTML.replace(/<mark>/g, "").replace(/<\/mark>/g, "");
        const regex = new RegExp(`(${wordToFind})`, 'gi');
        const newContent = editorContent.replace(regex, wordToReplace);

        this.editorContainer.innerHTML = newContent;
        this.searchWord();
    }
}

const editorContainer = document.getElementById('editorContainer');
const editor = new TextEditor(editorContainer);
