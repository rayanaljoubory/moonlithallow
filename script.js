// Read the current account list, migrating the older single-user format if needed.
function getUsers() {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        return JSON.parse(savedUsers);
    }

    const oldUser = localStorage.getItem('user');
    if (!oldUser) {
        return [];
    }

    const user = JSON.parse(oldUser);
    const users = user.email
        ? [{ email: user.email, password: user.password, highScore: Number(user.highScore ?? user.topScore) || 0 }]
        : [];
    localStorage.setItem('users', JSON.stringify(users));
    return users;
}

// Validate registration details and save a new account in browser storage.
function register() {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const phoneRegex = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]+$/;
    const postcodeRegex = /^(?:GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})$/i;
    const emailInput = document.querySelector('#email');
    const addressInput = document.querySelector('#address');
    const postcodeInput = document.querySelector('#postcode');
    const phoneInput = document.querySelector('#phone');
    const passwordInput = document.querySelector('#psw');
    const message = document.querySelector('#registerMessage');
    const email = emailInput.value.trim();
    const address = addressInput.value.trim();
    const postcode = postcodeInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;


    emailInput.value = email;
    if (!emailRegex.test(email)) {
        message.textContent = 'Please enter a valid email address.';
        emailInput.focus();
        return;
    }

    addressInput.value = address;
    if (!address) {
        message.textContent = 'Please enter your address.';
        addressInput.focus();
        return;
    }

    postcodeInput.value = postcode;
    if (!postcodeRegex.test(postcode)) {
        message.textContent = 'Please enter a valid UK postcode.';
        postcodeInput.focus();
        return;
    }

    phoneInput.value = phone;
    if (!phoneRegex.test(phone)) {
        message.textContent = 'Please enter a valid phone number with 7 to 15 digits.';
        phoneInput.focus();
        return;
    }

    if (!passwordRegex.test(password)) {
        message.textContent = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and one of @$!%*?&.';
        passwordInput.focus();
        return;
    }

    const users = getUsers();
    if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        message.textContent = 'An account with that email already exists.';
        return;
    }

    users.push({
        email: email,
        address: address,
        postcode: postcode,
        phone: phone,
        password: password,
        highScore: 0
    });

    try {
        localStorage.setItem('users', JSON.stringify(users));
        message.textContent = 'Registration completed!';
    } catch (error) {
        message.textContent = `Could not save your account in this browser: ${error.message}`;
    }
}



// Check the saved credentials, mark the user as signed in, and open the game.
function login() {
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#psw');
    const message = document.querySelector('#loginMessage');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const user = getUsers().find(savedUser =>
        savedUser.email.toLowerCase() === email.toLowerCase() &&
        savedUser.password === password
    );

    if (!user) {
        message.textContent = 'Email or password is incorrect.';
        return;
    }

    localStorage.setItem('currentUser', user.email);
    window.location.href = 'game.html';
}

// Sort saved accounts by high score and render them safely as list items.
function displayHighScores() {
    const leaderboard = document.querySelector('#leaderboard');
    if (!leaderboard) {
        return;
    }

    const users = getUsers().sort((first, second) =>
        Number(second.highScore || 0) - Number(first.highScore || 0)
    );
    leaderboard.replaceChildren();

    if (users.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No scores yet.';
        leaderboard.append(item);
        return;
    }

    users.forEach(user => {
        const item = document.createElement('li');
        item.textContent = `${user.email}: ${Number(user.highScore) || 0}`;
        leaderboard.append(item);
    });
}

// Show whether a user is signed in on the scores page.
function displayCurrentUser() {
    const currentUserLabel = document.querySelector('#currentUser');
    if (currentUserLabel) {
        currentUserLabel.textContent = localStorage.getItem('currentUser')
            ? `Logged in as ${localStorage.getItem('currentUser')}`
            : 'Log in to save a score.';
    }
}

// Summarize the latest run using the values saved by the game.
function displayGameScore() {
    const scoreSummary = document.querySelector('#gameScoreSummary');
    const savedScore = localStorage.getItem('spookyGameScore');
    if (!scoreSummary) {
        return;
    }

    if (savedScore === null) {
        scoreSummary.textContent = 'Your game score will appear here automatically after you play.';
        return;
    }

    const score = Number(savedScore);
    if (!Number.isFinite(score) || score < 0) {
        scoreSummary.textContent = 'Your latest game score could not be read.';
        return;
    }

    const level = Number(localStorage.getItem('spookyGameLevel')) || 1;
    const completed = localStorage.getItem('spookyGameCompleted') === 'true';
    const deaths = Number(localStorage.getItem('spookyGameDeaths')) || 0;
    const elapsedSeconds = Number(localStorage.getItem('spookyGameTime')) || 0;
    const elapsedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
    scoreSummary.textContent = `Latest game score: ${score} points, level ${level}${completed ? ' — all three levels complete' : ''}; ${deaths} deaths, ${elapsedTime} total time.`;
}

// Initialize score-page displays and refresh them when another tab saves changes.
if (document.querySelector('#leaderboard')) {
    displayHighScores();
    displayCurrentUser();
    displayGameScore();
    window.addEventListener('storage', event => {
        if (event.key === 'users' || event.key === 'currentUser') {
            displayHighScores();
            displayCurrentUser();
        }
        if (event.key === 'spookyGameScore' || event.key === 'spookyGameLevel' || event.key === 'spookyGameCompleted' ||
            event.key === 'spookyGameDeaths' || event.key === 'spookyGameTime') {
            displayGameScore();
        }
    });
}

// Explain why login is required when the game redirects a signed-out visitor.
if (window.location.pathname.endsWith('/login.html') && new URLSearchParams(window.location.search).has('required')) {
    const message = document.querySelector('#loginMessage');
    if (message) {
        message.textContent = 'Please log in to play Moonlit Hollow.';
    }
}
