const $ = (id) => document.getElementById(id);

const money = (n) => Math.round(n).toLocaleString('vi-VN');
const number = (n) => (Math.round(n * 10) / 10).toLocaleString('vi-VN');

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatShort(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function postJson(url, body) {
  return api(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setMessage(element, text, isError) {
  element.textContent = text;
  element.classList.toggle('is-error', Boolean(isError));
}

function makeRow(values, firstClass) {
  const tr = document.createElement('tr');
  values.forEach((value, index) => {
    const td = document.createElement('td');
    td.textContent = value;
    if (index === 0 && firstClass) {
      td.className = firstClass;
    }
    tr.appendChild(td);
  });
  return tr;
}

const financialPanel = $('financialForm');
const suppliesPanel = $('panelSupplies');
const picks = $('picks');
const stockSection = document.querySelector('.stock');
const forecastSection = document.querySelector('.forecast');

let currentMode = null; 

function showMode(mode) {
  const isSupplies = mode === 'supplies';
  financialPanel.hidden = isSupplies;
  suppliesPanel.hidden = !isSupplies;
  picks.hidden = !isSupplies;
  
  stockSection.hidden = false;
  forecastSection.hidden = false;
}

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('click', (e) => {
    if (currentMode === radio.value) {
      radio.checked = false;
      currentMode = null;
      financialPanel.hidden = true;
      suppliesPanel.hidden = true;
      picks.hidden = true;
      stockSection.hidden = true;
      forecastSection.hidden = true;
    } else {
      currentMode = radio.value;
      showMode(radio.value);
    }
  });
});

document.querySelectorAll('a[href="#donate"]').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('input[name="mode"][value="financial"]').checked = true;
    currentMode = 'financial';
    showMode('financial');
  });
});

async function loadStock() {
  try {
    const data = await api('/api/stock');
    const body = $('stockBody');
    body.replaceChildren();

    data.items.forEach((item) => {
      body.appendChild(makeRow([
        capitalize(item.name),
        `${number(item.in_stock)} ${item.unit}`,
        `${number(item.daily_use)} ${item.unit}`,
        formatShort(item.lasts_until),
        `${item.days_left} days`,
      ], 'cell-head'));
    });

    if (data.all_until) {
      $('stockUntil').textContent =
        `${formatDate(data.all_until.date)} (${data.all_until.days_left} days left)`;
    }
  } catch (error) {
    $('stockUntil').textContent = error.message;
  }
}

async function loadNeeds() {
  try {
    const data = await api('/api/needs');
    const body = $('needsBody');
    body.replaceChildren();

    data.items.forEach((item) => {
      body.appendChild(makeRow([
        item.priority,
        capitalize(item.name),
        `${item.days_left} days`,
        item.suggested === null ? '–' : `${money(item.suggested)} ${item.unit}`,
      ], 'cell-head'));
    });

    $('needsUpdated').textContent = formatDate(data.updated);

    const list = $('picksList');
    list.replaceChildren();
    data.top.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = capitalize(name);
      list.appendChild(li);
    });
  } catch (error) {
    $('needsUpdated').textContent = error.message;
  }
}

async function loadForecast() {
  try {
    const data = await api('/api/forecast');
    if (!data.food) {
      return;
    }
    $('forecastText').textContent =
      `Without further donations, we run short of ${data.food} from ${formatShort(data.run_out)}. ` +
      `About ${money(data.extra_vnd)} VND more is needed to last through ${data.month}.`;
  } catch (error) {
    $('forecastText').textContent = error.message;
  }
}

const amountInput = $('amount');
const financialMsg = $('financialMsg');

function readAmount() {
  return parseInt(amountInput.value.replace(/\D/g, ''), 10) || 0;
}

function selectedGroup() {
  return document.querySelector('input[name="group"]:checked').value;
}

function describeItem(item) {
  if (item.unit === 'pcs' || item.unit === 'cartons') {
    return `${Math.round(item.qty).toLocaleString('vi-VN')} ${item.unit} of ${item.name}`;
  }
  return `${number(item.qty)} ${item.unit} ${item.name}`;
}

