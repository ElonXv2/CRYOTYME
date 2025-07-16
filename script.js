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
      user.username === 'admin' ? showAdmin() : showDashboard();
    }
  }
});

function login() {
  const uname = document.getElementById('username').value.trim();
  const pw = document.getElementById('password').value.trim();
  const error = document.getElementById('login-error');

  getUser(uname).then(user => {
    if (uname === 'admin' && pw === 'admin123') {
      currentUser = { username: 'admin' };
      localStorage.setItem('currentUser', 'admin');
      showAdmin();
    } else if (user && user.password === pw) {
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
  const pw = document.getElementById('reg-password').value.trim();
  const pin = document.getElementById('reg-pin').value.trim();
  const deposit = parseFloat(document.getElementById('reg-deposit').value);
  const mobile = document.getElementById('reg-mobile').value.trim();
  const avatarInput = document.getElementById('reg-avatar');
  const theme = document.getElementById('reg-theme').value;
  const error = document.getElementById('register-error');

  if (!uname || !pw || !pin || isNaN(deposit) || !mobile) {
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
          balance: deposit,
          theme: theme,
          avatar: reader.result,
          mobile: mobile,
          transactions: [{ title: 'Initial Deposit', amount: deposit }]
        };
        saveUser(user);
        showLogin();
      };
      if (avatarInput.files[0]) {
        reader.readAsDataURL(avatarInput.files[0]);
      } else {
        reader.onload();
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
}

function showAdmin() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('admin-screen').classList.remove('hidden');
  renderAdminUsers();
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
  document.body.className = theme + '-mode';
  localStorage.setItem('theme', theme);
}

function toggleDarkMode() {
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
