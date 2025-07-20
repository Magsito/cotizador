document.addEventListener("DOMContentLoaded", () => {
  const supabaseClient = supabase.createClient(
    'https://kgwzjrpgmhjfaxvndfjm.supabase.co',
    'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'
  );

  let ultimoIdCargado = null;

  const modoCheckbox = document.getElementById("modoMetraje");
  const downloadBtn = document.getElementById("downloadBtn");
  const addItemBtn = document.getElementById("addItemBtn");
  const guardarBtn = document.getElementById("guardarBtn");

  modoCheckbox.addEventListener("change", alternarModoMetraje);
  addItemBtn.addEventListener("click", addItem);
  guardarBtn.addEventListener("click", guardarCotizacion);
  downloadBtn.addEventListener("click", () => {
    if (ultimoIdCargado !== null) {
      generarPDFDesdeId(ultimoIdCargado);
    } else {
      alert("Primero visualiza una cotización guardada.");
    }
  });

  function alternarModoMetraje() {
    document.querySelector("#itemsTable tbody").innerHTML = "";
    updateTableHeader();
  }

  function updateTableHeader() {
    const modoMetraje = modoCheckbox.checked;
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

  function addItem() {
    const tbody = document.querySelector("#itemsTable tbody");
    const row = document.createElement("tr");
    const index = tbody.rows.length + 1;
    const modoMetraje = modoCheckbox.checked;

    if (modoMetraje) {
      row.innerHTML = `
        <td>${index}</td>
        <td><input class="desc" type="text"></td>
        <td><input class="largo" type="number" step="0.01"></td>
        <td><input class="alto" type="number" step="0.01"></td>
        <td><span class="area">0.00</span></td>
        <td><input class="precioM2" type="number" step="0.01"></td>
        <td class="itemTotal">0.00</td>
        <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
      `;
    } else {
      row.innerHTML = `
        <td>${index}</td>
        <td><input class="desc" type="text"></td>
        <td><input class="qty" type="number" value="1"></td>
        <td><input class="unit" type="number" step="0.01"></td>
        <td class="itemTotal">0.00</td>
        <td><button onclick="this.closest('tr').remove(); updateTotals();">🗑️</button></td>
      `;
    }

    tbody.appendChild(row);
    row.querySelectorAll("input").forEach(i => i.addEventListener("input", updateTotals));
    updateTotals();
  }

  function updateTotals() {
    let subtotal = 0;
    const modoMetraje = modoCheckbox.checked;

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
    const modoMetraje = modoCheckbox.checked;

    const { data: quote, error } = await supabaseClient
      .from('quotes')
      .insert([{ quote_number: quoteNumber, date, subtotal, igv, total }])
      .select()
      .single();

    if (error) return alert("Error: " + error.message);

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
          description: `${desc} (${largo}x${alto})`,
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

    await supabaseClient.from('quote_items').insert(items);
    alert("Cotización guardada ✅");
    downloadBtn.style.display = "inline";
    cargarCotizaciones();
  }

  async function cargarCotizaciones() {
    const { data, error } = await supabaseClient
      .from('quotes')
      .select('*')
      .order('quote_number', { ascending: true });

    const tbody = document.querySelector("#cotizacionesGuardadas tbody");
    tbody.innerHTML = "";

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

  window.verDetalle = async function (id) {
    ultimoIdCargado = id;
    const { data: quote } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
    const { data: items } = await supabaseClient.from('quote_items').select('*').eq('quote_id', id);

    document.getElementById("quoteNumber").value = quote.quote_number;
    document.getElementById("quoteDate").value = quote.date.split("T")[0];
    modoCheckbox.checked = false;
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
  };

  window.generarPDFDesdeId = async function (id) {
    const { data: quote } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
    const { data: items } = await supabaseClient.from('quote_items').select('*').eq('quote_id', id);

    const win = window.open('', '_blank');
    win.document.write('<html><head><title>Cotización</title></head><body>');
    win.document.write(`<h1>Cotización #${quote.quote_number}</h1>`);
    win.document.write(`<p>Fecha: ${new Date(quote.date).toLocaleDateString()}</p>`);
    win.document.write('<table border="1"><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Precio Unitario</th><th>Total</th></tr>');

    items.forEach((item, i) => {
      win.document.write(`<tr><td>${i + 1}</td><td>${item.description}</td><td>${item.quantity}</td><td>${item.unit_price}</td><td>${item.total}</td></tr>`);
    });

    win.document.write('</table>');
    win.document.write(`<p>Subtotal: ${quote.subtotal}</p><p>IGV: ${quote.igv}</p><p><strong>Total: ${quote.total}</strong></p>`);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  window.eliminarCotizacion = async function (id) {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await supabaseClient.from('quote_items').delete().eq('quote_id', id);
    await supabaseClient.from('quotes').delete().eq('id', id);
    cargarCotizaciones();
  };

  cargarCotizaciones(); // Primera carga
});
