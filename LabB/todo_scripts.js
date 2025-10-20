class Todo {
    constructor() {
        let stored = localStorage.getItem('tasks');

        if (stored) {
            this.tasks = JSON.parse(stored);
        } else {
            this.tasks = [];
        }

        this.listEl = document.getElementById('todo-list');
        this.searchEl = document.getElementById('search');
        this.newTaskEl = document.getElementById('new-task');
        this.deadlineEl = document.getElementById('deadline');
        this.addBtn = document.getElementById('add-btn');

        this.addBtn.addEventListener('click', () => this.addTask());
        this.searchEl.addEventListener('input', () => this.draw());

        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        this.draw();
    }

    save() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    validate(taskText, dateValue) {
        if (taskText.length < 3 || taskText.length > 255) {
            alert('Zadanie musi mieć od 3 do 255 znaków.');
            return false;
        }
        if (dateValue) {
            const inputDate = new Date(dateValue);
            if (inputDate < new Date()) {
                alert('Data musi być w przyszłości.');
                return false;
            }
        }
        return true;
    }

    addTask() {

        const text = this.newTaskEl.value.trim(); //The trim() method of String  values removes whitespace from both ends of this string and returns a new string, without modifying the original string.
        const date = this.deadlineEl.value;

        if (!this.validate(text, date)) return;

        this.tasks.push({ text, date });
        this.newTaskEl.value = '';
        this.deadlineEl.value = '';

        this.save();
        this.draw();
    }

    deleteTask(index) {
        this.tasks.splice(index, 1);
        this.save();
        this.draw();
    }

    highlight(text, query) {
        if (!query || query.length < 2) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    draw() {
        const query = this.searchEl.value.trim().toLowerCase();
        this.listEl.innerHTML = '';

        for (let [index, task] of this.tasks.entries()) {
            if (query.length >= 2 && !task.text.toLowerCase().includes(query)) continue;

            const li = document.createElement('li');
            li.className = 'task';
            li.dataset.index = index;

            // Tekst zadania (span)
            const span = document.createElement('span');
            span.className = 'text-span';
            span.innerHTML = this.highlight(task.text, query); // highlight tylko na tekście
            span.addEventListener('click', (e) => this.editTask(e));
            li.appendChild(span);

            // Data w osobnym small
            if (task.date) {
                const dateEl = document.createElement('small');
                dateEl.textContent = ` (${task.date})`;
                li.appendChild(dateEl);
            }

            // Przycisk usuwania
            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.className = 'delete-btn';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(index);
            });

            li.appendChild(delBtn);
            this.listEl.appendChild(li);
        }
    }

    editTask(e) {
        const li = e.target.closest('li.task');
        if (!li) return;

        const index = Number(li.dataset.index);
        if (!Number.isFinite(index)) return;

        if (this.currentEdit && this.currentEdit.li === li) return;
        if (this.currentEdit) this.commitCurrentEdit();

        const task = this.tasks[index];

        // Tworzymy input dla tekstu
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = task.text;
        textInput.className = 'edit-input';
        textInput.style.flex = '1';
        textInput.style.marginRight = '10px';

        // Tworzymy input dla daty
        const dateInput = document.createElement('input');
        dateInput.type = 'datetime-local';
        dateInput.value = task.date || '';
        dateInput.className = 'edit-date';
        dateInput.style.marginRight = '10px';

        // Czyścimy li i dodajemy oba inputy
        li.innerHTML = '';
        li.appendChild(textInput);
        li.appendChild(dateInput);

        // Przycisk zatwierdzenia (opcjonalnie)
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '✔️';
        confirmBtn.className = 'confirm-btn';
        confirmBtn.addEventListener('click', () => this.commitCurrentEdit());
        li.appendChild(confirmBtn);

        textInput.focus();
        textInput.setSelectionRange(textInput.value.length, textInput.value.length);

        const onKey = (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                this.commitCurrentEdit();
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                this.cancelCurrentEdit();
            }
        };
        textInput.addEventListener('keydown', onKey);
        dateInput.addEventListener('keydown', onKey);

        this.currentEdit = { index, textInput, dateInput, li, onKey };

        setTimeout(() => {
            this.outsideClickActive = true;
        }, 0);
    }




    commitCurrentEdit() {
        if (!this.currentEdit) return;
        const { index, textInput, dateInput } = this.currentEdit;

        const newText = textInput.value.trim();
        const newDate = dateInput.value;

        if (!this.validate(newText, newDate)) {
            textInput.focus();
            return;
        }

        this.tasks[index].text = newText;
        this.tasks[index].date = newDate;
        this.save();
        this.currentEdit = null;
        this.outsideClickActive = false;
        this.draw();
    }


    cancelCurrentEdit() {
        if (!this.currentEdit) return;
        this.currentEdit = null;
        this.outsideClickActive = false;
        this.draw();
    }


    handleOutsideClick(e) {
        if (!this.currentEdit || !this.outsideClickActive) return;

        const { input, li } = this.currentEdit;

        if (li.contains(e.target)) return;

        this.commitCurrentEdit();
        this.outsideClickActive = false;
    }



    // handleOutsideClick(e) {
    //     if (!this.currentEdit) return;
    //
    //     const { index, input, li } = this.currentEdit;
    //
    //     if (!li.contains(e.target)) {
    //         const newText = input.value.trim();
    //         if (this.validate(newText, this.tasks[index].date)) {
    //             this.tasks[index].text = newText;
    //             this.save();
    //             this.draw();
    //         }
    //         this.currentEdit = null;
    //     }
    // }
}

// Start aplikacji
window.addEventListener('DOMContentLoaded', () => new Todo());
