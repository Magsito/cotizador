const supabaseClient = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
);

let ultimoIdCargado = null;

function addItem() {
  const tbody = document.querySelector("#itemsTable tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input class="desc" type="text"></td>
    <td><input class="qty" type="number" value="1"></td>
    <td><input class="unit" type="number" value="0.00"></td>
    <td class="itemTotal">0.00</td>
    <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
  `;
  tbody.appendChild(row);
  row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateTotals));
  updateTotals();
}

function updateTotals() {
  let subtotal = 0;
  document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
    const qty = parseFloat(row.querySelector(".qty").value) || 0;
    const unit = parseFloat(row.querySelector(".unit").value) || 0;
    const total = qty * unit;
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
  const date = document.getElementById("quoteDate").value;
  const subtotal = parseFloat(document.getElementById("subtotal").textContent);
  const igv = parseFloat(document.getElementById("igv").textContent);
  const total = parseFloat(document.getElementById("total").textContent);

  const { data: quote, error } = await supabaseClient
    .from('quotes')
    .insert([{ quote_number: quoteNumber, date, subtotal, igv, total }])
    .select()
    .single();

  if (error) return alert("Error: " + error.message);

  const quoteId = quote.id;
  ultimoIdCargado = quoteId;

  const items = [];
  document.querySelectorAll("#itemsTable tbody tr").forEach((row, i) => {
    const desc = row.querySelector(".desc").value;
    const qty = parseFloat(row.querySelector(".qty").value);
    const unit = parseFloat(row.querySelector(".unit").value);
    const total = qty * unit;
    items.push({
      quote_id: quoteId,
      item_number: i + 1,
      description: desc,
      quantity: qty,
      unit_price: unit,
      total: total
    });
  });

  await supabaseClient.from('quote_items').insert(items);
  cargarCotizaciones();
}

async function cargarCotizaciones() {
  const { data, error } = await supabaseClient.from('quotes').select('*').order('quote_number');
  const tbody = document.querySelector("#listaCotizaciones tbody");
  tbody.innerHTML = "";
  if (error) return console.error(error);

  data.forEach(c => {
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
  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="desc" value="${item.description}"></td>
      <td><input class="qty" type="number" value="${item.quantity}"></td>
      <td><input class="unit" type="number" value="${item.unit_price}"></td>
      <td class="itemTotal">${item.total.toFixed(2)}</td>
      <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
  updateTotals();
}

async function generarPDFDesdeId(id) {
  const { data: quote } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
  const { data: items } = await supabaseClient.from('quote_items').select('*').eq('quote_id', id);

  const content = document.createElement("div");
  content.innerHTML = `
    <h2>Cotización #${quote.quote_number}</h2>
    <p>Fecha: ${new Date(quote.date).toLocaleDateString()}</p>
    <table border="1" cellpadding="4" cellspacing="0">
      <thead><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Precio Unitario</th><th>Total</th></tr></thead>
      <tbody>
        ${items.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unit_price}</td>
            <td>${item.total}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <p>Subtotal: ${quote.subtotal}</p>
    <p>IGV: ${quote.igv}</p>
    <p><strong>Total: ${quote.total}</strong></p>
  `;
  html2pdf().from(content).save(`Cotizacion-${quote.quote_number}.pdf`);
}

async function eliminarCotizacion(id) {
  if (!confirm("¿Eliminar esta cotización?")) return;
  await supabaseClient.from('quote_items').delete().eq('quote_id', id);
  await supabaseClient.from('quotes').delete().eq('id', id);
  cargarCotizaciones();
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  if (ultimoIdCargado) {
    generarPDFDesdeId(ultimoIdCargado);
  } else {
    alert("Primero selecciona una cotización para descargar.");
  }
});

document.addEventListener("DOMContentLoaded", cargarCotizaciones);
