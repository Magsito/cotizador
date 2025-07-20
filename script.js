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

// Guardar cotización (adaptada para modo normal y metraje)
async function guardarCotizacion() {
  const quoteNumber = document.getElementById("quoteNumber").value;
  const date = document.getElementById("quoteDate").value || new Date().toISOString();
  const subtotal = parseFloat(document.getElementById("subtotal").textContent);
  const igv = parseFloat(document.getElementById("igv").textContent);
  const total = parseFloat(document.getElementById("total").textContent);
  const modoMetraje = document.getElementById("modoMetraje")?.checked;

  const { data: quote, error } = await supabaseClient
    .from('quotes')
    .insert([{ quote_number: quoteNumber, date, subtotal, igv, total }])
    .select()
    .single();

  if (error) {
    alert("Error al guardar cotización: " + error.message);
    return;
  }

  const quoteId = quote.id;
  const items = [];

  document.querySelectorAll("#itemsTable tbody tr").forEach((row, i) => {
    const desc = row.querySelector(".desc")?.value || "";
    if (modoMetraje) {
      const largo = parseFloat(row.querySelector(".largo")?.value) || 0;
      const alto = parseFloat(row.querySelector(".alto")?.value) || 0;
      const area = largo * alto;
      const precioM2 = parseFloat(row.querySelector(".precioM2")?.value) || 0;
      const total = area * precioM2;

      items.push({
        quote_id: quoteId,
        item_number: i + 1,
        description: desc + ` (${largo}m x ${alto}m)`,
        quantity: area,
        unit_price: precioM2,
        total: total
      });
    } else {
      const qty = parseFloat(row.querySelector(".qty")?.value) || 0;
      const unit = parseFloat(row.querySelector(".unit")?.value) || 0;
      const total = qty * unit;

      items.push({
        quote_id: quoteId,
        item_number: i + 1,
        description: desc,
        quantity: qty,
        unit_price: unit,
        total: total
      });
    }
  });

  const { error: itemError } = await supabaseClient.from('quote_items').insert(items);
  if (itemError) {
    alert("Error al guardar ítems: " + itemError.message);
    return;
  }

  alert("Cotización guardada con éxito ✅");
  document.getElementById("downloadBtn").style.display = "inline";
  cargarCotizaciones();
}

async function cargarCotizaciones() {
  const { data: cotizaciones, error } = await supabaseClient
    .from('quotes')
    .select('*')
    .order('quote_number', { ascending: true });

  const tbody = document.querySelector("#cotizacionesGuardadas");
  tbody.innerHTML = "";

  if (error) {
    console.error("Error al cargar cotizaciones:", error);
    return;
  }

  cotizaciones.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.quote_number}</td>
      <td>${new Date(c.date).toLocaleDateString()}</td>
      <td>${c.total.toFixed(2)}</td>
      <td><button onclick="verDetalle(${c.id})">👁️</button></td>
      <td><button onclick="generarPDFDesdeId(${c.id})">📄</button></td>
      <td><button onclick="eliminarCotizacion(${c.id})">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function verDetalle(id) {
  const { data: quote } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
  const { data: items } = await supabaseClient.from('quote_items').select('*').eq('quote_id', id);

  document.getElementById("quoteNumber").value = quote.quote_number;
  document.getElementById("quoteDate").value = quote.date.split("T")[0];
  document.getElementById("modoMetraje").checked = false;
  alternarModoMetraje();

  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";

  items.forEach((item, i) => {
    addItem();
    const row = tbody.rows[i];
    row.querySelector(".desc").value = item.description;
    row.querySelector(".qty").value = item.quantity;
    row.querySelector(".unit").value = item.unit_price;
  });

  updateTotals();
}

async function generarPDFDesdeId(id) {
  const { data: quote } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
  const { data: items } = await supabaseClient.from('quote_items').select('*').eq('quote_id', id);

  const win = window.open('', '_blank');
  win.document.write('<html><head><title>Cotización</title></head><body>');
  win.document.write(`<h1>Cotización #${quote.quote_number}</h1>`);
  win.document.write(`<p>Fecha: ${new Date(quote.date).toLocaleDateString()}</p>`);
  win.document.write('<table border="1" cellpadding="5" cellspacing="0"><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Precio Unitario</th><th>Total</th></tr>');

  items.forEach((item, i) => {
    win.document.write(`<tr><td>${i + 1}</td><td>${item.description}</td><td>${item.quantity}</td><td>${item.unit_price}</td><td>${item.total}</td></tr>`);
  });

  win.document.write('</table>');
  win.document.write(`<p>Subtotal: ${quote.subtotal}</p>`);
  win.document.write(`<p>IGV: ${quote.igv}</p>`);
  win.document.write(`<p><strong>Total: ${quote.total}</strong></p>`);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
}

async function eliminarCotizacion(id) {
  if (!confirm("¿Seguro que deseas eliminar esta cotización?")) return;

  await supabaseClient.from('quote_items').delete().eq('quote_id', id);
  await supabaseClient.from('quotes').delete().eq('id', id);

  cargarCotizaciones();
}

// Exportar funciones globales
window.addItem = addItem;
window.updateTotals = updateTotals;
window.alternarModoMetraje = alternarModoMetraje;
window.guardarCotizacion = guardarCotizacion;

// Agregar funciones faltantes
window.cargarCotizaciones = cargarCotizaciones;
window.verDetalle = verDetalle;
window.generarPDF = generarPDF;
window.generarPDFDesdeId = generarPDFDesdeId;
window.eliminarCotizacion = eliminarCotizacion;
