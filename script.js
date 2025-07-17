// script.js — Mobile Banking App Logic

let currentUser = null;
let balanceChart = null;

window.addEventListener('db-ready', async () => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const user = await getUser(savedUser);
    if (user) {
      currentUser = user;
      applyTheme(user.theme);
      // Check if the user is admin
      user.username === 'admin' ? showAdmin() : showDashboard();
    }
  }
});

function login() {
  const uname = document.getElementById('username').value.trim();
  const pw = document.getElementById('password').value.trim();
  const error = document.getElementById('login-error');

  // Admin login check
  if (uname === 'admin' && pw === 'admin123') { // Example admin credentials
    currentUser = { username: 'admin' }; // Set a simple currentUser object for admin
    localStorage.setItem('currentUser', 'admin'); // Persist admin login
    showAdmin(); // Show the admin panel
    return; // Exit the function after admin login
  }

  getUser(uname).then(user => {
    if (user && user.password === pw) {
      currentUser = user;
      localStorage.setItem('currentUser', uname);
      applyTheme(user.theme);
      showDashboard();
    } else {
      error.innerText = 'Invalid username or password.';
    }
  });
}

function register() {
  const uname = document.getElementById('reg-username').value.trim();
  const pw = document.getElementById('reg-password').value.trim();  // ✅ FIXED
  const pin = document.getElementById('reg-pin').value.trim();
  const mobile = document.getElementById('reg-mobile').value.trim();
  const avatarInput = document.getElementById('reg-avatar');
  const theme = document.getElementById('reg-theme').value;
  const error = document.getElementById('register-error');

  if (!uname || !pw || !pin || !mobile) {
    error.innerText = 'Please fill out all fields.';
    return;
  }

  getUser(uname).then(existing => {
    if (existing) {
      error.innerText = 'Username already exists.';
    } else {
      const reader = new FileReader();
      reader.onload = function () {
        const user = {
          username: uname,
          password: pw,
          pin: pin,
          balance: 0,
          theme: theme,
          avatar: reader.result,
          mobile: mobile,
          transactions: []
        };
        saveUser(user);
        showLogin();
      };
      if (avatarInput.files[0]) {
        reader.readAsDataURL(avatarInput.files[0]);
      } else {
        reader.onload(); // still call it if no avatar
      }
    }
  });
}


function resetPin() {
  const uname = document.getElementById('reset-username').value.trim();
  const pw = document.getElementById('reset-password').value.trim();
  const newPin = document.getElementById('new-pin').value.trim();
  const error = document.getElementById('reset-error');

  getUser(uname).then(user => {
    if (user && user.password === pw) {
      user.pin = newPin;
      saveUser(user);
      showLogin();
    } else {
      error.innerText = 'Incorrect credentials.';
    }
  });
}

function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('login-screen').classList.remove('hidden');
  document.body.className = 'light-mode';
}

function showDashboard() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('dashboard-screen').classList.remove('hidden');
  document.getElementById('user-name').innerText = currentUser.username;
  document.getElementById('balance').innerText = currentUser.balance.toFixed(2);
  document.getElementById('user-avatar').src = currentUser.avatar || '';
  populateTransactions();
  drawChart();
  populateUserProfile(); // NEW: Populate user profile details
}

function showAdmin() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('admin-screen').classList.remove('hidden');
  renderAdminUsers();
  renderAdminMessages(); // NEW: Render admin messages
}

function showLogin() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('login-screen').classList.remove('hidden');
}

function showRegister() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('register-screen').classList.remove('hidden');
}

function showReset() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('reset-screen').classList.remove('hidden');
}

function applyTheme(theme) {
  document.body.className = theme + '-mode'; // This line is flexible enough
  localStorage.setItem('theme', theme);
}

function toggleDarkMode() { // This still just toggles between light and dark
  if (document.body.classList.contains('dark-mode')) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }
}


function transferMoney() {
  const recipient = document.getElementById('recipient').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const pin = document.getElementById('pin').value.trim();
  const error = document.getElementById('transfer-error');
  const sms = document.getElementById('sms-alert');

  if (!recipient || isNaN(amount) || amount <= 0 || !pin) {
    error.innerText = 'Fill in all fields.';
    return;
  }
  if (pin !== currentUser.pin) {
    error.innerText = 'Incorrect PIN.';
    return;
  }
  if (amount > currentUser.balance) {
    error.innerText = 'Insufficient funds.';
    return;
  }

  getUser(recipient).then(targetUser => {
    if (!targetUser) {
      error.innerText = 'Recipient not found.';
      return;
    }
    currentUser.balance -= amount;
    currentUser.transactions.push({ title: `Transfer to ${recipient}`, amount: -amount });
    saveUser(currentUser);

    targetUser.balance += amount;
    targetUser.transactions.push({ title: `Received from ${currentUser.username}`, amount: amount });
    saveUser(targetUser);

    document.getElementById('recipient').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('pin').value = '';
    error.innerText = '';

    sms.innerText = `📲 SMS: ₱${amount} transferred to ${recipient}. Balance: ₱${currentUser.balance.toFixed(2)} (sent to ${currentUser.mobile})`;
    showDashboard();
  });
}

