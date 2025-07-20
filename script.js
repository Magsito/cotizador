const supabaseClient = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
);

let ultimoIdCargado = null;

function alternarModoMetraje() {
  document.querySelector("#itemsTable tbody").innerHTML = "";
  updateTableHeader();
}

function updateTableHeader() {
  const modoMetraje = document.getElementById("modoMetraje").checked;
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
      <th></th>`;
  } else {
    thead.innerHTML = `
      <th>#</th>
      <th>Descripción</th>
      <th>Cantidad</th>
      <th>Precio Unitario</th>
      <th>Total</th>
      <th></th>`;
  }
}

function addItem() {
  const tbody = document.querySelector("#itemsTable tbody");
  const index = tbody.rows.length + 1;
  const modoMetraje = document.getElementById("modoMetraje").checked;

  const row = document.createElement("tr");
  row.innerHTML = modoMetraje
    ? `<td>${index}</td>
       <td><input class="desc" type="text"></td>
       <td><input class="largo" type="number" value="0" step="0.01"></td>
       <td><input class="alto" type="number" value="0" step="0.01"></td>
       <td><span class="area">0.00</span></td>
       <td><input class="precioM2" type="number" value="0.00"></td>
       <td class="itemTotal">0.00</td>
       <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>`
    : `<td>${index}</td>
       <td><input class="desc" type="text"></td>
       <td><input class="qty" type="number" value="1"></td>
       <td><input class="unit" type="number" value="0.00"></td>
       <td class="itemTotal">0.00</td>
       <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>`;

  tbody.appendChild(row);
  row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateTotals));
  updateTotals();
}

function updateTotals() {
  let subtotal = 0;
  const modoMetraje = document.getElementById("modoMetraje").checked;

  document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
    let total = 0;

    if (modoMetraje) {
      const largo = parseFloat(row.querySelector(".largo")?.value) || 0;
      const alto = parseFloat(row.querySelector(".alto")?.value) || 0;
      const area = largo * alto;
      const precioM2 = parseFloat(row.querySelector(".precioM2")?.value) || 0;
      total = area * precioM2;
      row.querySelector(".area").textContent = area.toFixed(2);
    } else {
      const qty = parseFloat(row.querySelector(".qty")?.value) || 0;
      const unit = parseFloat(row.querySelector(".unit")?.value) || 0;
      total = qty * unit;
    }

    row.querySelector(".itemTotal").textContent = total.toFixed(2);
    subtotal += total;
  });

  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  document.getElementById("subtotal").textContent = subtotal.toFixed(2);
  document.getElementById("igv").textContent = igv.toFixed(2);
  document.getElementById("total").textContent = total.toFixed(2);
}

async function guardarCotizacion() {
  const quoteNumber = document.getElementById("quoteNumber").value;
  const date = document.getElementById("quoteDate").value || new Date().toISOString();
  const subtotal = parseFloat(document.getElementById("subtotal").textContent);
  const igv = parseFloat(document.getElementById("igv").textContent);
  const total = parseFloat(document.getElementById("total").textContent);
  const modoMetraje = document.getElementById("modoMetraje").checked;

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
        total
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
        total
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
  ultimoIdCargado = quoteId;
  cargarCotizaciones();
}

async function cargarCotizaciones() {
  const { data: cotizaciones, error } = await supabaseClient
    .from('quotes')
    .select('*')
    .order('quote_number', { ascending: true });

  const tbody = document.querySelector("#cotizacionesGuardadas tbody");
  tbody.innerHTML = "";

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
  ultimoIdCargado = id;
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

  const pdfContainer = document.getElementById("pdfContainer");
  pdfContainer.innerHTML = `
    <h1>Cotización #${quote.quote_number}</h1>
    <p>Fecha: ${new Date(quote.date).toLocaleDateString()}</p>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Precio Unitario</th><th>Total</th></tr>
      ${items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${item.unit_price}</td>
          <td>${item.total}</td>
        </tr>`).join("")}
    </table>
    <p>Subtotal: ${quote.subtotal}</p>
    <p>IGV: ${quote.igv}</p>
    <p><strong>Total: ${quote.total}</strong></p>`;

  html2pdf().from(pdfContainer).save(`Cotizacion_${quote.quote_number}.pdf`);
}

async function eliminarCotizacion(id) {
  if (!confirm("¿Seguro que deseas eliminar esta cotización?")) return;
  await supabaseClient.from('quote_items').delete().eq('quote_id', id);
  await supabaseClient.from('quotes').delete().eq('id', id);
  cargarCotizaciones();
}

// Evento para el botón de descarga principal
document.addEventListener("DOMContentLoaded", () => {
  cargarCotizaciones();
  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (ultimoIdCargado !== null) {
      generarPDFDesdeId(ultimoIdCargado);
    } else {
      alert("Primero visualiza una cotización guardada.");
    }
  });
});
