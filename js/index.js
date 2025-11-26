(function () {
    var slideContainer = $('.slide-container');
    slideContainer.slick({
        arrows: false,
        infinite: false,
        swipe: true,
        adaptiveHeight: true
    });

    $(".nextBtn").on("click", function () {
        slideContainer.slick("slickNext")
    })

    $(".prevBtn").on("click", function () {
        slideContainer.slick("slickPrev")
    })
})();

// === CUSTOM CURSOR MOVEMENT & HANDLING ===
const cursor = document.getElementById('custom-cursor');
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

// === HIDE CUSTOM CURSOR & ZOOM FOR SCOPE EFFECT ===
// We use mouseover/mouseout delegation to handle dynamic elements
document.body.addEventListener('mouseover', function(e) {
    const profile = e.target.closest('.organizer-profile');
    if (profile) {
        cursor.style.opacity = '0'; // Hide main cursor
        const img = profile.querySelector('.profile-img');
        if(img) {
            // Updated: Set inline styles for "Pop up" and "Scope" effect
            // We rely on the CSS 'transition' property for smooth animation (defined in style.css)
            img.style.transform = 'scale(1.5)'; // Enlarge to 1.5x
            img.style.filter = 'contrast(1.2)';
            img.style.borderColor = '#4CAF50'; // Green border
            img.style.zIndex = '100'; // Bring to front
            img.style.position = 'relative'; // Required for z-index
            img.style.boxShadow = '0 0 25px rgba(76, 175, 80, 0.6)'; // Green Glow
        }
    } else {
        cursor.style.opacity = '1'; // Show main cursor
    }
});

document.body.addEventListener('mouseout', function(e) {
    const profile = e.target.closest('.organizer-profile');
    // Check if we are really leaving the profile block to avoid flickering
    if (profile && !e.relatedTarget?.closest('.organizer-profile')) {
        const img = profile.querySelector('.profile-img');
        if(img) {
            // Reset Image properties to default
            img.style.transform = 'scale(1)';
            img.style.filter = 'none';
            img.style.borderColor = '#FF9800'; // Reset to orange border
            img.style.zIndex = ''; // Reset z-index
            img.style.boxShadow = ''; // Reset shadow to CSS default
        }
    }
});


// === 3D TILT & GLARE EFFECT ===

// 1. Initialize Glare Elements
document.querySelectorAll('.clash-card').forEach(card => {
    if (!card.querySelector('.card-glare')) {
        const glare = document.createElement('div');
        glare.className = 'card-glare';
        card.appendChild(glare);
    }
});

// 2. Mouse Move Listener for Tilt/Glare
document.addEventListener('mousemove', (e) => {
    const activeCard = document.querySelector('.slick-active .clash-card');
    
    if(!activeCard) return;

    const rect = activeCard.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const mouseX = e.clientX - cardCenterX;
    const mouseY = e.clientY - cardCenterY;

    // --- TILT MATH ---
    const rotateX = (mouseY / (window.innerHeight / 2)) * -15; 
    const rotateY = (mouseX / (window.innerWidth / 2)) * 15;

    activeCard.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

    // --- GLARE MATH ---
    const glare = activeCard.querySelector('.card-glare');
    if (glare) {
        const distance = Math.sqrt(mouseX**2 + mouseY**2);
        const maxDist = Math.sqrt((rect.width/2)**2 + (rect.height/2)**2);
        const opacity = Math.min(distance / maxDist, 0.6) + 0.1; 

        const angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI) - 90;
        
        glare.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)`;
        glare.style.opacity = opacity.toString();
    }
});

// 3. Reset on Mouse Leave
document.addEventListener('mouseleave', () => {
    const activeCard = document.querySelector('.slick-active .clash-card');
    if (activeCard) {
        activeCard.style.transform = `rotateY(0deg) rotateX(0deg)`;
        const glare = activeCard.querySelector('.card-glare');
        if (glare) glare.style.opacity = '0';
    }
});


const entrySound = new Audio('images/audio/gun2.mp3'); 
const gunshotSound = new Audio('images/audio/gun.mp3'); 

// === ENTER BUTTON ===
document.getElementById('enterBtn').addEventListener('click', function() {
    entrySound.volume = 0.5; 
    entrySound.play().catch(e => console.log("Audio play failed"));

    var elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log(err)); 
    }
    
    $("#overlay").fadeOut();
    
    fetchContributors(); 
});

window.addEventListener('click', function(e) {
    if (e.target.tagName === 'INPUT') return;
    const shot = gunshotSound.cloneNode();
    shot.volume = 0.3; 
    shot.play().catch(e => {});
});

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    if(modalId === 'teamsModal') {
        fetchRegisteredTeams();
    }
    if(modalId === 'contributorsModal') {
        fetchAllContributorsModal();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// === REGISTRATION FORM SUBMISSION ===
document.getElementById('regForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const statusDiv = document.getElementById('regStatus');
    
    const teamName = document.getElementById('teamName').value;
    const member1 = document.getElementById('member1').value;
    const member2 = document.getElementById('member2').value;

    btn.textContent = "TRANSMITTING...";
    btn.disabled = true;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamName, member1, member2 })
        });

        if (response.ok) {
            statusDiv.textContent = "REGISTRATION SUBMITTED. WAITING FOR ADMIN APPROVAL.";
            statusDiv.style.color = "#FBDE79"; 
            document.getElementById('regForm').reset();
        } else {
            statusDiv.textContent = "ERROR: TRANSMISSION FAILED.";
            statusDiv.style.color = "#FF4D4D";
        }
    } catch (error) {
        console.error(error);
        statusDiv.textContent = "CONNECTION ERROR. CHECK NETWORK.";
        statusDiv.style.color = "#FF4D4D";
    } finally {
        btn.textContent = "CONFIRM DEPLOYMENT";
        btn.disabled = false;
    }
});

// === FETCH TEAMS ===
async function fetchRegisteredTeams() {
    const listContainer = document.getElementById('teamsList');
    listContainer.innerHTML = '<div class="loading-text">SCANNING DATABASE...</div>';

    try {
        const response = await fetch('/teams');
        const teams = await response.json();

        listContainer.innerHTML = ''; 

        if(teams.length === 0) {
            listContainer.innerHTML = '<div class="loading-text">NO APPROVED SQUADS YET</div>';
            return;
        }

        teams.forEach((team, index) => {
            const div = document.createElement('div');
            div.className = 'team-item';
            div.innerHTML = `<span>#${index + 1} ${team.teamName}</span> <br> M1: ${team.member1} | M2: ${team.member2}`;
            listContainer.appendChild(div);
        });

    } catch (error) {
        listContainer.innerHTML = '<div class="loading-text">DATABASE OFFLINE</div>';
    }
}

