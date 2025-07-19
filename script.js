// Inicializar Supabase
const supabaseClient = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
);

// Función para agregar ítems
function addItem() {
  const tbody = document.querySelector("#itemsTable tbody");
  const row = document.createElement("tr");

  const index = tbody.rows.length + 1;
  row.innerHTML = `
    <td>${index}</td>
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

// Función para calcular totales
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

// Función para guardar cotización en Supabase
async function guardarCotizacion() {
  const quoteNumber = document.getElementById("quoteNumber").value;
  const date = document.getElementById("quoteDate").value || new Date().toISOString();
  const subtotal = parseFloat(document.getElementById("subtotal").textContent);
  const igv = parseFloat(document.getElementById("igv").textContent);
  const total = parseFloat(document.getElementById("total").textContent);

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
    const desc = row.querySelector(".desc").value;
    const qty = parseInt(row.querySelector(".qty").value);
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

  const { error: itemError } = await supabaseClient.from('quote_items').insert(items);
  if (itemError) {
    alert("Error al guardar ítems: " + itemError.message);
    return;
  }

  alert("Cotización guardada con éxito ✅");
  document.getElementById("downloadBtn").style.display = "inline";
  cargarCotizaciones(); // para actualizar la tabla debajo
}

// NUEVO: listar cotizaciones
async function cargarCotizaciones() {
  const { data, error } = await supabaseClient
    .from('quotes')
    .select('*')
    .order('quote_number', { ascending: false });

  if (error) {
    alert("Error al cargar cotizaciones");
    return;
  }

  const tbody = document.querySelector("#listaCotizaciones tbody");
  tbody.innerHTML = "";

  data.forEach(q => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${q.quote_number}</td>
      <td>${q.date.split('T')[0]}</td>
      <td>${q.total.toFixed(2)}</td>
      <td><button onclick="verDetalle('${q.id}')">🔍</button></td>
    `;
    tbody.appendChild(row);
  });
}

// NUEVO: ver detalle de cotización
async function verDetalle(quoteId) {
  const { data: quote, error: err1 } = await supabaseClient
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  const { data: items, error: err2 } = await supabaseClient
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId);

  if (err1 || err2) {
    alert("Error al cargar el detalle");
    return;
  }

  const container = document.getElementById("detalleCotizacion");
  container.innerHTML = `
    <h3>Detalle de Cotización</h3>
    <p><strong>N°:</strong> ${quote.quote_number}</p>
    <p><strong>Fecha:</strong> ${quote.date.split('T')[0]}</p>
    <p><strong>Subtotal:</strong> ${quote.subtotal.toFixed(2)}</p>
    <p><strong>IGV:</strong> ${quote.igv.toFixed(2)}</p>
    <p><strong>Total:</strong> ${quote.total.toFixed(2)}</p>
    <table border="1">
      <thead>
        <tr>
          <th>#</th><th>Descripción</th><th>Cantidad</th><th>Unitario</th><th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.item_number}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unit_price}</td>
            <td>${item.total}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// NUEVO: exportar como PDF (básico)
function generarPDF() {
  window.print();
}

// Cargar cotizaciones al cargar página
window.addEventListener("DOMContentLoaded", cargarCotizaciones);

// Exportar funciones para que HTML pueda llamarlas
window.addItem = addItem;
window.updateTotals = updateTotals;
window.guardarCotizacion = guardarCotizacion;
window.verDetalle = verDetalle;
window.generarPDF = generarPDF;
