// Sistema de Progreso
let completedLessons = JSON.parse(localStorage.getItem('nivel2Progress')) || [];
let builderElements = [];

// Cargar progreso al iniciar
window.onload = function() {
    loadProgress();
};

function loadProgress() {
    completedLessons.forEach(lessonNum => {
        markAsCompleted(lessonNum, false);
    });
    updateProgress();
    unlockNextLesson();
}

function completeLesson(lessonNum) {
    if (!completedLessons.includes(lessonNum)) {
        completedLessons.push(lessonNum);
        localStorage.setItem('nivel2Progress', JSON.stringify(completedLessons));
        markAsCompleted(lessonNum, true);
        updateProgress();
        unlockNextLesson();
    }
}

function markAsCompleted(lessonNum, showAnimation) {
    const status = document.getElementById(`status${lessonNum}`);
    if (status) {
        status.textContent = '✅ Completada';
        status.style.background = '#FFC107';
        status.style.color = 'white';
        
        if (showAnimation) {
            createConfetti();
        }
    }
}

function updateProgress() {
    const total = 4;
    const completed = completedLessons.length;
    const percentage = (completed / total) * 100;
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        progressBar.textContent = Math.round(percentage) + '%';
    }
    
    if (progressText) {
        progressText.textContent = `${completed}/${total}`;
    }

    if (completed === total) {
        showCertificate();
    }
}

function unlockNextLesson() {
    for (let i = 1; i <= 4; i++) {
        if (completedLessons.includes(i)) {
            const nextLesson = document.getElementById(`lesson${i + 1}`);
            if (nextLesson) {
                nextLesson.classList.remove('locked');
                const nextStatus = document.getElementById(`status${i + 1}`);
                if (nextStatus && nextStatus.textContent.includes('🔒')) {
                    nextStatus.textContent = '📝 Pendiente';
                }
            }
        }
    }
}

// Lección 1: Editor HTML en Vivo
function updatePreview(lessonNum) {
    const htmlCode = document.getElementById(`htmlEditor${lessonNum}`).value;
    const preview = document.getElementById(`preview${lessonNum}`);
    
    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background: #f0f0f0;
                }
                button {
                    background: #007BFF;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>${htmlCode}</body>
        </html>
    `;
    
    preview.srcdoc = fullHTML;
}

// Lección 2: Constructor de Página
function addElement(type) {
    const output = document.getElementById('builderOutput');
    const placeholder = output.querySelector('.placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    let element;
    let htmlCode = '';
    
    switch(type) {
        case 'h1':
            element = document.createElement('h1');
            element.textContent = 'Título Grande';
            element.style.color = '#007BFF';
            htmlCode = '<h1>Título Grande</h1>';
            break;
        case 'h2':
            element = document.createElement('h2');
            element.textContent = 'Título Mediano';
            element.style.color = '#28A745';
            htmlCode = '<h2>Título Mediano</h2>';
            break;
        case 'p':
            element = document.createElement('p');
            element.textContent = 'Este es un párrafo de texto que puedes personalizar.';
            htmlCode = '<p>Este es un párrafo de texto.</p>';
            break;
        case 'img':
            element = document.createElement('div');
            element.innerHTML = '🖼️ [Imagen aquí]';
            element.style.background = '#e9ecef';
            element.style.padding = '20px';
            element.style.borderRadius = '8px';
            element.style.textAlign = 'center';
            htmlCode = '<img src="imagen.jpg" alt="Descripción">';
            break;
        case 'button':
            element = document.createElement('button');
            element.textContent = 'Haz clic aquí';
            element.style.background = '#FFC107';
            element.style.color = 'white';
            element.style.border = 'none';
            element.style.padding = '10px 20px';
            element.style.borderRadius = '5px';
            element.style.cursor = 'pointer';
            element.style.margin = '10px 0';
            htmlCode = '<button>Haz clic aquí</button>';
            break;
    }
    
    output.appendChild(element);
    builderElements.push(htmlCode);
    updateGeneratedCode();
}

function clearBuilder() {
    const output = document.getElementById('builderOutput');
    output.innerHTML = '<p class="placeholder">Haz clic en los botones para construir tu página</p>';
    builderElements = [];
    updateGeneratedCode();
}

function updateGeneratedCode() {
    const codeDisplay = document.getElementById('generatedCode');
    codeDisplay.textContent = builderElements.join('\n');
}

// Lección 3: Laboratorio de Estilos
function applyStyle() {
    const element = document.getElementById('styledElement');
    const textColor = document.getElementById('textColor').value;
    const bgColor = document.getElementById('bgColor').value;
    const fontSize = document.getElementById('fontSize').value;
    const borderWidth = document.getElementById('borderWidth').value;
    const borderRadius = document.getElementById('borderRadius').value;
    
    element.style.color = textColor;
    element.style.background = bgColor;
    element.style.fontSize = fontSize + 'px';
    element.style.border = borderWidth > 0 ? `${borderWidth}px solid #007BFF` : 'none';
    element.style.borderRadius = borderRadius + 'px';
    element.style.padding = '20px';
    element.style.transition = 'all 0.3s ease';
    
    document.getElementById('fontSizeValue').textContent = fontSize + 'px';
    document.getElementById('borderValue').textContent = borderWidth + 'px';
    document.getElementById('radiusValue').textContent = borderRadius + 'px';
    
    const cssCode = `color: ${textColor};
background: ${bgColor};
font-size: ${fontSize}px;
${borderWidth > 0 ? `border: ${borderWidth}px solid #007BFF;` : ''}
${borderRadius > 0 ? `border-radius: ${borderRadius}px;` : ''}
padding: 20px;`;
    
    document.getElementById('cssCode').textContent = cssCode;
}

// Lección 4: Tabs y Proyecto Final
function switchTab(tab) {
    const htmlTab = document.getElementById('htmlTab');
    const cssTab = document.getElementById('cssTab');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'html') {
        htmlTab.classList.add('active');
        cssTab.classList.remove('active');
        tabs[0].classList.add('active');
    } else {
        cssTab.classList.add('active');
        htmlTab.classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function renderFinalProject() {
    const htmlCode = document.getElementById('finalHTML').value;
    const cssCode = document.getElementById('finalCSS').value;
    const preview = document.getElementById('finalPreview');
    
    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, sans-serif; 
                    padding: 20px;
                    margin: 0;
                }
                ${cssCode}
            </style>
        </head>
        <body>${htmlCode}</body>
        </html>
    `;
    
    preview.srcdoc = fullHTML;
}

// Certificado
function showCertificate() {
    const certSection = document.getElementById('certificateSection');
    if (certSection) {
        certSection.style.display = 'block';
        setTimeout(() => {
            certSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
        
        const date = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('certDate').textContent = date;
        
        createConfetti();
    }
}

function downloadCertificate() {
    alert('🎓 ¡Certificado descargado!\n\nCertificado de Desarrollador Web Junior\n\nHabilidades dominadas:\n✓ HTML\n✓ CSS\n✓ Diseño Web\n✓ Maquetación\n\n¡Continúa al Nivel 3 para aprender Python!');
}

function nextLevel() {
    window.location.href = 'nivel3-avanzado.html';
}

// Efectos visuales
function createConfetti() {
    const colors = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3'];
    const symbols = ['⭐', '🎉', '🎊', '✨', '🌟'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
            confetti.style.fontSize = (Math.random() * 20 + 20) + 'px';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }, i * 30);
    }
}