// === FETCH CONTRIBUTORS ===
async function fetchContributors() {
    try { } catch(e) { console.log(e); }
}

async function fetchAllContributorsModal() {
    const listContainer = document.getElementById('allContributorsList');
    listContainer.innerHTML = '<div class="loading-text">LOADING...</div>';
    
    try {
        const res = await fetch('/contributors');
        const data = await res.json();
        listContainer.innerHTML = '';
        
        if(data.length === 0) {
            listContainer.innerHTML = '<div class="loading-text">NO CONTRIBUTORS YET</div>';
            return;
        }

        data.forEach((c, index) => {
            const div = document.createElement('div');
            div.className = 'team-item'; 
            div.innerHTML = `<span>${index + 1}. ${c.name}</span> <span style="float:right; color:#4CAF50;">₹${c.amount}</span>`;
            listContainer.appendChild(div);
        });
    } catch(e) {
        listContainer.innerHTML = '<div class="loading-text">ERROR LOADING DATA</div>';
    }
}

// === CANVAS SPARK TRAIL ===
var colorArray = ['#FF4500', '#FF8C00', '#FFD700', '#FFA500']; 
var canvas = document.querySelector('canvas');
var c = canvas.getContext('2d');

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

window.addEventListener('resize', function () {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
});

var mouse = { x: undefined, y: undefined };
window.addEventListener('mousemove', function (e) {
    mouse.x = e.x;
    mouse.y = e.y;
    spawnParticles(3); 
});
window.addEventListener('touchmove', function (e) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    spawnParticles(3);
});

function Particle(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.radians = Math.random() * Math.PI * 2;
    this.velocity = 0.05;
    this.dx = (Math.random() - 0.5) * 2; 
    this.dy = (Math.random() - 0.5) * 2; 
    
    this.life = 100;

    this.draw = function() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        c.globalAlpha = Math.max(0, this.life / 100); 
        c.fill();
        c.globalAlpha = 1; 
    }

    this.update = function() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= 2; 
        if(this.radius > 0.2) this.radius -= 0.05;
        this.draw();
    }
}

var particles = [];

function spawnParticles(amount) {
    for (let i = 0; i < amount; i++) {
        let radius = Math.random() * 3 + 1;
        let color = colorArray[Math.floor(Math.random() * colorArray.length)];
        particles.push(new Particle(mouse.x, mouse.y, radius, color));
    }
}

function animate() {
    requestAnimationFrame(animate);
    c.clearRect(0, 0, innerWidth, innerHeight);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

animate();

// === DISABLE SHORTCUTS ===
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123) return false;
    if(e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) return false;
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false;
}