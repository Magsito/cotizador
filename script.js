// Supabase config
const supabaseClient = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
);

// Agregar ítem, actualizar totales, guardar cotización
// (ya tienes estas funciones)

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

// NUEVO: ver detalle de una cotización
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

// NUEVO: generar PDF (versión básica)
function generarPDF() {
  window.print(); // opción rápida para exportar visualmente como PDF
}

// Ejecutar carga inicial
window.addEventListener("DOMContentLoaded", cargarCotizaciones);

// Exportar funciones globales
window.addItem = addItem;
window.guardarCotizacion = guardarCotizacion;
window.verDetalle = verDetalle;
window.generarPDF = generarPDF;