function renderEstimate(estimate) {
  $('estimateHead').textContent = `With ${money(estimate.amount)} VND, you provide:`;
  
  const listItems = estimate.items.map(item => `• ${describeItem(item)}`).join('<br>');
  $('estimateItems').innerHTML = listItems;

  $('estimateDays').textContent = `Enough for the whole ${estimate.group_name} (${estimate.children} children) for ${number(estimate.days)} days`;
}

amountInput.addEventListener('input', () => {
  const digits = amountInput.value.replace(/\D/g, '');
  amountInput.value = digits ? Number(digits).toLocaleString('vi-VN') : '';
});

financialPanel.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(financialMsg, 'Calculating...');
  const amount = readAmount();
  if (!amount) {
    setMessage(financialMsg, 'Please enter an amount in VND.', true);
    return;
  }
  try {
    const data = await api(`/api/estimate?amount=${amount}&group=${selectedGroup()}`);
    renderEstimate(data);
    setMessage(financialMsg, '');
  } catch (error) {
    setMessage(financialMsg, error.message, true);
  }
});


// ==========================================
// ĐOẠN XỬ LÝ 2 POPUP VÀ GỌI API GỬI EMAIL
// ==========================================

const donationModal = $('donationModal');
const modalClose = $('modalClose');
const modalConfirmBtn = $('modalConfirmBtn');
const modalQr = $('modalQr');
const modalEmail = $('modalEmail');
const modalDesc = $('modalDesc');

const successModal = $('successModal');
const successClose = $('successClose');

let currentAction = null; 

// Mở Popup Xác nhận (Có QR)
function openModal(type) {
  currentAction = type;
  donationModal.hidden = false;
  modalEmail.value = ''; 
  
  if (type === 'financial') {
    modalQr.hidden = false;
    modalDesc.textContent = "Please scan the QR code to transfer. Enter your email below to confirm.";
  } else {
    modalQr.hidden = true;
    modalDesc.textContent = "Please enter your email below to confirm your supplies donation.";
    modalEmail.value = $('sEmail').value; 
  }
}

// Nút X tắt Popup Xác nhận
modalClose.addEventListener('click', () => {
  donationModal.hidden = true;
});

// Nút X tắt Popup Cảm ơn
successClose.addEventListener('click', () => {
  successModal.hidden = true;
});

// Nút Donate This Amount
$('donateBtn').addEventListener('click', () => {
  setMessage(financialMsg, '');
  const amount = readAmount();
  if (!amount) {
    setMessage(financialMsg, 'Please enter an amount in VND.', true);
    return;
  }
  openModal('financial');
});

// Nút Register a Supplies
const supplyForm = $('supplyForm');
const supplyMsg = $('supplyMsg');

supplyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  setMessage(supplyMsg, '');
  openModal('supplies'); 
});

// Xử lý GỬI MAIL qua API khi bấm Confirm
modalConfirmBtn.addEventListener('click', async () => {
  const email = modalEmail.value.trim() || 'Anonymous';
  
  // Tạo dữ liệu để gửi lên backend
  const payload = {
    type: currentAction,
    email: email
  };

  if (currentAction === 'financial') {
    payload.amount = $('amount').value;
    let estimateHtml = $('estimateItems').innerHTML;
    // Chuyển <br> thành dấu xuống dòng cho mail text
    payload.estimateText = estimateHtml.replace(/<br\s*[\/]?>/gi, '\n'); 
  } else {
    payload.items = $('sItems').value;
    payload.details = $('sDetails').value;
  }

  // Khóa nút để tránh bấm 2 lần
  modalConfirmBtn.textContent = "Sending...";
  modalConfirmBtn.disabled = true;

  try {
    // Gọi API Node.js
    await postJson('/api/send-email', payload);
    
    // Tắt hoàn toàn Popup nhập email và mã QR
    donationModal.hidden = true;
    
    // Hiện Popup Cảm Ơn
    successModal.hidden = false;
    
    // Tự động đóng TẤT CẢ (ẩn popup cảm ơn) sau đúng 3 giây
    setTimeout(() => {
      successModal.hidden = true;
    }, 3000);
    
    if (currentAction === 'supplies') {
      supplyForm.reset();
    }
  } catch (error) {
    alert("Could not send confirmation. Please try again.");
  } finally {
    modalConfirmBtn.textContent = "Confirm";
    modalConfirmBtn.disabled = false;
  }
});

loadStock();
loadNeeds();
loadForecast();