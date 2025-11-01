// Header scroll effect
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Параллакс эффект только в зоне hero секции
const layersSection = document.querySelector('.layers');

document.addEventListener('mousemove', e => {
    // Проверяем, находится ли курсор в зоне layers секции
    if (!layersSection) return;
    
    const rect = layersSection.getBoundingClientRect();
    const isInSection = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
    );
    
    // Если курсор не в зоне секции, возвращаем в исходное положение
    if (!isInSection) {
        Object.assign(document.documentElement, {
            style: `
            --move-x: 0deg;
            --move-y: 0deg;
            `
        });
        return;
    }
    
    // Ограничиваем движение мыши
    const maxMoveX = 2; // максимальный угол поворота по X
    const maxMoveY = 3; // максимальный угол поворота по Y
    
    let moveX = (e.clientX - window.innerWidth / 2) * -.003;
    let moveY = (e.clientY - window.innerHeight / 2) * -.005;
    
    // Ограничиваем значения
    moveX = Math.max(-maxMoveX, Math.min(maxMoveX, moveX));
    moveY = Math.max(-maxMoveY, Math.min(maxMoveY, moveY));

    Object.assign(document.documentElement, {
        style: `
        --move-x: ${moveX}deg;
        --move-y: ${moveY}deg;
        `
    });
});

// Typewriter effect
function typeWriter(element, text, speed = 60, delay = 0, onComplete) {
    let i = 0;
    element.textContent = '';
    element.style.borderRight = '3px solid #4A7C59';
    element.style.animation = 'none'; // Disable CSS animation during typing

    setTimeout(() => {
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                // Remove cursor after typing is complete
                setTimeout(() => {
                    element.style.borderRight = 'none';
                    if (typeof onComplete === 'function') {
                        onComplete();
                    }
                }, 300);
            }
        }, speed);
    }, delay);
}

// Initialize typewriter effects
document.addEventListener('DOMContentLoaded', function() {
    const text1 = document.querySelector('.typing-text');
    const text2 = document.querySelector('.typing-delay');
    const text3 = document.querySelector('.typing-text-p');

    const typingElements = [text1, text2, text3].filter(Boolean);
    typingElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        el.style.display = 'inline-block';
        el.style.minWidth = rect.width + 'px';
        el.style.minHeight = rect.height + 'px';
    });

    if (text1) typeWriter(text1, 'ЭКО-ТЕХ', 90, 1400);
    if (text2) typeWriter(text2, 'ДОМА', 90, 2500);
    if (text3) typeWriter(text3, 'Качественные деревянные дома с душой', 55, 3600);
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe all sections for scroll animations except hero
document.querySelectorAll('section:not(.layers)').forEach(section => {
    observer.observe(section);
});

// Calculation Section - Speech Bubbles Animation
const calculationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const bubbles = entry.target.querySelectorAll('.speech-bubble');
            const image = entry.target.querySelector('.calculation__image');
            
            // Reset animations
            bubbles.forEach(bubble => {
                bubble.style.animation = 'none';
            });
            if (image) image.style.animation = 'none';
            
            // Trigger reflow
            void entry.target.offsetWidth;
            
            // Restart animations
            bubbles.forEach(bubble => {
                bubble.style.animation = '';
            });
            if (image) image.style.animation = '';
        }
    });
}, {
    threshold: 0.3,
    rootMargin: '0px 0px -100px 0px'
});

// Observe calculation section
const calculationSection = document.querySelector('.calculation');
if (calculationSection) {
    calculationObserver.observe(calculationSection);
}

// Video FAQ navigation
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.querySelector('.video-faq__grid');
    const prevBtn = document.querySelector('.video-faq__nav--prev');
    const nextBtn = document.querySelector('.video-faq__nav--next');

    if (grid && prevBtn && nextBtn) {
        const scrollAmount = 400; // Amount to scroll on each click

        prevBtn.addEventListener('click', () => {
            grid.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });

        nextBtn.addEventListener('click', () => {
            grid.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
});

// Mobile Navigation Bar
document.addEventListener('DOMContentLoaded', function() {
    const mobileNavBar = document.querySelector('.mobile-nav-bar');
    
    if (mobileNavBar) {
        const buttons = mobileNavBar.querySelectorAll('.mobile-nav-bar__btn');
        
        buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Add click animation
                btn.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
                
                // Handle navigation based on button index
                switch(index) {
                    case 0: // Back button
                        window.history.back();
                        break;
                    case 1: // Profile button
                        console.log('Profile clicked');
                        break;
                    case 2: // Home button
                        window.location.href = 'index.html';
                        break;
                    case 3: // Settings button
                        console.log('Settings clicked');
                        break;
                    case 4: // Forward button
                        window.history.forward();
                        break;
                }
            });
        });
    }
});
