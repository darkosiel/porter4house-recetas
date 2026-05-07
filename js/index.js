const input = document.getElementById('codigoInput');
const btn = document.getElementById('accederBtn');
const msgError = document.getElementById('msgError');
const msgLoading = document.getElementById('msgLoading');

function showError(msg) {
  msgError.textContent = msg;
  msgError.classList.remove('hidden');
  msgLoading.classList.add('hidden');
  btn.disabled = false;
}

function showLoading() {
  msgError.classList.add('hidden');
  msgLoading.classList.remove('hidden');
  btn.disabled = true;
}

async function validarCodigo() {
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) {
    showError('Introduce un código de acceso.');
    return;
  }

  showLoading();

  // Marcar como usado atómicamente — solo funciona si usado = false
  const { data, error } = await db
    .from('codigos')
    .update({ usado: true })
    .eq('codigo', codigo)
    .eq('usado', false)
    .select('mes')
    .single();

  if (error || !data) {
    const { data: existe } = await db
      .from('codigos')
      .select('usado')
      .eq('codigo', codigo)
      .single();

    if (existe && existe.usado) {
      showError('Este código ya ha sido utilizado. Contacta con Porter para obtener uno nuevo.');
    } else {
      showError('Código no válido. Comprueba que lo has escrito correctamente.');
    }
    return;
  }

  sessionStorage.setItem('porter_mes', data.mes);
  window.location.href = 'mes.html';
}

btn.addEventListener('click', validarCodigo);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') validarCodigo(); });

// Si viene ?code= en la URL, rellenar y validar automáticamente
const codeParam = new URLSearchParams(window.location.search).get('code');
if (codeParam) {
  input.value = codeParam.toUpperCase();
  validarCodigo();
}
