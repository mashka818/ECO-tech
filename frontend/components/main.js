// Main JavaScript for interactivity

document.addEventListener('DOMContentLoaded', function() {
    // Mediahub carousel with infinite scroll
    const mediahubGrid = document.querySelector('.mediahub__grid');
    const mediahubPrevBtn = document.querySelector('.mediahub__nav-btn--prev');
    const mediahubNextBtn = document.querySelector('.mediahub__nav-btn--next');
    
    if (mediahubGrid && mediahubPrevBtn && mediahubNextBtn) {
        const cards = mediahubGrid.querySelectorAll('.mediahub__card');
        const cardWidth = 260 + 20; // width + gap
        const visibleCards = Math.floor(mediahubGrid.parentElement.offsetWidth / cardWidth);
        let currentIndex = 0;
        const totalCards = cards.length;

        function updateCarousel() {
            const offset = -currentIndex * cardWidth;
            mediahubGrid.style.transform = `translateX(${offset}px)`;
        }

        mediahubNextBtn.addEventListener('click', () => {
            currentIndex++;
            if (currentIndex >= totalCards - visibleCards + 1) {
                currentIndex = 0; // Reset to beginning for infinite scroll
            }
            updateCarousel();
        });

        mediahubPrevBtn.addEventListener('click', () => {
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = Math.max(0, totalCards - visibleCards); // Go to end for infinite scroll
            }
            updateCarousel();
        });
    }

    // Philosophy carousel with infinite scroll
    const philosophyGrid = document.querySelector('.philosophy__grid');
    const philosophyPrevBtn = document.querySelector('.philosophy__nav-btn--prev');
    const philosophyNextBtn = document.querySelector('.philosophy__nav-btn--next');
    
    if (philosophyGrid && philosophyPrevBtn && philosophyNextBtn) {
        const cards = philosophyGrid.querySelectorAll('.philosophy__card');
        const cardWidth = 162 + 50; // width + gap
        const visibleCards = Math.floor(philosophyGrid.parentElement.offsetWidth / cardWidth);
        let currentIndex = 0;
        const totalCards = cards.length;

        function updateCarousel() {
            const offset = -currentIndex * cardWidth;
            philosophyGrid.style.transform = `translateX(${offset}px)`;
        }

        philosophyNextBtn.addEventListener('click', () => {
            currentIndex++;
            if (currentIndex >= totalCards - visibleCards + 1) {
                currentIndex = 0; // Reset to beginning for infinite scroll
            }
            updateCarousel();
        });

        philosophyPrevBtn.addEventListener('click', () => {
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = Math.max(0, totalCards - visibleCards); // Go to end for infinite scroll
            }
            updateCarousel();
        });
    }

    // Team carousel with infinite scroll
    const teamGrid = document.querySelector('.team__grid');
    const teamPrevBtn = document.querySelector('.team__nav-btn--prev');
    const teamNextBtn = document.querySelector('.team__nav-btn--next');
    
    if (teamGrid && teamPrevBtn && teamNextBtn) {
        const members = teamGrid.querySelectorAll('.team-member');
        const memberWidth = 200 + 20; // width + gap
        const visibleMembers = Math.floor(teamGrid.parentElement.offsetWidth / memberWidth);
        let currentIndex = 0;
        const totalMembers = members.length;

        function updateCarousel() {
            const offset = -currentIndex * memberWidth;
            teamGrid.style.transform = `translateX(${offset}px)`;
        }

        teamNextBtn.addEventListener('click', () => {
            currentIndex++;
            if (currentIndex >= totalMembers - visibleMembers + 1) {
                currentIndex = 0; // Reset to beginning for infinite scroll
            }
            updateCarousel();
        });

        teamPrevBtn.addEventListener('click', () => {
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = Math.max(0, totalMembers - visibleMembers); // Go to end for infinite scroll
            }
            updateCarousel();
        });
    }

    // Completed carousel with infinite scroll
    const completedGrid = document.querySelector('.completed__grid');
    const completedPrevBtn = document.querySelector('.completed__nav-btn--prev');
    const completedNextBtn = document.querySelector('.completed__nav-btn--next');
    
    if (completedGrid && completedPrevBtn && completedNextBtn) {
        const cards = completedGrid.querySelectorAll('.completed-card');
        const cardWidth = 360 + 40; // width + gap
        const visibleCards = Math.floor(completedGrid.parentElement.offsetWidth / cardWidth);
        let currentIndex = 0;
        const totalCards = cards.length;

        function updateCarousel() {
            const offset = -currentIndex * cardWidth;
            completedGrid.style.transform = `translateX(${offset}px)`;
        }

        completedNextBtn.addEventListener('click', () => {
            currentIndex++;
            if (currentIndex >= totalCards - visibleCards + 1) {
                currentIndex = 0; // Reset to beginning for infinite scroll
            }
            updateCarousel();
        });

        completedPrevBtn.addEventListener('click', () => {
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = Math.max(0, totalCards - visibleCards); // Go to end for infinite scroll
            }
            updateCarousel();
        });
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.header__nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', function() {
            nav.classList.toggle('active');
            this.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = nav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                nav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }

    // Filter buttons functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('filter-btn--catalog')) {
                filterButtons.forEach(b => {
                    if (!b.classList.contains('filter-btn--catalog')) {
                        b.classList.remove('filter-btn--active');
                    }
                });
                this.classList.add('filter-btn--active');
            }
        });
    });

    // Like buttons
    const likeButtons = document.querySelectorAll('.project-card__like');
    likeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('project-card__like--active');

            const svg = this.querySelector('svg path');
            if (this.classList.contains('project-card__like--active')) {
                if (svg) {
                    svg.setAttribute('fill', '#FF0032');
                    svg.setAttribute('stroke', '#FF0032');
                }
            } else {
                if (svg) {
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor');
                }
            }
        });
    });

    // Play button functionality
    const playButtons = document.querySelectorAll('.play-button, .hero__play-btn');
    playButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            // Add video play functionality here
            console.log('Play button clicked');
        });
    });

    // Media hub items click
    const mediahubItems = document.querySelectorAll('.mediahub__item');
    mediahubItems.forEach(item => {
        item.addEventListener('click', function() {
            // Add video play functionality here
            console.log('Media hub item clicked');
        });
    });

    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Add form submission logic here
            console.log('Form submitted');
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '#!') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Animate on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe sections for animation
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Production carousel functionality (if exists)
    const productionItems = document.querySelectorAll('.production-item');
    productionItems.forEach((item) => {
        const prevBtn = item.querySelector('.production-item__arrow--prev');
        const nextBtn = item.querySelector('.production-item__arrow--next');
        const dots = item.querySelectorAll('.production-item__dots .dot');

        if (dots.length > 0) {
            let currentSlide = 0;
            const totalSlides = dots.length;

            function showSlide(slideIndex) {
                dots.forEach((dot, i) => {
                    if (i === slideIndex) {
                        dot.classList.add('dot--active');
                    } else {
                        dot.classList.remove('dot--active');
                    }
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
                    showSlide(currentSlide);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide + 1) % totalSlides;
                    showSlide(currentSlide);
                });
            }

            dots.forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    currentSlide = i;
                    showSlide(currentSlide);
                });
            });
        }
    });

    // Completed projects carousel functionality (if exists)
    const completedCards = document.querySelectorAll('.completed-card');
    completedCards.forEach((card) => {
        const prevBtn = card.querySelector('.completed-card__arrow--prev');
        const nextBtn = card.querySelector('.completed-card__arrow--next');
        const dots = card.querySelectorAll('.completed-card__dots .dot');

        if (dots.length > 0) {
            let currentSlide = 0;
            const totalSlides = dots.length;

            function showSlide(slideIndex) {
                dots.forEach((dot, i) => {
                    if (i === slideIndex) {
                        dot.classList.add('dot--active');
                    } else {
                        dot.classList.remove('dot--active');
                    }
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
                    showSlide(currentSlide);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide + 1) % totalSlides;
                    showSlide(currentSlide);
                });
            }

            dots.forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    currentSlide = i;
                    showSlide(currentSlide);
                });
            });
        }
    });
});
