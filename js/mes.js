const mesId = sessionStorage.getItem('porter_mes');
if (!mesId) window.location.href = 'index.html';

let mesDatos = null;

function formatRecipeName(filename) {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/^\d+\s+/, '')
    .replace(/\s*nº\d+/gi, '')
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

function drivePreviewUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/preview';
}

function driveDownloadUrl(fileId) {
  return 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media&key=' + GOOGLE_API_KEY;
}

let currentFile = null;

function openModal(fileName, fileId) {
  currentFile = { name: fileName, id: fileId };
  document.getElementById('modalTitle').textContent = formatRecipeName(fileName);
  document.getElementById('pdfFrame').src = drivePreviewUrl(fileId);
  const btnDescargar = document.getElementById('btnDescargarPdf');
  btnDescargar.textContent = '⬇️ Descargar';
  btnDescargar.disabled = false;
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

async function descargarPdfActual() {
  if (!currentFile) return;
  const btn = document.getElementById('btnDescargarPdf');
  btn.textContent = 'Descargando...';
  btn.disabled = true;

  try {
    const res = await fetch(driveDownloadUrl(currentFile.id));
    if (!res.ok) throw new Error('Error al descargar');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('No se pudo descargar el archivo. Inténtalo de nuevo.');
  }

  btn.textContent = '⬇️ Descargar';
  btn.disabled = false;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('pdfFrame').src = '';
  document.body.style.overflow = '';
}

document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnDescargarPdf').addEventListener('click', descargarPdfActual);
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

function renderGrid(files) {
  const grid = document.getElementById('recipeGrid');
  grid.textContent = '';

  if (!files.length) {
    const p = document.createElement('p');
    p.className = 'loading-grid';
    p.textContent = 'No se encontraron recetas para este mes.';
    grid.appendChild(p);
    return;
  }

  files.forEach(function(file) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = '🍽️';

    const title = document.createElement('h3');
    title.textContent = formatRecipeName(file.name);

    const link = document.createElement('span');
    link.className = 'open-link';
    link.textContent = 'Ver receta →';

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(link);
    card.addEventListener('click', function() { openModal(file.name, file.id); });
    grid.appendChild(card);
  });
}

async function fetchDriveFiles(folderId) {
  const query = encodeURIComponent("'" + folderId + "' in parents and trashed=false");
  const url = 'https://www.googleapis.com/drive/v3/files'
    + '?q=' + query
    + '&key=' + GOOGLE_API_KEY
    + '&fields=files(id,name,mimeType)'
    + '&orderBy=name'
    + '&pageSize=100';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar archivos de Drive: ' + res.status);
  const data = await res.json();
  const all = data.files || [];

  return {
    pdfs: all.filter(f => f.mimeType === 'application/pdf'),
    zip: all.find(f => f.name.endsWith('.zip')) || null
  };
}

async function downloadZip(files, zipFile) {
  const btn = document.getElementById('btnZip');
  btn.disabled = true;

  // Si hay un ZIP pre-preparado en Drive, descárgalo directamente
  if (zipFile) {
    btn.textContent = 'Descargando ZIP...';
    try {
      const res = await fetch(driveDownloadUrl(zipFile.id));
      if (!res.ok) throw new Error('Error al descargar ZIP');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      btn.textContent = '⬇️ Descargar todo el mes (ZIP)';
      btn.disabled = false;
      return;
    } catch (err) {
      console.warn('Fallo descarga ZIP directo, generando en cliente...', err);
    }
  }

  // Fallback: generar ZIP en el navegador
  btn.textContent = 'Preparando ZIP...';
  const zip = new JSZip();
  const folder = zip.folder(mesDatos.nombre);

  for (const file of files) {
    try {
      const res = await fetch(driveDownloadUrl(file.id));
      if (!res.ok) throw new Error('No se pudo descargar: ' + file.name);
      const blob = await res.blob();
      folder.file(file.name, blob);
    } catch (err) {
      console.warn(err.message);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'porter4house-' + mesId + '.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  btn.textContent = '⬇️ Descargar todo el mes (ZIP)';
  btn.disabled = false;
}

async function init() {
  const res = await fetch('data/meses.json');
  const data = await res.json();
  const mes = data.meses.find(m => m.id === mesId);

  if (!mes) {
    document.getElementById('mesTitle').textContent = 'Mes no encontrado';
    return;
  }

  mesDatos = mes;
  document.title = 'Porter4House — ' + mes.nombre;
  document.getElementById('mesTitle').textContent = mes.nombre;

  const { pdfs, zip } = await fetchDriveFiles(mes.folderId);
  renderGrid(pdfs);

  document.getElementById('btnZip').addEventListener('click', () => downloadZip(pdfs, zip));
}

init();
