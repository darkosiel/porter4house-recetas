// Cambia esta contraseña por la que quiera usar Porter
const ADMIN_PASSWORD = 'PORTER2026';
const BASE_URL = window.location.origin + window.location.pathname.replace('admin.html', '');

document.getElementById('loginBtn').addEventListener('click', checkLogin);
document.getElementById('passwordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});

function checkLogin() {
  if (document.getElementById('passwordInput').value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    showPanel();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function showPanel() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  loadMeses();
  loadCodigos();
}

if (sessionStorage.getItem('admin_auth') === '1') showPanel();

async function loadMeses() {
  const res = await fetch('data/meses.json');
  const data = await res.json();
  const select = document.getElementById('mesSelect');
  select.textContent = '';
  data.meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    select.appendChild(opt);
  });
}

function generarCodigoAleatorio(mesId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return random + '-' + mesId.substring(0, 3).toUpperCase() + '-' + new Date().getFullYear();
}

document.getElementById('btnGenerar').addEventListener('click', async () => {
  const mesId = document.getElementById('mesSelect').value;
  const codigo = generarCodigoAleatorio(mesId);

  const { error } = await db
    .from('codigos')
    .insert({ codigo, mes: mesId, usado: false });

  if (error) {
    alert('Error al generar el código: ' + error.message);
    return;
  }

  const link = BASE_URL + '?code=' + codigo;
  document.getElementById('generatedLink').textContent = link;
  document.getElementById('generatedBox').classList.remove('hidden');
  loadCodigos();
});

document.getElementById('btnCopiar').addEventListener('click', () => {
  const link = document.getElementById('generatedLink').textContent;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('btnCopiar');
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  });
});

async function loadCodigos() {
  const { data, error } = await db
    .from('codigos')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('tableContainer');
  container.textContent = '';

  if (error || !data || data.length === 0) {
    const p = document.createElement('p');
    p.style.color = 'var(--color-text-muted)';
    p.textContent = 'Aún no hay códigos generados.';
    container.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  table.className = 'codigos-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Mes', 'Código', 'Estado', 'Fecha', 'Acción'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');

    const tdMes = document.createElement('td');
    tdMes.textContent = row.mes;
    tr.appendChild(tdMes);

    const tdCodigo = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = row.codigo;
    tdCodigo.appendChild(code);
    tr.appendChild(tdCodigo);

    const tdEstado = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge ' + (row.usado ? 'badge-usado' : 'badge-pendiente');
    badge.textContent = row.usado ? 'Usado' : 'Pendiente';
    tdEstado.appendChild(badge);
    tr.appendChild(tdEstado);

    const tdFecha = document.createElement('td');
    tdFecha.textContent = new Date(row.created_at).toLocaleDateString('es-ES');
    tr.appendChild(tdFecha);

    const tdAccion = document.createElement('td');
    if (!row.usado) {
      const btnCopy = document.createElement('button');
      btnCopy.className = 'btn btn-secondary';
      btnCopy.style.cssText = 'font-size:0.8rem;padding:0.4rem 0.75rem';
      btnCopy.textContent = 'Copiar link';
      btnCopy.addEventListener('click', () => {
        const link = BASE_URL + '?code=' + row.codigo;
        navigator.clipboard.writeText(link).then(() => {
          btnCopy.textContent = '✓ Copiado';
          setTimeout(() => { btnCopy.textContent = 'Copiar link'; }, 2000);
        });
      });
      tdAccion.appendChild(btnCopy);
    } else {
      tdAccion.textContent = '—';
    }
    tr.appendChild(tdAccion);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