function populateTransactions() {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';
  currentUser.transactions.slice().reverse().forEach(tx => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${tx.title}</span><span style="color: ${tx.amount < 0 ? 'red' : 'green'};">${tx.amount < 0 ? '-' : '+'}$${Math.abs(tx.amount).toFixed(2)}</span>`;
    list.appendChild(li);
  });
}

function drawChart() {
  const ctx = document.getElementById('balance-chart').getContext('2d');
  const labels = currentUser.transactions.map((tx, i) => `#${i + 1}`);
  const data = currentUser.transactions.reduce((arr, tx) => {
    const prev = arr.length ? arr[arr.length - 1] : 0;
    arr.push(prev + tx.amount);
    return arr;
  }, []);

  if (balanceChart) balanceChart.destroy();
  balanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Balance Over Time',
        data: data,
        fill: false,
        borderColor: 'blue',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderAdminUsers() {
  const div = document.getElementById('admin-users');
  div.innerHTML = '<h3>All Users</h3>';
  getAllUsers().then(users => {
    users.forEach(u => {
      if (u.username === 'admin') return;
      const block = document.createElement('div');
      block.innerHTML = `
        <strong>${u.username}</strong> - $${u.balance.toFixed(2)}
        <button onclick="deleteUserAdmin('${u.username}')">Delete</button>
        <input type="number" id="deposit-amount-${u.username}" placeholder="Amount" style="width: 80px; display: inline-block; margin-left: 10px;">
        <button onclick="adminDeposit('${u.username}')">Deposit</button>
      `;
      div.appendChild(block);
    });
  });
}

function deleteUserAdmin(username) {
  if (confirm(`Delete user ${username}?`)) {
    deleteUser(username).then(() => renderAdminUsers());
  }
}

async function adminDeposit(username) {
  const amountInput = document.getElementById(`deposit-amount-${username}`);
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid positive amount for deposit.');
    return;
  }

  const user = await getUser(username);
  if (user) {
    user.balance += amount;
    user.transactions.push({ title: `Admin Deposit`, amount: amount });
    await saveUser(user);
    alert(`Successfully deposited $${amount.toFixed(2)} to ${username}.`);
    renderAdminUsers(); // Re-render the user list to show updated balance
  } else {
    alert('User not found.');
  }
}

// NEW FUNCTIONS

function populateUserProfile() {
  document.getElementById('profile-username').innerText = currentUser.username;
  document.getElementById('profile-mobile').innerText = currentUser.mobile;
  document.getElementById('profile-theme').innerText = currentUser.theme;
}

async function sendMessageToAdmin() {
  const messageText = document.getElementById('admin-message').value.trim();
  const statusElement = document.getElementById('admin-message-status');

  if (!messageText) {
    statusElement.innerText = 'Message cannot be empty.';
    statusElement.style.color = 'red';
    return;
  }

  try {
    const admin = await getUser('admin'); // Assuming 'admin' is the admin user
    if (admin) {
      if (!admin.messages) {
        admin.messages = [];
      }
      admin.messages.push({
        from: currentUser.username,
        message: messageText,
        timestamp: new Date().toLocaleString()
      });
      await saveUser(admin);
      statusElement.innerText = 'Message sent successfully!';
      statusElement.style.color = 'green';
      document.getElementById('admin-message').value = '';
    } else {
      statusElement.innerText = 'Admin user not found. Cannot send message.';
      statusElement.style.color = 'red';
    }
  } catch (error) {
    console.error('Error sending message to admin:', error);
    statusElement.innerText = 'Failed to send message. Please try again.';
    statusElement.style.color = 'red';
  }
}

async function renderAdminMessages() {
  const messageList = document.getElementById('message-list');
  messageList.innerHTML = ''; // Clear previous messages

  try {
    const admin = await getUser('admin');
    if (admin && admin.messages && admin.messages.length > 0) {
      admin.messages.slice().reverse().forEach(msg => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>From: ${msg.from}</strong> (${msg.timestamp})<br>
          ${msg.message}
          <hr>
        `;
        messageList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.innerText = 'No messages from users.';
      messageList.appendChild(li);
    }
  } catch (error) {
    console.error('Error rendering admin messages:', error);
    const li = document.createElement('li');
    li.innerText = 'Could not load messages.';
    messageList.appendChild(li);
  }
}
