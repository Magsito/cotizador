const supabase = supabase.createClient(
  'https://kgwzjrpgmhjfaxvndfjm.supabase.co', // ← pon tu URL
  'sb_publishable_VslI4Xb5L0ZECAmyA6ITyw_lwGg5uFn'                    // ← pon tu API key
);

// Agregar ítem a la tabla
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

// Calcular totales
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

// Guardar en Supabase
async function guardarCotizacion() {
  const quoteNumber = document.getElementById("quoteNumber").value;
  const date = document.getElementById("quoteDate").value || new Date().toISOString();
  const subtotal = parseFloat(document.getElementById("subtotal").textContent);
  const igv = parseFloat(document.getElementById("igv").textContent);
  const total = parseFloat(document.getElementById("total").textContent);

  const { data: quote, error } = await supabase
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

  const { error: itemError } = await supabase.from('quote_items').insert(items);
  if (itemError) {
    alert("Error al guardar ítems: " + itemError.message);
    return;
  }

  alert("Cotización guardada con éxito ✅");
  document.getElementById("downloadBtn").style.display = "inline";
}
