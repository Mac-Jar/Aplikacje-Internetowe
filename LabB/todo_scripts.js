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

        this.tasks.forEach((task, index) => {
            if (query.length >= 2 && !task.text.toLowerCase().includes(query)) return;

            const li = document.createElement('li');
            li.className = 'task';

            const span = document.createElement('span');
            span.innerHTML = this.highlight(task.text, query) +
                (task.date ? ` <small>(${task.date})</small>` : '');
            span.addEventListener('click', (e) => this.editTask(e, index));

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '🗑️';
            delBtn.className = 'delete-btn';
            delBtn.addEventListener('click', () => this.deleteTask(index));

            li.appendChild(span);
            li.appendChild(delBtn);
            this.listEl.appendChild(li);
        });

    }

    editTask(e, index) {
        const li = e.target.closest('.task');
        const span = li.querySelector('span');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.tasks[index].text;
        input.className = 'edit-input';
        li.replaceChild(input, span);
        input.focus();

        this.currentEdit = { index, input, li };
    }

    handleOutsideClick(e) {
        if (!this.currentEdit) return;

        const { index, input, li } = this.currentEdit;

        if (!li.contains(e.target)) {
            const newText = input.value.trim();
            if (this.validate(newText, this.tasks[index].date)) {
                this.tasks[index].text = newText;
                this.save();
                this.draw();
            }
            this.currentEdit = null;
        }
    }
}

// Start aplikacji
window.addEventListener('DOMContentLoaded', () => new Todo());
