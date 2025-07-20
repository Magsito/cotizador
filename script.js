// Inicializar Supabase
const supabaseClient = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
);

// Alternar entre modo normal y con metraje
function alternarModoMetraje() {
  document.querySelector("#itemsTable tbody").innerHTML = "";
  updateTableHeader();
}

// Actualizar encabezado de la tabla según el modo
function updateTableHeader() {
  const modoMetraje = document.getElementById("modoMetraje")?.checked;
  const thead = document.querySelector("#itemsTable thead tr");

  if (modoMetraje) {
    thead.innerHTML = `
      <th>#</th>
      <th>Descripción</th>
      <th>Largo</th>
      <th>Alto</th>
      <th>m²</th>
      <th>Precio x m²</th>
      <th>Total</th>
      <th></th>
    `;
  } else {
    thead.innerHTML = `
      <th>#</th>
      <th>Descripción</th>
      <th>Cantidad</th>
      <th>Precio Unitario</th>
      <th>Total</th>
      <th></th>
    `;
  }
}

// Agregar ítem
function addItem() {
  const tbody = document.querySelector("#itemsTable tbody");
  const row = document.createElement("tr");
  const index = tbody.rows.length + 1;
  const modoMetraje = document.getElementById("modoMetraje")?.checked;

  if (modoMetraje) {
    row.innerHTML = `
      <td>${index}</td>
      <td><input class="desc" type="text"></td>
      <td><input class="largo" type="number" value="0" step="0.01"></td>
      <td><input class="alto" type="number" value="0" step="0.01"></td>
      <td><span class="area">0.00</span></td>
      <td><input class="precioM2" type="number" value="0.00"></td>
      <td class="itemTotal">0.00</td>
      <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
    `;
  } else {
    row.innerHTML = `
      <td>${index}</td>
      <td><input class="desc" type="text"></td>
      <td><input class="qty" type="number" value="1"></td>
      <td><input class="unit" type="number" value="0.00"></td>
      <td class="itemTotal">0.00</td>
      <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
    `;
  }

  tbody.appendChild(row);
  row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateTotals));
  updateTotals();
}

// Calcular totales
function updateTotals() {
  let subtotal = 0;
  const modoMetraje = document.getElementById("modoMetraje")?.checked;

  document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
    let total = 0;

    if (modoMetraje) {
      const largo = parseFloat(row.querySelector(".largo")?.value) || 0;
      const alto = parseFloat(row.querySelector(".alto")?.value) || 0;
      const area = largo * alto;
      const precioM2 = parseFloat(row.querySelector(".precioM2")?.value) || 0;
      total = area * precioM2;

      const areaSpan = row.querySelector(".area");
      if (areaSpan) areaSpan.textContent = area.toFixed(2);
    } else {
      const qty = parseFloat(row.querySelector(".qty")?.value) || 0;
      const unit = parseFloat(row.querySelector(".unit")?.value) || 0;
      total = qty * unit;
    }

    const totalCell = row.querySelector(".itemTotal");
    if (totalCell) totalCell.textContent = total.toFixed(2);
    subtotal += total;
  });

  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  document.getElementById("subtotal").textContent = subtotal.toFixed(2);
  document.getElementById("igv").textContent = igv.toFixed(2);
  document.getElementById("total").textContent = total.toFixed(2);
}

// Exportar funciones globales
window.addItem = addItem;
window.updateTotals = updateTotals;
window.alternarModoMetraje = alternarModoMetraje;
